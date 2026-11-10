import React, { useEffect, useState } from 'react';
import { api, formatMinorUnits } from '../api';
import { Channel3Quote, ScreenId } from '../types';
import { PlusCircle, Sparkles, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface NewTradeProposalProps {
  currentMsp: string;
  onNavigate: (screen: ScreenId) => void;
  onTradeCreated: (trade: any) => void;
  initialQuote?: Channel3Quote | null;
}

export const NewTradeProposal: React.FC<NewTradeProposalProps> = ({
  currentMsp,
  onNavigate,
  onTradeCreated,
  initialQuote,
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

  useEffect(() => {
    setProposerMsp(currentMsp);
    setCounterpartyMsp(currentMsp === 'BankA1MSP' ? 'BankB1MSP' : 'BankA1MSP');
    setCcyA(currentMsp === 'BankA1MSP' ? 'INR' : 'SGD');
    setCcyB(currentMsp === 'BankA1MSP' ? 'SGD' : 'INR');
  }, [currentMsp]);

  useEffect(() => {
    if (!initialQuote) return;
    if (!['INR', 'SGD'].includes(initialQuote.currency) || !['INR', 'SGD'].includes(initialQuote.targetCurrency || '')) {
      setNegotiationNotice(`Quote ${initialQuote.quoteId} is attached, but ${initialQuote.currency} is outside the Fabric INR/SGD corridor. Choose a supported catalog item to link it to Fabric.`);
      setReference(`${initialQuote.item.title} · Channel3 ${initialQuote.quoteId}`);
      return;
    }
    const quotePayer = initialQuote.recommendedPayerOrg === 'BankA1' ? 'BankA1MSP' : 'BankB1MSP';
    if (quotePayer !== currentMsp) {
      setNegotiationNotice('This quote names the other bank as payer. Your bank can only propose trades for itself; review the corridor and amounts before proceeding.');
      return;
    }
    setCcyA(initialQuote.targetCurrency);
    setCcyB(initialQuote.currency);
    setAmountA(initialQuote.targetSettlementAmount || initialQuote.netSettlementAmount);
    setAmountB(initialQuote.netSettlementAmount);
    setFxRate(initialQuote.fxRate || '1.0000000');
    setReference(`${initialQuote.item.title} · ${initialQuote.quantity} units · Channel3 ${initialQuote.quoteId}`);
    setNegotiationNotice(`Channel3 quote ${initialQuote.quoteId} prefilled. The target leg uses an illustrative static FX benchmark; review all amounts before proposing.`);
  }, [initialQuote, currentMsp]);

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
      setNegotiationNotice(`Demo quote calculated with a static FX benchmark and ${res.discountAppliedPct}% illustrative volume heuristic.`);
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
        proposer: currentMsp.includes('A1') ? 'a1-trader' : 'b1-trader',
        proposerMsp: currentMsp,
        cparty: counterpartyMsp.includes('A1') ? 'a1-trader' : 'b1-trader',
        counterpartyMsp,
        ccyA,
        amountA: Math.round(amountA * 100), // into minor units
        ccyB,
        amountB: Math.round(amountB * 100), // into minor units
        fxRate,
        reference,
        channel3Sku: initialQuote?.item.sku,
        channel3Quote: initialQuote || undefined,
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
      <div className="glass-panel rounded-2xl p-6 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-sky-800 rounded-xl border border-sky-200">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Create a sample trade proposal</h2>
              <p className="text-xs text-slate-600">
                Generate an indicative cross-border proposal using static demo FX benchmarks and illustrative pricing rules.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAutoNegotiate}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-slate-900 text-xs font-semibold border border-sky-200 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-800" />
            <span>Calculate Demo Quote</span>
          </button>
        </div>

        {negotiationNotice && (
          <div className="mb-6 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-800" />
            <span>{negotiationNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Institutions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700">Proposer Institution (Buyer)</label>
              <select
                value={proposerMsp}
                disabled
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-200"
              >
                <option value={currentMsp}>{currentMsp === 'BankA1MSP' ? 'Bank A1 (India / Mumbai Desk)' : 'Bank B1 (Singapore Desk)'}</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Counterparty Institution (Seller)</label>
              <select
                value={counterpartyMsp}
                disabled
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-200"
              >
                <option value={counterpartyMsp}>{counterpartyMsp === 'BankB1MSP' ? 'Bank B1 (Singapore Desk)' : 'Bank A1 (India / Mumbai Desk)'}</option>
              </select>
            </div>
          </div>

          {/* Currency Amounts & Corridors */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700">Payer Currency (Leg A)</label>
              <select
                value={ccyA}
                onChange={(e) => setCcyA(e.target.value)}
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-200"
              >
                <option value="INR">INR (₹)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Payer Amount (Base Units)</label>
              <input
                type="number"
                value={amountA}
                onChange={(e) => setAmountA(Number(e.target.value))}
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-200"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Indicative Demo FX Rate</label>
              <input
                type="text"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-200"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-semibold text-slate-700">Payee Currency (Leg B)</label>
              <select
                value={ccyB}
                onChange={(e) => setCcyB(e.target.value)}
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-sky-200"
              >
                <option value="SGD">SGD (S$)</option>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Payee Target Settlement (Units)</label>
              <input
                type="number"
                value={amountB}
                onChange={(e) => setAmountB(Number(e.target.value))}
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-200"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Trade Reference & SLA</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full mt-1.5 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-200"
              required
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-600 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-800" />
              Proposing updates the in-memory demo ledger; it does not submit a Fabric transaction.
            </span>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-sky-100 hover:bg-sky-200 border border-sky-200 text-slate-900 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting Proposal...' : 'Add Demo Proposal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
