import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { api } from '../api';
import { FabricBlock } from '../types';
import { Blocks, Search, Download, CheckCircle2, Cloud, Server, ShieldCheck, ExternalLink } from 'lucide-react';

export const FabricBlockExplorer: React.FC = () => {
  const gridRef = useRef<AgGridReact>(null);
  const [blocks, setBlocks] = useState<FabricBlock[]>([]);
  const [status, setStatus] = useState<any | null>(null);
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
            <span className="font-mono font-bold text-accent-cyan text-xs">
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
            <span className="bg-slate-900 border border-slate-700/80 px-2 py-0.5 rounded text-xs font-mono font-semibold text-slate-200">
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
          <div className="flex items-center h-full font-mono text-xs text-white">
            {params.value} Tx
          </div>
        ),
      },
      {
        headerName: 'Data Hash',
        field: 'dataHash',
        width: 280,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono text-[11px] text-slate-300 truncate">
            {params.value}
          </div>
        ),
      },
      {
        headerName: 'Committed At (Consensus)',
        field: 'committedAt',
        width: 220,
        cellRenderer: (params: ICellRendererParams) => (
          <div className="flex items-center h-full font-mono text-xs text-slate-400">
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
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold border border-slate-700 transition-colors"
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
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Blocks className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Hyperledger Fabric 2.5 Block Explorer</h2>
              <span className="bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Consortium Channel: settlement
              </span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Powered by AG Grid
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live cryptographic inspection of Fabric ledger blocks, Read-Write sets, and dual-regulator endorsement signatures.
            </p>
          </div>
        </div>

        {/* Cloud Status Pill */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Cloud className="w-4 h-4 text-accent-cyan" />
            <div>
              <div className="text-[10px] text-slate-400">Fabric Network Mode:</div>
              <div className="text-white font-bold text-[11px]">{status?.mode || 'AWS Cloud Live'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Consortium Architecture & Consensus Meta */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-xs">Endorsement Policy</div>
          <div className="text-sm font-bold text-emerald-400 mt-1 font-mono truncate">
            {status?.activeEndorsementPolicy || "AND('RegA', 'RegB')"}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Dual central bank sovereign signatures required</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-xs">Orderer Consensus</div>
          <div className="text-sm font-bold text-white mt-1 font-mono">
            {status?.consensus || '3-Node Raft Cluster'}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Crash Fault Tolerant (CFT) Leader</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-xs">Chaincode Architecture</div>
          <div className="text-sm font-bold text-primary-light mt-1 font-mono">
            Go 1.23 CCAAS (Docker)
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Chaincode-as-a-Service on port 9999</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
          <div className="text-slate-400 text-xs">PayPal Atomic Bridge</div>
          <div className="text-sm font-bold text-paypal-gold mt-1 font-mono">
            Orders v2 ↔ Block Commit
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Disburses payouts on block consensus</div>
        </div>
      </div>

      {/* AG Grid Blocks Table */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl overflow-hidden space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-bold text-white">Committed Ledger Blocks</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search blocks or hashes..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 w-48"
            />
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-medium"
            >
              <Download className="w-3 h-3 text-emerald-400" /> Export CSV
            </button>
          </div>
        </div>

        <div className="ag-theme-quartz-dark w-full h-[320px]">
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
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Blocks className="w-4 h-4 text-accent-cyan" />
              <span>Block #{selectedBlock.blockNumber} — Transaction Payload & Endorsement Signatures</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">{selectedBlock.committedAt}</span>
          </div>

          <div className="space-y-3">
            {selectedBlock.transactions.map((tx) => (
              <div key={tx.txId} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">TxID:</span>
                    <span className="font-bold text-accent-cyan">{tx.txId}</span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.2 rounded font-bold">
                      {tx.validationCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Chaincode Function: <strong className="text-white">{tx.function}</strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] text-slate-400">Sovereign Endorsements:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tx.endorsements?.map((end: string) => (
                        <span key={end} className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-semibold">
                          ✓ {end}
                        </span>
                      ))}
                    </div>
                  </div>

                  {tx.paypalLinkage && (
                    <div>
                      <span className="text-[11px] text-slate-400">PayPal Atomic Linkage:</span>
                      <div className="mt-1 text-[11px] space-y-0.5">
                        <div>Order ID: <span className="text-paypal-gold font-bold">{tx.paypalLinkage.orderId}</span></div>
                        <div>Payout Batch: <span className="text-purple-300 font-bold">{tx.paypalLinkage.payoutBatchId}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {tx.readWriteSets && (
                  <div className="pt-2 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">LevelDB Read-Write Set (State Updates):</span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {tx.readWriteSets.map((rw: any, i: number) => (
                        <span key={i} className="bg-slate-900/90 border border-slate-800 px-2 py-1 rounded text-[11px] text-slate-300">
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
  );
};
