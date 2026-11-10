import React, { useEffect, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { TradeComposite } from '../types';
import { formatMinorUnits, api } from '../api';
import { X, CheckCircle2, ShieldCheck, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';

interface PayPalCheckoutModalProps {
  trade: TradeComposite | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (captureData: any) => void;
}

export const PayPalCheckoutModal: React.FC<PayPalCheckoutModalProps> = ({
  trade,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successCapture, setSuccessCapture] = useState<any | null>(null);
  const [fundingQuote, setFundingQuote] = useState<any | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !trade) return;
    let cancelled = false;
    setFundingQuote(null);
    setQuoteError(null);
    setSuccessCapture(null);
    api.getPayPalFundingQuote(trade.trade.tradeId)
      .then((quote) => { if (!cancelled) setFundingQuote(quote); })
      .catch((err) => { if (!cancelled) setQuoteError(err.message || 'Could not load the funding quote'); });
    return () => { cancelled = true; };
  }, [isOpen, trade?.trade.tradeId]);

  if (!isOpen || !trade) return null;

  const tradeData = trade.trade;
  const payerCcy = tradeData.ccyA;
  const payerAmt = tradeData.amountA;
  const payeeCcy = tradeData.ccyB;
  const payeeAmt = tradeData.amountB;

  // Handle direct simulated or backend capture
  const handleDirectCapture = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Create order
      const order = await api.createPayPalOrder({
        tradeId: tradeData.tradeId,
        description: `PayBridge Sandbox funding for trade ${tradeData.tradeId} (${payerCcy}/${payeeCcy})`,
      });

      // 2. Capture order
      const capture = await api.capturePayPalOrder(order.orderId, tradeData.tradeId);
      setSuccessCapture(capture);
      onSuccess(capture);
    } catch (err: any) {
      setError(err.message || 'Capture failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-slate-300/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center font-black text-xl ${
            fundingQuote?.providerMode === 'simulation'
              ? 'bg-amber-100 border-amber-200 text-amber-800'
              : 'bg-sky-100 border-sky-200 text-sky-800'
          }`}>
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {fundingQuote?.providerMode === 'simulation' ? 'Simulated Demo Funding' : 'PayPal Sandbox Funding'}
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                fundingQuote?.providerMode === 'simulation'
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : 'bg-sky-100 text-sky-800 border border-sky-200'
              }`}>
                {fundingQuote?.providerMode === 'simulation' ? 'SIMULATION' : fundingQuote?.providerMode === 'sandbox' ? 'SANDBOX' : 'CHECKING'}
              </span>
            </div>
            <p className="text-xs text-slate-600">
              {fundingQuote?.providerMode === 'simulation'
                ? `Simulated demo flow for Trade ${tradeData.tradeId} (does not call PayPal)`
                : `PayPal Sandbox USD funding for Trade ${tradeData.tradeId}`}
            </p>
          </div>
        </div>

        {/* Trade Details Summary */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3 font-mono text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Trade Reference:</span>
            <span className="text-slate-900 font-bold">{tradeData.tradeId}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Corridor Currency Pair:</span>
            <span className="text-cyan-800 font-bold">{payerCcy} <ArrowRight className="inline w-3 h-3 mx-1" /> {payeeCcy}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Payer leg (demo-held):</span>
            <span className="text-slate-900 font-bold">{formatMinorUnits(payerAmt, payerCcy)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Payee leg (demo-held):</span>
            <span className="text-emerald-800 font-bold">{formatMinorUnits(payeeAmt, payeeCcy)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/80 pt-2">
            <span>Ledger behavior:</span>
            <span className="text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Demo ledger workflow
            </span>
          </div>
          <div className="flex justify-between items-start gap-3 border-t border-slate-200 pt-2 text-slate-600">
            <span>PayPal funding amount:</span>
            <span className="text-slate-900 text-right font-bold">
              {fundingQuote ? formatMinorUnits(fundingQuote.paymentAmountMinor, 'USD') : quoteError || 'Loading quote…'}
            </span>
          </div>
          {fundingQuote && (
            <p className="text-[10px] leading-relaxed text-slate-600">
              Converted using a static demo benchmark ({fundingQuote.usdPerSourceUnit} USD per {payerCcy}); this is not a live FX rate.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900">
          A successful capture verifies PayPal Sandbox funding and records its reference. It does not settle the Fabric trade. After capture, open Fabric Explorer, link this accepted trade, submit the explicit Fabric settlement, then commit each required test-ledger value leg.
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-800" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successCapture ? (
          <div className={`p-4 rounded-xl border text-slate-800 text-xs space-y-2 ${
            successCapture.isSimulation
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${
                successCapture.isSimulation ? 'text-amber-800' : 'text-emerald-800'
              }`}>
              <CheckCircle2 className="w-5 h-5" />
              {successCapture.isSimulation ? 'Simulated demo capture completed' : 'PayPal Sandbox capture completed'}
            </div>
            <div className="font-mono text-[11px] text-slate-700 space-y-1">
              <div>Capture ID: <span className="font-semibold text-slate-900">{successCapture.captureId}</span></div>
              <div>Provider mode: <span className={`font-semibold ${successCapture.isSimulation ? 'text-amber-800' : 'text-emerald-800'}`}>{successCapture.isSimulation ? 'Simulated (not a PayPal transaction)' : 'PayPal Sandbox'}</span></div>
              <div>Captured USD: <span className="font-semibold text-slate-900">{successCapture.fundingAmountMinor ? formatMinorUnits(successCapture.fundingAmountMinor, 'USD') : 'Verified'}</span></div>
              <div>Status: <span className="font-semibold text-slate-900">{successCapture.status}</span></div>
              {successCapture.payoutStatus && (
                <div>Payout status: <span className="font-semibold text-slate-900">{successCapture.payoutStatus}{successCapture.payoutMode ? ` · ${successCapture.payoutMode}` : ''}{successCapture.payoutBatchId ? ` (${successCapture.payoutBatchId})` : ''}</span></div>
              )}
              <div className="text-[10px] text-slate-600 mt-2">
                Funding was captured; the linked Fabric trade still needs explicit settlement confirmation and all four value-leg transactions.
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-slate-900 rounded-lg font-semibold text-xs transition-colors"
            >
              Done & View In Ledger
            </button>
          </div>
        ) : (
          /* Checkout Buttons */
          <div className="space-y-3">
            {fundingQuote?.providerMode === 'sandbox' && import.meta.env.VITE_PAYPAL_CLIENT_ID && (
              <PayPalScriptProvider
                options={{
                  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
                  currency: 'USD',
                  intent: 'capture',
                }}
              >
              <div className="min-h-[90px] relative">
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                  createOrder={async () => {
                    const order = await api.createPayPalOrder({
                      tradeId: tradeData.tradeId,
                      description: `PayBridge Sandbox funding ${tradeData.tradeId}`,
                    });
                    return order.orderId;
                  }}
                  onApprove={async (data) => {
                    const capture = await api.capturePayPalOrder(data.orderID, tradeData.tradeId);
                    setSuccessCapture(capture);
                    onSuccess(capture);
                  }}
                  onError={(err) => setError(err instanceof Error ? err.message : 'PayPal checkout failed')}
                />
              </div>
              </PayPalScriptProvider>
            )}

            {fundingQuote?.providerMode === 'sandbox' && !import.meta.env.VITE_PAYPAL_CLIENT_ID && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                PayPal Sandbox credentials are configured on the server, but the browser button needs VITE_PAYPAL_CLIENT_ID. Add the matching sandbox client ID to the client environment and restart Vite.
              </p>
            )}

            {fundingQuote?.providerMode === 'simulation' && (
              <div className="space-y-2">
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-700">
                  PayPal Sandbox credentials are not configured on the server. Running this action simulates a capture locally without calling PayPal.
                </p>
                <button
                  disabled={loading || !fundingQuote}
                  onClick={handleDirectCapture}
                  className="w-full min-h-11 rounded-xl border border-amber-200 bg-amber-100 px-3 py-2.5 text-xs font-bold text-slate-900 transition-colors hover:bg-amber-200 disabled:opacity-50"
                >
                  {loading ? 'Running simulated capture…' : 'Run simulated demo capture'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
