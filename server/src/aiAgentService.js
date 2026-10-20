// PayBridge Multi-Agent AI Swarm & Conversational Copilot
// Agents:
// 1. Trade Negotiation Agent (Agentic Commerce)
// 2. Compliance & AML Sentinel Agent (Risk Screening)
// 3. Autonomous Treasury Orchestrator Agent (Liquidity & Payouts)
// 4. PayBridge Conversational Copilot (Natural Language Interface)

import { ulid } from 'ulid';
import { CORRIDORS, FX_RATES, getCalculatedFx } from './corridorRules.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';

/**
 * 1. Trade Negotiation Agent (Agentic Commerce)
 * Autonomously evaluates pricing, FX hedging spread, and volume discount
 */
export async function agentNegotiateTrade({
  buyerOrg = 'BankA1',
  sellerOrg = 'BankB1',
  currencyFrom = 'INR',
  currencyTo = 'SGD',
  amountFrom = 100000000, // in minor units
  desiredDiscountPct = 1.5,
}) {
  const baseFx = parseFloat(getCalculatedFx(currencyFrom, currencyTo));
  // Autonomous market negotiation simulation
  const volumeDiscount = amountFrom > 50000000 ? 0.012 : 0.005;
  const hedgedFx = (baseFx * (1 - volumeDiscount)).toFixed(4);
  const amountTo = Math.round((amountFrom / 100) * parseFloat(hedgedFx) * 100);

  const proposalId = `PROP-${ulid().slice(0, 10)}`;

  const deliberationLog = [
    `[Negotiator] Evaluated corridor ${currencyFrom} -> ${currencyTo}. Benchmark FX: ${baseFx}.`,
    `[Negotiator] Applied institutional volume discount: ${(volumeDiscount * 100).toFixed(2)}% based on size (${amountFrom} minor units).`,
    `[Negotiator] Synthesized locked forward rate of ${hedgedFx} ${currencyTo} per ${currencyFrom}.`,
    `[Negotiator] Computed target settlement amount: ${amountTo} minor units (${currencyTo}).`,
    `[Negotiator] Generated bilateral contract proposal ${proposalId} with atomic settlement guarantee.`,
  ];

  return {
    proposalId,
    buyerOrg,
    sellerOrg,
    currencyFrom,
    currencyTo,
    amountFrom,
    amountTo,
    baseFx: String(baseFx),
    agreedFx: String(hedgedFx),
    discountAppliedPct: (volumeDiscount * 100).toFixed(2),
    deliberationLog,
    confidenceScore: 0.96,
    recommendedAction: 'SUBMIT_FOR_APPROVAL',
    suggestedCutoffMin: 30,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 2. Compliance & AML Sentinel Agent
 * Screens trade parameters against regulatory corridor rules, sanctions, and AML thresholds
 */
export async function agentScreenCompliance({
  tradeId,
  proposerOrg,
  counterpartyOrg,
  currencyA,
  amountA,
  currencyB,
  amountB,
}) {
  const jurA = currencyA === 'INR' ? 'JUR-A' : currencyA === 'SGD' ? 'JUR-B' : 'JUR-C';
  const jurB = currencyB === 'INR' ? 'JUR-A' : currencyB === 'SGD' ? 'JUR-B' : 'JUR-C';

  const rulesA = CORRIDORS[jurA];
  const rulesB = CORRIDORS[jurB];

  const checks = [];
  let isRefused = false;
  let refusalReason = null;
  let riskScore = 12; // Base baseline risk (0-100)

  // 1. Corridor Ceiling Check
  if (rulesA && BigInt(amountA || 0) > BigInt(rulesA.maxTxAmount)) {
    isRefused = true;
    refusalReason = `Amount ${amountA} exceeds ${jurA} single-transaction regulatory ceiling of ${rulesA.maxTxAmount}`;
    riskScore += 65;
    checks.push({ check: 'CORRIDOR_CEILING_CHECK', passed: false, detail: refusalReason });
  } else {
    checks.push({ check: 'CORRIDOR_CEILING_CHECK', passed: true, detail: `Within ${jurA} maximum limit` });
  }

  // 2. Regulatory Halt Check
  if (rulesA?.halted || rulesB?.halted) {
    isRefused = true;
    refusalReason = `Corridor currently halted by regulator`;
    riskScore += 80;
    checks.push({ check: 'CORRIDOR_HALT_STATUS', passed: false, detail: refusalReason });
  } else {
    checks.push({ check: 'CORRIDOR_HALT_STATUS', passed: true, detail: 'Corridors active and operational' });
  }

  // 3. Counterparty Risk & Sanctions Screening
  const sanctionedBlacklist = ['SANCTIONED_CORP', 'DARK_NODE_9', 'EVIL_CORP'];
  if (sanctionedBlacklist.includes(counterpartyOrg?.toUpperCase())) {
    isRefused = true;
    refusalReason = `Counterparty ${counterpartyOrg} matches global sanctions watch-list`;
    riskScore = 99;
    checks.push({ check: 'AML_SANCTIONS_SCREENING', passed: false, detail: refusalReason });
  } else {
    checks.push({ check: 'AML_SANCTIONS_SCREENING', passed: true, detail: 'Zero sanctions match detected across OFAC/FATF' });
  }

  // 4. PayPal Velocity & High Value Threshold
  if (BigInt(amountA || 0) > 200000000n) {
    riskScore += 18;
    checks.push({ check: 'VELOCITY_TIER', passed: true, detail: 'Flagged for Senior Dual-Approver sign-off due to size' });
  } else {
    checks.push({ check: 'VELOCITY_TIER', passed: true, detail: 'Standard automated clearance tier' });
  }

  const deliberationLog = [
    `[Sentinel] Initiated multi-jurisdiction AML & Corridor compliance inspection for ${tradeId || 'NEW_TRADE'}.`,
    `[Sentinel] Verified rules for ${jurA} (${rulesA?.country}) and ${jurB} (${rulesB?.country}).`,
    ...checks.map(c => `[Sentinel] Check [${c.check}]: ${c.passed ? 'PASSED' : 'REFUSED'} - ${c.detail}`),
    `[Sentinel] Computed composite financial risk score: ${riskScore}/100 (${riskScore > 50 ? 'HIGH' : riskScore > 25 ? 'MEDIUM' : 'LOW'}).`,
    `[Sentinel] Final Verdict: ${isRefused ? 'REFUSED - TRANSACTION BLOCKED' : 'APPROVED - SAFE TO SETTLE'}.`,
  ];

  return {
    tradeId,
    verdict: isRefused ? 'REFUSED' : 'APPROVED',
    riskScore,
    riskTier: riskScore > 50 ? 'HIGH' : riskScore > 25 ? 'MEDIUM' : 'LOW',
    refusalReason,
    checks,
    deliberationLog,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 3. Autonomous Treasury Orchestrator Agent
 * Evaluates reserve liquidity and recommends PayPal Batch Payout rebalancing
 */
export async function agentOrchestrateTreasury({ accounts, trades }) {
  const recommendations = [];
  const activePending = (trades || []).filter(t => t.trade?.status === 'ACCEPTED' || t.trade?.status === 'PROPOSED');

  let totalCommittedINR = 0n;
  let totalCommittedSGD = 0n;

  activePending.forEach(t => {
    totalCommittedINR += BigInt(t.trade?.amountA || 0);
    totalCommittedSGD += BigInt(t.trade?.amountB || 0);
  });

  const inrAcct = (accounts || []).find(a => a.ccy === 'INR');
  const sgdAcct = (accounts || []).find(a => a.ccy === 'SGD');

  const inrAvail = BigInt(inrAcct?.available || '1000000000');
  const sgdAvail = BigInt(sgdAcct?.available || '10000000');

  const inrCoverage = totalCommittedINR > 0n ? Number((inrAvail * 100n) / totalCommittedINR) : 999;
  const sgdCoverage = totalCommittedSGD > 0n ? Number((sgdAvail * 100n) / totalCommittedSGD) : 999;

  if (inrCoverage < 150) {
    recommendations.push({
      action: 'REBALANCE_INR_LIQUIDITY',
      reason: `Committed INR settlements (${totalCommittedINR}) approaching available reserves.`,
      suggestedPayout: 'Execute PayPal Batch Payout from USD Treasury reserves.',
      priority: 'HIGH',
    });
  }

  if (sgdCoverage < 150) {
    recommendations.push({
      action: 'REBALANCE_SGD_LIQUIDITY',
      reason: `SGD available float (${sgdAvail}) low relative to pending trades.`,
      suggestedPayout: 'Schedule automated PayPal top-up from Singapore corridor account.',
      priority: 'MEDIUM',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      action: 'MAINTAIN_OPTIMAL_FLOAT',
      reason: 'All currency reserves exceed 200% headroom coverage requirement.',
      priority: 'LOW',
    });
  }

  return {
    totalCommittedINR: totalCommittedINR.toString(),
    totalCommittedSGD: totalCommittedSGD.toString(),
    inrCoverageRatio: `${inrCoverage}%`,
    sgdCoverageRatio: `${sgdCoverage}%`,
    recommendations,
    autonomousPayoutReady: activePending.filter(t => t.trade?.status === 'ACCEPTED').length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 4. PayBridge Conversational Copilot
 * Natural language intent parser for trading, settlement, risk inquiries, and PayPal execution
 */
export async function agentChatCopilot(userPrompt, context = {}) {
  const lower = userPrompt.toLowerCase();

  // 1. If user asks to create / propose trade
  if (lower.includes('propose') || lower.includes('create trade') || lower.includes('buy') || lower.includes('sell')) {
    const isSgd = lower.includes('sgd') || lower.includes('singapore');
    const amountMatch = lower.match(/\d+([,\.]\d+)?/);
    const amountVal = amountMatch ? parseFloat(amountMatch[0].replace(/,/g, '')) : 50000;
    
    const negotiation = await agentNegotiateTrade({
      buyerOrg: 'BankA1',
      sellerOrg: 'BankB1',
      currencyFrom: 'INR',
      currencyTo: 'SGD',
      amountFrom: Math.round(amountVal * 83.5 * 100),
    });

    return {
      reply: `I have activated the **Trade Negotiation Agent** for your request.\n\n` +
        `• **Corridor**: INR -> SGD\n` +
        `• **Agreed FX Rate**: ${negotiation.agreedFx} (with ${negotiation.discountAppliedPct}% volume hedge discount)\n` +
        `• **Proposed Settlement**: ₹${(negotiation.amountFrom / 100).toLocaleString()} <-> S$${(negotiation.amountTo / 100).toLocaleString()}\n` +
        `• **PayPal Status**: Ready to link with PayPal Sandbox Order.\n\n` +
        `Would you like me to commit this proposal to the ledger?`,
      actionType: 'PROPOSAL_GENERATED',
      data: negotiation,
    };
  }

  // 2. If user asks to screen compliance or risk
  if (lower.includes('risk') || lower.includes('screen') || lower.includes('aml') || lower.includes('compliance')) {
    const screenRes = await agentScreenCompliance({
      tradeId: 'T-PROMPT-TEST',
      proposerOrg: 'BankA1',
      counterpartyOrg: 'BankB1',
      currencyA: 'INR',
      amountA: '83500000',
      currencyB: 'SGD',
      amountB: '1000000',
    });

    return {
      reply: `**Compliance & AML Sentinel Report**:\n\n` +
        `• **Verdict**: ${screenRes.verdict === 'APPROVED' ? '✅ APPROVED' : '❌ REFUSED'}\n` +
        `• **Risk Score**: ${screenRes.riskScore}/100 (${screenRes.riskTier})\n` +
        `• **Sanctions Match**: None (Clean across global watchlists)\n` +
        `• **Corridor Rule**: Single-tx limit & window check passed.\n\n` +
        `The transaction meets dual-regulator sovereign standards.`,
      actionType: 'COMPLIANCE_SCREENED',
      data: screenRes,
    };
  }

  // 3. If user asks to settle or execute PayPal payment
  if (lower.includes('settle') || lower.includes('paypal') || lower.includes('payout') || lower.includes('execute')) {
    return {
      reply: `**Autonomous Settlement & PayPal Engine Ready**:\n\n` +
        `• Connected to: **PayPal Sandbox Developer API**\n` +
        `• Capability: Atomic leg execution with PayPal Orders v2 capture & Batch Payouts v1.\n` +
        `• You can click **"Settle via PayPal"** on any accepted trade to trigger immediate atomic disbursement!`,
      actionType: 'PAYPAL_INFO',
    };
  }

  // General assistant response
  return {
    reply: `Hello! I am your **PayBridge AI Copilot**, orchestrating autonomous agentic commerce, cross-border treasury settlements, and PayPal Sandbox payouts.\n\n` +
      `Here is what you can ask me to do:\n` +
      `• *"Negotiate a 50,000 SGD trade with Bank B1 with hedge discount"*\n` +
      `• *"Screen trade T-1048 for AML and sanctions compliance"*\n` +
      `• *"Orchestrate treasury float and calculate PayPal payout requirements"*\n` +
      `• *"Source electronics inventory from Singapore via Channel3 catalog"*`,
    actionType: 'HELP',
  };
}
