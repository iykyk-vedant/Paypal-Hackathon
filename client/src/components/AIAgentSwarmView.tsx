import React, { useState } from 'react';
import { api } from '../api';
import { Cpu, ShieldCheck, DollarSign, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Play, Terminal } from 'lucide-react';

export const AIAgentSwarmView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [agentType, setAgentType] = useState<'negotiate' | 'compliance' | 'treasury'>('negotiate');
  const [deliberationLogs, setDeliberationLogs] = useState<string[]>([
    '[System] Multi-Agent Swarm initialized on PayBridge Protocol.',
    '[Negotiator] Standing by for agentic bilateral commerce proposals.',
    '[Sentinel] Active OFAC/FATF sanctions and corridor limit screening armed.',
    '[Treasury] Monitoring INR, SGD, and USD reserve coverage.',
  ]);

  // Form State
  const [currencyFrom, setCurrencyFrom] = useState<'INR' | 'SGD' | 'USD'>('INR');
  const [currencyTo, setCurrencyTo] = useState<'INR' | 'SGD' | 'USD'>('SGD');
  const [amountFrom, setAmountFrom] = useState<number>(1000000);
  const [resultData, setResultData] = useState<any | null>(null);

  // Trigger Negotiation Agent
  const handleRunNegotiate = async () => {
    setLoading(true);
    setAgentType('negotiate');
    try {
      const res = await api.aiNegotiate({
        buyerOrg: 'BankA1',
        sellerOrg: 'BankB1',
        currencyFrom,
        currencyTo,
        amountFrom: amountFrom * 100, // into minor units
      });
      setResultData(res);
      setDeliberationLogs((prev) => [...prev, ...res.deliberationLog]);
    } catch (err: any) {
      setDeliberationLogs((prev) => [...prev, `[Error] ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Compliance Sentinel
  const handleRunCompliance = async () => {
    setLoading(true);
    setAgentType('compliance');
    try {
      const res = await api.aiRiskScreen({
        tradeId: `T-AGENT-${Date.now().toString().slice(-4)}`,
        proposerOrg: 'BankA1',
        counterpartyOrg: 'BankB1',
        currencyA: currencyFrom,
        amountA: String(amountFrom * 100),
        currencyB: currencyTo,
        amountB: String(Math.round(amountFrom * 0.016 * 100)),
      });
      setResultData(res);
      setDeliberationLogs((prev) => [...prev, ...res.deliberationLog]);
    } catch (err: any) {
      setDeliberationLogs((prev) => [...prev, `[Error] ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Treasury Orchestrator
  const handleRunTreasury = async () => {
    setLoading(true);
    setAgentType('treasury');
    try {
      const res = await api.aiTreasuryOrchestrate();
      setResultData(res);
      setDeliberationLogs((prev) => [
        ...prev,
        `[Treasury] INR Coverage Ratio: ${res.inrCoverageRatio}`,
        `[Treasury] SGD Coverage Ratio: ${res.sgdCoverageRatio}`,
        ...res.recommendations.map((r: any) => `[Treasury Recommendation] ${r.action}: ${r.reason}`),
      ]);
    } catch (err: any) {
      setDeliberationLogs((prev) => [...prev, `[Error] ${err.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-accent-cyan/20 text-cyan-800 rounded-xl border border-accent-cyan/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">AI Multi-Agent Swarm (Agentic Commerce)</h2>
              <span className="bg-accent-cyan/20 border border-accent-cyan/40 text-cyan-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Autonomous Swarm
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Three specialized agents collaborating on B2B negotiation, regulatory AML guardrails, and PayPal payouts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunNegotiate}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-100 text-slate-900 text-xs font-semibold shadow-glow flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" /> Negotiate Trade
          </button>
          <button
            onClick={handleRunCompliance}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-semibold border border-slate-300 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-800" /> AML Screen
          </button>
          <button
            onClick={handleRunTreasury}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-100 text-purple-800 text-xs font-semibold border border-purple-700/60 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <DollarSign className="w-3.5 h-3.5 text-purple-800" /> Treasury Rebalance
          </button>
        </div>
      </div>

      {/* Swarm Architecture Triad */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Agent 1 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 relative overflow-hidden group hover:border-sky-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">Agent 01</span>
            <span className="w-2 h-2 rounded-full bg-emerald-100 animate-pulse"></span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-2">Trade Negotiation Agent</h3>
          <p className="text-xs text-slate-600 mt-1">
            Evaluates corridor liquidity, dynamic FX spread, and locks institutional volume discounts.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Model:</span>
              <span className="text-slate-900">Gemini / Heuristic Swarm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Specialty:</span>
              <span className="text-sky-800">Bilateral B2B Forward Hedging</span>
            </div>
          </div>
        </div>

        {/* Agent 2 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 relative overflow-hidden group hover:border-accent-cyan/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Agent 02</span>
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-2">Compliance & AML Sentinel</h3>
          <p className="text-xs text-slate-600 mt-1">
            Real-time screening against single-tx corridor caps, sanctions watchlists, and regulatory operating windows.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Watchlists:</span>
              <span className="text-slate-900">OFAC / FATF / Interpol</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Output:</span>
              <span className="text-cyan-800">Deterministic Refusal / Pass</span>
            </div>
          </div>
        </div>

        {/* Agent 3 */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200 relative overflow-hidden group hover:border-violet-200/50 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">Agent 03</span>
            <span className="w-2 h-2 rounded-full bg-violet-100 animate-pulse"></span>
          </div>
          <h3 className="text-base font-bold text-slate-900 mt-2">Treasury Orchestrator</h3>
          <p className="text-xs text-slate-600 mt-1">
            Monitors multi-currency float and automatically triggers PayPal Batch Payouts for atomic fund releases.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-mono text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-600">Integration:</span>
              <span className="text-slate-900">PayPal Payouts v1</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Action:</span>
              <span className="text-purple-800">Automated Vendor Disbursements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Agent Deliberation Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls Card */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Play className="w-4 h-4 text-sky-800" /> Test Agent Deliberation Parameters
            </h3>
            <span className="text-[10px] text-slate-600 font-mono">Live Sandbox Execution</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 font-medium">Source Currency</label>
              <select
                value={currencyFrom}
                onChange={(e: any) => setCurrencyFrom(e.target.value)}
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-200"
              >
                <option value="INR">INR (India)</option>
                <option value="SGD">SGD (Singapore)</option>
                <option value="USD">USD (Global)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 font-medium">Destination Currency</label>
              <select
                value={currencyTo}
                onChange={(e: any) => setCurrencyTo(e.target.value)}
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-200"
              >
                <option value="SGD">SGD (Singapore)</option>
                <option value="INR">INR (India)</option>
                <option value="USD">USD (Global)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600 font-medium">Trade Amount (Base Currency Units)</label>
            <input
              type="number"
              value={amountFrom}
              onChange={(e) => setAmountFrom(Number(e.target.value))}
              className="w-full mt-1.5 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-200"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleRunNegotiate}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-sky-100 hover:bg-sky-100 text-slate-900 text-xs font-bold transition-all shadow-glow flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Trigger Negotiation
            </button>
            <button
              onClick={handleRunCompliance}
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-900 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-cyan-800" /> Screen AML Risk
            </button>
          </div>

          {resultData && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs font-mono space-y-2 mt-4">
              <div className="text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                Agent Verdict & Synthesized Terms:
              </div>
              {resultData.agreedFx && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Locked Forward FX:</span>
                  <span className="text-emerald-800 font-bold">{resultData.agreedFx} (Discount: {resultData.discountAppliedPct}%)</span>
                </div>
              )}
              {resultData.verdict && (
                <div className="flex justify-between">
                  <span className="text-slate-600">AML Compliance Verdict:</span>
                  <span className={resultData.verdict === 'APPROVED' ? 'text-emerald-800 font-bold' : 'text-rose-800 font-bold'}>
                    {resultData.verdict} (Risk Score: {resultData.riskScore}/100)
                  </span>
                </div>
              )}
              {resultData.inrCoverageRatio && (
                <div className="flex justify-between">
                  <span className="text-slate-600">INR / SGD Coverage:</span>
                  <span className="text-purple-800 font-bold">{resultData.inrCoverageRatio} / {resultData.sgdCoverageRatio}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Swarm Deliberation Terminal */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <Terminal className="w-4 h-4 text-emerald-800" />
                <span>Live Swarm Deliberation Trace</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-mono">Stream Active</span>
            </div>

            <div className="mt-4 bg-white/90 rounded-xl p-4 border border-slate-200 font-mono text-[11px] h-[320px] overflow-y-auto space-y-2">
              {deliberationLogs.map((log, idx) => {
                const isError = log.includes('[Error]');
                const isNeg = log.includes('[Negotiator]');
                const isSent = log.includes('[Sentinel]');
                const isTreas = log.includes('[Treasury]');

                return (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
                      isError
                        ? 'text-rose-800'
                        : isNeg
                        ? 'text-sky-800'
                        : isSent
                        ? 'text-cyan-800'
                        : isTreas
                        ? 'text-purple-800'
                        : 'text-slate-600'
                    }`}
                  >
                    {log}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 text-[10px] text-slate-600 flex items-center justify-between">
            <span>Deterministic Agentic Verification</span>
            <span className="text-slate-600 font-mono">Zero Hallucination Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
};
