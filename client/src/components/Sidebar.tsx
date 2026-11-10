import React from 'react';
import { ScreenId, MeResponse } from '../types';
import {
  LayoutDashboard,
  Table,
  CreditCard,
  CalendarDays,
  Cpu,
  ShoppingBag,
  Search,
  Scale,
  FileCheck2,
  Workflow,
  Blocks,
  Bot,
} from 'lucide-react';
import { ROLE_SCREENS } from '../roles';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  me: MeResponse | null;
  paypalMode?: string;
  onOpenZapierModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  me,
  paypalMode = 'checking',
  onOpenZapierModal,
}) => {
  const navItems = [
    {
      id: 'desk' as ScreenId,
      label: 'Trader Desk',
      sublabel: 'Accounts & cash positions',
      icon: LayoutDashboard,
    },
    {
      id: 'active-settlements' as ScreenId,
      label: 'Active Settlements',
      sublabel: 'Payments & settlement status',
      icon: Table,
    },
    {
      id: 'paypal-ledger' as ScreenId,
      label: 'PayPal Ledger',
      sublabel: 'Sandbox & demo history',
      icon: CreditCard,
    },
    {
      id: 'bryntum-timeline' as ScreenId,
      label: 'Settlement Timeline',
      sublabel: 'Payment windows & schedule',
      icon: CalendarDays,
    },
    {
      id: 'fabric-explorer' as ScreenId,
      label: 'Fabric Block Explorer',
      sublabel: 'Sample ledger records',
      icon: Blocks,
    },
    {
      id: 'ai-auditor' as ScreenId,
      label: 'AI Chaincode Auditor',
      sublabel: 'Ledger rule review',
      icon: Bot,
    },
    {
      id: 'ai-swarm' as ScreenId,
      label: 'AI Multi-Agent Swarm',
      sublabel: 'Negotiation & risk tools',
      icon: Cpu,
    },
    {
      id: 'channel3-sourcing' as ScreenId,
      label: 'Product Catalog',
      sublabel: 'Supplier search & quotes',
      icon: ShoppingBag,
    },
    {
      id: 'elastic-audit' as ScreenId,
      label: 'Activity Search',
      sublabel: 'Audit and event records',
      icon: Search,
    },
    {
      id: 'regulator' as ScreenId,
      label: 'Regulator Console',
      sublabel: 'Sample rules & limits',
      icon: Scale,
    },
    {
      id: 'auditor' as ScreenId,
      label: 'Receipt Review',
      sublabel: 'Settlement receipt details',
      icon: FileCheck2,
    },
  ];

  return (
    <aside aria-label="Primary navigation" className="hidden w-72 shrink-0 select-none flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white md:flex">
      <div className="p-4 space-y-6">
        {/* Navigation Category: Core Operations */}
        <div>
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            Banking
          </div>
          <nav className="space-y-1">
            {navItems.filter((item) => me && ROLE_SCREENS[me.role].includes(item.id)).map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-12 w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors group focus-visible:outline-none ${
                    isActive
                    ? 'border border-sky-200 bg-sky-50 text-slate-900 font-semibold'
                      : 'border border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      aria-hidden="true"
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-sky-800' : 'text-slate-600 group-hover:text-slate-800'
                      }`}
                    />
                    <div className="truncate">
                      <div className="truncate leading-tight">{item.label}</div>
                      <div className="text-[11px] text-slate-700 truncate leading-tight mt-0.5">
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                </button>
              );
            })}
          </nav>
        </div>

        {/* Automation settings */}
        {me?.role === 'approver' && onOpenZapierModal && (
          <div className="px-1">
            <button
              onClick={onOpenZapierModal}
              className="min-h-12 w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 transition-colors hover:bg-sky-50 hover:text-slate-900 group"
            >
              <div className="flex items-center gap-2.5">
                <Workflow className="w-4 h-4 text-sky-800" aria-hidden="true" />
                <div className="text-left">
                  <div className="font-semibold text-slate-900 text-sm">Automation settings</div>
                  <div className="text-xs text-slate-600">Workflow notifications</div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Footer System Status Card */}
      <div className="space-y-2 border-t border-slate-200 bg-slate-50 p-4 text-xs">
        <div className="flex items-center justify-between text-slate-600">
          <span>PayPal Mode:</span>
          <span className={`font-mono font-semibold ${paypalMode === 'sandbox' ? 'text-emerald-800' : 'text-amber-800'}`}>
            {paypalMode === 'sandbox' ? 'Sandbox' : paypalMode === 'simulation' ? 'Simulation' : 'Checking...'}
          </span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Ledger:</span>
          <span className="font-mono font-semibold text-slate-700">Demo workflow</span>
        </div>
        <div className="flex items-center justify-between text-slate-600">
          <span>Fabric:</span>
          <span className="font-mono font-semibold text-slate-700">Test ledger</span>
        </div>
      </div>
    </aside>
  );
};
