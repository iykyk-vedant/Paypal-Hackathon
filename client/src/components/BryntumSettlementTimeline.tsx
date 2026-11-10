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
    { id: 'PROPOSED', title: '1. AI Proposed & Negotiated', color: 'border-amber-200 bg-amber-50 text-amber-800' },
    { id: 'ACCEPTED', title: '2. Dual-Leg Hold & PayPal Ready', color: 'border-sky-200 bg-sky-100/10 text-sky-800' },
    { id: 'SETTLED', title: '3. Demo ledger updated', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl border border-purple-200">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settlement Timeline & Corridor Schedule</h2>

            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Illustrative schedule for sample currency corridor windows and demo workflow stages.
            </p>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setActiveView('pipeline')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'pipeline'
                ? 'bg-violet-100 text-slate-900 font-semibold shadow-glow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pipeline view
          </button>
          <button
            onClick={() => setActiveView('timeline')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all ${
              activeView === 'timeline'
                ? 'bg-violet-100 text-slate-900 font-semibold shadow-glow'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Timeline view
          </button>
        </div>
      </div>

      {/* Corridor Window Clocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">JUR-A (India / RBI RTGS)</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-mono">UTC+05:30</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">11:30 - 13:00 IST</div>
          <div className="text-[11px] text-emerald-800 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-100 animate-pulse"></span> Window Open
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">JUR-B (Singapore / MAS MEPS+)</span>
            <span className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-mono">UTC+08:00</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">14:00 - 15:30 SGT</div>
          <div className="text-[11px] text-emerald-800 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-100 animate-pulse"></span> Window Open
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80 bg-gradient-to-r from-violet-50 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-800">Sample Corridor Overlap Window</span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono">Demo</span>
          </div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">48m Remaining</div>
          <div className="text-[11px] text-slate-700 mt-1">Sample schedule; no settlement guarantee</div>
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
              <div key={stage.id} className="glass-panel rounded-2xl p-4 border border-slate-200 space-y-4">
                <div className={`p-3 rounded-xl border font-semibold text-xs flex items-center justify-between ${stage.color}`}>
                  <span>{stage.title}</span>
                  <span className="font-mono bg-white/60 px-2 py-0.5 rounded-full text-[11px]">
                    {stageTrades.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[350px]">
                  {stageTrades.length === 0 ? (
                    <div className="text-center py-12 text-slate-600 text-xs italic">
                      No trades currently in this stage
                    </div>
                  ) : (
                    stageTrades.map((t) => (
                      <div
                        key={t.trade.tradeId}
                        className="bg-white/80 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 p-4 rounded-xl transition-all shadow-md group cursor-pointer"
                        onClick={() => {
                          onSelectTrade(t.trade.tradeId);
                          onNavigate('trade-detail');
                        }}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-cyan-800">{t.trade.tradeId}</span>
                          <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            {t.trade.ccyA} / {t.trade.ccyB}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-600">Payer Leg:</span>
                            <span className="text-slate-900 font-semibold">
                              {formatMinorUnits(t.trade.amountA, t.trade.ccyA)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-slate-600">Payee Leg:</span>
                            <span className="text-slate-900 font-semibold">
                              {formatMinorUnits(t.trade.amountB, t.trade.ccyB)}
                            </span>
                          </div>
                        </div>

                        {t.trade.reference && (
                          <div className="mt-2 text-[11px] text-slate-600 truncate">
                            {t.trade.reference}
                          </div>
                        )}

                        {t.trade.status === 'ACCEPTED' && (
                          <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                            <span className="text-[10px] text-amber-800 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-paypal-gold"></span>
                              PayPal Ready
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenPayPalModal(t);
                              }}
                              className="px-2.5 py-1 rounded bg-sky-100 hover:bg-sky-100 text-slate-900 text-[11px] font-semibold flex items-center gap-1 shadow-glow"
                            >
                              <Play className="w-2.5 h-2.5 fill-white" /> Settle Now
                            </button>
                          </div>
                        )}

                        {t.trade.status === 'SETTLED' && (
                          <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-emerald-800 font-mono">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Recorded in demo ledger
                            </span>
                            <span className="text-[10px] text-slate-600">Demo</span>
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
        <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Cross-Border Settlement Gantt Schedule</h3>
              <p className="text-xs text-slate-600">Illustrative corridor timeline and demo workflow state</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-2 bg-amber-200 rounded-sm"></span> JUR-A Corridor
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-2 bg-cyan-200 rounded-sm"></span> JUR-B Corridor
              </span>
              <span className="flex items-center gap-1.5 text-slate-700">
                <span className="w-3 h-2 bg-emerald-200 rounded-sm"></span> PayPal Demo Settlement
              </span>
            </div>
          </div>

          {/* Simulated Gantt Bars */}
          <div className="space-y-4 font-mono text-xs">
            {trades.map((t) => (
              <div key={t.trade.tradeId} className="space-y-1">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-bold text-slate-900">{t.trade.tradeId} — {t.trade.ccyA}/{t.trade.ccyB}</span>
                  <span className="text-[11px]">{t.trade.status}</span>
                </div>
                <div className="h-7 bg-white rounded-lg p-1 relative border border-slate-200">
                  <div
                    className={`h-full rounded flex items-center px-2 text-[10px] font-bold text-slate-900 transition-all ${
                      t.trade.status === 'SETTLED'
                        ? 'bg-emerald-100 border border-emerald-200 w-[95%]'
                        : t.trade.status === 'ACCEPTED'
                        ? 'bg-sky-100 border border-sky-200 w-[65%]'
                        : 'bg-amber-100 border border-amber-200 w-[35%]'
                    }`}
                  >
                    <span>{t.trade.status === 'SETTLED' ? 'Recorded in demo ledger' : 'In demo hold queue'}</span>
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
