import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { FabricActivity, TradeComposite } from '../types';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, LoaderCircle } from 'lucide-react';

interface FabricLedgerActionsProps {
  currentMsp: string;
  enabled: boolean;
  onChanged: () => void;
  demoTrades?: TradeComposite[];
  onCapturePayPal?: (trade: TradeComposite) => void;
}

function toMinorUnits(value: string): string {
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive amount with up to two decimal places.');
  const [whole, fraction = ''] = value.split('.');
  const minor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount is outside the supported demo range.');
  return minor.toString();
}

function fromMinorUnits(value: string | number | undefined): string {
  const minor = BigInt(String(value || 0));
  return `${minor / 100n}.${(minor % 100n).toString().padStart(2, '0')}`;
}

export const FabricLedgerActions: React.FC<FabricLedgerActionsProps> = ({ currentMsp, enabled, onChanged, demoTrades, onCapturePayPal }) => {
  const proposerMsp = currentMsp as 'BankA1MSP' | 'BankB1MSP';
  const [amountA, setAmountA] = useState('1000.00');
  const [amountB, setAmountB] = useState('16.00');
  const ccyA: 'INR' | 'SGD' = proposerMsp === 'BankA1MSP' ? 'INR' : 'SGD';
  const [tradeId, setTradeId] = useState('');
  const [sourceTradeId, setSourceTradeId] = useState('');
  const [selectedSourceTrade, setSelectedSourceTrade] = useState<TradeComposite | null>(null);
  const [acceptedDemoTrades, setAcceptedDemoTrades] = useState<TradeComposite[]>([]);
  const [reference, setReference] = useState('CorridorFlow Fabric demo trade');
  const [writeToken, setWriteToken] = useState(() => {
    try { return sessionStorage.getItem('corridorflow-fabric-demo-token') || ''; } catch { return ''; }
  });
  const [confirmSettlement, setConfirmSettlement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string; transactionId?: string; blockNumber?: string } | null>(null);

  useEffect(() => {
    const loadTrades = demoTrades ? Promise.resolve(demoTrades) : api.getTrades();
    loadTrades.then((trades) => {
      const accepted = trades.filter((item) =>
      ['ACCEPTED', 'SETTLED'].includes(item.trade.status) &&
      ['INR', 'SGD'].includes(item.trade.ccyA) &&
      ['INR', 'SGD'].includes(item.trade.ccyB) &&
      item.trade.ccyA !== item.trade.ccyB
      );
      setAcceptedDemoTrades(accepted);
      if (sourceTradeId) {
        setSelectedSourceTrade(accepted.find((item) => item.trade.tradeId === sourceTradeId) || null);
      } else if (accepted[0]) {
        setSourceTradeId(accepted[0].trade.tradeId);
        setSelectedSourceTrade(accepted[0]);
        setTradeId(accepted[0].trade.fabricTradeId || '');
      }
    }).catch(() => setAcceptedDemoTrades([]));
  }, [demoTrades, sourceTradeId]);

  const run = async (action: () => Promise<any>) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      if (result.tradeId) setTradeId(result.tradeId);
      if (result.status === 'REFUSAL_RECONCILED') setTradeId('');
      if (sourceTradeId) {
        const refreshed = await api.getTrade(sourceTradeId);
        setSelectedSourceTrade(refreshed);
        setAcceptedDemoTrades((current) => current.map((item) => item.trade.tradeId === sourceTradeId ? refreshed : item));
      }
      setMessage({
        kind: 'success',
        text: `${result.status || 'Fabric transaction'} confirmed (${result.validationCode || 'VALID'}).`,
        transactionId: result.transactionId,
        blockNumber: result.blockNumber,
      });
      onChanged();
    } catch (error) {
      if (sourceTradeId) {
        try {
          const refreshed = await api.getTrade(sourceTradeId);
          setSelectedSourceTrade(refreshed);
          setAcceptedDemoTrades((current) => current.map((item) => item.trade.tradeId === sourceTradeId ? refreshed : item));
        } catch { /* Keep the original transaction error visible. */ }
      }
      const detail = error as Error & { transactionId?: string; validationCode?: string; commitStatusUnknown?: boolean };
      const statusNote = detail.commitStatusUnknown ? 'Commit status is unknown; check the live ledger before retrying. ' : '';
      setMessage({
        kind: 'error',
        text: `${statusNote}${detail.message || 'Fabric transaction failed.'}`,
        transactionId: detail.transactionId,
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePropose = () => run(async () => {
    const amountAMinor = toMinorUnits(amountA);
    const amountBMinor = toMinorUnits(amountB);
    const input = {
      proposerMsp,
      ccyA,
      amountA: amountAMinor,
      ccyB: ccyA === 'INR' ? 'SGD' as const : 'INR' as const,
      amountB: amountBMinor,
      reference,
      sourceTradeId: sourceTradeId || undefined,
    };
    return api.proposeFabricTrade(input, writeToken);
  });

  const runNextDemoStep = () => run(async () => {
    if (!selectedSourceTrade) throw new Error('Choose an accepted demo trade first.');
    const trade = selectedSourceTrade.trade;
    const msp = currentMsp;
    if (!trade.fabricTradeId) {
      return api.demoAcceptFabricTrade(sourceTradeId, writeToken);
    }
    if (trade.fabricStatus === 'PROPOSED') {
      return api.demoAcceptFabricTrade(sourceTradeId, writeToken);
    }
    if (trade.fabricStatus === 'ACCEPTED') {
      if (trade.proposerMsp !== msp) throw new Error('The proposing bank approver must confirm settlement after PayPal Sandbox funding.');
      if (!trade.paypalCaptureId || !String(trade.paypalStatus || '').startsWith('CAPTURED_')) {
        throw new Error('Capture PayPal Sandbox funding for this trade first, then continue here.');
      }
      const settled = await api.settleFabricTrade(trade.fabricTradeId, writeToken);
      const actions = msp === trade.proposerMsp
        ? [{ leg: 'B' as const, operation: 'credit' as const }, { leg: 'A' as const, operation: 'debit' as const }]
        : [{ leg: 'B' as const, operation: 'debit' as const }, { leg: 'A' as const, operation: 'credit' as const }];
      let latest = settled;
      for (const action of actions) latest = await api.performFabricLegAction(trade.fabricTradeId, action.leg, action.operation, writeToken);
      return latest;
    }
    if (trade.fabricStatus === 'SETTLED_PENDING_VALUE_LEGS') {
      const actions = msp === trade.proposerMsp
        ? [{ leg: 'B' as const, operation: 'credit' as const }, { leg: 'A' as const, operation: 'debit' as const }]
        : [{ leg: 'B' as const, operation: 'debit' as const }, { leg: 'A' as const, operation: 'credit' as const }];
      const completed = trade.fabricLegActions || {};
      let latest: any = { status: 'VALUE_LEGS_UPDATED' };
      for (const action of actions) {
        if (completed[`${action.leg}_${action.operation}`]) continue;
        latest = await api.performFabricLegAction(trade.fabricTradeId, action.leg, action.operation, writeToken);
      }
      if (latest.status === 'VALUE_LEGS_UPDATED') throw new Error('This bank has no remaining value-leg actions. Switch to the other bank approver to finish.');
      return latest;
    }
    if (trade.fabricStatus === 'SETTLED') throw new Error('This demo trade is already fully settled on the Fabric test ledger.');
    throw new Error(`This trade is not ready for the guided Fabric step (${trade.fabricStatus || 'not linked'}).`);
  });

  const nextDemoStepLabel = !selectedSourceTrade
    ? 'Choose an accepted trade to begin'
    : selectedSourceTrade.trade.fabricStatus === 'SETTLED' ? 'Demo trade complete'
      : selectedSourceTrade.trade.fabricStatus === 'PROPOSED' ? 'Accept & continue Fabric demo'
      : selectedSourceTrade.trade.fabricStatus === 'ACCEPTED' ? selectedSourceTrade.trade.proposerMsp === currentMsp ? selectedSourceTrade.trade.paypalCaptureId ? 'Settle and record my bank’s ledger steps' : 'Capture PayPal Sandbox funding'
          : 'Next: proposing bank settlement'
          : selectedSourceTrade.trade.fabricStatus === 'SETTLED_PENDING_VALUE_LEGS' ? 'Record my bank’s remaining ledger steps'
            : selectedSourceTrade.trade.fabricTradeId ? 'Continue Fabric demo' : 'Accept & link on Fabric';

  const fabricActivity: FabricActivity[] = selectedSourceTrade?.trade.fabricActivity?.length
    ? selectedSourceTrade.trade.fabricActivity
    : selectedSourceTrade?.trade.fabricTransactionId
      ? [
          { action: 'Settlement committed', transactionId: selectedSourceTrade.trade.fabricTransactionId, validationCode: 'VALID', peerOrgs: ['RegAMSP', 'RegBMSP'], timestamp: '' },
          ...Object.entries(selectedSourceTrade.trade.fabricLegActions || {}).map(([key, transactionId]) => {
            const [leg, operation] = key.split('_');
            const isProposer = (leg === 'A' && operation === 'debit') || (leg === 'B' && operation === 'credit');
            return {
              action: `${leg} ${operation} committed`, transactionId, validationCode: 'VALID',
              peerOrgs: [isProposer ? selectedSourceTrade.trade.proposerMsp || 'BankA1MSP' : selectedSourceTrade.trade.counterpartyMsp || 'BankB1MSP'], timestamp: '',
            };
          }),
        ]
      : [];
  const peerActivityRows = fabricActivity.flatMap((entry, index) => entry.peerOrgs.map((peerOrg) => ({ ...entry, peerOrg, rowKey: `${entry.transactionId}-${peerOrg}-${index}` })));

  const peerLabel = (msp: string) => ({
    BankA1MSP: 'Bank A1 peer', BankB1MSP: 'Bank B1 peer', RegAMSP: 'Regulator A peer', RegBMSP: 'Regulator B peer',
  } as Record<string, string>)[msp] || `${msp} peer`;

  return (
    <section className="glass-panel rounded-2xl p-5 border border-slate-200 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl p-2 bg-amber-50 text-amber-800 border border-amber-200"><AlertTriangle className="w-5 h-5" /></div>
        <div>
          <h3 className="font-bold text-slate-900">Complete the demo settlement</h3>
          <p className="text-xs text-slate-600 mt-1">One click records both bank identities for the Fabric demo. PayPal Sandbox payment still requires your approval.</p>
        </div>
      </div>

      {!enabled ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Ledger writes are disabled or the Gateway and both bank identities are not ready. Configure rotated BankA1 and BankB1 identities, verify live queries, then explicitly enable <code>FABRIC_GATEWAY_WRITE_ENABLED</code> on the backend.
        </p>
      ) : (
        <>
          <label className="block text-xs text-slate-700">Authorized demo write token
            <input type="password" autoComplete="off" value={writeToken} onChange={(event) => {
              setWriteToken(event.target.value);
              try { if (event.target.value) sessionStorage.setItem('corridorflow-fabric-demo-token', event.target.value); else sessionStorage.removeItem('corridorflow-fabric-demo-token'); } catch { /* Storage may be unavailable in private contexts. */ }
            }} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900" placeholder="Demo write authorization" />
          </label>
          <label className="block text-xs text-slate-700">Accepted demo trade
            <select value={sourceTradeId} onChange={(event) => {
              const selected = acceptedDemoTrades.find((item) => item.trade.tradeId === event.target.value);
              setSourceTradeId(event.target.value);
              setSelectedSourceTrade(selected || null);
              setTradeId(selected?.trade.fabricTradeId || '');
              if (selected) {
                setAmountA(fromMinorUnits(selected.trade.amountA));
                setAmountB(fromMinorUnits(selected.trade.amountB));
                setReference(selected.trade.reference || `CorridorFlow linked trade ${selected.trade.tradeId}`);
              }
            }} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900">
              <option value="">Select an accepted trade…</option>
              {acceptedDemoTrades.map((item) => <option key={item.trade.tradeId} value={item.trade.tradeId}>{item.trade.tradeId} · {item.trade.ccyA} → {item.trade.ccyB} · {item.trade.fabricStatus || 'ready for Fabric'}</option>)}
            </select>
          </label>
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Guided demo run</h4>
              <p className="mt-1 text-xs text-slate-700">Accept & link uses the configured test-bank identities to record both bank approvals in one demo action. Then approve PayPal Sandbox and continue to settlement.</p>
            </div>
            <button onClick={() => {
              const needsPaypalCapture = selectedSourceTrade?.trade.fabricStatus === 'ACCEPTED' && !selectedSourceTrade.trade.paypalCaptureId && selectedSourceTrade.trade.proposerMsp === currentMsp;
              if (needsPaypalCapture && onCapturePayPal && selectedSourceTrade) onCapturePayPal(selectedSourceTrade);
              else void runNextDemoStep();
            }} disabled={busy || !selectedSourceTrade || (writeToken.length < 32 && !(selectedSourceTrade?.trade.fabricStatus === 'ACCEPTED' && !selectedSourceTrade.trade.paypalCaptureId && selectedSourceTrade.trade.proposerMsp === currentMsp)) || selectedSourceTrade?.trade.fabricStatus === 'SETTLED'} className="w-full rounded-lg bg-sky-800 hover:bg-sky-900 text-white font-semibold text-sm p-3 disabled:opacity-50">{busy ? 'Completing step…' : nextDemoStepLabel}</button>
            {selectedSourceTrade?.trade.fabricStatus === 'SETTLED' && <p className="text-xs font-semibold text-emerald-800">PayPal Sandbox funding and all four Fabric value legs are recorded. The detailed ledger controls remain available below.</p>}
          </div>
          <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Live Fabric transaction log</h4>
                <p className="text-[11px] text-slate-500">Each committed ledger step is shown under the peer organization that endorsed it</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">{peerActivityRows.length} entries</span>
            </div>
            {peerActivityRows.length ? (
              <div className="divide-y divide-slate-100">
                {peerActivityRows.map((entry) => (
                  <div key={entry.rowKey} className="grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:gap-4">
                    <span className="text-xs font-semibold text-sky-900">{peerLabel(entry.peerOrg)}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800">{entry.action}</div>
                      <div className="mt-0.5 truncate font-mono text-[10px] text-slate-500" title={entry.transactionId}>Tx {entry.transactionId}</div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">{entry.validationCode}</span>
                      {entry.blockNumber && <span>Block {entry.blockNumber}</span>}
                      {entry.timestamp && <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-5 text-xs text-slate-500">Select a trade to see its committed peer activity. New Fabric writes will appear here as they are confirmed.</p>
            )}
          </section>
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <summary className="cursor-pointer text-xs font-semibold text-slate-700">Advanced controls and individual ledger actions</summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-blue-700" /> Propose a live trade</h4>
              <label className="block text-xs text-slate-700">Signing bank
                <div className="mt-1 rounded-lg border border-slate-300 bg-slate-50 p-2 text-slate-900">{proposerMsp === 'BankA1MSP' ? 'Bank A1 (INR payer)' : 'Bank B1 (SGD payer)'}</div>
              </label>
              <p className="text-xs text-slate-600">Trade corridor: {ccyA} → {ccyA === 'INR' ? 'SGD' : 'INR'}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-700">Amount A ({ccyA})<input value={amountA} onChange={(event) => setAmountA(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900" /></label>
                <label className="text-xs text-slate-700">Amount B ({ccyA === 'INR' ? 'SGD' : 'INR'})<input value={amountB} onChange={(event) => setAmountB(event.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900" /></label>
              </div>
              <label className="block text-xs text-slate-700">Reference<input value={reference} onChange={(event) => setReference(event.target.value)} maxLength={160} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900" /></label>
              <button onClick={handlePropose} disabled={busy || writeToken.length < 32 || Boolean(selectedSourceTrade && selectedSourceTrade.trade.proposerMsp !== currentMsp)} className="w-full rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs p-2.5 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit proposal to Fabric'}</button>
              {selectedSourceTrade?.trade.fabricTradeId && selectedSourceTrade.trade.fabricStatus === 'PROPOSED' && selectedSourceTrade.trade.proposerMsp === currentMsp && <button onClick={() => run(() => api.reconcileFabricRefusal(selectedSourceTrade.trade.fabricTradeId!, writeToken))} disabled={busy || writeToken.length < 32} className="w-full rounded-lg border border-amber-300 p-2 text-xs text-amber-900 disabled:opacity-50">Check and clear a refused proposal link</button>}
              {selectedSourceTrade?.trade.proposerMsp !== currentMsp && selectedSourceTrade && <p className="text-xs text-amber-800">This proposal belongs to the other bank. You may review or accept it as counterparty.</p>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Accept or settle a live trade</h4>
              <label className="block text-xs text-slate-700">Trade ID<input value={tradeId} onChange={(event) => setTradeId(event.target.value)} placeholder="T-…" className="mt-1 w-full rounded-lg border border-slate-300 p-2 font-mono text-slate-900" /></label>
              {(!selectedSourceTrade || selectedSourceTrade.trade.counterpartyMsp === currentMsp) && <button onClick={() => run(() => api.acceptFabricTrade(tradeId, writeToken))} disabled={busy || !tradeId || writeToken.length < 32 || (Boolean(sourceTradeId) && (selectedSourceTrade?.trade.fabricStatus === 'ACCEPTED' || selectedSourceTrade?.trade.fabricStatus?.startsWith('SETTLED')))} className="w-full rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs p-2.5 disabled:opacity-50">{busy ? 'Submitting…' : selectedSourceTrade?.trade.fabricStatus === 'ACCEPTED' || selectedSourceTrade?.trade.fabricStatus?.startsWith('SETTLED') ? 'Fabric proposal already accepted' : 'Accept as counterparty bank'}</button>}
              <label className="flex items-start gap-2 text-xs text-slate-700 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <input type="checkbox" checked={confirmSettlement} onChange={(event) => setConfirmSettlement(event.target.checked)} className="mt-0.5" />
                I understand this writes permanently to the test ledger. For a linked trade, PayPal capture must complete first; this confirmation submits Fabric settlement, then each of the four value-leg actions is a separate commit.
              </label>
              {(!selectedSourceTrade || selectedSourceTrade.trade.proposerMsp === currentMsp) && <button onClick={() => run(() => api.settleFabricTrade(tradeId, writeToken))} disabled={busy || !tradeId || !confirmSettlement || writeToken.length < 32 || selectedSourceTrade?.trade.fabricStatus === 'SETTLED_PENDING_VALUE_LEGS' || selectedSourceTrade?.trade.fabricStatus === 'SETTLED'} className="w-full rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs p-2.5 disabled:opacity-50">{busy ? 'Submitting…' : selectedSourceTrade?.trade.fabricStatus?.startsWith('SETTLED') ? 'Fabric settlement already committed' : 'Settle on Fabric'}</button>}
              <div className="border-t border-slate-200 pt-3">
                <p className="text-[11px] text-slate-600 mb-2">After dual-regulator Settle, the network round-trip uses this order. Each is a separate committed ledger write, and chaincode validates current state.</p>
                <div className="grid grid-cols-2 gap-2">
                  {(!selectedSourceTrade || selectedSourceTrade.trade.proposerMsp === currentMsp) && <button onClick={() => run(() => api.performFabricLegAction(tradeId, 'B', 'credit', writeToken))} disabled={busy || !tradeId || !confirmSettlement || writeToken.length < 32 || (Boolean(sourceTradeId) && selectedSourceTrade?.trade.fabricStatus !== 'SETTLED_PENDING_VALUE_LEGS')} className="rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs p-2 disabled:opacity-50">1 · Credit payee B</button>}
                  {(!selectedSourceTrade || selectedSourceTrade.trade.proposerMsp === currentMsp) && <button onClick={() => run(() => api.performFabricLegAction(tradeId, 'A', 'debit', writeToken))} disabled={busy || !tradeId || !confirmSettlement || writeToken.length < 32 || (Boolean(sourceTradeId) && selectedSourceTrade?.trade.fabricStatus !== 'SETTLED_PENDING_VALUE_LEGS')} className="rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs p-2 disabled:opacity-50">2 · Settle debit A</button>}
                  {(!selectedSourceTrade || selectedSourceTrade.trade.counterpartyMsp === currentMsp) && <button onClick={() => run(() => api.performFabricLegAction(tradeId, 'B', 'debit', writeToken))} disabled={busy || !tradeId || !confirmSettlement || writeToken.length < 32 || (Boolean(sourceTradeId) && selectedSourceTrade?.trade.fabricStatus !== 'SETTLED_PENDING_VALUE_LEGS')} className="rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs p-2 disabled:opacity-50">3 · Settle debit B</button>}
                  {(!selectedSourceTrade || selectedSourceTrade.trade.counterpartyMsp === currentMsp) && <button onClick={() => run(() => api.performFabricLegAction(tradeId, 'A', 'credit', writeToken))} disabled={busy || !tradeId || !confirmSettlement || writeToken.length < 32 || (Boolean(sourceTradeId) && selectedSourceTrade?.trade.fabricStatus !== 'SETTLED_PENDING_VALUE_LEGS')} className="rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs p-2 disabled:opacity-50">4 · Credit payee A</button>}
                </div>
              </div>
            </div>
          </div>
          </details>
          {message && (
            <div className={`rounded-lg border p-3 text-xs ${message.kind === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <div className="flex items-center gap-2 font-semibold">{message.kind === 'success' && <CheckCircle2 className="w-4 h-4" />}{message.text}</div>
              {message.transactionId && <div className="mt-1 font-mono break-all">TxID: {message.transactionId}{message.blockNumber ? ` · Block ${message.blockNumber}` : ''}</div>}
            </div>
          )}
        </>
      )}
      {busy && <span className="sr-only"><LoaderCircle /></span>}
    </section>
  );
};
