// CorridorFlow Multi-Agent AI Swarm & Conversational Copilot
// Agents:
// 1. Trade Negotiation Agent (Agentic Commerce)
// 2. Compliance & AML Sentinel Agent (Risk Screening)
// 3. Autonomous Treasury Orchestrator Agent (Liquidity & Payouts)
// 4. CorridorFlow Conversational Copilot (Natural Language Interface)

import { ulid } from 'ulid';
import { CORRIDORS, FX_RATES, getCalculatedFx } from './corridorRules.js';

const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

/**
 * Call Google Gemini 2.5 Flash reasoning engine
 */
async function callGeminiFlash(userPrompt, systemInstruction = '') {
  const apiKey = process.env.GEMINI_API_KEY || GEMINI_KEY;
  const model = process.env.GEMINI_MODEL || GEMINI_MODEL;
  if (!apiKey) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const payload = {
      contents: [{ parts: [{ text: userPrompt }] }],
    };
    if (systemInstruction) {
      payload.systemInstruction = { parts: [{ text: systemInstruction }] };
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    }
  } catch (err) {
    console.warn('[Gemini 2.5 Flash] Call error:', err.message);
  }
  return null;
}

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

  const aiExplanation = await callGeminiFlash(
    JSON.stringify({ currencyFrom, currencyTo, baseFx, indicativeRate: hedgedFx, volumeRulePct: volumeDiscount * 100, amountFrom, amountTo }),
    'Explain this prototype quote in at most 2 sentences. Do not invent current market data or call it a hedge, locked rate, or firm offer. State that the FX benchmark and volume rule are illustrative demo values.'
  );
  const deliberationLog = [
    `[Negotiator] Applied static demo FX benchmark for ${currencyFrom} -> ${currencyTo}: ${baseFx}.`,
    `[Negotiator] Applied illustrative volume heuristic: ${(volumeDiscount * 100).toFixed(2)}% for ${amountFrom} source minor units.`,
    `[Negotiator] Calculated an indicative demo rate of ${hedgedFx} ${currencyTo} per ${currencyFrom}; this is not a market quote or hedge.`,
    `[Negotiator] Calculated indicative target amount: ${amountTo} minor units (${currencyTo}).`,
    `[Negotiator] Created demo proposal ${proposalId}; it has not been committed to Fabric.`,
    ...(aiExplanation ? [`[Gemini] ${aiExplanation}`] : ['[Gemini] Not configured; deterministic demo quote only.']),
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
    confidenceScore: null,
    quoteSource: 'Static demo benchmark and illustrative volume heuristic',
    aiExplanation,
    reasoningSource: aiExplanation ? 'Gemini explanation of demo quote' : 'Deterministic demo pricing; Gemini unavailable',
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
    refusalReason = `Counterparty ${counterpartyOrg} matches the built-in demo blocklist`;
    riskScore = 99;
    checks.push({ check: 'DEMO_BLOCKLIST_MATCH', passed: false, detail: refusalReason });
  } else {
    checks.push({ check: 'DEMO_BLOCKLIST_MATCH', passed: true, detail: 'No match in the small built-in sample blocklist; no official sanctions lists were queried.' });
  }

  // 4. PayPal Velocity & High Value Threshold
  if (BigInt(amountA || 0) > 200000000n) {
    riskScore += 18;
    checks.push({ check: 'DEMO_AMOUNT_TIER', passed: true, detail: 'Large demo amount; production use would require a separately enforced approval policy.' });
  } else {
    checks.push({ check: 'DEMO_AMOUNT_TIER', passed: true, detail: 'Below the illustrative high-amount threshold; not an official compliance check.' });
  }

  const deterministicSummary = {
    tradeId,
    verdict: isRefused ? 'REFUSED' : 'APPROVED',
    riskScore,
    refusalReason,
    checks,
  };
  const aiExplanation = await callGeminiFlash(
    JSON.stringify(deterministicSummary),
    'Explain this prototype risk result in 2 short sentences. Only describe the supplied deterministic checks. Do not claim live sanctions, OFAC, FATF, identity, or regulatory screening. State that the sample blocklist is not an official sanctions source.'
  );

  const deliberationLog = [
    `[Sentinel] Ran illustrative corridor and sample-blocklist checks for ${tradeId || 'NEW_TRADE'}.`,
    `[Sentinel] Loaded sample corridor rules for ${jurA} (${rulesA?.country}) and ${jurB} (${rulesB?.country}).`,
    ...checks.map(c => `[Sentinel] Check [${c.check}]: ${c.passed ? 'PASSED' : 'REFUSED'} - ${c.detail}`),
    `[Sentinel] Computed composite financial risk score: ${riskScore}/100 (${riskScore > 50 ? 'HIGH' : riskScore > 25 ? 'MEDIUM' : 'LOW'}).`,
    `[Sentinel] Demo rule result: ${isRefused ? 'REFUSED' : 'APPROVED'}; this is not regulatory clearance.`,
    ...(aiExplanation ? [`[Gemini] ${aiExplanation}`] : ['[Gemini] Not configured; explanation omitted.']),
  ];

  return {
    tradeId,
    verdict: isRefused ? 'REFUSED' : 'APPROVED',
    riskScore,
    riskTier: riskScore > 50 ? 'HIGH' : riskScore > 25 ? 'MEDIUM' : 'LOW',
    refusalReason,
    checks,
    aiExplanation,
    reasoningSource: aiExplanation ? 'Gemini explanation of demo checks' : 'Deterministic demo checks; Gemini unavailable',
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
      reason: `Demo pending INR amounts (${totalCommittedINR}) are high relative to seeded INR balance.`,
      suggestedPayout: 'Illustrative suggestion only; no PayPal payout is queued automatically.',
      priority: 'HIGH',
    });
  }

  if (sgdCoverage < 150) {
    recommendations.push({
      action: 'REBALANCE_SGD_LIQUIDITY',
      reason: `Seeded SGD demo balance (${sgdAvail}) is low relative to pending demo trades.`,
      suggestedPayout: 'Illustrative suggestion only; no transfer is initiated automatically.',
      priority: 'MEDIUM',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      action: 'MAINTAIN_DEMO_BALANCES',
      reason: 'Seeded in-memory demo balances exceed the illustrative 150% threshold.',
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
 * 4. CorridorFlow Conversational Copilot
 * Natural language intent parser for trading, settlement, risk inquiries, and PayPal execution
 */
export async function agentChatCopilot(userPrompt, context = {}) {
  const lower = userPrompt.toLowerCase();

  // 1. If user asks to create / propose trade
  if (lower.includes('propose') || lower.includes('create trade') || lower.includes('buy') || lower.includes('sell')) {
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
      reply: `**Indicative demo quote** (static benchmark & illustrative volume rule — not a market quote or hedge):\n\n` +
        `• **Corridor**: INR -> SGD\n` +
        `• **Indicative FX Rate**: ${negotiation.agreedFx} (illustrative ${negotiation.discountAppliedPct}% volume heuristic)\n` +
        `• **Indicative Amounts**: ₹${(negotiation.amountFrom / 100).toLocaleString()} <-> S$${(negotiation.amountTo / 100).toLocaleString()}\n` +
        `• **Next Step**: Create a proposal in the in-memory demo ledger (no Fabric commit).\n\n` +
        `${negotiation.aiExplanation || 'Gemini explanation is unavailable; values come from deterministic demo rules.'}`,
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
      reply: `**Prototype risk check**:\n\n` +
        `• **Verdict**: ${screenRes.verdict === 'APPROVED' ? '✅ APPROVED' : '❌ REFUSED'}\n` +
        `• **Risk Score**: ${screenRes.riskScore}/100 (${screenRes.riskTier})\n` +
        `• **Blocklist**: ${screenRes.checks.find((c) => c.check === 'DEMO_BLOCKLIST_MATCH')?.detail || 'Sample blocklist only'}\n` +
        `• **Scope**: Demo corridor rules; no official sanctions or regulator systems were queried.\n\n` +
        `${screenRes.aiExplanation || 'Gemini explanation is unavailable; this result comes from deterministic demo checks.'}`,
      actionType: 'COMPLIANCE_SCREENED',
      data: screenRes,
    };
  }

  // 3. If user asks to settle or execute PayPal payment
  if (lower.includes('settle') || lower.includes('paypal') || lower.includes('payout') || lower.includes('execute')) {
    return {
      reply: `**PayPal prototype flow**:\n\n` +
        `• PayPal Orders v2 uses Sandbox credentials when configured; otherwise the app labels the action as simulation.\n` +
          `• A successful capture records PayPal funding only; Fabric settlement requires a separate explicit confirmation and four distinct test-ledger value-leg commits.\n` +
        `• PayPal and Fabric operations are sequential and non-atomic. This is a prototype, not a real-money payment service.`,
      actionType: 'PAYPAL_INFO',
    };
  }

  // Live Gemini 2.5 Flash AI reasoning
  if (process.env.GEMINI_API_KEY || GEMINI_KEY) {
    const systemPrompt = `You are CorridorFlow, an assistant for a hackathon prototype. The app uses an in-memory workflow ledger and may have a live Fabric Gateway for explicitly confirmed test-ledger operations. A PayPal Sandbox capture does not itself settle Fabric; Fabric settlement and four value-leg writes are separate commits, never atomic with PayPal. PayPal may be Sandbox or simulated. Do not claim central-bank approval, official sanctions screening, live FX quotes, or completed transfers unless the supplied context explicitly proves it. Answer concisely, under 4 sentences.`;
    const geminiReply = await callGeminiFlash(userPrompt, systemPrompt);
    if (geminiReply) {
      return {
        reply: geminiReply,
        actionType: 'GEMINI_REASONING',
        poweredBy: 'Google Gemini 2.5 Flash',
      };
    }
  }

  // General assistant response fallback
  return {
    reply: `Hello! I am your **CorridorFlow Copilot** for an in-memory hackathon prototype.\n\n` +
      `Here is what you can ask me to do:\n` +
      `• *"Negotiate a 50,000 SGD trade with Bank B1 with hedge discount"*\n` +
      `• *"Run sample risk checks for trade T-1048"*\n` +
      `• *"Orchestrate treasury float and calculate PayPal payout requirements"*\n` +
      `• *"Source electronics inventory from Singapore via Channel3 catalog"*`,
    actionType: 'HELP',
  };
}
