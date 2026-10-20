import React, { useState, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { PayPalLedgerEntry } from '../types';
import { CreditCard, Download, Search, CheckCircle2, DollarSign, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface PayPalLedgerAGGridProps {
  ledger: PayPalLedgerEntry[];
  onRefresh: () => void;
}

export const PayPalLedgerAGGrid: React.FC<PayPalLedgerAGGridProps> = ({ ledger, onRefresh }) => {
  const gridRef = useRef<AgGridReact>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');

  const handleExportCsv = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `paybridge_paypal_ledger_${new Date().toISOString().slice(0, 10)}.csv`,
      });
    }
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      {
        headerName: 'Tx ID',
        field: 'transactionId',
        width: 150,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full">
            <span className="font-mono font-bold text-accent-cyan text-xs">{params.value}</span>
          </div>
        ),
      },
      {
        headerName: 'PayPal Identifier',
        field: 'paypalOrderId',
        width: 220,
        cellRenderer: (params: ICellRendererParams) => {
          const id = params.data?.paypalOrderId || params.data?.payoutBatchId;
          const isPayout = !!params.data?.payoutBatchId;
          return (
            <div className="flex items-center gap-1.5 h-full font-mono text-xs">
              <span className="text-paypal-gold font-semibold">{id}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                isPayout ? 'bg-purple-500/20 text-purple-300' : 'bg-paypal-blue/30 text-paypal-lightBlue'
              }`}>
                {isPayout ? 'PAYOUT' : 'ORDER'}
              </span>
            </div>
          );
        },
      },
      {
        headerName: 'Operation Type',
        field: 'type',
        width: 170,
        cellRenderer: (params: ICellRendererParams) => {
          const val = params.value;
          const isPayout = val?.includes('PAYOUT');
          return (
            <div className="flex items-center gap-1.5 h-full text-xs">
              {isPayout ? (
                <ArrowUpRight className="w-3.5 h-3.5 text-purple-400" />
              ) : (
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="font-semibold text-slate-200">{val}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Gross Amount',
        field: 'grossAmount',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono font-bold text-white text-xs">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'PayPal Fee',
        field: 'paypalFee',
        width: 130,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono text-xs text-slate-400">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'Net Disbursed',
        field: 'netAmount',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono font-bold text-emerald-400 text-xs">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'Sender Org',
        field: 'sender',
        width: 180,
      },
      {
        headerName: 'Recipient / Payee',
        field: 'recipient',
        width: 200,
      },
      {
        headerName: 'Corridor',
        field: 'corridor',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full">
            <span className="bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-[11px] font-mono text-slate-300">
              {params.value}
            </span>
          </div>
        ),
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 130,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full">
            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {params.value}
            </span>
          </div>
        ),
      },
    ];
  }, []);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      sortable: true,
      filter: true,
      resizable: true,
    };
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Header Card */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-paypal-blue/30 text-paypal-lightBlue rounded-xl border border-paypal-lightBlue/40">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">PayPal Sandbox Transaction Ledger</h2>
              <span className="bg-paypal-blue/30 border border-paypal-lightBlue/40 text-paypal-lightBlue text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Orders v2 & Batch Payouts v1
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Powered by AG Grid
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live audit stream of all PayPal Sandbox captures, vendor disbursements, and fees.
            </p>
          </div>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter PayPal events..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary w-52"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5 text-paypal-gold" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Captured Transactions</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-1 font-mono">{ledger.length} Events</div>
          <div className="text-[11px] text-emerald-400 mt-1">100% Sandbox capture success rate</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Settlement Mode</span>
            <CreditCard className="w-4 h-4 text-paypal-lightBlue" />
          </div>
          <div className="text-2xl font-bold text-paypal-lightBlue mt-1 font-mono">Atomic PvP</div>
          <div className="text-[11px] text-slate-400 mt-1">Captures release dual-leg holds simultaneously</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Automated Batch Payouts</span>
            <ArrowUpRight className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300 mt-1 font-mono">
            {ledger.filter((l) => l.type?.includes('PAYOUT')).length} Disbursed
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Direct to overseas vendor accounts</div>
        </div>
      </div>

      {/* AG Grid Table */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl overflow-hidden">
        <div className="ag-theme-quartz-dark w-full h-[480px]">
          <AgGridReact
            ref={gridRef}
            rowData={ledger}
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
    </div>
  );
};
