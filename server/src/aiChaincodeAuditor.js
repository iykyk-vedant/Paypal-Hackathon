// AI Smart Chaincode & DLT Auditor Service
// Deterministic demo auditor over seeded example records. It does not connect
// to a Fabric block stream or cryptographically verify endorsements.

import { ulid } from 'ulid';

export const fabricBlocksStore = [
  {
    blockNumber: 1044,
    channelId: 'settlement',
    txCount: 1,
    dataHash: '0x8f3b2791acde84192df04928103cba02819028a1e2f3a4b5c6d7e8f901234567',
    previousHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    committedAt: new Date(Date.now() - 3600000).toISOString(),
    transactions: [
      {
        txId: 'tx-payfabric-01j9x874',
        type: 'ENDORSER_TRANSACTION',
        chaincodeId: 'settlement-cc',
        function: 'SettleTrade',
        creatorMsp: 'BankA1MSP',
        endorsements: ['RegAMSP', 'RegBMSP', 'BankA1MSP', 'BankB1MSP'],
        validationCode: 'VALID',
        readWriteSets: [
          { key: 'TRADE~T-1042', status: 'SETTLED' },
          { key: 'ACCOUNT~BankA1~SGD', delta: '+2500000' },
          { key: 'ACCOUNT~BankB1~INR', delta: '+156250000' },
        ],
        paypalLinkage: {
          orderId: 'PAYID-LR99410294102',
          payoutBatchId: 'BATCH-01J9X874291',
        },
      },
    ],
  },
  {
    blockNumber: 1043,
    channelId: 'settlement',
    txCount: 1,
    dataHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    previousHash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    committedAt: new Date(Date.now() - 5400000).toISOString(),
    transactions: [
      {
        txId: 'tx-payfabric-01j9x661',
        type: 'ENDORSER_TRANSACTION',
        chaincodeId: 'settlement-cc',
        function: 'AcceptTrade',
        creatorMsp: 'BankB1MSP',
        endorsements: ['BankB1MSP', 'RegBMSP'],
        validationCode: 'VALID',
        readWriteSets: [{ key: 'TRADE~T-1042', status: 'ACCEPTED' }],
      },
    ],
  },
  {
    blockNumber: 1042,
    channelId: 'settlement',
    txCount: 1,
    dataHash: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
    previousHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    committedAt: new Date(Date.now() - 7200000).toISOString(),
    transactions: [
      {
        txId: 'tx-payfabric-01j9x510',
        type: 'ENDORSER_TRANSACTION',
        chaincodeId: 'settlement-cc',
        function: 'ProposeTrade',
        creatorMsp: 'BankA1MSP',
        endorsements: ['BankA1MSP', 'RegAMSP'],
        validationCode: 'VALID',
        readWriteSets: [{ key: 'TRADE~T-1042', status: 'PROPOSED' }],
      },
    ],
  },
];

/**
 * Get all Fabric blocks
 */
export function getFabricBlocks() {
  return fabricBlocksStore;
}

/**
 * AI Smart Chaincode Auditor Analysis
 * Inspects blocks and outputs compliance audit report
 */
export async function auditFabricLedger() {
  const totalBlocks = fabricBlocksStore.length;
  const allTxs = fabricBlocksStore.flatMap((b) => b.transactions);
  const totalTxs = allTxs.length;

  let dualEndorsedCount = 0;
  let anomalousTxCount = 0;
  const findings = [];

  allTxs.forEach((tx) => {
    // Check dual-regulator endorsement
    const hasRegA = tx.endorsements?.includes('RegAMSP');
    const hasRegB = tx.endorsements?.includes('RegBMSP');

    if (tx.function === 'SettleTrade') {
      if (hasRegA && hasRegB) {
        dualEndorsedCount++;
        findings.push({
          txId: tx.txId,
          type: 'COMPLIANCE_PASS',
          severity: 'INFO',
          message: `Fixture lists both regulator MSPs; endorsement signatures were not cryptographically verified.`,
        });
      } else {
        anomalousTxCount++;
        findings.push({
          txId: tx.txId,
          type: 'ENDORSEMENT_ANOMALY',
          severity: 'HIGH',
          message: `Tx ${tx.txId} missing dual-regulator endorsement. Potential policy bypass.`,
        });
      }
    }

    // Check PayPal Linkage
    if (tx.paypalLinkage?.orderId) {
      findings.push({
        txId: tx.txId,
        type: 'PAYPAL_ATOMIC_BRIDGE',
        severity: 'INFO',
        message: `Fixture contains PayPal Order ${tx.paypalLinkage.orderId} and payout ${tx.paypalLinkage.payoutBatchId}; no external verification was performed.`,
      });
    }
  });

  const reportId = `AUDIT-REP-${ulid().slice(0, 8)}`;
  const integrityScore = Math.max(0, 100 - anomalousTxCount * 25);

  const executiveSummary =
    `DEMO FIXTURES ONLY: inspected ${totalBlocks} seeded example blocks and ${totalTxs} example transactions. ` +
    `${dualEndorsedCount} settlement fixture(s) list both regulator MSPs. ` +
    `No live Fabric connection, cryptographic endorsement verification, double-spend analysis, ` +
    `MVCC check, or PayPal capture verification was performed.`;

  return {
    reportId,
    dataSource: 'SEEDED_DEMO_FIXTURES',
    auditorMode: 'DETERMINISTIC_FIXTURE_CHECK',
    generatedAt: new Date().toISOString(),
    channelId: 'settlement',
    totalBlocksInspected: totalBlocks,
    totalTransactionsInspected: totalTxs,
    integrityScore,
    status: integrityScore >= 90 ? 'CLEAN_AUDIT' : 'FLAGGED_ANOMALIES',
    executiveSummary,
    findings,
    supervisorySignoff: {
      rbiSupervisor: 'NOT_VERIFIED_DEMO_FIXTURE',
      masSupervisor: 'NOT_VERIFIED_DEMO_FIXTURE',
    },
  };
}
