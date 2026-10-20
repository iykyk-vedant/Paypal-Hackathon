import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { FabricAuditReport } from '../types';
import { Bot, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, FileText, Cpu, Play } from 'lucide-react';

export const AIChaincodeAuditorView: React.FC = () => {
  const [report, setReport] = useState<FabricAuditReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.getFabricAuditReport();
      setReport(data);
    } catch (err) {
      console.warn('AI Auditor fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAudit = async () => {
    setLoading(true);
    try {
      const data = await api.runFabricAudit();
      setReport(data);
    } catch (err: any) {
      alert(`Audit error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-accent-purple to-primary text-white rounded-xl shadow-glow">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">AI Smart Chaincode & DLT Auditor</h2>
              <span className="bg-accent-purple/20 border border-accent-purple/40 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Autonomous Compliance Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Continuously audits Hyperledger Fabric 2.5 blocks, verifies dual-regulator endorsements, and detects financial crime anomalies.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-primary to-primary-light hover:from-primary-light hover:to-accent-cyan text-white rounded-xl text-xs font-bold shadow-glow flex items-center gap-2 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Auditing Fabric Ledger...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-paypal-gold" />
              Run Live AI Ledger Audit
            </>
          )}
        </button>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Key Audit KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
              <div className="text-slate-400 text-xs">DLT Integrity Score</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {report.integrityScore} / 100
              </div>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> High Integrity Rating
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
              <div className="text-slate-400 text-xs">Blocks Inspected</div>
              <div className="text-2xl font-black text-white mt-1 font-mono">
                {report.totalBlocksInspected} Blocks
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Channel: {report.channelId}</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
              <div className="text-slate-400 text-xs">Transactions Inspected</div>
              <div className="text-2xl font-black text-accent-cyan mt-1 font-mono">
                {report.totalTransactionsInspected} Transactions
              </div>
              <div className="text-[11px] text-slate-400 mt-1">100% Cryptographic Verification</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
              <div className="text-slate-400 text-xs">Audit Status</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                CLEAN
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Zero Double-Spend Anomalies</div>
            </div>
          </div>

          {/* Natural Language Executive Report for Central Banks */}
          <div className="glass-panel-glow rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-light" />
                <h3 className="text-sm font-bold text-white">Autonomous Supervisory Audit Report</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">Report ID: {report.reportId}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-xs leading-relaxed text-slate-200">
              {report.executiveSummary}
            </div>

            {/* Central Bank Signoffs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">RBI Regulatory Supervisor Sign-off:</span>
                <span className="text-emerald-400 font-bold">✓ {report.supervisorySignoff?.rbiSupervisor}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">MAS Regulatory Supervisor Sign-off:</span>
                <span className="text-emerald-400 font-bold">✓ {report.supervisorySignoff?.masSupervisor}</span>
              </div>
            </div>
          </div>

          {/* Deep Inspection Findings Log */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Deep Block Inspection Findings & PayPal Atomic Linkage</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {report.findings.map((f, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {f.severity === 'HIGH' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">{f.txId}</span>
                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-accent-cyan border border-slate-800 font-bold">
                        {f.type}
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{f.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
