import React, { useState, useEffect, useCallback } from 'react';
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
import { ConsortiumBar } from './components/ConsortiumBar';
import { Sidebar } from './components/Sidebar';
import { Toast } from './components/Toast';

import { TraderDesk } from './components/TraderDesk';
import { ActiveSettlementsAGGrid } from './components/ActiveSettlementsAGGrid';
import { PayPalLedgerAGGrid } from './components/PayPalLedgerAGGrid';
import { BryntumSettlementTimeline } from './components/BryntumSettlementTimeline';
import { AIAgentSwarmView } from './components/AIAgentSwarmView';
import { Channel3SourcingModal } from './components/Channel3SourcingModal';
import { ElasticSearchPanel } from './components/ElasticSearchPanel';
import { NewTradeProposal } from './components/NewTradeProposal';
import { TradeDetail } from './components/TradeDetail';
import { RegulatorConsole } from './components/RegulatorConsole';
import { AuditorPortal } from './components/AuditorPortal';
import { PayPalCheckoutModal } from './components/PayPalCheckoutModal';
import { AICopilotDrawer } from './components/AICopilotDrawer';
import { ZapierConfigModal } from './components/ZapierConfigModal';
import { FabricBlockExplorer } from './components/FabricBlockExplorer';
import { AIChaincodeAuditorView } from './components/AIChaincodeAuditorView';

export function App() {
  const [currentNodeId, setCurrentNodeId] = useState<string>('banka1');
  const [activeOperator, setActiveOperator] = useState<string>('a1-trader');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('desk');
  const [selectedTradeId, setSelectedTradeId] = useState<string>('T-1048');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trades, setTrades] = useState<TradeComposite[]>([]);
  const [paypalLedger, setPayPalLedger] = useState<PayPalLedgerEntry[]>([]);
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

  // Fetch /me & setup node identity
  const setupNode = useCallback(async (operator: string) => {
    api.setOperator(operator);
    try {
      const meData = await api.getMe();
      setMe(meData);
    } catch (err) {
      console.warn('Failed to fetch /me:', err);
    }
  }, []);

  // Refresh Accounts, Trades, and PayPal Ledger
  const refreshData = useCallback(async () => {
    try {
      const [accts, trs, ledger] = await Promise.all([
        api.getAccounts().catch(() => []),
        api.getTrades().catch(() => []),
        api.getPayPalLedger().catch(() => []),
      ]);

      if (Array.isArray(accts)) setAccounts(accts);
      if (Array.isArray(trs)) {
        setTrades(trs);
        if (trs.length > 0 && !trs.some((t) => t.trade.tradeId === selectedTradeId)) {
          setSelectedTradeId(trs[0].trade.tradeId);
        }
      }
      if (Array.isArray(ledger)) setPayPalLedger(ledger);
    } catch (err) {
      console.warn('Error refreshing data:', err);
    }
  }, [selectedTradeId]);

  useEffect(() => {
    setupNode(activeOperator);
    refreshData();
  }, [activeOperator, setupNode, refreshData]);

  // Node Switcher Handler
  const handleSelectNode = (nodeId: string, operator: string) => {
    setCurrentNodeId(nodeId);
    setActiveOperator(operator);
    if (nodeId === 'rega' || nodeId === 'regb') {
      setCurrentScreen('regulator');
    } else if (nodeId === 'auditor') {
      setCurrentScreen('auditor');
    } else {
      setCurrentScreen('desk');
    }
  };

  // Accept Trade Handler
  const handleAcceptTrade = async (tradeId: string) => {
    try {
      const updated = await api.acceptTrade(tradeId);
      addToast({
        type: 'success',
        title: 'Trade Accepted & Leg B Locked',
        message: `Both sovereign legs are locked in escrow. Ready for atomic PayPal settlement.`,
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
      title: 'Atomic Settlement Captured via PayPal',
      message: `Both sovereign legs released. Batch payout to vendor initiated.`,
      paypalOrderId: captureData.orderId,
    });
    await refreshData();
  };

  const selectedTrade = trades.find((t) => t.trade.tradeId === selectedTradeId) || trades[0] || null;

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col font-sans">
      {/* 1. Header with branding, sponsor badges, operator switcher */}
      <Header
        me={me}
        activeOperator={activeOperator}
        onOperatorChange={(op) => setActiveOperator(op)}
        onNavigate={(screen) => setCurrentScreen(screen)}
        onToggleCopilot={() => setIsCopilotOpen((prev) => !prev)}
        onRefresh={refreshData}
        currentScreen={currentScreen}
      />

      {/* 2. Consortium Bar for Node Switching */}
      <ConsortiumBar
        currentNodeId={currentNodeId}
        onSelectNode={handleSelectNode}
      />

      {/* 3. Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          me={me}
          onOpenZapierModal={() => setIsZapierModalOpen(true)}
        />

        {/* Screen Routing Content Area */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-[#0B1120] to-[#080D1A]">
          {currentScreen === 'desk' && (
            <TraderDesk
              accounts={accounts}
              trades={trades}
              onNavigate={(screen) => setCurrentScreen(screen)}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {currentScreen === 'active-settlements' && (
            <ActiveSettlementsAGGrid
              trades={trades}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onNavigate={(screen) => setCurrentScreen(screen)}
              onSettleTrade={handleSettleTrade}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {currentScreen === 'paypal-ledger' && (
            <PayPalLedgerAGGrid
              ledger={paypalLedger}
              onRefresh={refreshData}
            />
          )}

          {currentScreen === 'bryntum-timeline' && (
            <BryntumSettlementTimeline
              trades={trades}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onNavigate={(screen) => setCurrentScreen(screen)}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {currentScreen === 'fabric-explorer' && <FabricBlockExplorer />}

          {currentScreen === 'ai-auditor' && <AIChaincodeAuditorView />}

          {currentScreen === 'ai-swarm' && <AIAgentSwarmView />}

          {currentScreen === 'channel3-sourcing' && (
            <Channel3SourcingModal
              onNavigate={(screen) => setCurrentScreen(screen)}
              onInitiateTradeFromQuote={(quote: Channel3Quote) => {
                setCurrentScreen('new-trade');
              }}
            />
          )}

          {currentScreen === 'elastic-audit' && <ElasticSearchPanel />}

          {currentScreen === 'new-trade' && (
            <NewTradeProposal
              onNavigate={(screen) => setCurrentScreen(screen)}
              onTradeCreated={async (trade) => {
                addToast({
                  type: 'success',
                  title: 'New Trade Proposed',
                  message: `Trade ${trade.trade.tradeId} submitted with Leg A locked in escrow.`,
                });
                await refreshData();
              }}
            />
          )}

          {currentScreen === 'trade-detail' && (
            <TradeDetail
              trade={selectedTrade}
              onNavigate={(screen) => setCurrentScreen(screen)}
              onAcceptTrade={handleAcceptTrade}
              onOpenPayPalModal={(trade) => {
                setPaypalModalTrade(trade);
                setIsPayPalModalOpen(true);
              }}
            />
          )}

          {currentScreen === 'regulator' && <RegulatorConsole />}

          {currentScreen === 'auditor' && (
            <AuditorPortal
              trades={trades}
              onSelectTrade={(id) => setSelectedTradeId(id)}
              onNavigate={(screen) => setCurrentScreen(screen)}
            />
          )}
        </main>
      </div>

      {/* Floating Drawers & Modals */}
      <AICopilotDrawer
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        onNavigate={(screen) => setCurrentScreen(screen)}
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

      {/* Floating Notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
export default App;
