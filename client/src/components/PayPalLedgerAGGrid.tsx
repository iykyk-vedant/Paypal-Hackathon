import React, { useState, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import '../grid.css';
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
            <span className="font-mono font-bold text-cyan-800 text-xs">{params.value}</span>
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
              <span className="text-amber-800 font-semibold">{id}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                isPayout ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'
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
                <ArrowUpRight className="w-3.5 h-3.5 text-purple-800" />
              ) : (
                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-800" />
              )}
              <span className="font-semibold text-slate-800">{val}</span>
            </div>
          );
        },
      },
      {
        headerName: 'Gross Amount',
        field: 'grossAmount',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono font-bold text-slate-900 text-xs">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'PayPal Fee',
        field: 'paypalFee',
        width: 130,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono text-xs text-slate-600">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'Net Disbursed',
        field: 'netAmount',
        width: 150,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono font-bold text-emerald-800 text-xs">
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
            <span className="bg-white border border-slate-300/80 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700">
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
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3 text-emerald-800" />
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
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 text-sky-800 rounded-xl border border-sky-200">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">PayPal Sandbox Transaction Ledger</h2>

              <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">

              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Live audit stream of all PayPal Sandbox captures, vendor disbursements, and fees.
            </p>
          </div>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter PayPal events..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-sky-200 w-52"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-medium transition-all"
          >
            <Download className="w-3.5 h-3.5 text-amber-800" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-600 text-xs">
            <span>Total Captured Transactions</span>
            <DollarSign className="w-4 h-4 text-emerald-800" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">{ledger.length} Events</div>
          <div className="text-[11px] text-slate-700 mt-1">Seeded and simulated events may be included</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-600 text-xs">
            <span>Settlement Mode</span>
            <CreditCard className="w-4 h-4 text-sky-800" />
          </div>
          <div className="text-2xl font-bold text-sky-800 mt-1 font-mono">Demo ledger</div>
          <div className="text-[11px] text-slate-700 mt-1">PayPal events are not atomic with Fabric</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="flex items-center justify-between text-slate-600 text-xs">
            <span>Automated Batch Payouts</span>
            <ArrowUpRight className="w-4 h-4 text-purple-800" />
          </div>
          <div className="text-2xl font-bold text-purple-800 mt-1 font-mono">
            {ledger.filter((l) => l.type?.includes('PAYOUT')).length} Disbursed
          </div>
          <div className="text-[11px] text-slate-600 mt-1">Direct to overseas vendor accounts</div>
        </div>
      </div>

      {/* AG Grid Table */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200 shadow-xl overflow-hidden">
        <div className="ag-theme-quartz w-full h-[480px]">
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
