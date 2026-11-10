import React from 'react';
import { TradeComposite, ScreenId } from '../types';
import { formatMinorUnits } from '../api';
import {
  FileText,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  ArrowLeft,
  Sparkles,
  CreditCard,
  Key,
  Layers,
} from 'lucide-react';

interface TradeDetailProps {
  trade: TradeComposite | null;
  onNavigate: (screen: ScreenId) => void;
  onAcceptTrade: (tradeId: string) => void;
  onOpenPayPalModal: (trade: TradeComposite) => void;
  onRequestPayPalPayout?: (tradeId: string) => void;
}

export const TradeDetail: React.FC<TradeDetailProps> = ({
  trade,
  onNavigate,
  onAcceptTrade,
  onOpenPayPalModal,
  onRequestPayPalPayout,
}) => {
  if (!trade) {
    return (
      <div className="p-8 text-center text-slate-600 text-xs">
        No trade selected.{' '}
        <button onClick={() => onNavigate('active-settlements')} className="text-primary hover:underline">
          Return to settlements grid
        </button>
      </div>
    );
  }

  const t = trade.trade;
  const legA = trade.legA;
  const legB = trade.legB;

  return (
    <div className="p-6 space-y-6 max-w-[1200px] mx-auto w-full">
      {/* Back Button & Top Status */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate('active-settlements')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settlements Grid
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-mono">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
              t.status === 'SETTLED'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                : t.status === 'ACCEPTED'
                ? 'bg-sky-100 text-sky-800 border-sky-200'
                : 'bg-amber-100 text-amber-800 border-amber-200'
            }`}
          >
            {t.status}
          </span>
        </div>
      </div>

      {/* Main Trade Banner */}
      <div className="glass-panel-glow rounded-2xl p-6 border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-sky-100 text-sky-800 rounded-xl border border-sky-200">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 font-mono">{t.tradeId}</h2>
                <p className="text-xs text-slate-600 mt-0.5">{t.reference || 'Bilateral Cross-Border Trade'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {t.status === 'PROPOSED' && (
              <button
                onClick={() => onAcceptTrade(t.tradeId)}
                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" /> Accept Demo Trade
              </button>
            )}

            {t.status === 'ACCEPTED' && (
              <button
                onClick={() => onOpenPayPalModal(trade)}
                className="px-4 py-2 bg-sky-100 hover:bg-sky-200 border border-sky-200 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Sparkles className="w-4 h-4 text-amber-800" /> Capture PayPal Funding
              </button>
            )}

            {t.status === 'SETTLED' && t.paypalCaptureId && ['SGD', 'USD'].includes(t.ccyB) && (!t.payoutStatus || t.payoutStatus === 'FAILED') && onRequestPayPalPayout && (
              <button
                onClick={() => onRequestPayPalPayout(t.tradeId)}
                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <CreditCard className="w-4 h-4" /> {t.payoutStatus === 'FAILED' ? 'Retry Sandbox Payout' : 'Initiate Sandbox Payout'}
              </button>
            )}
          </div>
        </div>

        {/* Counterparty & Corridor Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-200 text-xs font-mono">
          <div>
            <div className="text-slate-600 text-[11px]">Proposer Org:</div>
            <div className="text-slate-900 font-bold mt-0.5">{t.proposerMsp}</div>
          </div>
          <div>
            <div className="text-slate-600 text-[11px]">Counterparty Org:</div>
            <div className="text-slate-900 font-bold mt-0.5">{t.counterpartyMsp}</div>
          </div>
          <div>
            <div className="text-slate-600 text-[11px]">Demo FX Rate:</div>
            <div className="text-cyan-800 font-bold mt-0.5">{t.fxRate}</div>
          </div>
          <div>
            <div className="text-slate-600 text-[11px]">Settlement Method:</div>
            <div className="text-emerald-800 font-bold mt-0.5">{t.fabricStatus === 'SETTLED' ? 'PayPal + Fabric test ledger' : t.fabricStatus === 'SETTLED_PENDING_VALUE_LEGS' ? 'Fabric approved; value legs pending' : 'Demo proposal; Fabric pending'}</div>
          </div>
        </div>
      </div>

      {(t.riskAssessment || t.channel3Quote) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {t.channel3Quote && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h3 className="text-xs font-bold text-slate-800">Supplier quote reference</h3>
              <p className="text-sm font-semibold text-slate-900">{t.channel3Quote.item?.title || t.channel3Sku}</p>
              <p className="text-[11px] text-slate-600">Quote {t.channel3Quote.quoteId || '—'} · {t.channel3Quote.quantity || '—'} units · supplier and bank mapping are demo assumptions.</p>
            </section>
          )}
          {t.riskAssessment && (
            <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Pre-trade prototype risk review</h3>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${t.riskAssessment.verdict === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{t.riskAssessment.verdict} · {t.riskAssessment.riskScore}/100</span>
              </div>
              <p className="text-[11px] text-slate-600">Deterministic sample rules; not official sanctions screening or regulatory clearance.</p>
              {t.riskAssessment.aiExplanation && <p className="text-xs text-slate-700">Gemini explanation: {t.riskAssessment.aiExplanation}</p>}
            </section>
          )}
        </div>
      )}

      {/* Illustrative Currency Legs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leg A */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-bold text-amber-800 font-mono">Leg A — Payer Leg ({legA.ccy})</span>
            <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono">
              Hold: {legA.holdStatus}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="text-2xl font-black text-slate-900">
              {formatMinorUnits(legA.amount, legA.ccy)}
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payer Bank:</span>
              <span className="text-slate-900 font-bold">{legA.payer}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payee Bank:</span>
              <span className="text-slate-900 font-bold">{legA.payee}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Credit Status:</span>
              <span className={legA.creditStatus === 'CREDITED' ? 'text-emerald-800 font-bold' : 'text-slate-600'}>
                {legA.creditStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Leg B */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-xs font-bold text-cyan-800 font-mono">Leg B — Counterparty Leg ({legB.ccy})</span>
            <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-mono">
              Hold: {legB.holdStatus}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="text-2xl font-black text-slate-900">
              {formatMinorUnits(legB.amount, legB.ccy)}
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payer Bank:</span>
              <span className="text-slate-900 font-bold">{legB.payer}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payee Bank:</span>
              <span className="text-slate-900 font-bold">{legB.payee}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Credit Status:</span>
              <span className={legB.creditStatus === 'CREDITED' ? 'text-emerald-800 font-bold' : 'text-slate-600'}>
                {legB.creditStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations: PayPal & Local Demo Receipt */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PayPal / Demo Settlement Details */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-sky-800">
            <CreditCard className="w-4 h-4" />
            <span>PayPal Funding Details</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Order / Demo Ref:</span>
              <span className="text-amber-800 font-bold">{t.paypalOrderId || 'NOT_CREATED'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Capture Status:</span>
              <span className="text-slate-900">{t.paypalStatus || 'AWAITING_APPROVAL'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Fabric Status:</span>
              <span className="text-slate-900">{t.fabricStatus || 'NOT_LINKED'}</span>
            </div>
            {t.paypalMode && (
              <div className="flex justify-between">
                <span className="text-slate-600">Provider Mode:</span>
                <span className="text-slate-900 font-semibold">{t.paypalMode}</span>
              </div>
            )}
            {t.payoutBatchId && (
              <div className="flex justify-between">
                <span className="text-slate-600">Payout Batch ID:</span>
                <span className="text-purple-800 font-bold">{t.payoutBatchId}</span>
              </div>
            )}
            {t.payoutStatus && (
              <div className="flex justify-between">
                <span className="text-slate-600">Payout Status:</span>
                <span className={t.payoutStatus === 'FAILED' ? 'text-rose-800 font-bold' : 'text-slate-900'}>{t.payoutStatus}</span>
              </div>
            )}
          </div>
        </div>

        {/* Local receipt reference */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-800">
            <Key className="w-4 h-4" />
            <span>Local Demo Receipt</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Local SHA-256 Digest:</span>
              <span className="text-slate-700 truncate max-w-[200px]">
                {t.receiptHash || 'Not recorded'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Fabric commit:</span>
              <span className="text-amber-800 font-bold">{t.fabricTransactionId || 'Not yet linked'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Receipt scope:</span>
              <span className="text-cyan-800 font-bold">{t.receiptHash ? 'PayPal + Fabric demo references' : 'No final receipt yet'}</span>
            </div>
            <p className="pt-1 font-sans text-[11px] leading-relaxed text-slate-600">
              Local receipt digest only. Review the transaction IDs and live ledger directly; this digest is not a provider attestation or regulator approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
