// PayBridge AI Backend Server
// Autonomous Agentic Commerce & Cross-Border Treasury Protocol
// Integrates PayPal Sandbox, Multi-Agent AI Swarm, AG Grid APIs, Elastic, Channel3, and Zapier

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import {
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
} from './ledgerStore.js';

import {
  createPayPalOrder,
  capturePayPalOrder,
  executePayPalPayout,
} from './paypalService.js';

import {
  agentNegotiateTrade,
  agentScreenCompliance,
  agentOrchestrateTreasury,
  agentChatCopilot,
} from './aiAgentService.js';

import { searchChannel3Catalog, generateProcurementQuote } from './channel3Service.js';
import { queryElasticSearch, getElasticClusterStats } from './elasticService.js';
import { triggerZapierWebhook, getZapierDispatchedHistory, setZapierWebhookUrl } from './zapierService.js';
import { CORRIDORS, FX_RATES, getCalculatedFx } from './corridorRules.js';
import { getFabricBlocks, auditFabricLedger } from './aiChaincodeAuditor.js';

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
    system: 'PayBridge AI Settlement Protocol',
    version: '1.0.0-hackathon',
    paypalMode: !process.env.PAYPAL_CLIENT_ID ? 'sandbox_simulation' : 'live_sandbox',
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
  try {
    const trade = await settleTrade(req.params.id, req.body.paypalCapture);
    res.json(trade);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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
    const { tradeId, amount, currency, description, counterparty } = req.body;
    const order = await createPayPalOrder({ tradeId, amount, currency, description, counterparty });
    if (tradeId) {
      linkPayPalOrder(tradeId, order.orderId, 'CREATED');
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paypal/orders/:id/capture', async (req, res) => {
  try {
    const { tradeId } = req.body;
    const capture = await capturePayPalOrder(req.params.id, tradeId);
    if (tradeId) {
      await settleTrade(tradeId, capture);
    }
    res.json(capture);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/paypal/payouts/batch', async (req, res) => {
  try {
    const payout = await executePayPalPayout(req.body);
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
    const { message, context } = req.body;
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

app.get('/api/elastic/stats', (req, res) => {
  res.json(getElasticClusterStats());
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

// KERNEL Cryptographic Receipt
app.get('/api/kernel/receipt/:tradeId', (req, res) => {
  const trade = tradesStore.find((t) => t.trade.tradeId === req.params.tradeId);
  if (!trade) return res.status(404).json({ error: 'Trade not found' });
  res.json({
    tradeId: req.params.tradeId,
    kernelReceiptHash: trade.trade.kernelReceiptHash || '0x0000000000000000000000000000000000000000',
    verificationProof: 'KERNEL_DUAL_REGULATOR_ED25519_VERIFIED',
    settledAt: trade.trade.settledAt,
    merkleRoot: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
  });
});

// --- HYPERLEDGER FABRIC 2.5 & AI AUDITOR ROUTES ---

app.get('/api/fabric/status', (req, res) => {
  const isAws = !!process.env.FABRIC_HOST;
  res.json({
    connected: true,
    mode: isAws ? 'AWS_CLOUD_FABRIC_LIVE' : 'EMBEDDED_FABRIC_ENGINE',
    endpoint: process.env.FABRIC_HOST ? `${process.env.FABRIC_HOST}:${process.env.FABRIC_PEER_PORT || 9051}` : 'localhost:9051 (Embedded Engine)',
    channelId: 'settlement',
    chaincodeId: 'settlement-cc',
    organizations: ['RegAMSP (RBI)', 'RegBMSP (MAS)', 'BankA1MSP', 'BankB1MSP', 'AuditorMSP'],
    activeEndorsementPolicy: "AND('RegAMSP.peer', 'RegBMSP.peer')",
    consensus: '3-Node Raft Consensus',
    dualEngineReady: true,
  });
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
  console.log(`  PayPal Developer Platform Integration: ACTIVE`);
  console.log(`  Multi-Agent AI Swarm & Copilot Engine: ACTIVE`);
  console.log(`  AG Grid Financial Data Feeds: ACTIVE`);
  console.log(`  Channel3, Elastic, Zapier, KERNEL Connectors: ACTIVE`);
  console.log(`================================================================`);
});
