import React, { useState } from 'react';
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
        amount: Number(payerAmt),
        currency: 'USD',
        description: `Settlement for trade ${tradeData.tradeId} (${payerCcy}/${payeeCcy})`,
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
          <div className="w-10 h-10 rounded-xl bg-sky-100 border border-paypal-lightBlue/50 flex items-center justify-center text-sky-800 font-black text-xl">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">PayPal Sandbox Settlement</h3>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                SANDBOX
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Atomic Payment-versus-Payment capture for Trade {tradeData.tradeId}
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
            <span>Payer Leg (Held):</span>
            <span className="text-slate-900 font-bold">{formatMinorUnits(payerAmt, payerCcy)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Payee Leg (Held):</span>
            <span className="text-emerald-800 font-bold">{formatMinorUnits(payeeAmt, payeeCcy)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600 border-t border-slate-200/80 pt-2">
            <span>Settlement Guarantee:</span>
            <span className="text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Atomic PvP Guarantee
            </span>
          </div>
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
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-slate-800 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-800 text-sm">
              <CheckCircle2 className="w-5 h-5" /> Atomic Settlement Completed!
            </div>
            <div className="font-mono text-[11px] text-slate-700 space-y-1">
              <div>Capture ID: <span className="text-emerald-800">{successCapture.captureId}</span></div>
              <div>Status: <span className="text-emerald-800">COMPLETED & CREDITED</span></div>
              <div className="text-[10px] text-slate-600 mt-2">
                Both sovereign legs have been debited and credited simultaneously. Autonomous vendor payout has been queued.
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-3 py-2 bg-emerald-100 hover:bg-emerald-100 text-slate-900 rounded-lg font-semibold text-xs transition-colors"
            >
              Done & View In Ledger
            </button>
          </div>
        ) : (
          /* Checkout Buttons */
          <div className="space-y-3">
            <PayPalScriptProvider
              options={{
                clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test',
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
                      amount: Number(payerAmt),
                      currency: 'USD',
                      description: `PayBridge Settlement ${tradeData.tradeId}`,
                    });
                    return order.orderId;
                  }}
                  onApprove={async (data) => {
                    const capture = await api.capturePayPalOrder(data.orderID, tradeData.tradeId);
                    setSuccessCapture(capture);
                    onSuccess(capture);
                  }}
                  onError={(err) => {
                    console.warn('PayPal Button SDK error (falling back to direct):', err);
                  }}
                />
              </div>
            </PayPalScriptProvider>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-2 text-[10px] text-slate-600 uppercase font-mono">or 1-Click Fast Sandbox</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <button
              disabled={loading}
              onClick={handleDirectCapture}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-100 to-sky-100 hover:from-sky-100-light hover:to-cyan-100 text-slate-900 text-xs font-bold transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  Capturing via PayPal Sandbox...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-800" />
                  1-Click Autonomous PayPal Sandbox Settle
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
