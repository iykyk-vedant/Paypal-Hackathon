import React, { useState, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import '../grid.css';
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
              <span className="font-mono font-bold text-cyan-800 hover:underline cursor-pointer">
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
          let color = 'bg-slate-100 text-slate-700 border-slate-300';
          let icon = <Clock className="w-3 h-3" />;

          if (status === 'SETTLED') {
            color = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            icon = <CheckCircle2 className="w-3 h-3 text-emerald-800" />;
          } else if (status === 'ACCEPTED') {
            color = 'bg-sky-100 text-sky-800 border-sky-200';
            icon = <Sparkles className="w-3 h-3 text-sky-800" />;
          } else if (status === 'PROPOSED') {
            color = 'bg-amber-100 text-amber-800 border-amber-200';
          } else if (status === 'REFUSED') {
            color = 'bg-rose-100 text-rose-800 border-rose-200/40';
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
              <span className="bg-white border border-slate-300/80 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-900">
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
            <div className="flex items-center h-full font-mono font-semibold text-slate-800">
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
            <div className="flex items-center h-full font-mono font-semibold text-slate-800">
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
            <div className="flex items-center h-full font-mono text-xs text-slate-700">
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
                <span className="font-mono text-amber-800 text-[11px] font-semibold truncate flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-paypal-gold"></span>
                  {orderId}
                </span>
              ) : (
                <span className="text-slate-600 text-[11px]">Ready to Authorize</span>
              )}
              <span className="text-[10px] text-slate-600">{status}</span>
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
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
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
                  className="px-2.5 py-1 rounded bg-gradient-to-r from-paypal-blue to-primary hover:from-sky-100 hover:to-sky-100 text-slate-900 font-semibold text-xs shadow-glow flex items-center gap-1 transition-all"
                  title="Checkout & Settle via PayPal Sandbox"
                >
                  <Play className="w-3 h-3 fill-white" /> Settle PayPal
                </button>
              )}
              {isSettled && (
                <span className="text-xs text-emerald-800 font-mono flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                </span>
              )}
              <button
                onClick={() => {
                  onSelectTrade(tradeComposite.trade.tradeId);
                  onNavigate('trade-detail');
                }}
                className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
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
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200">
              <Table className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Active Settlements & Corridor Flow</h2>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">

                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Settlement records in the in-memory demo ledger. They are not synchronized with Fabric.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Search, Status Filter, CSV Export */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Quick search trades..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-200 w-52"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
            {['ALL', 'PROPOSED', 'ACCEPTED', 'SETTLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  statusFilter === st
                    ? 'bg-sky-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5 text-emerald-800" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* AG Grid Container */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200 shadow-xl overflow-hidden">
        <div className="ag-theme-quartz w-full h-[520px]">
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
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs font-medium">Total Pipeline Trades</div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">{trades.length} Trades</div>
          <div className="text-[11px] text-emerald-800 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Sorting, filtering, and export available
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs font-medium">Settled Demo Trades</div>
          <div className="text-xl font-bold text-emerald-800 mt-1 font-mono">
            {trades.filter((t) => t.trade.status === 'SETTLED').length} Settled
          </div>
          <div className="text-[11px] text-slate-700 mt-1">Status recorded in the in-memory demo ledger</div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs font-medium">PayPal Sandbox Readiness</div>
          <div className="text-xl font-bold text-amber-800 mt-1 font-mono">Sandbox mode</div>
          <div className="text-[11px] text-slate-700 mt-1">Live calls require valid credentials and payer approval</div>
        </div>
      </div>
    </div>
  );
};
