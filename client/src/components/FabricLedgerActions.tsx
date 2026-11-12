import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { TradeComposite } from '../types';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, LoaderCircle } from 'lucide-react';

interface FabricLedgerActionsProps {
  currentMsp: string;
  enabled: boolean;
  onChanged: () => void;
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

export const FabricLedgerActions: React.FC<FabricLedgerActionsProps> = ({ currentMsp, enabled, onChanged }) => {
  const proposerMsp = currentMsp as 'BankA1MSP' | 'BankB1MSP';
  const [amountA, setAmountA] = useState('1000.00');
  const [amountB, setAmountB] = useState('16.00');
  const ccyA: 'INR' | 'SGD' = proposerMsp === 'BankA1MSP' ? 'INR' : 'SGD';
  const [tradeId, setTradeId] = useState('');
  const [sourceTradeId, setSourceTradeId] = useState('');
  const [selectedSourceTrade, setSelectedSourceTrade] = useState<TradeComposite | null>(null);
  const [acceptedDemoTrades, setAcceptedDemoTrades] = useState<TradeComposite[]>([]);
  const [reference, setReference] = useState('CorridorFlow Fabric demo trade');
  const [writeToken, setWriteToken] = useState('');
  const [confirmSettlement, setConfirmSettlement] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string; transactionId?: string; blockNumber?: string } | null>(null);

  useEffect(() => {
    api.getTrades().then((trades) => setAcceptedDemoTrades(trades.filter((item) =>
      ['ACCEPTED', 'SETTLED'].includes(item.trade.status) &&
      ['INR', 'SGD'].includes(item.trade.ccyA) &&
      ['INR', 'SGD'].includes(item.trade.ccyB) &&
      item.trade.ccyA !== item.trade.ccyB
    ))).catch(() => setAcceptedDemoTrades([]));
  }, []);

  const run = async (action: () => Promise<any>) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      if (result.tradeId) setTradeId(result.tradeId);
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

  return (
    <section className="glass-panel rounded-2xl p-5 border border-amber-200 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl p-2 bg-amber-50 text-amber-800 border border-amber-200"><AlertTriangle className="w-5 h-5" /></div>
        <div>
          <h3 className="font-bold text-slate-900">Fabric ledger transactions</h3>
          <p className="text-xs text-slate-600 mt-1">These actions write permanent transactions to the live test ledger. Link an accepted demo trade to carry its terms across; capture PayPal Sandbox funding before explicit Fabric settlement.</p>
        </div>
      </div>

      {!enabled ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          Ledger writes are disabled or the Gateway and both bank identities are not ready. Configure rotated BankA1 and BankB1 identities, verify live queries, then explicitly enable <code>FABRIC_GATEWAY_WRITE_ENABLED</code> on the backend.
        </p>
      ) : (
        <>
          <label className="block text-xs text-slate-700">Authorized demo write token
            <input type="password" autoComplete="off" value={writeToken} onChange={(event) => setWriteToken(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900" placeholder="Provided by the backend operator; kept only in this page session" />
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ArrowRightLeft className="w-4 h-4 text-blue-700" /> Propose a live trade</h4>
              <label className="block text-xs text-slate-700">Link an accepted demo trade (optional)
                <select value={sourceTradeId} onChange={(event) => {
                  const selected = acceptedDemoTrades.find((item) => item.trade.tradeId === event.target.value);
                  setSourceTradeId(event.target.value);
                  setSelectedSourceTrade(selected || null);
                  setTradeId(selected?.trade.fabricTradeId || '');
                  if (!selected) return;
                  setAmountA(fromMinorUnits(selected.trade.amountA));
                  setAmountB(fromMinorUnits(selected.trade.amountB));
                  setReference(selected.trade.reference || `CorridorFlow linked trade ${selected.trade.tradeId}`);
                }} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-slate-900">
                  <option value="">Standalone Fabric test trade</option>
                  {acceptedDemoTrades.map((item) => <option key={item.trade.tradeId} value={item.trade.tradeId}>{item.trade.tradeId}{item.trade.fabricTradeId ? ` ↔ ${item.trade.fabricTradeId}` : ''} · ${item.trade.ccyA} → {item.trade.ccyB} · {item.trade.fabricStatus || 'not linked'}</option>)}
                </select>
              </label>
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
