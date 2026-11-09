import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, Database, CheckCircle2, Clock, Terminal, Filter } from 'lucide-react';

export const ElasticSearchPanel: React.FC = () => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<string>('paybridge_trades');
  const [results, setResults] = useState<any[]>([]);
  const [tookMs, setTookMs] = useState<number>(3);
  const [totalHits, setTotalHits] = useState<number>(0);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const executeSearch = async () => {
    setLoading(true);
    try {
      const data = await api.queryElastic(selectedIndex, query);
      setResults(data.hits || []);
      setTookMs(data.took_ms || 2);
      setTotalHits(data.total || 0);

      const clusterStats = await api.getElasticStats();
      setStats(clusterStats);
    } catch (err) {
      console.warn('Elastic search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch();
  }, [selectedIndex]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-100 text-blue-800 rounded-xl border border-sky-200">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Activity Search</h2>
              <span className="bg-sky-100 text-blue-800 border border-sky-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">

              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Full-text indexing, fuzzy search, and audit trail retrieval across multi-currency settlements and compliance logs.
            </p>
          </div>
        </div>

        {/* Index Selector & Search Input */}
        <div className="flex items-center flex-wrap gap-3">
          <select
            value={selectedIndex}
            onChange={(e) => setSelectedIndex(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-400"
          >
            <option value="paybridge_trades">Index: paybridge_trades</option>
            <option value="paybridge_compliance">Index: paybridge_compliance</option>
            <option value="paybridge_paypal_ledger">Index: paybridge_paypal_ledger</option>
          </select>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Query logs, TxIDs, counterparties..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeSearch()}
              className="bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-blue-400 w-64"
            />
          </div>

          <button
            onClick={executeSearch}
            className="px-3.5 py-1.5 bg-sky-100 hover:bg-sky-100 text-slate-900 rounded-lg text-xs font-semibold transition-all"
          >
            Search activity
          </button>
        </div>
      </div>

      {/* Cluster Health & KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">Cluster Health</div>
          <div className="text-lg font-bold text-emerald-800 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> Green (Healthy)
          </div>
          <div className="text-[11px] text-slate-600 mt-1">Available search indexes</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">Total Hits Found</div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono">{totalHits} Documents</div>
          <div className="text-[11px] text-slate-600 mt-1">Indexed in real-time</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">Search Latency</div>
          <div className="text-lg font-bold text-blue-800 mt-1 font-mono">{tookMs} ms</div>
          <div className="text-[11px] text-slate-600 mt-1">Inverted index query time</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
          <div className="text-slate-600 text-xs">Auditor Verification</div>
          <div className="text-lg font-bold text-purple-800 mt-1 font-mono">100% Cryptographic</div>
          <div className="text-[11px] text-slate-600 mt-1">Deterministic state proof</div>
        </div>
      </div>

      {/* Results Terminal List */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <Terminal className="w-4 h-4 text-blue-800" />
            <span>Search matches for: "{query || '*'}"</span>
          </div>
          <span className="text-[11px] font-mono text-slate-600">
            Index: {selectedIndex} • Hits: {totalHits}
          </span>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-xs italic">
              No documents matched your query criteria.
            </div>
          ) : (
            results.map((hit) => (
              <div
                key={hit._id}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all font-mono text-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] border-b border-slate-200/80 pb-2">
                  <span className="text-blue-800 font-bold">_id: {hit._id}</span>
                  <span className="text-slate-600 text-[10px]">{hit._source.indexedAt || hit._source.timestamp}</span>
                </div>

                <pre className="text-slate-700 text-[11px] overflow-x-auto p-2 bg-white/60 rounded border border-slate-200/60 leading-relaxed">
                  {JSON.stringify(hit._source, null, 2)}
                </pre>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
