import React, { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { api } from './api';
import {
  MeResponse,
  Account,
  TradeComposite,
  PayPalLedgerEntry,
  ToastMessage,
  ScreenId,
  Channel3Quote,
} from './types';

import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';
import { PublicEntry } from './components/PublicEntry';
import { canOpen, HOME_SCREEN } from './roles';


const TraderDesk = lazy(() => import('./components/TraderDesk').then((m) => ({ default: m.TraderDesk })));
const ActiveSettlementsAGGrid = lazy(() => import('./components/ActiveSettlementsAGGrid').then((m) => ({ default: m.ActiveSettlementsAGGrid })));
const PayPalLedgerAGGrid = lazy(() => import('./components/PayPalLedgerAGGrid').then((m) => ({ default: m.PayPalLedgerAGGrid })));
const BryntumSettlementTimeline = lazy(() => import('./components/BryntumSettlementTimeline').then((m) => ({ default: m.BryntumSettlementTimeline })));
const AIAgentSwarmView = lazy(() => import('./components/AIAgentSwarmView').then((m) => ({ default: m.AIAgentSwarmView })));
const Channel3SourcingModal = lazy(() => import('./components/Channel3SourcingModal').then((m) => ({ default: m.Channel3SourcingModal })));
const ElasticSearchPanel = lazy(() => import('./components/ElasticSearchPanel').then((m) => ({ default: m.ElasticSearchPanel })));
const NewTradeProposal = lazy(() => import('./components/NewTradeProposal').then((m) => ({ default: m.NewTradeProposal })));
const TradeDetail = lazy(() => import('./components/TradeDetail').then((m) => ({ default: m.TradeDetail })));
const RegulatorConsole = lazy(() => import('./components/RegulatorConsole').then((m) => ({ default: m.RegulatorConsole })));
const AuditorPortal = lazy(() => import('./components/AuditorPortal').then((m) => ({ default: m.AuditorPortal })));
const PayPalCheckoutModal = lazy(() => import('./components/PayPalCheckoutModal').then((m) => ({ default: m.PayPalCheckoutModal })));
const AICopilotDrawer = lazy(() => import('./components/AICopilotDrawer').then((m) => ({ default: m.AICopilotDrawer })));
const ZapierConfigModal = lazy(() => import('./components/ZapierConfigModal').then((m) => ({ default: m.ZapierConfigModal })));
const FabricBlockExplorer = lazy(() => import('./components/FabricBlockExplorer').then((m) => ({ default: m.FabricBlockExplorer })));
const AIChaincodeAuditorView = lazy(() => import('./components/AIChaincodeAuditorView').then((m) => ({ default: m.AIChaincodeAuditorView })));

export function App() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [checkingSession, setCheckingSession] = useState(api.hasSession());
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('desk');
  const [selectedTradeId, setSelectedTradeId] = useState<string>('T-1048');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<TradeComposite[]>([]);
  const [paypalLedger, setPayPalLedger] = useState<PayPalLedgerEntry[]>([]);
  const [channel3Quote, setChannel3Quote] = useState<Channel3Quote | null>(null);
  const [paypalMode, setPaypalMode] = useState<string>('checking');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals & Drawers
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(false);
  const [isZapierModalOpen, setIsZapierModalOpen] = useState<boolean>(false);
  const [isPayPalModalOpen, setIsPayPalModalOpen] = useState<boolean>(false);
  const [paypalModalTrade, setPaypalModalTrade] = useState<TradeComposite | null>(null);

  // Toast Helper
  const addToast = useCallback((t: Omit<ToastMessage, 'id' | 'timestamp'>) => {
    const id = `toast-${Date.now()}`;
    const newToast: ToastMessage = { ...t, id, timestamp: Date.now() };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 6000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Refresh Accounts, Trades, and PayPal Ledger
  const refreshData = useCallback(async () => {
    try {
      const [accts, trs, ledger, health] = await Promise.all([
        api.getAccounts().catch(() => []),
        api.getTrades().catch(() => []),
        api.getPayPalLedger().catch(() => []),
        api.getHealth().catch(() => null),
      ]);

      if (Array.isArray(accts)) setAccounts(accts);
      if (Array.isArray(trs)) {
        setTrades(trs);
        if (trs.length > 0 && !trs.some((t) => t.trade.tradeId === selectedTradeId)) {
          setSelectedTradeId(trs[0].trade.tradeId);
        }
      }
      if (Array.isArray(ledger)) setPayPalLedger(ledger);
      if (health?.paypalMode) setPaypalMode(health.paypalMode);
    } catch (err) {
      console.warn('Error refreshing data:', err);
    }
  }, [selectedTradeId]);

  useEffect(() => {
    if (!api.hasSession()) return;
    api.getMe().then((profile) => {
      setMe(profile);
      setCurrentScreen(HOME_SCREEN[profile.role]);
      setCheckingSession(false);
    }).catch(() => {
      api.setSession(null);
      setCheckingSession(false);
    });
  }, []);

  useEffect(() => {
    const onExpired = () => { setMe(null); setCheckingSession(false); };
    window.addEventListener('paybridge-session-expired', onExpired);
    return () => window.removeEventListener('paybridge-session-expired', onExpired);
  }, []);

  useEffect(() => { if (me) refreshData(); }, [me, refreshData]);
  useEffect(() => { if (me && !canOpen(me, currentScreen)) setCurrentScreen(HOME_SCREEN[me.role]); }, [me, currentScreen]);

  const navigate = (screen: ScreenId) => {
    if (canOpen(me, screen)) setCurrentScreen(screen);
  };

  const signOut = async () => {
    try { await api.logout(); } catch { api.setSession(null); }
    setMe(null);
    setAccounts([]);
    setTrades([]);
    setPayPalLedger([]);
    setIsCopilotOpen(false);
    setIsPayPalModalOpen(false);
  };

  // Accept Trade Handler
  const handleAcceptTrade = async (tradeId: string) => {
    try {
      const updated = await api.acceptTrade(tradeId);
      addToast({
        type: 'success',
        title: 'Trade accepted',
        message: 'Counterparty leg marked as held in the demo workflow.',
      });
      await refreshData();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Failed to Accept Trade',
        message: err.message,
      });
    }
  };

  // Settle Trade via PayPal
  const handleSettleTrade = async (tradeId: string) => {
    const tradeItem = trades.find((t) => t.trade.tradeId === tradeId);
    if (tradeItem) {
      setPaypalModalTrade(tradeItem);
      setIsPayPalModalOpen(true);
    }
  };

  // PayPal Success Callback
  const handlePayPalCaptureSuccess = async (captureData: any) => {
    addToast({
      type: 'success',
      title: captureData.isSimulation ? 'Simulated demo capture completed' : 'PayPal Sandbox capture completed',
      message: captureData.isSimulation
        ? 'This flow simulated PayPal funding; no provider transaction was made. Continue with explicit Fabric test settlement only if you intend to write the test ledger.'
        : 'PayPal Sandbox confirmed funding. The linked Fabric trade still needs explicit settlement confirmation and each required value-leg commit.',
      paypalOrderId: captureData.orderId,
      isSimulation: Boolean(captureData.isSimulation),
    });
    await refreshData();
  };

  const handlePayPalPayout = async (tradeId: string) => {
    try {
      const payout = await api.executePayPalPayout(tradeId);
      addToast({
        type: 'success',
        title: payout.isSimulation ? 'Simulated payout recorded' : 'PayPal Sandbox payout initiated',
        message: payout.isSimulation ? 'No provider payout was made.' : `Sandbox batch ${payout.payoutBatchId || ''} status: ${payout.status}.`,
        paypalOrderId: payout.payoutBatchId,
        isSimulation: Boolean(payout.isSimulation),
      });
      await refreshData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'PayPal payout failed', message: err.message || 'Could not initiate the Sandbox payout.' });
      await refreshData();
    }
  };

  const selectedTrade = trades.find((t) => t.trade.tradeId === selectedTradeId) || trades[0] || null;

  if (checkingSession) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600" role="status">Checking your session…</div>;
  if (!me) return <PublicEntry onSignedIn={(profile) => {
    setMe(profile);
    setCurrentScreen(HOME_SCREEN[profile.role]);
  }} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <a href="#main-content" className="sr-only z-[100] rounded-md bg-white px-4 py-3 text-sm text-slate-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to main content
      </a>
      {/* Header with branding and demo operator selector */}
      <Header
        me={me}
        onSignOut={signOut}
        onNavigate={navigate}
        onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
        onRefresh={refreshData}
        currentScreen={currentScreen}
      />

      {/* 3. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={navigate}
          me={me}
          paypalMode={paypalMode}
          onOpenZapierModal={() => setIsZapierModalOpen(true)}
        />

        {/* Screen Routing Content Area */}
        <main id="main-content" className="min-w-0 flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white">
          <Suspense fallback={
            <div className="mx-auto max-w-7xl p-6" role="status" aria-live="polite">
              <span className="sr-only">Loading section</span>
              <div className="h-8 w-56 animate-pulse rounded-lg bg-slate-100" />
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white/70" />)}
              </div>
              <div className="mt-4 h-64 animate-pulse rounded-xl border border-slate-200 bg-white/70" />
            </div>
          }>
          {canOpen(me, currentScreen) && currentScreen === 'desk' && (
            <TraderDesk
              accounts={accounts}
              trades={trades}
              onNavigate={navigate}
              canCapture={me.role === 'approver'}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {canOpen(me, currentScreen) && currentScreen === 'active-settlements' && (
            <ActiveSettlementsAGGrid
              currentMsp={me.msp}
              trades={trades}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onNavigate={navigate}
              canCapture={me.role === 'approver'}
              onSettleTrade={handleSettleTrade}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {canOpen(me, currentScreen) && currentScreen === 'paypal-ledger' && (
            <PayPalLedgerAGGrid
              ledger={paypalLedger}
              onRefresh={refreshData}
            />
          )}

          {canOpen(me, currentScreen) && currentScreen === 'bryntum-timeline' && (
            <BryntumSettlementTimeline
              currentMsp={me.msp}
              trades={trades}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onNavigate={navigate}
              canCapture={me.role === 'approver'}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {canOpen(me, currentScreen) && currentScreen === 'fabric-explorer' && <FabricBlockExplorer
            canWrite={me.role === 'approver'}
            currentMsp={me.msp}
            demoTrades={trades}
            onCapturePayPal={(trade) => { setPaypalModalTrade(trade); setIsPayPalModalOpen(true); }}
          />}

          {canOpen(me, currentScreen) && currentScreen === 'ai-auditor' && <AIChaincodeAuditorView />}

          {canOpen(me, currentScreen) && currentScreen === 'ai-swarm' && <AIAgentSwarmView />}

          {canOpen(me, currentScreen) && currentScreen === 'channel3-sourcing' && (
            <Channel3SourcingModal
              onNavigate={navigate}
              onInitiateTradeFromQuote={(quote: Channel3Quote) => {
                setChannel3Quote(quote);
                setCurrentScreen('new-trade');
              }}
            />
          )}

          {canOpen(me, currentScreen) && currentScreen === 'elastic-audit' && <ElasticSearchPanel />}

          {canOpen(me, currentScreen) && currentScreen === 'new-trade' && (
            <NewTradeProposal
              currentMsp={me.msp}
              initialQuote={channel3Quote}
              onNavigate={navigate}
              onTradeCreated={async (trade) => {
                addToast({
                  type: 'success',
                  title: 'Demo trade proposed',
                  message: `Trade ${trade.trade.tradeId} added to the demo workflow.`,
                });
                setChannel3Quote(null);
                await refreshData();
              }}
            />
          )}

          {canOpen(me, currentScreen) && currentScreen === 'trade-detail' && (
            <TradeDetail
              currentMsp={me.msp}
              trade={selectedTrade}
              onNavigate={navigate}
              canAccept={me.role === 'approver' && selectedTrade?.trade.counterpartyMsp === me.msp}
              canCapture={me.role === 'approver'}
              onAcceptTrade={handleAcceptTrade}
              onRequestPayPalPayout={me.role === 'approver' ? handlePayPalPayout : undefined}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {canOpen(me, currentScreen) && currentScreen === 'regulator' && <RegulatorConsole jurisdiction={me.jurisdiction as 'JUR-A' | 'JUR-B'} />}

          {canOpen(me, currentScreen) && currentScreen === 'auditor' && (
            <AuditorPortal
              trades={trades}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onNavigate={navigate}
            />
          )}
          </Suspense>
        </main>
      </div>

      {/* Floating Drawers & Modals */}
      <Suspense fallback={null}><AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onNavigate={navigate}
      />

      <PayPalCheckoutModal
        trade={paypalModalTrade}
        isOpen={isPayPalModalOpen}
        onClose={() => {
          setIsPayPalModalOpen(false);
          setPaypalModalTrade(null);
        }}
        onSuccess={handlePayPalCaptureSuccess}
      />

      <ZapierConfigModal
        isOpen={isZapierModalOpen}
        onClose={() => setIsZapierModalOpen(false)}
      />
      </Suspense>

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
export default App;
