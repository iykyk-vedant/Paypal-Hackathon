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
}

export const TradeDetail: React.FC<TradeDetailProps> = ({
  trade,
  onNavigate,
  onAcceptTrade,
  onOpenPayPalModal,
}) => {
  if (!trade) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
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
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Settlements Grid
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold font-mono border ${
              t.status === 'SETTLED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : t.status === 'ACCEPTED'
                ? 'bg-primary/20 text-primary-light border-primary/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
          >
            {t.status}
          </span>
        </div>
      </div>

      {/* Main Trade Banner */}
      <div className="glass-panel-glow rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 text-primary-light rounded-xl border border-primary/30">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white font-mono">{t.tradeId}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t.reference || 'Bilateral Cross-Border Trade'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {t.status === 'PROPOSED' && (
              <button
                onClick={() => onAcceptTrade(t.tradeId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-glow flex items-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" /> Accept Trade & Lock Leg B
              </button>
            )}

            {t.status === 'ACCEPTED' && (
              <button
                onClick={() => onOpenPayPalModal(trade)}
                className="px-4 py-2 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent-cyan text-white rounded-xl text-xs font-bold shadow-glow flex items-center gap-2 transition-all"
              >
                <Sparkles className="w-4 h-4 text-paypal-gold" /> Settle via PayPal Sandbox
              </button>
            )}
          </div>
        </div>

        {/* Counterparty & Corridor Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs font-mono">
          <div>
            <div className="text-slate-400 text-[11px]">Proposer Org:</div>
            <div className="text-white font-bold mt-0.5">{t.proposerMsp}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Counterparty Org:</div>
            <div className="text-white font-bold mt-0.5">{t.counterpartyMsp}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Agreed FX Rate:</div>
            <div className="text-accent-cyan font-bold mt-0.5">{t.fxRate}</div>
          </div>
          <div>
            <div className="text-slate-400 text-[11px]">Settlement Method:</div>
            <div className="text-emerald-400 font-bold mt-0.5">Atomic PvP Guarantee</div>
          </div>
        </div>
      </div>

      {/* Bilateral Legs (Payment-versus-Payment) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Leg A */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-amber-400 font-mono">Leg A — Payer Leg ({legA.ccy})</span>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
              Hold: {legA.holdStatus}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="text-2xl font-black text-white">
              {formatMinorUnits(legA.amount, legA.ccy)}
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Payer Bank:</span>
              <span className="text-white font-bold">{legA.payer}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Payee Bank:</span>
              <span className="text-white font-bold">{legA.payee}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Credit Status:</span>
              <span className={legA.creditStatus === 'CREDITED' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {legA.creditStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Leg B */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-accent-cyan font-mono">Leg B — Counterparty Leg ({legB.ccy})</span>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
              Hold: {legB.holdStatus}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            <div className="text-2xl font-black text-white">
              {formatMinorUnits(legB.amount, legB.ccy)}
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Payer Bank:</span>
              <span className="text-white font-bold">{legB.payer}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Payee Bank:</span>
              <span className="text-white font-bold">{legB.payee}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Credit Status:</span>
              <span className={legB.creditStatus === 'CREDITED' ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {legB.creditStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations: PayPal & KERNEL Proof */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PayPal Sandbox Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-paypal-lightBlue">
            <CreditCard className="w-4 h-4" />
            <span>PayPal Sandbox Integration Details</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">PayPal Order ID:</span>
              <span className="text-paypal-gold font-bold">{t.paypalOrderId || 'NOT_CREATED'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Capture Status:</span>
              <span className="text-white">{t.paypalStatus || 'AWAITING_APPROVAL'}</span>
            </div>
            {t.payoutBatchId && (
              <div className="flex justify-between">
                <span className="text-slate-400">Payout Batch ID:</span>
                <span className="text-purple-300 font-bold">{t.payoutBatchId}</span>
              </div>
            )}
          </div>
        </div>

        {/* KERNEL Cryptographic Proof Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-accent-cyan">
            <Key className="w-4 h-4" />
            <span>KERNEL Cryptographic Verifiable Receipt</span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Proof Hash:</span>
              <span className="text-slate-300 truncate max-w-[200px]">
                {t.kernelReceiptHash || '0x0000000000000000000000000000000000000000'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Consensus Endorsement:</span>
              <span className="text-emerald-400 font-bold">Dual-Regulator Validated</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Verifiable Audit:</span>
              <span className="text-accent-cyan font-bold">KERNEL-V1-COMPATIBLE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
