import assert from 'node:assert/strict';
import {
  initStorage, storageHealthy, storageMode, saveTradeAndPayPalEntry,
  getRecord, deleteRecord, saveSession, getSession, deleteSession, closeStorage,
} from '../src/storage.js';

const target = new URL(process.env.DATABASE_URL || 'postgres://invalid/');
if (!['127.0.0.1', 'localhost'].includes(target.hostname) || target.pathname !== '/paybridge_test') {
  throw new Error('Storage smoke test accepts only a local paybridge_test database.');
}

const tradeId = `T-STORAGE-${Date.now()}`;
const entryId = `TX-STORAGE-${Date.now()}`;
const tokenHash = `test-${Date.now()}`;
const trade = { trade: { tradeId, proposerMsp: 'BankA1MSP', status: 'PROPOSED', createdAt: Date.now() }, legA: {}, legB: {}, settle: {} };
const entry = { transactionId: entryId, tradeId, timestamp: new Date().toISOString(), type: 'STORAGE_TEST' };

try {
  assert.equal(storageMode(), 'postgresql');
  const first = { accounts: [], trades: [], refusals: [], reserves: {}, paypalLedger: [] };
  await initStorage(first);
  assert.equal(await storageHealthy(), true);
  await saveTradeAndPayPalEntry(trade, entry);
  await saveSession(tokenHash, 'a1-trader', Date.now() + 60_000);

  const reloaded = { accounts: [], trades: [], refusals: [], reserves: {}, paypalLedger: [] };
  await initStorage(reloaded);
  assert(reloaded.trades.some((item) => item.trade.tradeId === tradeId));
  assert(reloaded.paypalLedger.some((item) => item.transactionId === entryId));
  assert.equal((await getRecord('trade', tradeId)).trade.status, 'PROPOSED');
  assert.equal((await getSession(tokenHash)).operator, 'a1-trader');
  await deleteSession(tokenHash);
  assert.equal(await getSession(tokenHash), null);
  console.log('PostgreSQL trade, PayPal entry, restart load, health, and session checks passed.');
} finally {
  await deleteRecord('trade', tradeId);
  await deleteRecord('paypal_entry', entryId);
  await deleteSession(tokenHash);
  await closeStorage();
}
