import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { storageMode, saveSession, getSession, deleteSession, getUser, verifyPassword } from './storage.js';

export const OPERATORS = {
  'a1-trader': { label: 'Bank A1 Trader', org: 'banka1', msp: 'BankA1MSP', orgType: 'bank', jurisdiction: 'JUR-A', role: 'trader', passwordEnv: 'PAYBRIDGE_PASSWORD_A1_TRADER' },
  'a1-approver': { label: 'Bank A1 Approver', org: 'banka1', msp: 'BankA1MSP', orgType: 'bank', jurisdiction: 'JUR-A', role: 'approver', passwordEnv: 'PAYBRIDGE_PASSWORD_A1_APPROVER' },
  'b1-trader': { label: 'Bank B1 Trader', org: 'bankb1', msp: 'BankB1MSP', orgType: 'bank', jurisdiction: 'JUR-B', role: 'trader', passwordEnv: 'PAYBRIDGE_PASSWORD_B1_TRADER' },
  'b1-approver': { label: 'Bank B1 Approver', org: 'bankb1', msp: 'BankB1MSP', orgType: 'bank', jurisdiction: 'JUR-B', role: 'approver', passwordEnv: 'PAYBRIDGE_PASSWORD_B1_APPROVER' },
  'rega-operator': { label: 'RegA Supervisor', org: 'rega', msp: 'RegAMSP', orgType: 'regulator', jurisdiction: 'JUR-A', role: 'regulator', passwordEnv: 'PAYBRIDGE_PASSWORD_REGA' },
  'regb-operator': { label: 'RegB Supervisor', org: 'regb', msp: 'RegBMSP', orgType: 'regulator', jurisdiction: 'JUR-B', role: 'regulator', passwordEnv: 'PAYBRIDGE_PASSWORD_REGB' },
  'aud-reader': { label: 'Consortium Auditor', org: 'auditor', msp: 'AuditorMSP', orgType: 'auditor', jurisdiction: null, role: 'auditor', passwordEnv: 'PAYBRIDGE_PASSWORD_AUDITOR' },
};

const sessions = new Map();
const attempts = new Map();
const SESSION_MS = 8 * 60 * 60 * 1000;

export function publicOperator(operator) {
  const { passwordEnv, ...profile } = OPERATORS[operator];
  return { operator, ...profile, ready: true };
}

export async function login(operator, password, clientKey) {
  const profile = OPERATORS[operator];
  const now = Date.now();
  const failures = (attempts.get(clientKey) || []).filter((at) => now - at < 15 * 60 * 1000);
  if (failures.length >= 10) return { error: 'Too many login attempts. Try again in 15 minutes.', status: 429 };
  const databaseUser = profile && storageMode() === 'postgresql' ? await getUser(operator) : null;
  const expected = profile && storageMode() !== 'postgresql' ? process.env[profile.passwordEnv] : null;
  if (profile && !databaseUser && !expected) return { error: 'This role has no login password configured on the server.', status: 503 };
  const valid = databaseUser
    ? databaseUser.enabled && await verifyPassword(password, databaseUser.password_hash)
    : Boolean(expected && expected.length >= 12 && timingSafeEqual(
      createHash('sha256').update(String(password || '')).digest(),
      createHash('sha256').update(expected).digest(),
    ));
  if (!valid) {
    failures.push(now);
    attempts.set(clientKey, failures);
    return { error: 'Invalid operator or password.', status: 401 };
  }
  attempts.delete(clientKey);
  const token = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  if (storageMode() === 'postgresql') await saveSession(tokenHash, operator, now + SESSION_MS);
  else sessions.set(tokenHash, { operator, expiresAt: now + SESSION_MS });
  return { token, expiresAt: now + SESSION_MS, profile: publicOperator(operator) };
}

export async function authenticate(req, res, next) {
  const token = /^Bearer (\S+)$/i.exec(req.get('Authorization') || '')?.[1];
  const key = token && createHash('sha256').update(token).digest('hex');
  try {
    const session = key && (storageMode() === 'postgresql' ? await getSession(key) : sessions.get(key));
    if (!session || session.expiresAt < Date.now()) {
      if (key) sessions.delete(key);
      return res.status(401).json({ error: 'Sign in to continue.' });
    }
    req.operator = session.operator;
    req.profile = publicOperator(session.operator);
    req.sessionKey = key;
    next();
  } catch (error) {
    res.status(503).json({ error: 'Login storage is temporarily unavailable.' });
  }
}

export async function logout(req) {
  if (storageMode() === 'postgresql') await deleteSession(req.sessionKey);
  else sessions.delete(req.sessionKey);
}

const bank = (req) => req.profile.orgType === 'bank';
const trader = (req) => bank(req) && req.profile.role === 'trader';
const approver = (req) => bank(req) && req.profile.role === 'approver';
const oversight = (req) => ['regulator', 'auditor'].includes(req.profile.orgType);

export function authorizeRoute(req, res, next) {
  const path = req.path;
  const method = req.method;
  let allowed = true;
  if (path.startsWith('/api/kernel/')) allowed = false;
  else if (path.startsWith('/api/channel3/')) allowed = trader(req);
  else if (path.startsWith('/api/ai/negotiate') || path.startsWith('/api/ai/treasury') || path.startsWith('/api/ai/copilot') || path.startsWith('/api/ai/risk-screen')) allowed = bank(req);
  else if (path.startsWith('/api/elastic/')) allowed = req.profile.role === 'auditor';
  else if (path.startsWith('/api/fabric/audit/')) allowed = oversight(req);
  else if (path.startsWith('/api/zapier/')) allowed = approver(req);
  else if (path.startsWith('/api/paypal/')) allowed = bank(req) && (method === 'GET' || approver(req));
  else if (path.startsWith('/api/fabric/trades/')) allowed = approver(req);
  else if (path === '/trades' && method === 'POST') allowed = trader(req);
  else if (/^\/trades\/[^/]+\/accept$/.test(path) && method === 'POST') allowed = approver(req);
  else if (path === '/api/fabric/ledger') allowed = bank(req) || oversight(req);
  else if (path === '/api/integrations/status') allowed = oversight(req);
  if (!allowed) return res.status(403).json({ error: 'This action is not available to your role.' });
  next();
}
