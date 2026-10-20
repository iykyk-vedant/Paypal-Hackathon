import React, { useState } from 'react';
import { api, formatMinorUnits } from '../api';
import { ScreenId } from '../types';
import { PlusCircle, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface NewTradeProposalProps {
  onNavigate: (screen: ScreenId) => void;
  onTradeCreated: (trade: any) => void;
}

export const NewTradeProposal: React.FC<NewTradeProposalProps> = ({
  onNavigate,
  onTradeCreated,
}) => {
  const [proposerMsp, setProposerMsp] = useState<string>('BankA1MSP');
  const [counterpartyMsp, setCounterpartyMsp] = useState<string>('BankB1MSP');
  const [ccyA, setCcyA] = useState<string>('INR');
  const [amountA, setAmountA] = useState<number>(1000000);
  const [ccyB, setCcyB] = useState<string>('SGD');
  const [amountB, setAmountB] = useState<number>(16000);
  const [fxRate, setFxRate] = useState<string>('0.0160');
  const [reference, setReference] = useState<string>('B2B Medical Diagnostics Sourcing Batch');
  const [loading, setLoading] = useState<boolean>(false);
  const [negotiationNotice, setNegotiationNotice] = useState<string | null>(null);

  // Auto-negotiate using AI Agent
  const handleAutoNegotiate = async () => {
    setLoading(true);
    try {
      const res = await api.aiNegotiate({
        buyerOrg: proposerMsp.includes('A1') ? 'BankA1' : 'BankB1',
        sellerOrg: proposerMsp.includes('A1') ? 'BankB1' : 'BankA1',
        currencyFrom: ccyA,
        currencyTo: ccyB,
        amountFrom: amountA * 100,
      });

      setFxRate(res.agreedFx);
      setAmountB(Math.round(res.amountTo / 100));
      setNegotiationNotice(`AI Agent locked ${res.discountAppliedPct}% volume forward hedge discount.`);
    } catch (err: any) {
      alert(`Negotiation error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newTrade = await api.proposeTrade({
        proposer: proposerMsp.includes('A1') ? 'a1-trader' : 'b1-trader',
        proposerMsp,
        cparty: counterpartyMsp.includes('A1') ? 'a1-trader' : 'b1-trader',
        counterpartyMsp,
        ccyA,
        amountA: amountA * 100, // into minor units
        ccyB,
        amountB: amountB * 100, // into minor units
        fxRate,
        reference,
      });

      onTradeCreated(newTrade);
      onNavigate('active-settlements');
    } catch (err: any) {
      alert(`Proposal failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1000px] mx-auto w-full">
      <div className="glass-panel rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary-light rounded-xl border border-primary/30">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Propose Bilateral Sovereign Trade</h2>
              <p className="text-xs text-slate-400">
                Initiate cross-border trade terms with autonomous AI forward hedge calculation.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoNegotiate}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-accent-purple/30 to-primary/40 hover:from-accent-purple/40 hover:to-primary/50 text-white text-xs font-semibold border border-accent-purple/40 shadow-glow flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
            <span>AI Auto-Negotiate Terms</span>
          </button>
        </div>

        {negotiationNotice && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{negotiationNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Institutions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300">Proposer Institution (Buyer)</label>
              <select
                value={proposerMsp}
                onChange={(e) => setProposerMsp(e.target.value)}
                className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="BankA1MSP">Bank A1 (India / Mumbai Desk)</option>
                <option value="BankB1MSP">Bank B1 (Singapore Desk)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Counterparty Institution (Seller)</label>
              <select
                value={counterpartyMsp}
                onChange={(e) => setCounterpartyMsp(e.target.value)}
                className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="BankB1MSP">Bank B1 (Singapore Desk)</option>
                <option value="BankA1MSP">Bank A1 (India / Mumbai Desk)</option>
              </select>
            </div>
          </div>

          {/* Currency Amounts & Corridors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300">Payer Currency (Leg A)</label>
              <select
                value={ccyA}
                onChange={(e) => setCcyA(e.target.value)}
                className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="INR">INR (₹)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Payer Amount (Base Units)</label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(Number(e.target.value))}
                className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Agreed FX Rate</label>
              <input
                type="text"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-300">Payee Currency (Leg B)</label>
              <select
                value={ccyB}
                onChange={(e) => setCcyB(e.target.value)}
                className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="SGD">SGD (S$)</option>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Payee Target Settlement (Units)</label>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(Number(e.target.value))}
                className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Trade Reference & SLA</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full mt-1.5 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-primary"
              required
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Proposing will automatically lock Leg A funds in atomic hold
            </span>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-glow flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? 'Submitting Proposal...' : 'Commit Proposal & Lock Leg A'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
