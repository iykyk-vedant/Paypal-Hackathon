import React, { useState } from 'react';
import { TradeComposite, ScreenId } from '../types';
import { FileCheck2, Search, ShieldCheck, Key, Terminal, ExternalLink } from 'lucide-react';

interface AuditorPortalProps {
  trades: TradeComposite[];
  onSelectTrade: (tradeId: string) => void;
  onNavigate: (screen: ScreenId) => void;
}

export const AuditorPortal: React.FC<AuditorPortalProps> = ({
  trades,
  onSelectTrade,
  onNavigate,
}) => {
  const [searchId, setSearchId] = useState<string>('T-1042');
  const [verifiedTrade, setVerifiedTrade] = useState<TradeComposite | null>(
    trades.find((t) => t.trade.tradeId === 'T-1042') || trades[0] || null
  );

  const handleSearch = () => {
    const found = trades.find(
      (t) => t.trade.tradeId.toLowerCase() === searchId.toLowerCase().trim()
    );
    setVerifiedTrade(found || null);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl border border-purple-200">
            <FileCheck2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Settlement Receipt Review</h2>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Review sample trade records and receipt references; no signatures or provider events are verified here.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Trade ID (e.g. T-1042)..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-purple-400 w-64"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-3.5 py-1.5 bg-violet-100 hover:bg-violet-100 text-slate-900 rounded-lg text-xs font-semibold transition-all"
          >
            Reconstruct Trail
          </button>
        </div>
      </div>

      {verifiedTrade ? (
        <div className="space-y-6">
          {/* Verification Header */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs text-slate-600 font-mono">Demo trade record:</span>
                <h3 className="text-xl font-bold text-slate-900 font-mono">{verifiedTrade.trade.tradeId}</h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold font-mono">
                  Sample fixture; not verified
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-600 text-[11px]">Receipt reference (not a proof):</div>
                <div className="text-cyan-800 font-bold truncate">
                  {verifiedTrade.trade.receiptHash || 'Not recorded'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-600 text-[11px]">PayPal Order Reference:</div>
                <div className="text-amber-800 font-bold truncate">
                  {verifiedTrade.trade.paypalOrderId || 'Not recorded'}
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div className="text-slate-600 text-[11px]">Sample Corridor:</div>
                <div className="text-slate-900 font-bold">
                  {verifiedTrade.trade.ccyA} <span className="text-slate-600">↔</span> {verifiedTrade.trade.ccyB}
                </div>
              </div>
            </div>
          </div>

          {/* Reconstruction Timeline */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-800" /> Sample Workflow Stages (Fixture Only)
            </h3>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0"></div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">1. Demo Proposal & Leg A Hold</span>
                    <span className="text-slate-600 text-[11px]">Sample step</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">Illustrative fixture step; no live escrow or Fabric transaction was checked.</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-500 mt-1 shrink-0"></div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">2. Counterparty Accept & Leg B Hold</span>
                    <span className="text-slate-600 text-[11px]">Sample step</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">Illustrative fixture step; no counterparty hold was verified.</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1 shrink-0"></div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">3. PayPal Funding / Capture Reference</span>
                    <span className="text-amber-800 text-[11px]">Sample event</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">This fixture does not verify a PayPal capture or update two currency legs.</div>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 bg-white rounded-xl border border-slate-200">
                <div className="w-2.5 h-2.5 rounded-full bg-purple-500 mt-1 shrink-0"></div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">4. Payout reference</span>
                    <span className="text-purple-800 text-[11px]">Sample event</span>
                  </div>
                  <div className="text-slate-600 text-[11px]">The fixture contains a payout reference; no external payout was verified.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-12 text-center text-slate-600 text-xs">
          Demo trade ID "{searchId}" was not found in the in-memory ledger.
        </div>
      )}
    </div>
  );
};
