import React, { useMemo, useState } from 'react';
import { BryntumScheduler, type BryntumSchedulerProps } from '@bryntum/scheduler-react-community';
import '@bryntum/scheduler-community/scheduler.css';
import '@bryntum/scheduler-community/svalbard.css';
import { TradeComposite, ScreenId } from '../types';
import { formatMinorUnits } from '../api';
import { CalendarDays, CheckCircle2, Play } from 'lucide-react';

interface BryntumSettlementTimelineProps {
  canCapture?: boolean;
  currentMsp?: string;
  trades: TradeComposite[];
  onSelectTrade: (tradeId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onOpenPayPalModal: (trade: TradeComposite) => void;
}

const timeValue = (value?: string | number): Date | undefined => {
  if (value === undefined || value === '') return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export const BryntumSettlementTimeline: React.FC<BryntumSettlementTimelineProps> = ({
  canCapture = false,
  currentMsp,
  trades,
  onSelectTrade,
  onNavigate,
  onOpenPayPalModal,
}) => {
  const [activeView, setActiveView] = useState<'timeline' | 'pipeline'>('timeline');
  const stages = [
    { id: 'PROPOSED', title: 'Proposed', color: 'border-amber-200 bg-amber-50 text-amber-800' },
    { id: 'ACCEPTED', title: 'Accepted', color: 'border-sky-200 bg-sky-50 text-sky-800' },
    { id: 'SETTLED', title: 'Settled', color: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  ];

  const schedulerConfig = useMemo<BryntumSchedulerProps>(() => {
    const now = new Date();
    const records = trades.map(({ trade }) => {
      const start = timeValue(trade.createdAt ?? trade.proposedAt) ?? now;
      const end = timeValue(trade.settledAt ?? trade.acceptedAt) ?? new Date(start.getTime() + 30 * 60_000);
      return { trade, start, end: end > start ? end : new Date(start.getTime() + 5 * 60_000) };
    });
    const earliest = records.reduce((date, row) => row.start < date ? row.start : date, records[0]?.start ?? now);
    const latest = records.reduce((date, row) => row.end > date ? row.end : date, records[0]?.end ?? now);

    return {
      height: 560,
      startDate: new Date(earliest.getTime() - 60 * 60_000),
      endDate: new Date(latest.getTime() + 60 * 60_000),
      viewPreset: 'hourAndDay',
      rowHeight: 54,
      barMargin: 10,
      readOnly: true,
      columns: [{ text: 'Trade', field: 'name', width: 240 }],
      resources: records.map(({ trade }) => ({
        id: trade.tradeId,
        name: `${trade.tradeId} · ${trade.ccyA}/${trade.ccyB}`,
      })),
      events: records.map(({ trade, start, end }) => ({
        id: trade.tradeId,
        resourceId: trade.tradeId,
        name: `${trade.status}  ·  ${formatMinorUnits(trade.amountA, trade.ccyA)} → ${formatMinorUnits(trade.amountB, trade.ccyB)}`,
        startDate: start,
        endDate: end,
        eventColor: trade.status === 'SETTLED' ? 'green' : trade.status === 'ACCEPTED' ? 'blue' : 'orange',
        tradeId: trade.tradeId,
      })),
      listeners: {
        eventClick: ({ eventRecord }: { eventRecord: { getData: (key: string) => unknown } }) => {
          const tradeId = eventRecord.getData('tradeId');
          if (typeof tradeId === 'string') {
            onSelectTrade(tradeId);
            onNavigate('trade-detail');
          }
        },
      },
    };
  }, [trades, onSelectTrade, onNavigate]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl border border-purple-200">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settlement Timeline</h2>
            <p className="text-xs text-slate-600 mt-0.5">Trade schedule from recorded lifecycle timestamps. Select a trade to view details.</p>
          </div>
        </div>
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
          {(['timeline', 'pipeline'] as const).map((view) => (
            <button key={view} onClick={() => setActiveView(view)} className={`px-3 py-1.5 rounded-md font-medium transition-all ${activeView === view ? 'bg-violet-100 text-slate-900 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
              {view === 'timeline' ? 'Scheduler' : 'Pipeline'}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'timeline' ? (
        <div className="glass-panel rounded-2xl p-4 border border-slate-200 overflow-hidden">
          {trades.length ? <BryntumScheduler {...schedulerConfig} /> : (
            <div className="min-h-64 flex items-center justify-center text-sm text-slate-500">No trades to schedule yet.</div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stages.map((stage) => {
            const stageTrades = trades.filter(({ trade }) => trade.status === stage.id);
            return (
              <section key={stage.id} className="glass-panel rounded-2xl p-4 border border-slate-200 space-y-4">
                <div className={`p-3 rounded-xl border font-semibold text-xs flex items-center justify-between ${stage.color}`}>
                  <span>{stage.title}</span><span className="font-mono bg-white/60 px-2 py-0.5 rounded-full">{stageTrades.length}</span>
                </div>
                <div className="space-y-3 min-h-64">
                  {stageTrades.length === 0 ? <div className="text-center py-12 text-slate-500 text-xs">No trades in this stage</div> : stageTrades.map((t) => (
                    <article key={t.trade.tradeId} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm cursor-pointer" onClick={() => { onSelectTrade(t.trade.tradeId); onNavigate('trade-detail'); }}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-cyan-800">{t.trade.tradeId}</span>
                        <span className="font-mono text-slate-600">{t.trade.ccyA} / {t.trade.ccyB}</span>
                      </div>
                      <div className="mt-3 space-y-1 text-xs font-mono">
                        <div className="flex justify-between"><span className="text-slate-500">Payer leg</span><span>{formatMinorUnits(t.trade.amountA, t.trade.ccyA)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Payee leg</span><span>{formatMinorUnits(t.trade.amountB, t.trade.ccyB)}</span></div>
                      </div>
                      {canCapture && t.trade.status === 'ACCEPTED' && t.trade.proposerMsp === currentMsp && (
                        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-amber-700">PayPal ready</span>
                          <button onClick={(e) => { e.stopPropagation(); onOpenPayPalModal(t); }} className="px-2.5 py-1 rounded bg-sky-100 text-slate-900 text-[11px] font-semibold flex items-center gap-1">
                            <Play className="w-2.5 h-2.5" /> Settle
                          </button>
                        </div>
                      )}
                      {t.trade.status === 'SETTLED' && <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Recorded in demo ledger</div>}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};
