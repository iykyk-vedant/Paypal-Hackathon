import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const port = 39271;
const base = `http://127.0.0.1:${port}`;
const passwords = {
  trader: randomBytes(24).toString('base64url'),
  approver: randomBytes(24).toString('base64url'),
  regulator: randomBytes(24).toString('base64url'),
};
const child = spawn(process.execPath, ['src/index.js'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  env: {
    ...process.env,
    PORT: String(port),
    NODE_ENV: 'test',
    DATABASE_URL: '',
    PAYPAL_MODE: 'mock',
    FABRIC_GATEWAY_ENABLED: 'false',
    PAYBRIDGE_PASSWORD_A1_TRADER: passwords.trader,
    PAYBRIDGE_PASSWORD_A1_APPROVER: passwords.approver,
    PAYBRIDGE_PASSWORD_REGA: passwords.regulator,
  },
  stdio: ['ignore', 'ignore', 'pipe'],
});
let startupError = '';
child.stderr.on('data', (chunk) => { startupError += String(chunk); });

async function call(path, options = {}) {
  return fetch(`${base}${path}`, options);
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { ready = (await call('/health')).ok; } catch { /* server starting */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, `API did not start: ${startupError.slice(0, 500)}`);
  assert.equal((await call('/trades')).status, 401);
  assert.equal((await call('/me', { headers: { 'X-Operator': 'rega-operator' } })).status, 401);

  async function signIn(operator, password) {
    return call('/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operator, password }),
    });
  }

  assert.equal((await signIn('a1-trader', 'wrong-password')).status, 401);
  const traderResponse = await signIn('a1-trader', passwords.trader);
  assert.equal(traderResponse.status, 200);
  const { token: traderToken } = await traderResponse.json();
  const traderHeaders = { Authorization: `Bearer ${traderToken}` };
  assert.equal((await call('/me', { headers: traderHeaders })).status, 200);
  assert.equal((await call('/api/elastic/search', { headers: traderHeaders })).status, 403);
  assert.equal((await call('/trades/T-1042/accept', { method: 'POST', headers: traderHeaders })).status, 403);

  const regulatorResponse = await signIn('rega-operator', passwords.regulator);
  assert.equal(regulatorResponse.status, 200);
  const { token: regulatorToken } = await regulatorResponse.json();
  const regulatorHeaders = { Authorization: `Bearer ${regulatorToken}` };
  assert.equal((await call('/rules/JUR-A', { headers: regulatorHeaders })).status, 200);
  assert.equal((await call('/rules/JUR-B', { headers: regulatorHeaders })).status, 403);
  assert.equal((await call('/api/paypal/ledger', { headers: regulatorHeaders })).status, 403);

  assert.equal((await call('/auth/logout', { method: 'POST', headers: traderHeaders })).status, 200);
  assert.equal((await call('/me', { headers: traderHeaders })).status, 401);
  assert.equal((await call('/auth/logout', { method: 'POST', headers: regulatorHeaders })).status, 200);
  console.log('Role login, API scope, and logout smoke checks passed.');
} finally {
  child.kill();
}
