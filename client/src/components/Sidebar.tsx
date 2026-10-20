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
  Sparkles,
  Blocks,
  Bot,
} from 'lucide-react';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  me: MeResponse | null;
  onOpenZapierModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  me,
  onOpenZapierModal,
}) => {
  const isRegulator = me?.orgType === 'regulator';
  const isAuditor = me?.orgType === 'auditor';

  const navItems = [
    {
      id: 'desk' as ScreenId,
      label: 'Trader Desk',
      sublabel: 'Reserves & Accounts',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      id: 'active-settlements' as ScreenId,
      label: 'Active Settlements',
      sublabel: 'AG Grid Corridor Flow',
      icon: Table,
      sponsorBadge: 'AG Grid',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'paypal-ledger' as ScreenId,
      label: 'PayPal Sandbox Ledger',
      sublabel: 'Orders & Batch Payouts',
      icon: CreditCard,
      sponsorBadge: 'PayPal API',
      badgeColor: 'bg-primary/20 text-primary-light border-primary/30',
    },
    {
      id: 'bryntum-timeline' as ScreenId,
      label: 'Settlement Timeline',
      sublabel: 'Payment Windows & Schedule',
      icon: CalendarDays,
      sponsorBadge: 'Bryntum',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'fabric-explorer' as ScreenId,
      label: 'Fabric Block Explorer',
      sublabel: 'Hyperledger 2.5 Blocks',
      icon: Blocks,
      sponsorBadge: 'Fabric 2.5',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'ai-auditor' as ScreenId,
      label: 'AI Chaincode Auditor',
      sublabel: 'DLT & Block Inspector',
      icon: Bot,
      sponsorBadge: 'AI Auditor',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
    {
      id: 'ai-swarm' as ScreenId,
      label: 'AI Multi-Agent Swarm',
      sublabel: 'Negotiator • AML • Treasury',
      icon: Cpu,
      sponsorBadge: 'Agentic AI',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'channel3-sourcing' as ScreenId,
      label: 'Channel3 Sourcing',
      sublabel: 'B2B Catalog & Inventory',
      icon: ShoppingBag,
      sponsorBadge: 'Channel3',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'elastic-audit' as ScreenId,
      label: 'Elastic Observability',
      sublabel: 'Financial Crime & Audit',
      icon: Search,
      sponsorBadge: 'Elastic',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    },
    {
      id: 'regulator' as ScreenId,
      label: 'Regulator Console',
      sublabel: 'Reserve Attestation & Halts',
      icon: Scale,
    },
    {
      id: 'auditor' as ScreenId,
      label: 'Auditor Reconstruction',
      sublabel: 'KERNEL Cryptographic Proofs',
      icon: FileCheck2,
      sponsorBadge: 'KERNEL',
      badgeColor: 'bg-slate-700 text-slate-300 border-slate-600',
    },
  ];

  return (
    <aside className="w-64 bg-[#090E1D] border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="p-4 space-y-6">
        {/* Navigation Category: Core Operations */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Core Operations
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-medium transition-all group ${
                    isActive
                      ? 'bg-primary/20 text-white border border-primary/50 shadow-glow font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive ? 'text-primary-light' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <div className="truncate">
                      <div className="truncate leading-tight">{item.label}</div>
                      <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                        {item.sublabel}
                      </div>
                    </div>
                  </div>

                  {item.sponsorBadge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded border font-mono font-semibold ml-1 shrink-0 ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {item.sponsorBadge}
                    </span>
                  )}
                  {item.badge && !item.sponsorBadge && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-mono font-semibold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Zapier Outbound Automation Trigger */}
        {onOpenZapierModal && (
          <div className="px-1">
            <button
              onClick={onOpenZapierModal}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/30 hover:border-orange-500/50 text-slate-200 hover:text-white text-xs transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Workflow className="w-4 h-4 text-orange-400 group-hover:animate-spin" />
                <div className="text-left">
                  <div className="font-semibold text-orange-300 text-xs">Zapier Webhooks</div>
                  <div className="text-[10px] text-slate-400">Slack & ERP Automation</div>
                </div>
              </div>
              <span className="text-[9px] bg-orange-500/20 text-orange-300 px-1.5 py-0.5 rounded border border-orange-500/40 font-mono">
                Zapier
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Footer System Status Card */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-[11px] space-y-2">
        <div className="flex items-center justify-between text-slate-400">
          <span>Active Rail:</span>
          <span className="font-mono text-emerald-400 font-semibold">PayPal Sandbox v2</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Corridor Mode:</span>
          <span className="font-mono text-slate-300 font-semibold">PvP Atomic Lock</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Sponsors Eligible:</span>
          <span className="font-mono text-accent-cyan font-bold">12 / 12 Verified</span>
        </div>
      </div>
    </aside>
  );
};
