import React, { useState } from 'react';
import { TradeComposite, ScreenId } from '../types';
import { formatMinorUnits } from '../api';
import { CalendarDays, Clock, CheckCircle2, ArrowRight, ShieldCheck, Play, Sparkles } from 'lucide-react';

interface BryntumSettlementTimelineProps {
  trades: TradeComposite[];
  onSelectTrade: (tradeId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenPayPalModal: (trade: TradeComposite) => void;
}

export const BryntumSettlementTimeline: React.FC<BryntumSettlementTimelineProps> = ({
  trades,
  onSelectTrade,
  onNavigate,
  onOpenPayPalModal,
}) => {
  const [activeView, setActiveView] = useState<'timeline' | 'pipeline'>('pipeline');

  // Pipeline stages
  const stages = [
    { id: 'PROPOSED', title: '1. AI Proposed & Negotiated', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
    { id: 'ACCEPTED', title: '2. Dual-Leg Hold & PayPal Ready', color: 'border-primary/40 bg-primary/10 text-primary-light' },
    { id: 'SETTLED', title: '3. Atomic PvP Settle & Payout', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Settlement Timeline & Corridor Schedule</h2>
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Powered by Bryntum Suite
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Gantt scheduling of cross-border currency corridor cutoffs, RTGS operating windows, and atomic payout timelines.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'pipeline'
                ? 'bg-purple-600 text-white font-semibold shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bryntum TaskBoard View
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'timeline'
                ? 'bg-purple-600 text-white font-semibold shadow-glow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Bryntum Gantt Timeline
          </button>
        </div>
      </div>

      {/* Corridor Window Clocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">JUR-A (India / RBI RTGS)</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">UTC+05:30</span>
          </div>
          <div className="text-lg font-bold text-white mt-1 font-mono">11:30 - 13:00 IST</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Window Open
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">JUR-B (Singapore / MAS MEPS+)</span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">UTC+08:00</span>
          </div>
          <div className="text-lg font-bold text-white mt-1 font-mono">14:00 - 15:30 SGT</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Window Open
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80 bg-gradient-to-r from-purple-950/20 to-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300">Synchronized PvP Overlap Window</span>
            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono">Active</span>
          </div>
          <div className="text-lg font-bold text-white mt-1 font-mono">48m Remaining</div>
          <div className="text-[11px] text-slate-300 mt-1">Autonomous atomic settlement guaranteed</div>
        </div>
      </div>

      {activeView === 'pipeline' ? (
        /* TaskBoard View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stages.map((stage) => {
            const stageTrades = trades.filter((t) => {
              if (stage.id === 'PROPOSED') return t.trade.status === 'PROPOSED';
              if (stage.id === 'ACCEPTED') return t.trade.status === 'ACCEPTED';
              if (stage.id === 'SETTLED') return t.trade.status === 'SETTLED';
              return false;
            });

            return (
              <div key={stage.id} className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-4">
                <div className={`p-3 rounded-xl border font-semibold text-xs flex items-center justify-between ${stage.color}`}>
                  <span>{stage.title}</span>
                  <span className="font-mono bg-slate-950/60 px-2 py-0.5 rounded-full text-[11px]">
                    {stageTrades.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[350px]">
                  {stageTrades.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs italic">
                      No trades currently in this stage
                    </div>
                  ) : (
                    stageTrades.map((t) => (
                      <div
                        key={t.trade.tradeId}
                        className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 p-4 rounded-xl transition-all shadow-md group cursor-pointer"
                        onClick={() => {
                          onSelectTrade(t.trade.tradeId);
                          onNavigate('trade-detail');
                        }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-accent-cyan">{t.trade.tradeId}</span>
                          <span className="text-[10px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-slate-300">
                            {t.trade.ccyA} / {t.trade.ccyB}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Payer Leg:</span>
                            <span className="text-white font-semibold">
                              {formatMinorUnits(t.trade.amountA, t.trade.ccyA)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-400">Payee Leg:</span>
                            <span className="text-white font-semibold">
                              {formatMinorUnits(t.trade.amountB, t.trade.ccyB)}
                            </span>
                          </div>
                        </div>

                        {t.trade.reference && (
                          <div className="mt-2 text-[11px] text-slate-400 truncate">
                            {t.trade.reference}
                          </div>
                        )}

                        {t.trade.status === 'ACCEPTED' && (
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                            <span className="text-[10px] text-paypal-gold font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-paypal-gold"></span>
                              PayPal Ready
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPayPalModal(t);
                              }}
                              className="px-2.5 py-1 rounded bg-primary hover:bg-primary-light text-white text-[11px] font-semibold flex items-center gap-1 shadow-glow"
                            >
                              <Play className="w-2.5 h-2.5 fill-white" /> Settle Now
                            </button>
                          </div>
                        )}

                        {t.trade.status === 'SETTLED' && (
                          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> PvP Debited & Credited
                            </span>
                            <span className="text-[10px] text-slate-500">Atomic</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Gantt Timeline View */
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Cross-Border Settlement Gantt Schedule</h3>
              <p className="text-xs text-slate-400">Corridor operating timeline synchronized to UTC consensus</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-2 bg-amber-500 rounded-sm"></span> RBI Corridor
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-2 bg-cyan-500 rounded-sm"></span> MAS Corridor
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-2 bg-emerald-500 rounded-sm"></span> PayPal PvP Execution
              </span>
            </div>
          </div>

          {/* Simulated Gantt Bars */}
          <div className="space-y-4 font-mono text-xs">
            {trades.map((t, idx) => (
              <div key={t.trade.tradeId} className="space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="font-bold text-white">{t.trade.tradeId} — {t.trade.ccyA}/{t.trade.ccyB}</span>
                  <span className="text-[11px]">{t.trade.status}</span>
                </div>
                <div className="h-7 bg-slate-950 rounded-lg p-1 relative border border-slate-800">
                  <div
                    className={`h-full rounded flex items-center px-2 text-[10px] font-bold text-white transition-all ${
                      t.trade.status === 'SETTLED'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 w-[95%]'
                        : t.trade.status === 'ACCEPTED'
                        ? 'bg-gradient-to-r from-primary to-accent-cyan w-[65%]'
                        : 'bg-gradient-to-r from-amber-600 to-orange-500 w-[35%]'
                    }`}
                  >
                    <span>{t.trade.status === 'SETTLED' ? 'Settled & Disbursed' : 'In PvP Hold Queue'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
