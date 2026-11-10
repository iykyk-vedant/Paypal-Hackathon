import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Workflow, X, Send, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface ZapierConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ZapierConfigModal: React.FC<ZapierConfigModalProps> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState<boolean>(false);
  const [configured, setConfigured] = useState<boolean>(false);

  const fetchEvents = async () => {
    try {
      const history = await api.getZapierEvents();
      setEvents(history);
    } catch (err) {
      console.warn('Zapier events fetch error:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchEvents();
    api.getZapierStatus().then((status) => setConfigured(status.configured)).catch(() => setConfigured(false));
  }, [isOpen]);

  const handleTestDispatch = async () => {
    setLoading(true);
    setDispatchedSuccess(false);
    try {
      await api.triggerZapier('MANUAL_TEST_TRIGGER', {});
      setDispatchedSuccess(true);
      await fetchEvents();
    } catch (err: any) {
      alert(`Error dispatching webhook: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-orange-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-600 hover:text-slate-900"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-800 font-bold">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">Workflow notification settings</h3>

            </div>
            <p className="text-xs text-slate-600">{configured ? 'Outbound Zapier Catch webhook is configured on the API.' : 'Zapier is currently running in local simulation mode.'}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
          Configure <code>ZAPIER_WEBHOOK_URL</code> in the backend secret settings. An MCP server URL is not a Catch webhook. The endpoint is intentionally not editable from this public dashboard.
        </div>

        <button
          onClick={handleTestDispatch}
          disabled={loading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-100 hover:to-amber-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
        >
          {loading ? (
            'Dispatching Webhook...'
          ) : (
            <>
              <Send className="w-4 h-4" /> Send test event
            </>
          )}
        </button>

        {dispatchedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{configured ? 'Test event dispatched to the configured webhook.' : 'Test event recorded as a local simulation; no external webhook was called.'}</span>
          </div>
        )}

        {/* Recent Webhook Events */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-700">Recent workflow events</div>
          <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-[11px]">
            {events.length === 0 ? (
              <div className="text-slate-600 text-xs italic">No webhooks dispatched yet.</div>
            ) : (
              events.map((evt) => (
                <div key={evt.eventId} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-800 font-bold">{evt.eventType}</span>
                    <span className="text-emerald-800 text-[10px]">{evt.status}</span>
                  </div>
                  <div className="text-slate-600 text-[10px] truncate">{evt.eventId} • {evt.timestamp}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
