// PayBridge AI Backend Server
// Autonomous Agentic Commerce & Cross-Border Treasury Protocol
// Integrates PayPal Sandbox, Multi-Agent AI Swarm, AG Grid APIs, Elastic, Channel3, and Zapier

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const serverSourceDir = path.dirname(fileURLToPath(import.meta.url));
// Load root .env as the canonical local config, independent of the launch cwd.
dotenv.config({ path: path.resolve(serverSourceDir, '../../.env') });
dotenv.config({ path: path.resolve(serverSourceDir, '../.env') });
import express from 'express';
import cors from 'cors';
import net from 'node:net';
import { createHash, timingSafeEqual } from 'node:crypto';

const {
  accountsStore,
  tradesStore,
  refusalsStore,
  reservesStore,
  paypalLedgerStore,
  proposeTrade,
  acceptTrade,
  recordPayPalCapture,
  recordFabricSettlement,
  recordFabricLegAction,
  recordRefusal,
  linkPayPalOrder,
} = await import('./ledgerStore.js');

const {
  createPayPalOrder,
  capturePayPalOrder,
  executePayPalPayout,
  getPayPalFundingQuote,
  getPayPalMode,
} = await import('./paypalService.js');

const {
  agentNegotiateTrade,
  agentScreenCompliance,
  agentOrchestrateTreasury,
  agentChatCopilot,
} = await import('./aiAgentService.js');

const { searchChannel3Catalog, generateProcurementQuote } = await import('./channel3Service.js');
const { queryElasticSearch, getElasticClusterStats, indexTradeEvent, indexComplianceLog, indexPayPalTransaction } = await import('./elasticService.js');
const { triggerZapierWebhook, getZapierDispatchedHistory, getZapierStatus } = await import('./zapierService.js');
const {
  getKernelHealth,
  createKernelBrowserSession,
  auditMerchantStorefrontDOM,
  verifyCarrierDisputeEvidence,
} = await import('./kernelService.js');
const { CORRIDORS, FX_RATES, getCalculatedFx } = await import('./corridorRules.js');
const { getFabricBlocks, auditFabricLedger } = await import('./aiChaincodeAuditor.js');
const {
  getFabricGatewayStatus,
  getFabricLedgerSnapshot,
  proposeFabricTrade,
  acceptFabricTrade,
  settleFabricTrade,
  performFabricLegAction,
  getFabricWriteStatus,
} = await import('./fabricGatewayService.js');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  if (req.path !== '/health') {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Operator / Identity extraction
app.use((req, res, next) => {
  req.operator = req.get('X-Operator') || 'a1-trader';
  next();
});

// --- CORE SYSTEM ROUTES ---

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'PayBridge AI Prototype',
    version: '1.0.0-hackathon',
    paypalMode: getPayPalMode(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    ledgerMode: 'in_memory_workflow_with_optional_fabric_test_ledger',
    fabricGatewayConfigured: ['1', 'true', 'yes', 'on'].includes(String(process.env.FABRIC_GATEWAY_ENABLED || '').toLowerCase()),
    prototypeNotice: 'Hackathon prototype; demo operator headers are not authentication.',
    timestamp: new Date().toISOString(),
  });
});

app.get('/me', (req, res) => {
  const op = req.operator;
  let org = 'banka1';
  let msp = 'BankA1MSP';
  let orgType = 'bank';
  let jurisdiction = 'JUR-A';

  if (op.includes('regA') || op.includes('rega')) {
    org = 'rega';
    msp = 'RegAMSP';
    orgType = 'regulator';
    jurisdiction = 'JUR-A';
  } else if (op.includes('regB') || op.includes('regb')) {
    org = 'regb';
    msp = 'RegBMSP';
    orgType = 'regulator';
    jurisdiction = 'JUR-B';
  } else if (op.includes('b1')) {
    org = 'bankb1';
    msp = 'BankB1MSP';
    orgType = 'bank';
    jurisdiction = 'JUR-B';
  } else if (op.includes('aud')) {
    org = 'auditor';
    msp = 'AuditorMSP';
    orgType = 'auditor';
    jurisdiction = null;
  }

  res.json({
    org,
    msp,
    operator: op,
    orgType,
    jurisdiction,
    identities: ['a1-trader', 'a1-approver', 'b1-trader', 'b1-approver', 'rega-operator', 'regb-operator', 'aud-reader'],
    ready: true,
  });
});

// --- ACCOUNTS & LEDGER ---

app.get('/accounts', (req, res) => {
  const op = req.operator;
  const isA = op.includes('a1');
  const isB = op.includes('b1');
  const isAuditor = op.includes('aud') || op.includes('reg');

  if (isAuditor) {
    return res.json(accountsStore);
  }
  const bankFilter = isB ? 'BankB1' : 'BankA1';
  res.json(accountsStore.filter((a) => a.bank === bankFilter));
});

// --- TRADES LIFECYCLE ---

app.get('/trades', (req, res) => {
  res.json(tradesStore);
});

app.get('/trades/:id', (req, res) => {
  const item = tradesStore.find((t) => t.trade.tradeId === req.params.id);
  if (!item) return res.status(404).json({ error: 'Trade not found' });
  res.json(item);
});

app.post('/trades', async (req, res) => {
  try {
    const body = req.body || {};
    const riskAssessment = await agentScreenCompliance({
      proposerOrg: body.proposerMsp === 'BankB1MSP' ? 'BankB1' : 'BankA1',
      counterpartyOrg: body.counterpartyMsp === 'BankA1MSP' ? 'BankA1' : 'BankB1',
      currencyA: body.ccyA,
      amountA: String(body.amountA || 0),
      currencyB: body.ccyB,
      amountB: String(body.amountB || 0),
    });
    indexComplianceLog({ type: 'PRE_TRADE_RISK_SCREEN', ...riskAssessment });
    if (riskAssessment.verdict !== 'APPROVED') {
      recordRefusal(null, body.ccyA === 'INR' ? 'JUR-A' : 'JUR-B', 'PRE_TRADE_RISK_REFUSED', body.proposerMsp || 'BankA1MSP');
      return res.status(422).json({ error: 'Trade did not pass the prototype pre-trade risk rules.', riskAssessment });
    }
    const trade = proposeTrade(body);
    trade.trade.riskAssessment = riskAssessment;
    if (body.channel3Quote) trade.trade.channel3Quote = body.channel3Quote;
    indexTradeEvent(trade.trade);
    res.status(201).json(trade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/trades/:id/accept', (req, res) => {
  try {
    const trade = acceptTrade(req.params.id);
    res.json(trade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/trades/:id/settle', async (req, res) => {
  res.status(409).json({
    error: 'Settlement requires capturing the linked PayPal order via POST /api/paypal/orders/:id/capture',
  });
});

// --- REGULATORY & RESERVES ---

app.get('/refusals', (req, res) => {
  res.json(refusalsStore);
});

app.get('/rules/:jur', (req, res) => {
  const jur = req.params.jur.toUpperCase();
  const rules = CORRIDORS[jur] || CORRIDORS['JUR-A'];
  res.json(rules);
});

app.get('/reserve/:ccy', (req, res) => {
  const ccy = req.params.ccy.toUpperCase();
  res.json(reservesStore[ccy] || { ccy, rtgsBalance: '0', statementRef: 'NONE', attestedAt: new Date().toISOString() });
});

app.get('/supply/:ccy', (req, res) => {
  const ccy = req.params.ccy.toUpperCase();
  res.json({ ccy, total: '5000000000' });
});

// --- PAYPAL DEVELOPER PLATFORM ENDPOINTS ---

app.post('/api/paypal/orders/create', async (req, res) => {
  try {
    const { tradeId, description, counterparty } = req.body;
    const trade = tradesStore.find((item) => item.trade.tradeId === tradeId);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.trade.status !== 'ACCEPTED') {
      return res.status(409).json({ error: 'Trade must be accepted before creating a payment order' });
    }
    const fundingQuote = getPayPalFundingQuote({
      amountMinor: trade.trade.amountA,
      currency: trade.trade.ccyA,
    });
    if (trade.trade.paypalOrderId) {
      if (trade.trade.paypalFundingQuote?.paymentAmountMinor !== fundingQuote.paymentAmountMinor) {
        return res.status(409).json({ error: 'A different funding quote is already linked to this trade' });
      }
      return res.json({
        orderId: trade.trade.paypalOrderId,
        status: trade.trade.paypalStatus || 'CREATED',
        tradeId,
        amount: fundingQuote.paymentAmountMinor,
        currency: fundingQuote.paymentCurrency,
        fundingQuote,
        providerMode: trade.trade.paypalMode || getPayPalMode(),
        isSimulation: (trade.trade.paypalMode || getPayPalMode()) === 'SIMULATION',
      });
    }
    const order = await createPayPalOrder({
      tradeId,
      amountMinor: fundingQuote.paymentAmountMinor,
      currency: fundingQuote.paymentCurrency,
      description,
      counterparty,
      fundingQuote,
    });
    trade.trade.paypalFundingQuote = fundingQuote;
    trade.trade.paypalMode = order.providerMode === 'simulation' ? 'SIMULATION' : 'PAYPAL_SANDBOX';
    linkPayPalOrder(tradeId, order.orderId, 'CREATED');
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/paypal/orders/quote/:tradeId', (req, res) => {
  const trade = tradesStore.find((item) => item.trade.tradeId === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  if (trade.trade.status !== 'ACCEPTED') {
    return res.status(409).json({ error: 'Trade must be accepted before quoting PayPal funding' });
  }
  try {
    res.json(getPayPalFundingQuote({ amountMinor: trade.trade.amountA, currency: trade.trade.ccyA }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/paypal/orders/:id/capture', async (req, res) => {
  try {
    const { tradeId } = req.body;
    const trade = tradesStore.find((item) => item.trade.tradeId === tradeId);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (!trade.trade.paypalOrderId || trade.trade.paypalOrderId !== req.params.id) {
      return res.status(409).json({ error: 'Order is not linked to this trade' });
    }
    if (trade.trade.status === 'SETTLED' && trade.trade.paypalCaptureId) {
      const fundingAmountMinor = trade.trade.paypalFundingQuote.paymentAmountMinor;
      const isSimulation = trade.trade.paypalMode === 'SIMULATION';
      return res.json({
        captureId: trade.trade.paypalCaptureId,
        orderId: req.params.id,
        status: 'COMPLETED',
        tradeId,
        amount: { currency_code: 'USD', value: (Number(fundingAmountMinor) / 100).toFixed(2) },
        fundingAmountMinor,
        isSimulation,
        providerMode: isSimulation ? 'simulation' : 'sandbox',
        fundingQuote: trade.trade.paypalFundingQuote,
        payoutStatus: trade.trade.payoutStatus || null,
        payoutMode: trade.trade.payoutMode || null,
        payoutBatchId: trade.trade.payoutBatchId || null,
        payoutError: trade.trade.payoutError || null,
        receiptHash: trade.trade.receiptHash || null,
      });
    }
    if (trade.trade.paypalCaptureId && trade.trade.paypalCaptureDetails) {
      return res.json({
        ...trade.trade.paypalCaptureDetails,
        orderId: trade.trade.paypalOrderId,
        tradeId,
        status: 'COMPLETED',
        fundingAmountMinor: trade.trade.paypalCaptureDetails.fundingAmountMinor,
        isSimulation: trade.trade.paypalMode === 'SIMULATION',
        providerMode: trade.trade.paypalMode === 'SIMULATION' ? 'simulation' : 'sandbox',
        settlementStatus: trade.settle.status,
        fundingQuote: trade.trade.paypalFundingQuote,
        receiptHash: trade.trade.receiptHash || null,
      });
    }
    if (trade.trade.status !== 'ACCEPTED') {
      return res.status(409).json({ error: 'Trade must be accepted before capture' });
    }
    const expectedAmount = trade.trade.paypalFundingQuote?.paymentAmountMinor;
    if (!expectedAmount) return res.status(409).json({ error: 'Create a PayPal order before capturing it' });
    const capture = await capturePayPalOrder(req.params.id, tradeId, expectedAmount);
    if (capture.status !== 'COMPLETED') {
      return res.status(409).json({ error: `PayPal capture is ${capture.status}, not COMPLETED` });
    }
    if (capture.fundingAmountMinor !== String(expectedAmount)) {
      return res.status(409).json({ error: 'Captured PayPal amount did not match the approved USD funding quote' });
    }
    const captured = recordPayPalCapture(tradeId, capture);
    res.json({
      ...capture,
      fundingQuote: trade.trade.paypalFundingQuote,
      settlementStatus: captured.settle.status,
      payoutStatus: captured.trade.payoutStatus || null,
      payoutMode: captured.trade.payoutMode || null,
      payoutBatchId: captured.trade.payoutBatchId || null,
      payoutError: captured.trade.payoutError || null,
      receiptHash: captured.trade.receiptHash || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paypal/payouts/batch', async (req, res) => {
  try {
    const trade = tradesStore.find((item) => item.trade.tradeId === req.body.tradeId);
    if (!trade) return res.status(404).json({ error: 'Trade not found' });
    if (trade.trade.status !== 'SETTLED') {
      return res.status(409).json({ error: 'A payout is allowed only for a settled trade' });
    }
    if (!trade.trade.paypalCaptureId || !String(trade.trade.paypalStatus || '').startsWith('CAPTURED_')) {
      return res.status(409).json({ error: 'A verified PayPal capture is required before payout' });
    }
    if (!['USD', 'SGD'].includes(trade.trade.ccyB)) {
      return res.status(422).json({ error: `PayPal Sandbox payout is not configured for ${trade.trade.ccyB}; no currency conversion was attempted.` });
    }
    if (trade.trade.payoutStatus && trade.trade.payoutStatus !== 'FAILED') {
      return res.status(409).json({ error: 'A payout has already been initiated for this trade' });
    }
    trade.trade.payoutStatus = 'PENDING';
    let payout;
    try {
      payout = await executePayPalPayout({
        tradeId: trade.trade.tradeId,
        recipientEmail: 'vendor-payout-sandbox@paybridge.ai',
        amount: trade.trade.amountB,
        currency: trade.trade.ccyB === 'SGD' ? 'SGD' : 'USD',
        note: `Retry payout for settled trade ${trade.trade.tradeId}`,
      });
    } catch (err) {
      trade.trade.payoutStatus = 'FAILED';
      trade.trade.payoutMode = 'sandbox';
      throw err;
    }
    trade.trade.payoutBatchId = payout.payoutBatchId;
    trade.trade.payoutStatus = payout.status;
    trade.trade.payoutMode = payout.providerMode || (payout.isSimulation ? 'simulation' : 'sandbox');
    const payoutLedgerEntry = {
      transactionId: `TX-PAYPAL-${payout.payoutBatchId}`,
      tradeId: trade.trade.tradeId,
      type: payout.isSimulation ? 'BATCH_PAYOUT_SIMULATED' : 'BATCH_PAYOUT_SANDBOX',
      payoutBatchId: payout.payoutBatchId,
      paypalMode: trade.trade.payoutMode,
      isSimulation: Boolean(payout.isSimulation),
      grossAmount: `${trade.trade.ccyB} ${(Number(trade.trade.amountB) / 100).toFixed(2)}`,
      netAmount: `${trade.trade.ccyB} ${(Number(trade.trade.amountB) / 100).toFixed(2)}`,
      sender: 'PayBridge Sandbox Demo',
      recipient: payout.recipientEmail,
      status: payout.status,
      timestamp: new Date().toISOString(),
      corridor: `${trade.trade.ccyA} <-> ${trade.trade.ccyB}`,
    };
    paypalLedgerStore.unshift(payoutLedgerEntry);
    indexPayPalTransaction(payoutLedgerEntry);
    indexTradeEvent(trade.trade);
    triggerZapierWebhook('PAYPAL_PAYOUT_INITIATED', { tradeId: trade.trade.tradeId, payoutBatchId: payout.payoutBatchId, status: payout.status, mode: trade.trade.payoutMode });
    res.json(payout);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/paypal/ledger', (req, res) => {
  res.json(paypalLedgerStore);
});

app.post('/api/paypal/webhook', (req, res) => {
  console.log(`[PayPal Webhook] Received webhook event: ${req.body.event_type || 'TEST_EVENT'}`);
  res.json({ status: 'received' });
});

// --- AI MULTI-AGENT SWARM ENDPOINTS ---

app.post('/api/ai/negotiate', async (req, res) => {
  try {
    const result = await agentNegotiateTrade(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/risk-screen', async (req, res) => {
  try {
    const result = await agentScreenCompliance(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ai/treasury-orchestrate', async (req, res) => {
  try {
    const result = await agentOrchestrateTreasury({ accounts: accountsStore, trades: tradesStore });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/copilot', async (req, res) => {
  try {
    const message = req.body.message || req.body.prompt || '';
    const context = req.body.context || {};
    const reply = await agentChatCopilot(message, context);
    res.json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/copilot/chat', async (req, res) => {
  try {
    const message = req.body.message || req.body.prompt || '';
    const context = req.body.context || {};
    const reply = await agentChatCopilot(message, context);
    res.json(reply);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SPONSOR ENDPOINTS ---
const zapierManualDispatches = [];

// Channel3
app.get('/api/channel3/catalog', async (req, res) => {
  const { q, category } = req.query;
  const catalog = await searchChannel3Catalog(q, category);
  res.json(catalog);
});

app.get('/api/channel3/search', async (req, res) => {
  const { q, category } = req.query;
  const catalog = await searchChannel3Catalog(q, category);
  res.json(catalog);
});

app.post('/api/channel3/quote', (req, res) => {
  try {
    const { sku, quantity, targetCurrency } = req.body;
    const quote = generateProcurementQuote(sku, quantity, targetCurrency);
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Elastic
app.get('/api/elastic/search', async (req, res) => {
  const { index, q } = req.query;
  const results = await queryElasticSearch({ index, query: q });
  res.json(results);
});

app.get('/api/elastic/stats', async (req, res) => {
  const stats = await getElasticClusterStats();
  res.json(stats);
});

// Zapier
app.post('/api/zapier/trigger', async (req, res) => {
  if (req.body?.eventType !== 'MANUAL_TEST_TRIGGER') {
    return res.status(400).json({ error: 'Only the manual test event can be triggered from the public dashboard.' });
  }
  const now = Date.now();
  while (zapierManualDispatches.length && now - zapierManualDispatches[0] > 10 * 60 * 1000) zapierManualDispatches.shift();
  if (zapierManualDispatches.length >= 5) return res.status(429).json({ error: 'Manual Zapier test limit reached; try again later.' });
  zapierManualDispatches.push(now);
  const result = await triggerZapierWebhook('MANUAL_TEST_TRIGGER', {
    protocol: 'PayBridge AI settlement demo',
    triggeredAt: new Date(now).toISOString(),
    action: 'operator_manual_test',
  });
  res.json(result);
});

app.get('/api/zapier/status', (req, res) => {
  res.json(getZapierStatus());
});

app.get('/api/zapier/events', (req, res) => {
  res.json(getZapierDispatchedHistory());
});

app.get('/api/integrations/status', async (req, res) => {
  const fabric = await getFabricGatewayStatus();
  const elasticConfigured = Boolean(process.env.ELASTIC_ENDPOINT || process.env.ELASTIC_URL) && Boolean(process.env.ELASTIC_API_KEY);
  const kernel = await getKernelHealth();
  const zapier = getZapierStatus();
  res.json({
    checkedAt: new Date().toISOString(),
    integrations: {
      paypal: { status: getPayPalMode() === 'sandbox' ? 'configured' : 'simulation', mode: getPayPalMode(), role: 'Sandbox checkout/capture and explicitly requested payout' },
      channel3: { status: process.env.CHANNEL3_API_KEY ? 'configured' : 'curated_fallback', role: 'Product discovery and procurement quotes' },
      gemini: { status: process.env.GEMINI_API_KEY ? 'configured' : 'unconfigured', role: 'Explanation of deterministic prototype risk results' },
      elasticsearch: { status: elasticConfigured ? 'configured' : 'local_fallback', role: 'Search and workflow event indexing' },
      kernel: { status: kernel.liveConnected ? 'connected' : 'simulation', mode: kernel.mode, role: 'Optional browser-session infrastructure; demo audit scenario is not live DOM evidence' },
      zapier: { status: zapier.configured ? 'configured' : 'unconfigured', mode: zapier.mode, role: 'Outbound workflow event webhook; configure ZAPIER_WEBHOOK_URL (MCP server URL is not a Catch webhook)' },
      fabric: { status: fabric.gatewayConnected ? 'connected' : 'unavailable', mode: fabric.mode, writesEnabled: fabric.writesEnabled, writeReady: fabric.writeReady, role: 'Live test-ledger reads and explicitly confirmed test writes' },
    },
    prototypeNotice: 'Configured indicates credentials or gateway readiness; it does not guarantee every provider operation will succeed.',
  });
});

// Optional browser audit integration
app.get('/api/kernel/health', async (req, res) => {
  const health = await getKernelHealth();
  res.json(health);
});

app.post('/api/kernel/browsers/create', async (req, res) => {
  try {
    const session = await createKernelBrowserSession(req.body);
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kernel/audit-checkout', async (req, res) => {
  try {
    const audit = await auditMerchantStorefrontDOM(req.body);
    res.json(audit);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/kernel/verify-tracking', async (req, res) => {
  try {
    const proof = await verifyCarrierDisputeEvidence(req.body);
    res.json(proof);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Local demo receipt; this is not a Fabric or provider attestation.
app.get('/api/receipts/:tradeId', (req, res) => {
  const trade = tradesStore.find((t) => t.trade.tradeId === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  const receiptPayload = trade.trade.receiptPayload || null;
  const computedHash = receiptPayload
    ? `0x${createHash('sha256').update(JSON.stringify(receiptPayload)).digest('hex')}`
    : null;
  res.json({
    tradeId: req.params.tradeId,
    receiptHash: trade.trade.receiptHash || null,
    receiptType: 'LOCAL_DEMO_SHA256',
    verified: Boolean(receiptPayload && computedHash === trade.trade.receiptHash),
    fabricCommitVerified: false,
    disclaimer: 'Local SHA-256 digest of the in-memory demo payload only. Not a Fabric endorsement, regulator approval, or proof of external payment.',
    receiptPayload,
    settledAt: trade.trade.settledAt,
  });
});

// --- HYPERLEDGER FABRIC 2.5 & AI AUDITOR ROUTES ---

function checkTcpReachability(host, port, timeoutMs = 1500) {
  if (!host) return Promise.resolve(false);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port: Number(port) || 9051 });
    const finish = (reachable) => {
      socket.destroy();
      resolve(reachable);
    };
    socket.setTimeout(timeoutMs, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

app.get('/api/fabric/status', async (req, res) => {
  const status = await getFabricGatewayStatus();
  const peerConfigured = Boolean(process.env.FABRIC_HOST);
  const peerReachable = peerConfigured ? await checkTcpReachability(
    process.env.FABRIC_HOST,
    process.env.FABRIC_PEER_PORT || 9051,
  ) : false;
  res.json({
    ...status,
    peerConfigured,
    peerReachable,
    endpoint: status.endpoint || (peerConfigured ? `${process.env.FABRIC_HOST}:${process.env.FABRIC_PEER_PORT || 9051}` : null),
    organizations: ['RegAMSP (RBI)', 'RegBMSP (MAS)', 'BankA1MSP', 'BankB1MSP', 'AuditorMSP'],
    activeEndorsementPolicy: "AND('RegAMSP.peer', 'RegBMSP.peer')",
    consensus: 'Raft (configured network; topology claims require live verification)',
    sampleTopology: !status.gatewayConnected,
    dualEngineReady: false,
  });
});

app.get('/api/fabric/ledger', async (req, res) => {
  try {
    const status = await getFabricGatewayStatus();
    if (!status.gatewayConnected) {
      return res.status(503).json({ error: status.connectionNote, status });
    }
    res.json(await getFabricLedgerSnapshot(req.operator));
  } catch (err) {
    res.status(503).json({ error: err.message });
  }
});

function authorizeFabricWrite(req, res, next) {
  const expectedToken = process.env.FABRIC_WRITE_API_TOKEN || '';
  const providedToken = req.get('X-Fabric-Write-Token') || '';
  if (expectedToken.length < 32) {
    return res.status(503).json({ error: 'Fabric write authorization is not configured on the backend.' });
  }
  const expectedBytes = Buffer.from(expectedToken);
  const providedBytes = Buffer.from(providedToken);
  if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
    return res.status(401).json({ error: 'Valid X-Fabric-Write-Token is required.' });
  }
  next();
}

app.post('/api/fabric/trades/propose', authorizeFabricWrite, async (req, res) => {
  try {
    const writeStatus = await getFabricWriteStatus();
    if (!writeStatus.writeReady) {
      return res.status(503).json({ error: 'Fabric trade writes are not ready. Configure rotated BankA1 and BankB1 identities and enable writes.' });
    }
    const { sourceTradeId, ...proposalInput } = req.body || {};
    let sourceTrade = null;
    if (sourceTradeId) {
      sourceTrade = tradesStore.find((item) => item.trade.tradeId === sourceTradeId);
      if (!sourceTrade) return res.status(404).json({ error: 'Linked demo trade not found' });
      if (sourceTrade.trade.status !== 'ACCEPTED') return res.status(409).json({ error: 'Linked demo trade must be accepted before creating its Fabric proposal' });
      if (sourceTrade.trade.fabricTradeId) return res.status(409).json({ error: 'A Fabric trade is already linked to this demo trade' });
      if (proposalInput.proposerMsp !== sourceTrade.trade.proposerMsp || proposalInput.ccyA !== sourceTrade.trade.ccyA || proposalInput.ccyB !== sourceTrade.trade.ccyB || String(proposalInput.amountA) !== String(sourceTrade.trade.amountA) || String(proposalInput.amountB) !== String(sourceTrade.trade.amountB)) {
        return res.status(409).json({ error: 'Fabric proposal terms must exactly match the accepted demo trade' });
      }
    }
    const outcome = await proposeFabricTrade({ ...proposalInput, reference: proposalInput.reference || sourceTrade?.trade.reference });
    if (sourceTrade) {
      sourceTrade.trade.fabricTradeId = outcome.tradeId;
      sourceTrade.trade.fabricStatus = 'PROPOSED';
      indexTradeEvent(sourceTrade.trade);
      triggerZapierWebhook('FABRIC_PROPOSAL_LINKED', { sourceTradeId, fabricTradeId: outcome.tradeId, transactionId: outcome.transactionId });
    }
    res.status(201).json({ ...outcome, sourceTradeId: sourceTrade?.trade.tradeId || null });
  } catch (err) {
    res.status(400).json({ error: err.message, transactionId: err.transactionId, validationCode: err.validationCode, commitStatusUnknown: err.commitStatusUnknown });
  }
});

app.post('/api/fabric/trades/:tradeId/accept', authorizeFabricWrite, async (req, res) => {
  try {
    const writeStatus = await getFabricWriteStatus();
    if (!writeStatus.writeReady) {
      return res.status(503).json({ error: 'Fabric trade writes are not ready. Configure rotated BankA1 and BankB1 identities and enable writes.' });
    }
    const outcome = await acceptFabricTrade(req.params.tradeId);
    const sourceTrade = tradesStore.find((item) => item.trade.fabricTradeId === req.params.tradeId);
    if (sourceTrade) {
      sourceTrade.trade.fabricStatus = 'ACCEPTED';
      indexTradeEvent(sourceTrade.trade);
      triggerZapierWebhook('FABRIC_TRADE_ACCEPTED', { sourceTradeId: sourceTrade.trade.tradeId, fabricTradeId: req.params.tradeId, transactionId: outcome.transactionId });
    }
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ error: err.message, transactionId: err.transactionId, validationCode: err.validationCode, commitStatusUnknown: err.commitStatusUnknown });
  }
});

app.post('/api/fabric/trades/:tradeId/settle', authorizeFabricWrite, async (req, res) => {
  try {
    const writeStatus = await getFabricWriteStatus();
    if (!writeStatus.writeReady) {
      return res.status(503).json({ error: 'Fabric trade writes are not ready. Configure rotated BankA1 and BankB1 identities and enable writes.' });
    }
    const sourceTrade = tradesStore.find((item) => item.trade.fabricTradeId === req.params.tradeId);
    if (sourceTrade && (!sourceTrade.trade.paypalCaptureId || !String(sourceTrade.trade.paypalStatus || '').startsWith('CAPTURED_'))) {
      return res.status(409).json({ error: 'Capture the linked PayPal Sandbox order before confirming Fabric settlement.' });
    }
    const outcome = await settleFabricTrade(req.params.tradeId, req.body?.confirmSettlement === true);
    if (sourceTrade) {
      const updated = recordFabricSettlement(sourceTrade.trade.tradeId, outcome);
      indexTradeEvent(updated.trade);
    }
    res.json({ ...outcome, sourceTradeId: sourceTrade?.trade.tradeId || null });
  } catch (err) {
    res.status(400).json({ error: err.message, transactionId: err.transactionId, validationCode: err.validationCode, commitStatusUnknown: err.commitStatusUnknown });
  }
});

app.post('/api/fabric/trades/:tradeId/legs/:leg/:operation', authorizeFabricWrite, async (req, res) => {
  try {
    const writeStatus = await getFabricWriteStatus();
    if (!writeStatus.writeReady) {
      return res.status(503).json({ error: 'Fabric trade writes are not ready. Configure rotated BankA1 and BankB1 identities and enable writes.' });
    }
    const { tradeId, leg, operation } = req.params;
    const outcome = await performFabricLegAction(tradeId, leg.toUpperCase(), operation.toLowerCase(), req.body?.confirmSettlement === true);
    const sourceTrade = tradesStore.find((item) => item.trade.fabricTradeId === tradeId);
    if (sourceTrade) {
      recordFabricLegAction(sourceTrade.trade.tradeId, leg.toUpperCase(), operation.toLowerCase(), outcome);
      triggerZapierWebhook('FABRIC_VALUE_LEG_COMMITTED', { sourceTradeId: sourceTrade.trade.tradeId, fabricTradeId: tradeId, leg: leg.toUpperCase(), operation: operation.toLowerCase(), transactionId: outcome.transactionId, signedBy: outcome.signedBy });
      indexTradeEvent(sourceTrade.trade);
    }
    res.json(outcome);
  } catch (err) {
    res.status(400).json({ error: err.message, transactionId: err.transactionId, validationCode: err.validationCode, commitStatusUnknown: err.commitStatusUnknown });
  }
});

app.get('/api/fabric/blocks', (req, res) => {
  res.json(getFabricBlocks());
});

app.get('/api/fabric/audit/latest', async (req, res) => {
  try {
    const report = await auditFabricLedger();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fabric/audit/run', async (req, res) => {
  try {
    const report = await auditFabricLedger();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  PayBridge AI Backend Server running on http://localhost:${PORT}`);
  console.log(`  PayPal mode: ${getPayPalMode()}`);
  console.log(`  Gemini explanation: ${process.env.GEMINI_API_KEY ? 'configured' : 'not configured'}`);
  console.log(`  Ledger mode: in-memory prototype`);
  console.log(`  Optional integrations: configured per environment`);
  console.log(`================================================================`);
});
