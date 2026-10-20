import React, { useState, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import { TradeComposite, ScreenId } from '../types';
import { formatMinorUnits } from '../api';
import { Table, Download, Search, Play, Eye, ShieldCheck, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface ActiveSettlementsAGGridProps {
  trades: TradeComposite[];
  onSelectTrade: (tradeId: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onSettleTrade: (tradeId: string) => void;
  onOpenPayPalModal: (trade: TradeComposite) => void;
}

export const ActiveSettlementsAGGrid: React.FC<ActiveSettlementsAGGridProps> = ({
  trades,
  onSelectTrade,
  onNavigate,
  onSettleTrade,
  onOpenPayPalModal,
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filtered dataset
  const rowData = useMemo(() => {
    if (statusFilter === 'ALL') return trades;
    return trades.filter((t) => t.trade.status === statusFilter);
  }, [trades, statusFilter]);

  // CSV Export via AG Grid API
  const handleExportCsv = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `paybridge_active_settlements_${new Date().toISOString().slice(0, 10)}.csv`,
      });
    }
  }, []);

  // AG Grid Column Definitions
  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      {
        headerName: 'Trade ID',
        field: 'trade.tradeId',
        width: 140,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => {
          const tradeId = params.value;
          return (
            <div className="flex items-center h-full">
              <span className="font-mono font-bold text-accent-cyan hover:underline cursor-pointer">
                {tradeId}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Status',
        field: 'trade.status',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => {
          const status = params.value;
          let color = 'bg-slate-800 text-slate-300 border-slate-700';
          let icon = <Clock className="w-3 h-3" />;

          if (status === 'SETTLED') {
            color = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            icon = <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
          } else if (status === 'ACCEPTED') {
            color = 'bg-primary/20 text-primary-light border-primary/40';
            icon = <Sparkles className="w-3 h-3 text-primary-light" />;
          } else if (status === 'PROPOSED') {
            color = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
          } else if (status === 'REFUSED') {
            color = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
          }

          return (
            <div className="flex items-center h-full">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
                {icon}
                {status}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Corridor Pair',
        valueGetter: (params) => `${params.data?.trade?.ccyA} / ${params.data?.trade?.ccyB}`,
        width: 140,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex items-center h-full">
              <span className="bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-xs font-mono font-bold text-white">
                {params.value}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Leg A Amount',
        field: 'trade.amountA',
        width: 160,
        cellRenderer: (params: ICellRendererParams) => {
          const ccy = params.data?.trade?.ccyA || 'INR';
          return (
            <div className="flex items-center h-full font-mono font-semibold text-slate-200">
              {formatMinorUnits(params.value, ccy)}
            </div>
          );
        },
      },
      {
        headerName: 'Leg B Amount',
        field: 'trade.amountB',
        width: 160,
        cellRenderer: (params: ICellRendererParams) => {
          const ccy = params.data?.trade?.ccyB || 'SGD';
          return (
            <div className="flex items-center h-full font-mono font-semibold text-slate-200">
              {formatMinorUnits(params.value, ccy)}
            </div>
          );
        },
      },
      {
        headerName: 'Agreed FX',
        field: 'trade.fxRate',
        width: 120,
        cellRenderer: (params: ICellRendererParams) => {
          return (
            <div className="flex items-center h-full font-mono text-xs text-slate-300">
              {params.value || 'N/A'}
            </div>
          );
        },
      },
      {
        headerName: 'PayPal Integration',
        field: 'trade.paypalOrderId',
        width: 200,
        cellRenderer: (params: ICellRendererParams) => {
          const orderId = params.value;
          const status = params.data?.trade?.paypalStatus || 'NOT_LINKED';
          return (
            <div className="flex flex-col justify-center h-full text-xs">
              {orderId ? (
                <span className="font-mono text-paypal-gold text-[11px] font-semibold truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-paypal-gold"></span>
                  {orderId}
                </span>
              ) : (
                <span className="text-slate-500 text-[11px]">Ready to Authorize</span>
              )}
              <span className="text-[10px] text-slate-400">{status}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Dual-Leg Hold',
        valueGetter: (params) => `A:${params.data?.legA?.holdStatus} • B:${params.data?.legB?.holdStatus}`,
        width: 180,
        cellRenderer: (params: ICellRendererParams) => {
          const legA = params.data?.legA?.holdStatus;
          const legB = params.data?.legB?.holdStatus;
          const bothHeld = (legA === 'HELD' || legA === 'DEBITED') && (legB === 'HELD' || legB === 'DEBITED');

          return (
            <div className="flex items-center h-full">
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                  bothHeld
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {bothHeld ? '🔒 Both Legs Locked' : '⏳ Awaiting Dual Hold'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Actions',
        width: 220,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams) => {
          const tradeComposite: TradeComposite = params.data;
          const status = tradeComposite.trade.status;
          const isAccepted = status === 'ACCEPTED';
          const isSettled = status === 'SETTLED';

          return (
            <div className="flex items-center gap-2 h-full">
              {isAccepted && (
                <button
                  onClick={() => onOpenPayPalModal(tradeComposite)}
                  className="px-2.5 py-1 rounded bg-gradient-to-r from-paypal-blue to-primary hover:from-primary hover:to-primary-light text-white font-semibold text-xs shadow-glow flex items-center gap-1 transition-all"
                  title="Checkout & Settle via PayPal Sandbox"
                >
                  <Play className="w-3 h-3 fill-white" /> Settle PayPal
                </button>
              )}
              {isSettled && (
                <span className="text-xs text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                </span>
              )}
              <button
                onClick={() => {
                  onSelectTrade(tradeComposite.trade.tradeId);
                  onNavigate('trade-detail');
                }}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="View Full Settlement Details"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        },
      },
    ];
  }, [onOpenPayPalModal, onSelectTrade, onNavigate]);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      sortable: true,
      filter: true,
      resizable: true,
    };
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Header Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Table className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-tight">Active Settlements & Corridor Flow</h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Powered by AG Grid
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Enterprise real-time grid of sovereign Payment-versus-Payment (PvP) settlement transactions.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Search, Status Filter, CSV Export */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Quick search trades..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary w-52"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
            {['ALL', 'PROPOSED', 'ACCEPTED', 'SETTLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-primary text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl overflow-hidden">
        <div className="ag-theme-quartz-dark w-full h-[520px]">
          <AgGridReact
            ref={gridRef}
            rowData={rowData}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={10}
            animateRows={true}
            rowHeight={48}
            headerHeight={44}
          />
        </div>
      </div>

      {/* Grid Legend & Metrics Footer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-xs font-medium">Total Pipeline Trades</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{trades.length} Trades</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Real-time AG Grid sorting & filtering active
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-xs font-medium">Settled Volume (Atomic PvP)</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            {trades.filter((t) => t.trade.status === 'SETTLED').length} Settled
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Dual-leg funds debited & credited simultaneously</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-xs font-medium">PayPal Sandbox Readiness</div>
          <div className="text-xl font-bold text-paypal-gold mt-1 font-mono">100% Sandbox</div>
          <div className="text-[11px] text-slate-400 mt-1">Orders v2 capture & Batch Payouts active</div>
        </div>
      </div>
    </div>
  );
};
