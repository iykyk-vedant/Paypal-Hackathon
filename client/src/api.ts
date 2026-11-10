import {
  MeResponse,
  Account,
  TradeComposite,
  Refusal,
  CorridorRules,
  ReserveBalance,
  SupplyBalance,
  PayPalLedgerEntry,
  Channel3Item,
  Channel3Quote,
} from './types';

export const CONSORTIUM_NODES = [
  { id: 'banka1', label: 'Bank A1', sublabel: '(India / Mumbai Desk)', operator: 'a1-trader', port: 3003, type: 'bank', color: 'hover:border-blue-400/60' },
  { id: 'bankb1', label: 'Bank B1', sublabel: '(Singapore Desk)', operator: 'b1-trader', port: 3004, type: 'bank', color: 'hover:border-teal-400/60' },
  { id: 'rega', label: 'RegA (RBI)', sublabel: '(INR Issuer / Supervisor)', operator: 'rega-operator', port: 3001, type: 'regulator', color: 'hover:border-amber-400/60' },
  { id: 'regb', label: 'RegB (MAS)', sublabel: '(SGD Issuer / Supervisor)', operator: 'regb-operator', port: 3002, type: 'regulator', color: 'hover:border-cyan-400/60' },
  { id: 'auditor', label: 'Auditor', sublabel: '(Demo Observer)', operator: 'aud-reader', port: 3005, type: 'auditor', color: 'hover:border-purple-400/60' },
] as const;

export function formatMinorUnits(minorStr: string | number | bigint | undefined, ccy: string): string {
  if (minorStr === undefined || minorStr === null || minorStr === '') return `${ccy} 0.00`;
  try {
    const bi = BigInt(String(minorStr));
    const isNeg = bi < 0n;
    const abs = isNeg ? -bi : bi;
    const units = abs / 100n;
    const rem = abs % 100n;
    const dec = rem.toString().padStart(2, '0');
    const unitsFormatted = Number(units).toLocaleString('en-US');
    const sign = isNeg ? '-' : '';
    const symbol = ccy === 'INR' ? '₹ ' : ccy === 'SGD' ? 'S$ ' : ccy === 'EUR' ? '€ ' : '$ ';
    return `${sign}${symbol}${unitsFormatted}.${dec}`;
  } catch {
    return `${ccy} ${minorStr}`;
  }
}

export function formatMinorUnitsPlain(minorStr: string | number | bigint | undefined): string {
  if (!minorStr) return '0.00';
  try {
    const bi = BigInt(String(minorStr));
    const units = bi / 100n;
    const rem = bi % 100n;
    return `${Number(units).toLocaleString('en-US')}.${rem.toString().padStart(2, '0')}`;
  } catch {
    return String(minorStr);
  }
}

export class ApiClient {
  private operator: string = 'a1-trader';

  setOperator(operator: string) {
    this.operator = operator;
  }

  getOperator(): string {
    return this.operator;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      'X-Operator': this.operator,
      ...(options.headers || {}),
    };

    let apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (apiBase && !/^https?:\/\//i.test(apiBase)) apiBase = `https://${apiBase}`;
    const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint}`;
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch {
        errBody = { error: await res.text() };
      }
      const error = new Error(errBody.error || `HTTP ${res.status}: ${res.statusText}`) as Error & {
        transactionId?: string;
        validationCode?: string;
        commitStatusUnknown?: boolean;
      };
      error.transactionId = errBody.transactionId;
      error.validationCode = errBody.validationCode;
      error.commitStatusUnknown = errBody.commitStatusUnknown;
      throw error;
    }
    return res.json();
  }

  // --- CORE ROUTES ---
  async getHealth() {
    return this.request<{
      status: string;
      paypalMode: string;
      geminiConfigured?: boolean;
      ledgerMode?: string;
      fabricGatewayConnected?: boolean;
    }>('/health');
  }

  async getMe(): Promise<MeResponse> {
    return this.request<MeResponse>('/me');
  }

  async getAccounts(): Promise<Account[]> {
    return this.request<Account[]>('/accounts');
  }

  async getTrades(): Promise<TradeComposite[]> {
    return this.request<TradeComposite[]>('/trades');
  }

  async getTrade(tradeId: string): Promise<TradeComposite> {
    return this.request<TradeComposite>(`/trades/${tradeId}`);
  }

  async proposeTrade(payload: any): Promise<TradeComposite> {
    return this.request<TradeComposite>('/trades', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async acceptTrade(tradeId: string): Promise<TradeComposite> {
    return this.request<TradeComposite>(`/trades/${tradeId}/accept`, {
      method: 'POST',
    });
  }

  async getRefusals(): Promise<Refusal[]> {
    return this.request<Refusal[]>('/refusals');
  }

  async getRules(jur: string): Promise<CorridorRules> {
    return this.request<CorridorRules>(`/rules/${jur}`);
  }

  async getReserve(ccy: string): Promise<ReserveBalance> {
    return this.request<ReserveBalance>(`/reserve/${ccy}`);
  }

  async getSupply(ccy: string): Promise<SupplyBalance> {
    return this.request<SupplyBalance>(`/supply/${ccy}`);
  }

  // --- PAYPAL DEVELOPER PLATFORM ---
  async createPayPalOrder(data: { tradeId: string; description?: string }) {
    return this.request<any>('/api/paypal/orders/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayPalFundingQuote(tradeId: string) {
    return this.request<any>(`/api/paypal/orders/quote/${encodeURIComponent(tradeId)}`);
  }

  async capturePayPalOrder(orderId: string, tradeId?: string) {
    return this.request<any>(`/api/paypal/orders/${orderId}/capture`, {
      method: 'POST',
      body: JSON.stringify({ tradeId }),
    });
  }

  async executePayPalPayout(tradeId: string) {
    return this.request<any>('/api/paypal/payouts/batch', {
      method: 'POST',
      body: JSON.stringify({ tradeId }),
    });
  }

  async getPayPalLedger(): Promise<PayPalLedgerEntry[]> {
    return this.request<PayPalLedgerEntry[]>('/api/paypal/ledger');
  }

  // --- MULTI-AGENT AI SWARM ---
  async aiNegotiate(payload: any) {
    return this.request<any>('/api/ai/negotiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async aiRiskScreen(payload: any) {
    return this.request<any>('/api/ai/risk-screen', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async aiTreasuryOrchestrate() {
    return this.request<any>('/api/ai/treasury-orchestrate');
  }

  async aiCopilot(message: string, context: any = {}) {
    return this.request<any>('/api/ai/copilot', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }

  // --- INTEGRATIONS ---
  async getChannel3Catalog(q = '', category = '') {
    return this.request<{ count: number; results: Channel3Item[]; poweredBy: string }>(
      `/api/channel3/catalog?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}`
    );
  }

  async getChannel3Quote(sku: string, quantity: number, targetCurrency = 'SGD'): Promise<Channel3Quote> {
    return this.request<Channel3Quote>('/api/channel3/quote', {
      method: 'POST',
      body: JSON.stringify({ sku, quantity, targetCurrency }),
    });
  }

  async queryElastic(index = 'paybridge_trades', q = '') {
    return this.request<{ took_ms: number; total: number; hits: any[]; poweredBy?: string }>(
      `/api/elastic/search?index=${index}&q=${encodeURIComponent(q)}`
    );
  }

  async getElasticStats() {
    return this.request<any>('/api/elastic/stats');
  }

  async triggerZapier(eventType: string, payload: any) {
    return this.request<any>('/api/zapier/trigger', {
      method: 'POST',
      body: JSON.stringify({ eventType, payload }),
    });
  }

  async getZapierEvents() {
    return this.request<any[]>('/api/zapier/events');
  }

  async getReceipt(tradeId: string) {
    return this.request<any>(`/api/receipts/${encodeURIComponent(tradeId)}`);
  }

  // --- HYPERLEDGER FABRIC 2.5 & AI AUDITOR ---
  async getFabricStatus() {
    return this.request<any>('/api/fabric/status');
  }

  async getFabricLedgerSnapshot() {
    return this.request<any>('/api/fabric/ledger');
  }

  async proposeFabricTrade(payload: {
    proposerMsp: 'BankA1MSP' | 'BankB1MSP';
    ccyA: 'INR' | 'SGD';
    amountA: string;
    ccyB: 'INR' | 'SGD';
    amountB: string;
    fxRate?: string;
    reference?: string;
  }, writeToken: string) {
    return this.request<any>('/api/fabric/trades/propose', {
      method: 'POST',
      headers: { 'X-Fabric-Write-Token': writeToken },
      body: JSON.stringify(payload),
    });
  }

  async acceptFabricTrade(tradeId: string, writeToken: string) {
    return this.request<any>(`/api/fabric/trades/${encodeURIComponent(tradeId)}/accept`, {
      method: 'POST', headers: { 'X-Fabric-Write-Token': writeToken },
    });
  }

  async settleFabricTrade(tradeId: string, writeToken: string) {
    return this.request<any>(`/api/fabric/trades/${encodeURIComponent(tradeId)}/settle`, {
      method: 'POST',
      headers: { 'X-Fabric-Write-Token': writeToken },
      body: JSON.stringify({ confirmSettlement: true }),
    });
  }

  async performFabricLegAction(tradeId: string, leg: 'A' | 'B', operation: 'debit' | 'credit', writeToken: string) {
    return this.request<any>(`/api/fabric/trades/${encodeURIComponent(tradeId)}/legs/${leg}/${operation}`, {
      method: 'POST',
      headers: { 'X-Fabric-Write-Token': writeToken },
      body: JSON.stringify({ confirmSettlement: true }),
    });
  }

  async getFabricBlocks() {
    return this.request<any[]>('/api/fabric/blocks');
  }

  async getFabricAuditReport() {
    return this.request<any>('/api/fabric/audit/latest');
  }

  async runFabricAudit() {
    return this.request<any>('/api/fabric/audit/run', { method: 'POST' });
  }
}

export const api = new ApiClient();
