import test from 'node:test';
import assert from 'node:assert/strict';
import { requireSuccessfulChaincodeResult } from '../src/fabricResult.js';

test('accepts a successful chaincode result', () => {
  assert.doesNotThrow(() => requireSuccessfulChaincodeResult({ status: 'OK' }, 'ProposeTrade', 'tx', 'VALID'));
});

test('reports a committed refusal rather than treating it as a successful trade', () => {
  assert.throws(() => requireSuccessfulChaincodeResult({ status: 'REFUSED', reasonCode: 'INSUFFICIENT_AVAILABLE' }, 'ProposeTrade', 'tx', 'VALID'),
    (error) => error.reasonCode === 'INSUFFICIENT_AVAILABLE' && error.transactionId === 'tx' && error.validationCode === 'VALID');
});

test('rejects an unknown result', () => {
  assert.throws(() => requireSuccessfulChaincodeResult('', 'ProposeTrade', 'tx', 'VALID'), /UNKNOWN_RESULT/);
});
