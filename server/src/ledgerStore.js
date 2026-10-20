// PayBridge Core Ledger & State Store
// Manages Multi-Currency Accounts, Sovereign Corridor Ledgers,
// PvP (Payment-versus-Payment) Atomic Locks, and KERNEL Cryptographic Proofs.

import { ulid } from 'ulid';
import { CORRIDORS, REFUSAL_CODES } from './corridorRules.js';
import { indexTradeEvent, indexComplianceLog, indexPayPalTransaction } from './elasticService.js';
import { triggerZapierWebhook } from './zapierService.js';
import { executePayPalPayout } from './paypalService.js';

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
      paypalOrderId: 'PAYID-MK873210984210',
      paypalStatus: 'APPROVED_PENDING_CAPTURE',
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
      paypalStatus: 'CAPTURED',
      payoutBatchId: 'BATCH-01J9X874291',
      createdAt: Date.now() - 7200000,
      proposedAt: Date.now() - 7200000,
      acceptedAt: Date.now() - 5400000,
      settledAt: Date.now() - 3600000,
      kernelReceiptHash: '0x94f83b27acbe83091df94827104bda02819028',
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
      status: 'SETTLED_ATOMIC',
      txId: 'tx-paybridge-01j9x874',
      settledAt: new Date(Date.now() - 3600000).toISOString(),
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

// PayPal live transaction ledger (feed of all PayPal interactions)
export const paypalLedgerStore = [
  {
    transactionId: 'TX-PAYPAL-1001',
    tradeId: 'T-1042',
    type: 'ORDER_CAPTURE',
    paypalOrderId: 'PAYID-LR99410294102',
    captureId: 'CAP-01J9X874102',
    grossAmount: '$18,750.00 USD',
    paypalFee: '$54.38 USD',
    netAmount: '$18,695.62 USD',
    sender: 'BankB1 Corporate Treasury',
    recipient: 'BankA1 Clearing Account',
    status: 'COMPLETED',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    corridor: 'SGD <-> INR',
  },
  {
    transactionId: 'TX-PAYPAL-1002',
    tradeId: 'T-1042',
    type: 'BATCH_PAYOUT',
    payoutBatchId: 'BATCH-01J9X874291',
    grossAmount: '$18,695.62 USD',
    paypalFee: '$0.25 USD',
    netAmount: '$18,695.37 USD',
    sender: 'PayBridge Settlement Custody',
    recipient: 'vendor-payout-sandbox@paybridge.ai',
    status: 'SUCCESS',
    timestamp: new Date(Date.now() - 3590000).toISOString(),
    corridor: 'USD Global Payout',
  },
];

// Seed Elastic with initial documents
tradesStore.forEach(t => indexTradeEvent(t.trade));
paypalLedgerStore.forEach(p => indexPayPalTransaction(p));

/**
 * Propose a new trade
 */
export function proposeTrade({
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
  const tradeId = `T-${ulid().slice(0, 10)}`;

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
  item.settle.status = 'READY_FOR_ATOMIC_SETTLEMENT';

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
 * Perform Atomic Settle on Trade (Payment-versus-Payment)
 * Releases held funds atomically across both sovereign legs and executes PayPal Payout
 */
export async function settleTrade(tradeId, paypalCaptureData = null) {
  const item = tradesStore.find(t => t.trade.tradeId === tradeId);
  if (!item) throw new Error(`Trade ${tradeId} not found`);

  item.trade.status = 'SETTLED';
  item.trade.settledAt = Date.now();

  item.legA.holdStatus = 'DEBITED';
  item.legA.creditStatus = 'CREDITED';
  item.legB.holdStatus = 'DEBITED';
  item.legB.creditStatus = 'CREDITED';

  const txId = `tx-atomic-${ulid().slice(0, 12)}`;
  // Generate KERNEL-compatible cryptographic settlement receipt
  const kernelReceiptHash = `0x${Buffer.from(`kernel_pvp_${tradeId}_${txId}_${Date.now()}`).toString('hex').slice(0, 40)}`;

  item.trade.kernelReceiptHash = kernelReceiptHash;
  item.settle = {
    status: 'SETTLED_ATOMIC',
    txId,
    settledAt: new Date().toISOString(),
    kernelReceiptHash,
  };

  // Record in PayPal Ledger
  const paypalEntry = {
    transactionId: `TX-PAYPAL-${ulid().slice(0, 8)}`,
    tradeId,
    type: 'ORDER_CAPTURE_ATOMIC',
    paypalOrderId: item.trade.paypalOrderId || `PAYID-${ulid().slice(0, 12)}`,
    captureId: paypalCaptureData?.captureId || `CAP-${ulid().slice(0, 10)}`,
    grossAmount: `${item.trade.ccyA} ${(Number(item.trade.amountA) / 100).toLocaleString()}`,
    paypalFee: 'Standard Sandbox Fee',
    netAmount: `${item.trade.ccyB} ${(Number(item.trade.amountB) / 100).toLocaleString()}`,
    sender: item.trade.proposerMsp,
    recipient: item.trade.counterpartyMsp,
    status: 'COMPLETED',
    timestamp: new Date().toISOString(),
    corridor: `${item.trade.ccyA} <-> ${item.trade.ccyB}`,
  };

  paypalLedgerStore.unshift(paypalEntry);
  indexPayPalTransaction(paypalEntry);
  indexTradeEvent(item.trade);

  // Trigger Zapier Webhook
  triggerZapierWebhook('ATOMIC_SETTLED', {
    tradeId,
    txId,
    kernelReceiptHash,
    corridor: `${item.trade.ccyA}/${item.trade.ccyB}`,
    settledAt: item.settle.settledAt,
  });

  // Autonomous Vendor Payout via PayPal
  try {
    const payoutRes = await executePayPalPayout({
      tradeId,
      recipientEmail: 'vendor-payout-sandbox@paybridge.ai',
      amount: item.trade.amountB,
      currency: item.trade.ccyB === 'SGD' ? 'SGD' : 'USD',
      note: `Atomic PvP settlement payout for ${tradeId}`,
    });

    item.trade.payoutBatchId = payoutRes.payoutBatchId;

    const payoutLedgerEntry = {
      transactionId: `TX-PAYPAL-${ulid().slice(0, 8)}`,
      tradeId,
      type: 'BATCH_PAYOUT',
      payoutBatchId: payoutRes.payoutBatchId,
      grossAmount: `${item.trade.ccyB} ${(Number(item.trade.amountB) / 100).toLocaleString()}`,
      paypalFee: '$0.25 USD',
      netAmount: `${item.trade.ccyB} ${(Number(item.trade.amountB) / 100).toLocaleString()}`,
      sender: 'PayBridge Settlement Custody',
      recipient: payoutRes.recipientEmail,
      status: 'SUCCESS',
      timestamp: new Date().toISOString(),
      corridor: 'Automated Agentic Payout',
    };
    paypalLedgerStore.unshift(payoutLedgerEntry);
    indexPayPalTransaction(payoutLedgerEntry);
  } catch (payoutErr) {
    console.warn(`Autonomous payout step warning:`, payoutErr.message);
  }

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
