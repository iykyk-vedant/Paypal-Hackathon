// PayBridge Core Ledger & State Store
// Manages Multi-Currency Accounts, Sovereign Corridor Ledgers,
// In-memory trade workflow, PayPal events, and local demo receipt digests.

import { ulid } from 'ulid';
import { createHash } from 'node:crypto';
import { CORRIDORS, REFUSAL_CODES } from './corridorRules.js';
import { indexTradeEvent, indexComplianceLog, indexPayPalTransaction } from './elasticService.js';
import { triggerZapierWebhook } from './zapierService.js';

// Multi-currency accounts for consortium institutions
export const accountsStore = [
  { bank: 'BankA1', ccy: 'INR', available: '4250000000', held: '200000000', status: 'ACTIVE' }, // ₹42.5M
  { bank: 'BankA1', ccy: 'SGD', available: '85000000', held: '0', status: 'ACTIVE' },           // S$850K
  { bank: 'BankB1', ccy: 'SGD', available: '512000000', held: '32000000', status: 'ACTIVE' },   // S$5.12M
  { bank: 'BankB1', ccy: 'INR', available: '142000000', held: '0', status: 'ACTIVE' },          // ₹1.42M
  { bank: 'BankA1', ccy: 'USD', available: '250000000', held: '0', status: 'ACTIVE' },          // $2.5M Treasury Float
  { bank: 'BankB1', ccy: 'USD', available: '310000000', held: '0', status: 'ACTIVE' },          // $3.1M Treasury Float
];

// Initial seeded trades
export const tradesStore = [
  {
    trade: {
      tradeId: 'T-1048',
      proposer: 'a1-trader',
      proposerMsp: 'BankA1MSP',
      cparty: 'b1-trader',
      counterpartyMsp: 'BankB1MSP',
      ccyA: 'INR',
      amountA: 100000000, // ₹1,000,000.00
      ccyB: 'SGD',
      amountB: 1600000,   // S$16,000.00
      fxRate: '0.0160',
      reference: 'B2B Medical Diagnostics Sourcing Batch 4',
      status: 'ACCEPTED',
      paypalStatus: 'NOT_CREATED',
      createdAt: Date.now() - 3600000,
      proposedAt: Date.now() - 3600000,
      acceptedAt: Date.now() - 1800000,
      channel3Sku: 'CH3-MED-8841',
    },
    legA: {
      tradeId: 'T-1048',
      leg: 'A',
      ccy: 'INR',
      amount: 100000000,
      payer: 'BankA1',
      payee: 'BankB1',
      senderMsp: 'BankA1MSP',
      receiverMsp: 'BankB1MSP',
      holdStatus: 'HELD',
      creditStatus: 'NONE',
    },
    legB: {
      tradeId: 'T-1048',
      leg: 'B',
      ccy: 'SGD',
      amount: 1600000,
      payer: 'BankB1',
      payee: 'BankA1',
      senderMsp: 'BankB1MSP',
      receiverMsp: 'BankA1MSP',
      holdStatus: 'HELD',
      creditStatus: 'NONE',
    },
    settle: {
      status: 'AWAITING_PVP_TRIGGER',
    },
  },
  {
    trade: {
      tradeId: 'T-1042',
      proposer: 'b1-trader',
      proposerMsp: 'BankB1MSP',
      cparty: 'a1-trader',
      counterpartyMsp: 'BankA1MSP',
      ccyA: 'SGD',
      amountA: 2500000,   // S$25,000.00
      ccyB: 'INR',
      amountB: 156250000, // ₹1,562,500.00
      fxRate: '62.5000',
      reference: 'Automotive RISC-V Microcontrollers Purchase',
      status: 'SETTLED',
      paypalOrderId: 'PAYID-LR99410294102',
      paypalStatus: 'CAPTURED_FIXTURE',
      paypalMode: 'SEEDED_FIXTURE',
      payoutBatchId: 'BATCH-01J9X874291',
      payoutStatus: 'SEEDED_FIXTURE',
      createdAt: Date.now() - 7200000,
      proposedAt: Date.now() - 7200000,
      acceptedAt: Date.now() - 5400000,
      settledAt: Date.now() - 3600000,
      channel3Sku: 'CH3-SEMI-2099',
    },
    legA: {
      tradeId: 'T-1042',
      leg: 'A',
      ccy: 'SGD',
      amount: 2500000,
      payer: 'BankB1',
      payee: 'BankA1',
      holdStatus: 'DEBITED',
      creditStatus: 'CREDITED',
    },
    legB: {
      tradeId: 'T-1042',
      leg: 'B',
      ccy: 'INR',
      amount: 156250000,
      payer: 'BankA1',
      payee: 'BankB1',
      holdStatus: 'DEBITED',
      creditStatus: 'CREDITED',
    },
    settle: {
      status: 'SETTLED_DEMO_FIXTURE',
      txId: 'tx-fixture-01j9x874',
      settledAt: new Date(Date.now() - 3600000).toISOString(),
      dataSource: 'SEEDED_DEMO_FIXTURE',
    },
  },
];

// Regulatory refusals store
export const refusalsStore = [
  {
    refusalId: 'REF-01',
    tradeId: 'T-REF-902',
    jurisdiction: 'JUR-A',
    ruleVersion: 4,
    reasonCode: 'REF_AMOUNT_EXCEEDS_CEILING',
    invokerMsp: 'BankA1MSP',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Central Bank Reserves (RTGS backing 1:1)
export const reservesStore = {
  INR: { ccy: 'INR', rtgsBalance: '10000000000', statementRef: 'RBI-RTGS-MUM-2026-X89', attestedAt: new Date().toISOString() },
  SGD: { ccy: 'SGD', rtgsBalance: '500000000', statementRef: 'MAS-MEPS-SG-2026-B12', attestedAt: new Date().toISOString() },
  USD: { ccy: 'USD', rtgsBalance: '2500000000', statementRef: 'FEDWIRE-NY-2026-P01', attestedAt: new Date().toISOString() },
};

// Seeded demo PayPal ledger records (illustrative fixtures; not live PayPal events)
export const paypalLedgerStore = [
  {
    transactionId: 'TX-PAYPAL-1001',
    tradeId: 'T-1042',
    type: 'ORDER_CAPTURE_FIXTURE',
    paypalOrderId: 'PAYID-LR99410294102',
    captureId: 'CAP-01J9X874102',
    paypalMode: 'SEEDED_FIXTURE',
    isSimulation: true,
    grossAmount: '$18,750.00 USD',
    paypalFee: '$54.38 USD',
    netAmount: '$18,695.62 USD',
    sender: 'BankB1 Corporate Treasury',
    recipient: 'BankA1 Clearing Account',
    status: 'SEEDED_FIXTURE',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    corridor: 'SGD <-> INR',
  },
  {
    transactionId: 'TX-PAYPAL-1002',
    tradeId: 'T-1042',
    type: 'BATCH_PAYOUT_FIXTURE',
    payoutBatchId: 'BATCH-01J9X874291',
    paypalMode: 'SEEDED_FIXTURE',
    isSimulation: true,
    grossAmount: '$18,695.62 USD',
    paypalFee: '$0.25 USD',
    netAmount: '$18,695.37 USD',
    sender: 'PayBridge Settlement Custody',
    recipient: 'vendor-payout-sandbox@paybridge.ai',
    status: 'SEEDED_FIXTURE',
    timestamp: new Date(Date.now() - 3590000).toISOString(),
    corridor: 'USD Global Payout',
  },
];

export function seedElasticFromStores() {
  tradesStore.forEach((item) => indexTradeEvent(item.trade));
  paypalLedgerStore.forEach((item) => indexPayPalTransaction(item));
}

/**
 * Propose a new trade
 */
export function proposeTrade({
  tradeId: suppliedTradeId = null,
  proposer = 'a1-trader',
  proposerMsp = 'BankA1MSP',
  cparty = 'b1-trader',
  counterpartyMsp = 'BankB1MSP',
  ccyA = 'INR',
  amountA = 100000000,
  ccyB = 'SGD',
  amountB = 1600000,
  fxRate = '0.0160',
  reference = 'B2B Cross-Border Sourcing',
  channel3Sku = null,
}) {
  const tradeId = suppliedTradeId || `T-${ulid().slice(0, 10)}`;

  const newComposite = {
    trade: {
      tradeId,
      proposer,
      proposerMsp,
      cparty,
      counterpartyMsp,
      ccyA,
      amountA,
      ccyB,
      amountB,
      fxRate,
      reference,
      status: 'PROPOSED',
      createdAt: Date.now(),
      proposedAt: Date.now(),
      channel3Sku,
    },
    legA: {
      tradeId,
      leg: 'A',
      ccy: ccyA,
      amount: amountA,
      payer: proposerMsp.includes('A1') ? 'BankA1' : 'BankB1',
      payee: proposerMsp.includes('A1') ? 'BankB1' : 'BankA1',
      holdStatus: 'HELD',
      creditStatus: 'NONE',
    },
    legB: {
      tradeId,
      leg: 'B',
      ccy: ccyB,
      amount: amountB,
      payer: proposerMsp.includes('A1') ? 'BankB1' : 'BankA1',
      payee: proposerMsp.includes('A1') ? 'BankA1' : 'BankB1',
      holdStatus: 'NONE',
      creditStatus: 'NONE',
    },
    settle: {
      status: 'AWAITING_COUNTERPARTY_ACCEPTANCE',
    },
  };

  tradesStore.unshift(newComposite);

  // Index event
  indexTradeEvent(newComposite.trade);

  // Trigger Zapier Automation
  triggerZapierWebhook('TRADE_PROPOSED', {
    tradeId,
    proposerMsp,
    counterpartyMsp,
    pair: `${ccyA}/${ccyB}`,
    amountA,
    amountB,
    fxRate,
  });

  return newComposite;
}

/**
 * Accept a proposed trade
 */
export function acceptTrade(tradeId) {
  const item = tradesStore.find(t => t.trade.tradeId === tradeId);
  if (!item) throw new Error(`Trade ${tradeId} not found`);

  item.trade.status = 'ACCEPTED';
  item.trade.acceptedAt = Date.now();
  item.legB.holdStatus = 'HELD';
  item.settle.status = 'READY_FOR_DEMO_SETTLEMENT';

  indexTradeEvent(item.trade);

  triggerZapierWebhook('TRADE_ACCEPTED', {
    tradeId,
    status: 'ACCEPTED',
    bothLegsHeld: true,
  });

  return item;
}

/**
 * Link PayPal Order to Trade
 */
export function linkPayPalOrder(tradeId, orderId, status = 'APPROVED') {
  const item = tradesStore.find(t => t.trade.tradeId === tradeId);
  if (!item) throw new Error(`Trade ${tradeId} not found`);

  item.trade.paypalOrderId = orderId;
  item.trade.paypalStatus = status;

  return item;
}

/**
 * Record a verified PayPal capture as funding only. Fabric settlement is a separate
 * explicit action and the local trade remains unsettled until all Fabric value legs commit.
 */
export function recordPayPalCapture(tradeId, paypalCaptureData = null) {
  const item = tradesStore.find(t => t.trade.tradeId === tradeId);
  if (!item) throw new Error(`Trade ${tradeId} not found`);
  if (item.trade.status !== 'ACCEPTED') {
    throw new Error(`Trade ${tradeId} must be ACCEPTED before PayPal capture (current: ${item.trade.status})`);
  }
  if (!paypalCaptureData || paypalCaptureData.status !== 'COMPLETED') {
    throw new Error('A completed PayPal capture is required');
  }
  if (paypalCaptureData.tradeId !== tradeId || paypalCaptureData.orderId !== item.trade.paypalOrderId) {
    throw new Error('PayPal capture does not match the linked trade order');
  }
  const expectedFundingMinor = item.trade.paypalFundingQuote?.paymentAmountMinor;
  if (!expectedFundingMinor || paypalCaptureData.fundingAmountMinor !== String(expectedFundingMinor)) {
    throw new Error('PayPal capture amount does not match the approved USD funding quote');
  }

  if (item.trade.paypalCaptureId) {
    if (item.trade.paypalCaptureId === paypalCaptureData.captureId) return item;
    throw new Error('A different PayPal capture is already linked to this trade');
  }
  item.trade.paypalStatus = paypalCaptureData.isSimulation ? 'CAPTURED_SIMULATED' : 'CAPTURED_SANDBOX';
  item.trade.paypalMode = paypalCaptureData.isSimulation ? 'SIMULATION' : 'PAYPAL_SANDBOX';
  item.trade.paypalCaptureId = paypalCaptureData.captureId;
  item.trade.paypalCaptureDetails = {
    captureId: paypalCaptureData.captureId,
    status: paypalCaptureData.status,
    fundingAmountMinor: paypalCaptureData.fundingAmountMinor,
    capturedAt: paypalCaptureData.capturedAt || new Date().toISOString(),
    providerMode: paypalCaptureData.isSimulation ? 'simulation' : 'sandbox',
  };
  item.settle = {
    status: 'AWAITING_EXPLICIT_FABRIC_SETTLEMENT',
    capturedAt: new Date().toISOString(),
    dataSource: 'PAYPAL_SANDBOX_CAPTURE',
  };

  // Record in PayPal Ledger
  const paypalEntry = {
    transactionId: `TX-PAYPAL-${ulid().slice(0, 8)}`,
    tradeId,
    type: paypalCaptureData.isSimulation ? 'ORDER_CAPTURE_SIMULATED' : 'ORDER_CAPTURE_SANDBOX',
    paypalOrderId: item.trade.paypalOrderId || `PAYID-${ulid().slice(0, 12)}`,
    captureId: paypalCaptureData?.captureId || `CAP-${ulid().slice(0, 10)}`,
    paypalFundingAmount: `$${(Number(expectedFundingMinor) / 100).toFixed(2)} USD`,
    paypalMode: paypalCaptureData.isSimulation ? 'SIMULATION' : 'PAYPAL_SANDBOX',
    isSimulation: Boolean(paypalCaptureData.isSimulation),
    grossAmount: `$${(Number(expectedFundingMinor) / 100).toFixed(2)} USD (${item.trade.ccyA} ${(Number(item.trade.amountA) / 100).toLocaleString()})`,
    paypalFee: paypalCaptureData.isSimulation ? '$0.00 USD (Simulated)' : 'Sandbox Fee',
    netAmount: `${item.trade.ccyB} ${(Number(item.trade.amountB) / 100).toLocaleString()}`,
    sender: item.trade.proposerMsp,
    recipient: item.trade.counterpartyMsp,
    status: paypalCaptureData.isSimulation ? 'SIMULATED' : 'COMPLETED',
    timestamp: new Date().toISOString(),
    corridor: `${item.trade.ccyA} <-> ${item.trade.ccyB}`,
  };

  paypalLedgerStore.unshift(paypalEntry);
  indexPayPalTransaction(paypalEntry);
  indexTradeEvent(item.trade);
  triggerZapierWebhook('PAYPAL_CAPTURED_PENDING_FABRIC', {
    tradeId,
    paypalOrderId: item.trade.paypalOrderId,
    paypalCaptureId: paypalCaptureData.captureId,
    corridor: `${item.trade.ccyA}/${item.trade.ccyB}`,
    capturedAt: item.settle.capturedAt,
    nextStep: 'EXPLICIT_FABRIC_SETTLEMENT',
  });
  return item;
}

/** Mark the local demo workflow settled only after a confirmed Fabric commit. */
export function recordFabricSettlement(tradeId, fabricOutcome) {
  const item = tradesStore.find((t) => t.trade.tradeId === tradeId);
  if (!item) throw new Error(`Trade ${tradeId} not found`);
  if (!item.trade.paypalCaptureId || !String(item.trade.paypalStatus || '').startsWith('CAPTURED_')) {
    throw new Error('A verified PayPal capture is required before completing this linked Fabric settlement');
  }
  if (!fabricOutcome?.transactionId || fabricOutcome.status !== 'SETTLED') {
    throw new Error('A confirmed successful Fabric settlement commit is required');
  }
  if (item.trade.fabricTransactionId === fabricOutcome.transactionId) return item;
  item.trade.fabricStatus = 'SETTLED_PENDING_VALUE_LEGS';
  item.trade.fabricTransactionId = fabricOutcome.transactionId;
  item.trade.fabricLegActions = item.trade.fabricLegActions || {};
  item.settle = {
    status: 'FABRIC_SETTLED_PENDING_VALUE_LEGS',
    txId: fabricOutcome.transactionId,
    dataSource: 'HYPERLEDGER_FABRIC_GATEWAY',
  };
  indexTradeEvent(item.trade);
  triggerZapierWebhook('FABRIC_SETTLE_APPROVED_AFTER_PAYPAL_CAPTURE', {
    tradeId,
    fabricTradeId: item.trade.fabricTradeId,
    transactionId: fabricOutcome.transactionId,
    paypalCaptureId: item.trade.paypalCaptureId,
    nextStep: 'COMMIT_ALL_FOUR_VALUE_LEG_ACTIONS',
  });
  return item;
}

/** Track each separately committed debit/credit leg; only finalize after all four. */
export function recordFabricLegAction(tradeId, leg, operation, outcome) {
  const item = tradesStore.find((t) => t.trade.tradeId === tradeId);
  if (!item) throw new Error(`Trade ${tradeId} not found`);
  if (!item.trade.fabricTransactionId || item.trade.fabricStatus !== 'SETTLED_PENDING_VALUE_LEGS') {
    throw new Error('The linked Fabric settlement must be approved before value legs are recorded');
  }
  if (!['A', 'B'].includes(leg) || !['debit', 'credit'].includes(operation) || !outcome?.transactionId) {
    throw new Error('A confirmed Fabric leg transaction is required');
  }
  const actionKey = `${leg}_${operation}`;
  item.trade.fabricLegActions = item.trade.fabricLegActions || {};
  item.trade.fabricLegActions[actionKey] = outcome.transactionId;
  if (operation === 'debit') item[`leg${leg}`].holdStatus = 'DEBITED';
  else item[`leg${leg}`].creditStatus = 'CREDITED';

  const required = ['A_debit', 'A_credit', 'B_debit', 'B_credit'];
  if (required.every((key) => item.trade.fabricLegActions[key])) {
    item.trade.status = 'SETTLED';
    item.trade.fabricStatus = 'SETTLED';
    item.trade.settledAt = Date.now();
    const settledAt = new Date().toISOString();
    const receiptPayload = {
      tradeId,
      fabricTradeId: item.trade.fabricTradeId,
      fabricTransactionId: item.trade.fabricTransactionId,
      fabricValueLegTransactions: item.trade.fabricLegActions,
      sourceAmountMinor: String(item.trade.amountA),
      sourceCurrency: item.trade.ccyA,
      counterAmountMinor: String(item.trade.amountB),
      counterCurrency: item.trade.ccyB,
      paypalOrderId: item.trade.paypalOrderId,
      paypalCaptureId: item.trade.paypalCaptureId,
      paypalFundingAmountMinor: String(item.trade.paypalFundingQuote.paymentAmountMinor),
      paypalMode: item.trade.paypalMode,
      settledAt,
    };
    const receiptHash = `0x${createHash('sha256').update(JSON.stringify(receiptPayload)).digest('hex')}`;
    item.trade.receiptHash = receiptHash;
    item.trade.receiptPayload = receiptPayload;
    item.settle = { status: 'SETTLED_ON_FABRIC', txId: item.trade.fabricTransactionId, settledAt, receiptHash, dataSource: 'HYPERLEDGER_FABRIC_GATEWAY' };
    triggerZapierWebhook('FABRIC_VALUE_SETTLEMENT_COMPLETED', { tradeId, fabricTradeId: item.trade.fabricTradeId, fabricTransactionId: item.trade.fabricTransactionId, receiptHash, settledAt });
  }
  indexTradeEvent(item.trade);
  return item;
}

/**
 * Record a regulatory refusal
 */
export function recordRefusal(tradeId, jurisdiction, reasonCode, invokerMsp = 'BankA1MSP') {
  const refusalId = `REF-${ulid().slice(0, 8)}`;
  const record = {
    refusalId,
    tradeId,
    jurisdiction,
    ruleVersion: CORRIDORS[jurisdiction]?.version || 1,
    reasonCode,
    reasonDescription: REFUSAL_CODES[reasonCode] || reasonCode,
    invokerMsp,
    timestamp: new Date().toISOString(),
  };

  refusalsStore.unshift(record);
  indexComplianceLog(record);

  triggerZapierWebhook('COMPLIANCE_REFUSED', record);
  return record;
}
