import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import '../grid.css';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { api } from '../api';
import { FabricBlock, TradeComposite } from '../types';
import { Blocks, Search, Download, CheckCircle2, Cloud, Server, ShieldCheck, ExternalLink } from 'lucide-react';
import { FabricLedgerActions } from './FabricLedgerActions';

export const FabricBlockExplorer: React.FC<{ canWrite?: boolean; currentMsp?: string; demoTrades?: TradeComposite[]; onCapturePayPal?: (trade: TradeComposite) => void }> = ({ canWrite = false, currentMsp, demoTrades, onCapturePayPal }) => {
  const gridRef = useRef<AgGridReact>(null);
  const [blocks, setBlocks] = useState<FabricBlock[]>([]);
  const [status, setStatus] = useState<any | null>(null);
  const [ledgerSnapshot, setLedgerSnapshot] = useState<any | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<FabricBlock | null>(null);
  const [quickFilterText, setQuickFilterText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [blockList, statusData] = await Promise.all([
        api.getFabricBlocks(),
        api.getFabricStatus(),
      ]);
      setBlocks(blockList || []);
      setStatus(statusData);
      if (statusData?.gatewayConnected) {
        try {
          setLedgerSnapshot(await api.getFabricLedgerSnapshot());
        } catch (ledgerError) {
          setLedgerSnapshot({ error: ledgerError instanceof Error ? ledgerError.message : 'Live ledger query failed' });
        }
      } else {
        setLedgerSnapshot(null);
      }
      if (blockList?.length > 0 && !selectedBlock) {
        setSelectedBlock(blockList[0]);
      }
    } catch (err) {
      console.warn('Fabric explorer fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExportCsv = useCallback(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `fabric_blocks_${new Date().toISOString().slice(0, 10)}.csv`,
      });
    }
  }, []);

  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      {
        headerName: 'Block #',
        field: 'blockNumber',
        width: 120,
        pinned: 'left',
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full">
            <span className="font-mono font-bold text-cyan-800 text-xs">
              #{params.value}
            </span>
          </div>
        ),
      },
      {
        headerName: 'Channel',
        field: 'channelId',
        width: 140,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full">
            <span className="bg-white border border-slate-300/80 px-2 py-0.5 rounded text-xs font-mono font-semibold text-slate-800">
              {params.value}
            </span>
          </div>
        ),
      },
      {
        headerName: 'Transactions',
        field: 'txCount',
        width: 130,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono text-xs text-slate-900">
            {params.value} Tx
          </div>
        ),
      },
      {
        headerName: 'Data Hash',
        field: 'dataHash',
        width: 280,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono text-[11px] text-slate-700 truncate">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'Committed At (Consensus)',
        field: 'committedAt',
        width: 220,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono text-xs text-slate-600">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'Actions',
        width: 120,
        pinned: 'right',
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full">
            <button
              onClick={() => setSelectedBlock(params.data)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded text-xs font-semibold border border-slate-300 transition-colors"
            >
              Inspect
            </button>
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
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 text-blue-800 rounded-xl border border-sky-200">
            <Blocks className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fabric settlement</h2>
              <span className="bg-sky-100 text-blue-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {status?.gatewayConnected ? `Live Channel: ${status.channelId || 'settlement'}` : 'Sample Channel: settlement'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Follow a trade and see the participating peers’ committed activity.
            </p>
          </div>
        </div>

        {/* Cloud Status Pill */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Cloud className="w-4 h-4 text-cyan-800" />
            <div>
              <div className="text-[10px] text-slate-600">Fabric Network Mode:</div>
              <div className="text-slate-900 font-bold text-[11px]">{status?.gatewayConnected ? status?.writeReady ? 'Live · ready' : 'Live · read-only' : 'Sample mode'}</div>
              <div className="text-[10px] text-slate-600">
                {status?.gatewayConnected ? 'Gateway query verified' : status?.peerReachable ? 'peer reachable (Gateway not connected)' : status?.peerConfigured ? 'unreachable' : 'not configured'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {ledgerSnapshot && (
        <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">Read-only ledger diagnostics</summary>
        <section className="glass-panel rounded-2xl p-5 border border-emerald-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900">Live chaincode query snapshot</h3>
              <p className="text-xs text-slate-600">Read-only Fabric Gateway queries. The block table below remains seeded fixture data.</p>
            </div>
            <span className="text-[10px] font-bold uppercase rounded-full px-2 py-1 bg-emerald-100 text-emerald-800">{ledgerSnapshot.mode || 'Query error'}</span>
          </div>
          {ledgerSnapshot.queries ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(ledgerSnapshot.queries).map(([name, result]: [string, any]) => (
                <div key={name} className="rounded-lg border border-slate-200 bg-white p-3 min-w-0">
                  <div className="text-xs font-semibold text-slate-800">{name}</div>
                  <pre className="mt-1 text-[11px] text-slate-600 whitespace-pre-wrap break-words max-h-40 overflow-auto">{result.ok ? JSON.stringify(result.data, null, 2) : result.error}</pre>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-rose-700">{ledgerSnapshot.error || 'Unable to query live ledger.'}</p>}
          <p className="text-[11px] text-slate-500">{ledgerSnapshot.notice || 'Queries are not transactions and do not change ledger state.'}</p>
        </section>
        </details>
      )}

      {canWrite && <FabricLedgerActions
        currentMsp={currentMsp || 'BankA1MSP'}
        enabled={Boolean(status?.gatewayConnected && status?.writeReady)}
        onChanged={fetchData}
        demoTrades={demoTrades}
        onCapturePayPal={onCapturePayPal}
      />}

      <details className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <summary className="cursor-pointer text-xs font-semibold text-slate-600">Network details and sample block fixtures</summary>
      <div className="mt-4 space-y-6">
      {/* Consortium Architecture & Consensus Meta */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">Endorsement Policy</div>
          <div className="text-sm font-bold text-emerald-800 mt-1 font-mono truncate">
            {status?.activeEndorsementPolicy || "AND('RegA', 'RegB')"}
          </div>
          <div className="text-[10px] text-slate-600 mt-1">Example policy details; signatures not checked</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">Orderer Consensus</div>
          <div className="text-sm font-bold text-slate-900 mt-1 font-mono">
            {status?.consensus || '3-Node Raft Cluster'}
          </div>
          <div className="text-[10px] text-slate-600 mt-1">Crash Fault Tolerant (CFT) Leader</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">Chaincode Architecture</div>
          <div className="text-sm font-bold text-sky-800 mt-1 font-mono">
            Go 1.23 CCAAS (Docker)
          </div>
          <div className="text-[10px] text-slate-600 mt-1">Chaincode-as-a-Service on port 9999</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">PayPal event references in fixtures</div>
          <div className="text-sm font-bold text-amber-800 mt-1 font-mono">
            Sample order reference
          </div>
          <div className="text-[10px] text-slate-600 mt-1">No payout is triggered by fixture data</div>
        </div>
      </div>

      {/* AG Grid Blocks Table */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-200 shadow-xl overflow-hidden space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold text-slate-900">Seeded sample blocks</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search blocks or hashes..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-400 w-48"
            />
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-medium"
            >
              <Download className="w-3 h-3 text-emerald-800" /> Export CSV
            </button>
          </div>
        </div>

        <div className="ag-theme-quartz w-full h-[320px]">
          <AgGridReact
            ref={gridRef}
            rowData={blocks}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            quickFilterText={quickFilterText}
            pagination={true}
            paginationPageSize={5}
            animateRows={true}
            rowHeight={46}
            headerHeight={42}
          />
        </div>
      </div>

      {/* Selected Block Transaction Deep Dive */}
      {selectedBlock && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Blocks className="w-4 h-4 text-cyan-800" />
              <span>Block #{selectedBlock.blockNumber} — Sample Payload & Fixture Endorsements</span>
            </h3>
            <span className="text-xs font-mono text-slate-600">{selectedBlock.committedAt}</span>
          </div>

          <div className="space-y-3">
            {selectedBlock.transactions.map((tx) => (
              <div key={tx.txId} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">TxID:</span>
                    <span className="font-bold text-cyan-800">{tx.txId}</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.2 rounded font-bold">
                      {tx.validationCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Chaincode Function: <strong className="text-slate-900">{tx.function}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-600">Endorsements listed in fixture:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tx.endorsements?.map((end: string) => (
                        <span key={end} className="bg-white border border-slate-300 px-2 py-0.5 rounded text-[10px] text-slate-700 font-semibold">
                          {end} (fixture)
                        </span>
                      ))}
                    </div>
                  </div>

                  {tx.paypalLinkage && (
                    <div>
                      <span className="text-[11px] text-slate-600">Sample PayPal references:</span>
                      <div className="mt-1 text-[11px] space-y-0.5">
                        <div>Order ID: <span className="text-amber-800 font-bold">{tx.paypalLinkage.orderId}</span></div>
                        <div>Payout Batch: <span className="text-purple-800 font-bold">{tx.paypalLinkage.payoutBatchId}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {tx.readWriteSets && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <span className="text-[11px] text-slate-600">LevelDB Read-Write Set (State Updates):</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {tx.readWriteSets.map((rw: any, i: number) => (
                        <span key={i} className="bg-white/90 border border-slate-200 px-2 py-1 rounded text-[11px] text-slate-700">
                          <strong>{rw.key}</strong> ➔ {rw.status || rw.delta}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      </details>
    </div>
  );
};
