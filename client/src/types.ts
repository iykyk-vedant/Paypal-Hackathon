export type ScreenId =
  | 'desk'
  | 'active-settlements'
  | 'paypal-ledger'
  | 'bryntum-timeline'
  | 'ai-swarm'
  | 'channel3-sourcing'
  | 'elastic-audit'
  | 'new-trade'
  | 'trade-detail'
  | 'regulator'
  | 'auditor';

export interface MeResponse {
  org: string;
  msp: string;
  operator: string;
  orgType: 'bank' | 'regulator' | 'auditor';
  jurisdiction: string | null;
  identities: string[];
  ready: boolean;
}

export interface Account {
  ccy: 'INR' | 'SGD' | 'USD' | 'EUR';
  bank: string;
  available: string;
  held: string;
  status: 'ACTIVE' | 'FROZEN';
}

export interface Trade {
  tradeId: string;
  proposer?: string;
  proposerMsp?: string;
  cparty?: string;
  counterpartyMsp?: string;
  ccyA: string;
  amountA?: string | number;
  ccyB: string;
  amountB?: string | number;
  fxRate?: string;
  reference?: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'SETTLED' | 'EXPIRED' | 'CANCELLED' | 'REFUSED';
  paypalOrderId?: string;
  paypalStatus?: string;
  payoutBatchId?: string;
  kernelReceiptHash?: string;
  channel3Sku?: string;
  createdAt?: string | number;
  proposedAt?: string | number;
  acceptedAt?: string | number;
  settledAt?: string | number;
}

export interface LegState {
  tradeId: string;
  leg: 'A' | 'B';
  ccy: string;
  amount?: string | number;
  payer?: string;
  payee?: string;
  senderMsp?: string;
  receiverMsp?: string;
  holdStatus: 'NONE' | 'HELD' | 'RELEASED' | 'RETURNED' | 'DEBITED';
  creditStatus: 'NONE' | 'CREDITED';
}

export interface TradeComposite {
  trade: Trade;
  legA: LegState;
  legB: LegState;
  settle: {
    status: string;
    txId?: string;
    settledAt?: string;
    kernelReceiptHash?: string;
  };
}

export interface PayPalLedgerEntry {
  transactionId: string;
  tradeId: string;
  type: string;
  paypalOrderId?: string;
  captureId?: string;
  payoutBatchId?: string;
  grossAmount: string;
  paypalFee: string;
  netAmount: string;
  sender: string;
  recipient: string;
  status: string;
  timestamp: string;
  corridor: string;
}

export interface Refusal {
  refusalId?: string;
  tradeId: string;
  jurisdiction: string;
  ruleVersion: number | string;
  reasonCode: string;
  reasonDescription?: string;
  invokerMsp: string;
  timestamp: string;
}

export interface CorridorRules {
  jurisdiction: string;
  country?: string;
  regulator?: string;
  currency?: string;
  version: number;
  opStartMin: number;
  opEndMin: number;
  utcOffsetMin: number;
  maxTxAmount: string;
  maxDailyMint: string;
  halted: boolean;
}

export interface ReserveBalance {
  ccy: string;
  rtgsBalance: string;
  statementRef: string;
  attestedAt: string;
}

export interface SupplyBalance {
  ccy: string;
  total: string;
}

export interface Channel3Item {
  sku: string;
  title: string;
  category: string;
  supplierOrg: string;
  supplierName: string;
  country: string;
  unitPrice: number;
  currency: string;
  minOrderQty: number;
  availableStock: number;
  specifications: string;
  leadTimeDays: number;
}

export interface Channel3Quote {
  quoteId: string;
  item: Channel3Item;
  quantity: number;
  baseUnitPrice: number;
  currency: string;
  grossAmount: number;
  volumeDiscountPct: string;
  netSettlementAmount: number;
  recommendedPayerOrg: string;
  recommendedPayeeOrg: string;
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'refused' | 'error' | 'info';
  title: string;
  message: string;
  txId?: string;
  paypalOrderId?: string;
  timestamp: number;
}
