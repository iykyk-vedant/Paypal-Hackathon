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
import { createHash } from 'node:crypto';

const {
  accountsStore,
  tradesStore,
  refusalsStore,
  reservesStore,
  paypalLedgerStore,
  proposeTrade,
  acceptTrade,
  settleTrade,
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
const { queryElasticSearch, getElasticClusterStats } = await import('./elasticService.js');
const { triggerZapierWebhook, getZapierDispatchedHistory, setZapierWebhookUrl } = await import('./zapierService.js');
const {
  getKernelHealth,
  createKernelBrowserSession,
  auditMerchantStorefrontDOM,
  verifyCarrierDisputeEvidence,
} = await import('./kernelService.js');
const { CORRIDORS, FX_RATES, getCalculatedFx } = await import('./corridorRules.js');
const { getFabricBlocks, auditFabricLedger } = await import('./aiChaincodeAuditor.js');
const { getFabricGatewayStatus, getFabricLedgerSnapshot } = await import('./fabricGatewayService.js');

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
    ledgerMode: 'in_memory_demo',
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

app.post('/trades', (req, res) => {
  try {
    const trade = proposeTrade(req.body);
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
    const settled = await settleTrade(tradeId, capture);
    res.json({
      ...capture,
      fundingQuote: trade.trade.paypalFundingQuote,
      payoutStatus: settled.trade.payoutStatus || null,
      payoutMode: settled.trade.payoutMode || null,
      payoutBatchId: settled.trade.payoutBatchId || null,
      payoutError: settled.trade.payoutError || null,
      receiptHash: settled.trade.receiptHash || null,
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
    if (trade.trade.payoutStatus !== 'FAILED') {
      return res.status(409).json({ error: 'Only a failed payout can be retried' });
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
  const { eventType, payload } = req.body;
  const result = await triggerZapierWebhook(eventType || 'MANUAL_TEST', payload || {});
  res.json(result);
});

app.get('/api/zapier/events', (req, res) => {
  res.json(getZapierDispatchedHistory());
});

app.post('/api/zapier/config', (req, res) => {
  const { url } = req.body;
  setZapierWebhookUrl(url);
  res.json({ ok: true, webhookUrl: url });
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
    sampleTopology: status.mode !== 'LIVE_READ_ONLY',
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
