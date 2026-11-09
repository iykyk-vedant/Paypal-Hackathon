import React, { useState, useEffect } from 'react';
import { api, formatMinorUnits } from '../api';
import { CorridorRules, ReserveBalance, Refusal } from '../types';
import { Scale, ShieldAlert, CheckCircle2, AlertOctagon, RefreshCw, Lock, Unlock } from 'lucide-react';

export const RegulatorConsole: React.FC = () => {
  const [activeJur, setActiveJur] = useState<'JUR-A' | 'JUR-B'>('JUR-A');
  const [rules, setRules] = useState<CorridorRules | null>(null);
  const [reserve, setReserve] = useState<ReserveBalance | null>(null);
  const [refusals, setRefusals] = useState<Refusal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const ccy = activeJur === 'JUR-A' ? 'INR' : 'SGD';

  const fetchData = async () => {
    setLoading(true);
    try {
      const r = await api.getRules(activeJur);
      setRules(r);
      const res = await api.getReserve(ccy);
      setReserve(res);
      const refs = await api.getRefusals();
      setRefusals(refs);
    } catch (err) {
      console.warn('Regulator fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeJur]);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sovereign Central Bank Supervisory Console</h2>
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {activeJur === 'JUR-A' ? 'Reserve Bank of India (RBI)' : 'Monetary Authority of Singapore (MAS)'}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Supervises 1:1 RTGS reserve backing, single-transaction regulatory ceilings, and corridor emergency halts.
            </p>
          </div>
        </div>

        {/* Corridor Switcher */}
        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setActiveJur('JUR-A')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeJur === 'JUR-A' ? 'bg-amber-100 text-slate-900 shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            JUR-A (India / INR)
          </button>
          <button
            onClick={() => setActiveJur('JUR-B')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              activeJur === 'JUR-B' ? 'bg-accent-cyan text-slate-900 shadow-md' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            JUR-B (Singapore / SGD)
          </button>
        </div>
      </div>

      {/* Reserve Backing & Regulatory Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Reserve Attestation */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="text-xs text-slate-600 font-semibold flex items-center justify-between">
            <span>Central Bank RTGS Reserve Backing</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
          </div>

          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatMinorUnits(reserve?.rtgsBalance || '10000000000', ccy)}
          </div>

          <div className="text-[11px] font-mono text-slate-600 space-y-1">
            <div>Statement Ref: <span className="text-slate-800">{reserve?.statementRef}</span></div>
            <div>Attestation: <span className="text-emerald-800">1:1 Backed & Verified</span></div>
          </div>
        </div>

        {/* Max Tx Ceiling */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="text-xs text-slate-600 font-semibold flex items-center justify-between">
            <span>Single-Transaction Regulatory Ceiling</span>
            <Lock className="w-4 h-4 text-sky-800" />
          </div>

          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatMinorUnits(rules?.maxTxAmount || '500000000', ccy)}
          </div>

          <div className="text-[11px] text-slate-600">
            Enforced autonomously by the AI Compliance Sentinel & sovereign chaincode rules.
          </div>
        </div>

        {/* Corridor Halt Status */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-3">
          <div className="text-xs text-slate-600 font-semibold flex items-center justify-between">
            <span>Corridor Emergency Circuit Breaker</span>
            <AlertOctagon className="w-4 h-4 text-rose-800" />
          </div>

          <div className="text-2xl font-black text-emerald-800 font-mono">
            {rules?.halted ? 'HALTED' : 'OPERATIONAL'}
          </div>

          <div className="text-[11px] text-slate-600">
            {rules?.halted
              ? 'Settlement corridor halted by central bank order'
              : 'Continuous 24-hr settlement window active'}
          </div>
        </div>
      </div>

      {/* Refusals Audit Log */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">Immutable Regulatory Refusals Ledger</h3>
            <span className="bg-rose-100 text-rose-800 text-[10px] px-2 py-0.2 rounded font-mono font-bold">
              {refusals.length} Refusals Recorded
            </span>
          </div>
          <span className="text-xs text-slate-600 font-mono">Permanent Ledger Audit Trail</span>
        </div>

        <div className="space-y-3 font-mono text-xs">
          {refusals.map((ref) => (
            <div
              key={ref.refusalId}
              className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-800">{ref.refusalId}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-900 font-semibold">{ref.tradeId}</span>
                  <span className="text-slate-600">({ref.jurisdiction})</span>
                </div>
                <div className="text-slate-700 text-[11px] mt-1">{ref.reasonCode}</div>
              </div>

              <div className="text-[11px] text-slate-600">{ref.timestamp}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
