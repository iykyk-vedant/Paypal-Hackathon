import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Workflow, X, Send, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface ZapierConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZapierConfigModal: React.FC<ZapierConfigModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState<boolean>(false);

  const fetchEvents = async () => {
    try {
      const history = await api.getZapierEvents();
      setEvents(history);
    } catch (err) {
      console.warn('Zapier events fetch error:', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [isOpen]);

  const handleTestDispatch = async () => {
    setLoading(true);
    setDispatchedSuccess(false);
    try {
      await api.triggerZapier('MANUAL_TEST_TRIGGER', {
        protocol: 'PayBridge AI Settlement',
        timestamp: new Date().toISOString(),
        testPayload: 'Triggered from PayBridge Dashboard',
        action: 'Notify Slack Channel #fintech-settlements',
      });
      setDispatchedSuccess(true);
      await fetchEvents();
    } catch (err: any) {
      alert(`Error dispatching webhook: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-orange-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 font-bold">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white">Zapier Outbound Automation Webhooks</h3>
              <span className="bg-orange-500/20 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                Zapier
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dispatches automated triggers to Slack, QuickBooks, and corporate ERP systems.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-300 font-medium">Zapier Webhook URL (Catch Hook)</label>
          <input
            type="text"
            placeholder="https://hooks.zapier.com/hooks/catch/12345/abcdef/"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
          <p className="text-[11px] text-slate-400">
            Leave empty to run in built-in automated simulation mode.
          </p>
        </div>

        <button
          onClick={handleTestDispatch}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
        >
          {loading ? (
            'Dispatching Webhook...'
          ) : (
            <>
              <Send className="w-4 h-4" /> Dispatch Test Event to Zapier
            </>
          )}
        </button>

        {dispatchedSuccess && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Webhook successfully delivered to Zapier automation runner!</span>
          </div>
        )}

        {/* Recent Webhook Events */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          <div className="text-xs font-bold text-slate-300">Recent Zapier Dispatches</div>
          <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
            {events.length === 0 ? (
              <div className="text-slate-500 text-xs italic">No webhooks dispatched yet.</div>
            ) : (
              events.map((evt) => (
                <div key={evt.eventId} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-bold">{evt.eventType}</span>
                    <span className="text-emerald-400 text-[10px]">{evt.status}</span>
                  </div>
                  <div className="text-slate-400 text-[10px] truncate">{evt.eventId} • {evt.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
