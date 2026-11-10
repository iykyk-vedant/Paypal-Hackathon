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
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-800 rounded-xl border border-purple-200">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Fabric Fixture Review</h2>
              <span className="bg-accent-purple/20 border border-accent-purple/40 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Sample data only
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Reviews seeded example records. The web app has no Fabric Gateway connection and does not verify signatures or detect live financial crime.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAudit}
          disabled={loading}
          className="px-4 py-2 bg-sky-100 hover:bg-sky-200 border border-sky-200 text-slate-900 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Reviewing sample records...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 text-amber-800" />
              Review sample records
            </>
          )}
        </button>
      </div>

      {report && (
        <div className="space-y-6">
          {/* Key Audit KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
              <div className="text-slate-600 text-xs">Fixture consistency score</div>
              <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">
                {report.integrityScore} / 100
              </div>
              <div className="text-[11px] text-emerald-800 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Sample checks only
              </div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
              <div className="text-slate-600 text-xs">Blocks Inspected</div>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {report.totalBlocksInspected} Blocks
              </div>
              <div className="text-[11px] text-slate-600 mt-1">Channel: {report.channelId}</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
              <div className="text-slate-600 text-xs">Transactions Inspected</div>
              <div className="text-2xl font-black text-cyan-800 mt-1 font-mono">
                {report.totalTransactionsInspected} Transactions
              </div>
              <div className="text-[11px] text-slate-600 mt-1">Endorsement signatures not verified</div>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-200/80">
              <div className="text-slate-600 text-xs">Audit Status</div>
              <div className="text-2xl font-black text-emerald-800 mt-1 font-mono">
                {report.status === 'CLEAN_AUDIT' ? 'Fixture checks pass' : 'Fixture anomalies'}
              </div>
              <div className="text-[11px] text-slate-600 mt-1">No live double-spend analysis performed</div>
            </div>
          </div>

          {/* Natural Language Executive Report for Central Banks */}
          <div className="glass-panel-glow rounded-2xl p-6 border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-800" />
                <h3 className="text-sm font-bold text-slate-900">Fixture review summary</h3>
              </div>
              <span className="text-xs font-mono text-slate-600">Report ID: {report.reportId}</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 text-xs leading-relaxed text-slate-800">
              {report.executiveSummary}
            </div>

            {/* Fixture status, not regulator approval */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 font-mono text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">RBI sign-off in fixture:</span>
                <span className="text-amber-800 font-bold">{report.supervisorySignoff?.rbiSupervisor}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">MAS sign-off in fixture:</span>
                <span className="text-amber-800 font-bold">{report.supervisorySignoff?.masSupervisor}</span>
              </div>
            </div>
          </div>

          {/* Deep Inspection Findings Log */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              <span>Sample findings and PayPal references</span>
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {report.findings.map((f, idx) => (
                <div
                  key={idx}
                  className="bg-white p-3.5 rounded-xl border border-slate-200 flex items-start gap-3"
                >
                  <div className="mt-0.5">
                    {f.severity === 'HIGH' ? (
                      <AlertTriangle className="w-4 h-4 text-rose-800" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-800" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-900 font-bold">{f.txId}</span>
                      <span className="text-[10px] bg-white px-2 py-0.5 rounded text-cyan-800 border border-slate-200 font-bold">
                        {f.type}
                      </span>
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed">{f.message}</p>
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
