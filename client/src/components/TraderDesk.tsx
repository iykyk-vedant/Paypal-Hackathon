import React, { useState } from 'react';
import { Account, TradeComposite, ScreenId } from '../types';
import { formatMinorUnits } from '../api';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  PlusCircle,
  ExternalLink,
} from 'lucide-react';

interface TraderDeskProps {
  accounts: Account[];
  trades: TradeComposite[];
  onNavigate: (screen: ScreenId) => void;
  onSelectTrade: (tradeId: string) => void;
  onOpenPayPalModal: (trade: TradeComposite) => void;
}

export const TraderDesk: React.FC<TraderDeskProps> = ({
  accounts,
  trades,
  onNavigate,
  onSelectTrade,
  onOpenPayPalModal,
}) => {
  const inrAccount = accounts.find((a) => a.ccy === 'INR');
  const sgdAccount = accounts.find((a) => a.ccy === 'SGD');
  const usdAccount = accounts.find((a) => a.ccy === 'USD');

  const pendingTrades = trades.filter((t) => t.trade.status === 'PROPOSED' || t.trade.status === 'ACCEPTED');
  const settledTrades = trades.filter((t) => t.trade.status === 'SETTLED');

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Welcome & Liquidity Overview */}
      <div className="glass-panel-glow rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-white tracking-tight">Institutional Treasury Trading Desk</h2>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              PvP Rail Active
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Autonomous agentic execution across international currency corridors (INR, SGD, USD).
            Settlements are cryptographically locked and backed 1:1 by sovereign reserves and PayPal Sandbox liquidity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('new-trade')}
            className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-glow flex items-center gap-2 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Propose New Trade
          </button>
          <button
            onClick={() => onNavigate('active-settlements')}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all"
          >
            Open AG Grid View
          </button>
        </div>
      </div>

      {/* Multi-Currency Balances & Headroom Meters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* INR Reserves Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> India Corridor (INR)
            </span>
            <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-amber-300 border border-slate-800">
              RBI Supervised
            </span>
          </div>

          <div className="text-2xl font-black text-white font-mono">
            {formatMinorUnits(inrAccount?.available || '4250000000', 'INR')}
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Held in PvP Escrow:</span>
              <span className="text-amber-400 font-bold">{formatMinorUnits(inrAccount?.held || '200000000', 'INR')}</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div className="bg-amber-400 h-full rounded-full w-[85%]"></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>85% Available Float</span>
              <span>15% Locked in Transit</span>
            </div>
          </div>
        </div>

        {/* SGD Reserves Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-cyan"></span> Singapore Corridor (SGD)
            </span>
            <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-cyan-300 border border-slate-800">
              MAS Supervised
            </span>
          </div>

          <div className="text-2xl font-black text-white font-mono">
            {formatMinorUnits(sgdAccount?.available || '85000000', 'SGD')}
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Held in PvP Escrow:</span>
              <span className="text-cyan-400 font-bold">{formatMinorUnits(sgdAccount?.held || '0', 'SGD')}</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div className="bg-accent-cyan h-full rounded-full w-[95%]"></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>95% Available Float</span>
              <span>5% Locked in Transit</span>
            </div>
          </div>
        </div>

        {/* USD Treasury Card */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-paypal-lightBlue"></span> Global Float (USD / PayPal)
            </span>
            <span className="font-mono text-[11px] bg-slate-900 px-2 py-0.5 rounded text-paypal-lightBlue border border-slate-800">
              PayPal Sandbox
            </span>
          </div>

          <div className="text-2xl font-black text-white font-mono">
            {formatMinorUnits(usdAccount?.available || '250000000', 'USD')}
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Automated Payout Ready:</span>
              <span className="text-emerald-400 font-bold">$2,500,000.00 USD</span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
              <div className="bg-primary h-full rounded-full w-[100%]"></div>
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>100% Reserve Backed</span>
              <span>Instant Disbursal</span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Pipeline Preview & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Settlements List */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Active Settlement Queue</h3>
              <span className="bg-primary/20 text-primary-light text-xs font-mono font-bold px-2 py-0.5 rounded-full">
                {pendingTrades.length} Pending
              </span>
            </div>
            <button
              onClick={() => onNavigate('active-settlements')}
              className="text-xs text-primary-light hover:underline font-semibold flex items-center gap-1"
            >
              View in AG Grid <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingTrades.map((t) => (
              <div
                key={t.trade.tradeId}
                className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-accent-cyan">{t.trade.tradeId}</span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-white">{t.trade.ccyA} / {t.trade.ccyB}</span>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.2 rounded font-mono font-bold">
                      {t.trade.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-1">
                    {formatMinorUnits(t.trade.amountA, t.trade.ccyA)} <ArrowUpRight className="inline w-3 h-3 text-slate-500" /> {formatMinorUnits(t.trade.amountB, t.trade.ccyB)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {t.trade.status === 'ACCEPTED' && (
                    <button
                      onClick={() => onOpenPayPalModal(t)}
                      className="px-3 py-1.5 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent-cyan text-white rounded-lg text-xs font-bold shadow-glow flex items-center gap-1.5 transition-all"
                    >
                      <Sparkles className="w-3 h-3 text-paypal-gold" /> Settle via PayPal
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onSelectTrade(t.trade.tradeId);
                      onNavigate('trade-detail');
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-all"
                  >
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Action Shortcuts */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3">
              Autonomous Operations
            </h3>

            <button
              onClick={() => onNavigate('ai-swarm')}
              className="w-full p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 to-slate-900 border border-cyan-500/30 hover:border-cyan-500/60 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-300">Launch AI Swarm Deliberation</span>
                <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Automated trade negotiation and sanctions screening.
              </p>
            </button>

            <button
              onClick={() => onNavigate('channel3-sourcing')}
              className="w-full p-3.5 rounded-xl bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 hover:border-amber-500/60 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">Channel3 Agentic Sourcing</span>
                <TrendingUp className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Search global wholesale electronics and medical inventory.
              </p>
            </button>

            <button
              onClick={() => onNavigate('paypal-ledger')}
              className="w-full p-3.5 rounded-xl bg-gradient-to-r from-blue-950/40 to-slate-900 border border-primary/30 hover:border-primary/60 text-left transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-light">PayPal Sandbox Transaction Ledger</span>
                <DollarSign className="w-4 h-4 text-paypal-gold group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Inspect live capture events and automated vendor payouts.
              </p>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono">
            <span>Sovereign Consensus:</span>
            <span className="text-emerald-400 font-bold">Synchronized</span>
          </div>
        </div>
      </div>
    </div>
  );
};
