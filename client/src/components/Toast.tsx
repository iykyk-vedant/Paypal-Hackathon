import React from 'react';
import { ToastMessage } from '../types';
import { CheckCircle2, AlertCircle, Info, X, ExternalLink } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success';
        const isRefused = t.type === 'refused';
        const isError = t.type === 'error';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-slide-up ${
              isSuccess
                ? 'bg-slate-900/90 border-emerald-500/50 text-slate-100 shadow-emerald-500/10'
                : isRefused
                ? 'bg-slate-900/90 border-rose-500/50 text-slate-100 shadow-rose-500/10'
                : isError
                ? 'bg-slate-900/90 border-amber-500/50 text-slate-100 shadow-amber-500/10'
                : 'bg-slate-900/90 border-primary/50 text-slate-100 shadow-primary/10'
            }`}
          >
            <div className="mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {isRefused && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isError && <AlertCircle className="w-5 h-5 text-amber-400" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-primary-light" />}
            </div>

            <div className="flex-1 text-sm">
              <div className="font-semibold text-white tracking-wide">{t.title}</div>
              <div className="text-slate-300 text-xs mt-1 leading-relaxed">{t.message}</div>
              {t.txId && (
                <div className="text-[11px] font-mono text-slate-400 mt-2 bg-slate-950/60 p-1.5 rounded border border-slate-800 break-all">
                  TxID: {t.txId}
                </div>
              )}
              {t.paypalOrderId && (
                <div className="text-[11px] font-mono text-paypal-gold mt-1 bg-slate-950/60 p-1.5 rounded border border-slate-800 break-all flex items-center justify-between">
                  <span>PayPal: {t.paypalOrderId}</span>
                  <span className="text-[9px] bg-paypal-blue/60 text-white px-1.5 py-0.5 rounded font-bold">SANDBOX</span>
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
