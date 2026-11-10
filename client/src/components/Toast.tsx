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
                ? 'bg-white/90 border-emerald-200/50 text-slate-900 shadow-emerald-500/10'
                : isRefused
                ? 'bg-white/90 border-rose-200/50 text-slate-900 shadow-rose-500/10'
                : isError
                ? 'bg-white/90 border-amber-200/50 text-slate-900 shadow-amber-500/10'
                : 'bg-white/90 border-sky-200 text-slate-900 shadow-primary/10'
            }`}
          >
            <div className="mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-800" />}
              {isRefused && <AlertCircle className="w-5 h-5 text-rose-800" />}
              {isError && <AlertCircle className="w-5 h-5 text-amber-800" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-sky-800" />}
            </div>

            <div className="flex-1 text-sm">
              <div className="font-semibold text-slate-900 tracking-wide">{t.title}</div>
              <div className="text-slate-700 text-xs mt-1 leading-relaxed">{t.message}</div>
              {t.txId && (
                <div className="text-[11px] font-mono text-slate-600 mt-2 bg-white/60 p-1.5 rounded border border-slate-200 break-all">
                  TxID: {t.txId}
                </div>
              )}
              {t.paypalOrderId && (
                <div className="text-[11px] font-mono text-amber-800 mt-1 bg-white/60 p-1.5 rounded border border-slate-200 break-all flex items-center justify-between">
                  <span>{t.isSimulation ? 'Demo Ref' : 'PayPal'}: {t.paypalOrderId}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${t.isSimulation ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-sky-100 text-sky-900 border border-sky-200'}`}>
                    {t.isSimulation ? 'SIMULATED' : 'SANDBOX'}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(t.id)}
              className="text-slate-600 hover:text-slate-900 transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
