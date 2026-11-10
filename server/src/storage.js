import pg from 'pg';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
const configured = Boolean(process.env.DATABASE_URL);
if (process.env.NODE_ENV === 'production' && !configured) {
  throw new Error('DATABASE_URL is required for production workflow storage.');
}

export function databaseConnectionString(value = process.env.DATABASE_URL, onRender = process.env.RENDER === 'true') {
  if (!value || !onRender) return value;
  const url = new URL(value);
  const externalSuffix = '.virginia-postgres.render.com';
  if (url.hostname.startsWith('dpg-') && url.hostname.endsWith(externalSuffix)) {
    url.hostname = url.hostname.slice(0, -externalSuffix.length);
    url.searchParams.delete('sslmode');
    return url.toString();
  }
  // Render's internal database certificate is self-signed, so verify-full cannot work there.
  if (/^dpg-[a-z0-9-]+$/.test(url.hostname) && url.searchParams.get('sslmode') === 'verify-full') {
    url.searchParams.delete('sslmode');
    return url.toString();
  }
  return value;
}

const pool = configured ? new Pool({
  connectionString: databaseConnectionString(),
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
}) : null;

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, encoded) {
  const [algorithm, salt, expectedHex] = String(encoded || '').split(':');
  if (algorithm !== 'scrypt' || !/^[0-9a-f]{32}$/.test(salt || '') || !/^[0-9a-f]{128}$/.test(expectedHex || '')) return false;
  const actual = await scrypt(String(password || ''), salt, 64);
  return timingSafeEqual(actual, Buffer.from(expectedHex, 'hex'));
}

if (pool) pool.on('error', (error) => console.error('[Storage] Idle PostgreSQL connection error:', error.message));

export function storageMode() {
  return configured ? 'postgresql' : 'in_memory';
}

export async function storageHealthy() {
  if (!pool) return true;
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

export async function initStorage({ accounts, trades, refusals, reserves, paypalLedger, operators = {} }) {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE TABLE IF NOT EXISTS paybridge_records (
      kind text NOT NULL,
      record_key text NOT NULL,
      payload jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (kind, record_key)
    )`);
    await client.query(`CREATE TABLE IF NOT EXISTS paybridge_sessions (
      token_hash text PRIMARY KEY,
      operator text NOT NULL,
      expires_at timestamptz NOT NULL
    )`);
    await client.query('CREATE INDEX IF NOT EXISTS paybridge_sessions_expiry_idx ON paybridge_sessions (expires_at)');
    await client.query(`CREATE TABLE IF NOT EXISTS paybridge_users (
      operator text PRIMARY KEY,
      password_hash text NOT NULL,
      enabled boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);

    // Import configured demo credentials once. Later env changes cannot silently rotate database users.
    for (const [operator, profile] of Object.entries(operators)) {
      const password = process.env[profile.passwordEnv];
      if (!password || password.length < 12) continue;
      const passwordHash = await hashPassword(password);
      await client.query(
        'INSERT INTO paybridge_users (operator, password_hash) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [operator, passwordHash],
      );
    }

    const seeds = [
      ...accounts.map((item) => ['account', `${item.bank}:${item.ccy}`, item]),
      ...trades.map((item) => ['trade', item.trade.tradeId, item]),
      ...refusals.map((item) => ['refusal', item.refusalId, item]),
      ...Object.values(reserves).map((item) => ['reserve', item.ccy, item]),
      ...paypalLedger.map((item) => ['paypal_entry', item.transactionId, item]),
    ];
    for (const [kind, key, payload] of seeds) {
      await client.query(
        'INSERT INTO paybridge_records (kind, record_key, payload) VALUES ($1, $2, $3::jsonb) ON CONFLICT DO NOTHING',
        [kind, key, JSON.stringify(payload)],
      );
    }

    const rows = await client.query('SELECT kind, record_key, payload FROM paybridge_records WHERE kind = ANY($1::text[])',
      [['account', 'trade', 'refusal', 'reserve', 'paypal_entry']]);
    const byKind = (kind) => rows.rows.filter((row) => row.kind === kind).map((row) => row.payload);
    accounts.splice(0, accounts.length, ...byKind('account'));
    trades.splice(0, trades.length, ...byKind('trade').sort((a, b) => Number(b.trade.createdAt || 0) - Number(a.trade.createdAt || 0)));
    refusals.splice(0, refusals.length, ...byKind('refusal').sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))));
    paypalLedger.splice(0, paypalLedger.length, ...byKind('paypal_entry').sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp))));
    for (const key of Object.keys(reserves)) delete reserves[key];
    for (const item of byKind('reserve')) reserves[item.ccy] = item;
    await client.query('DELETE FROM paybridge_sessions WHERE expires_at < now()');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getUser(operator) {
  if (!pool) return null;
  const result = await pool.query('SELECT password_hash, enabled FROM paybridge_users WHERE operator = $1', [operator]);
  return result.rows[0] || null;
}

export async function saveRecord(kind, key, payload) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO paybridge_records (kind, record_key, payload, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (kind, record_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
    [kind, key, JSON.stringify(payload)],
  );
}

export async function getRecord(kind, key) {
  if (!pool) return null;
  const result = await pool.query('SELECT payload FROM paybridge_records WHERE kind = $1 AND record_key = $2', [kind, key]);
  return result.rows[0]?.payload || null;
}

export async function deleteRecord(kind, key) {
  if (pool) await pool.query('DELETE FROM paybridge_records WHERE kind = $1 AND record_key = $2', [kind, key]);
}

export const saveTrade = (item) => saveRecord('trade', item.trade.tradeId, item);
export const saveRefusal = (item) => saveRecord('refusal', item.refusalId, item);
export const savePayPalEntry = (item) => saveRecord('paypal_entry', item.transactionId, item);

export async function saveTradeAndPayPalEntry(trade, entry) {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [kind, key, payload] of [
      ['trade', trade.trade.tradeId, trade],
      ['paypal_entry', entry.transactionId, entry],
    ]) {
      await client.query(
        `INSERT INTO paybridge_records (kind, record_key, payload, updated_at)
         VALUES ($1, $2, $3::jsonb, now())
         ON CONFLICT (kind, record_key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = now()`,
        [kind, key, JSON.stringify(payload)],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveSession(tokenHash, operator, expiresAt) {
  if (!pool) return;
  await pool.query(
    'INSERT INTO paybridge_sessions (token_hash, operator, expires_at) VALUES ($1, $2, $3) ON CONFLICT (token_hash) DO UPDATE SET expires_at = EXCLUDED.expires_at',
    [tokenHash, operator, new Date(expiresAt)],
  );
}

export async function getSession(tokenHash) {
  if (!pool) return null;
  const result = await pool.query('SELECT operator, expires_at FROM paybridge_sessions WHERE token_hash = $1 AND expires_at > now()', [tokenHash]);
  return result.rows[0] ? { operator: result.rows[0].operator, expiresAt: result.rows[0].expires_at.getTime() } : null;
}

export async function deleteSession(tokenHash) {
  if (pool) await pool.query('DELETE FROM paybridge_sessions WHERE token_hash = $1', [tokenHash]);
}

export async function closeStorage() {
  if (pool) await pool.end();
}
