import React from 'react';
import { ScreenId, MeResponse } from '../types';
import { Bot, PlusCircle, RefreshCw, ShieldCheck, LogOut } from 'lucide-react';
import { ROLE_SCREENS } from '../roles';

interface HeaderProps {
  me: MeResponse | null;
  onSignOut: () => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleCopilot: () => void;
  onRefresh: () => void;
  currentScreen: ScreenId;
}

export const Header: React.FC<HeaderProps> = ({
  me,
  onSignOut,
  onNavigate,
  onToggleCopilot,
  onRefresh,
  currentScreen,
}) => {
  const sections: { id: ScreenId; label: string }[] = [
    { id: 'desk', label: 'Trader desk' },
    { id: 'active-settlements', label: 'Active settlements' },
    { id: 'paypal-ledger', label: 'PayPal ledger' },
    { id: 'bryntum-timeline', label: 'Settlement timeline' },
    { id: 'fabric-explorer', label: 'Fabric explorer' },
    { id: 'ai-auditor', label: 'AI auditor' },
    { id: 'ai-swarm', label: 'AI agent tools' },
    { id: 'channel3-sourcing', label: 'Product catalog' },
    { id: 'elastic-audit', label: 'Activity search' },
    { id: 'regulator', label: 'Regulator console' },
    { id: 'auditor', label: 'Auditor portal' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3.5">
          <img src="/corridorflow-logo.png" alt="CorridorFlow" className="h-10 w-56 object-cover" />
        </div>

        <label className="w-full md:hidden">
          <span className="sr-only">Go to section</span>
          <select
            value={currentScreen}
            onChange={(event) => onNavigate(event.target.value as ScreenId)}
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none"
            aria-label="Go to section"
          >
            {sections.filter((section) => me && ROLE_SCREENS[me.role].includes(section.id)).map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
          </select>
        </label>

        {/* Right: Actions, Operator Selector, AI Copilot */}
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          {/* Signed-in identity */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs">
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            <span className="font-semibold text-slate-800">{me?.label}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Ledger & Accounts"
            aria-label="Refresh ledger and accounts"
            className="min-h-10 min-w-10 rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:bg-sky-50 hover:text-sky-900"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>

          {/* AI Copilot Toggle Button */}
          {me?.orgType === 'bank' && <button
            onClick={onToggleCopilot}
            className="flex min-h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-100"
          >
            <Bot className="w-4 h-4 text-cyan-800" aria-hidden="true" />
            <span>AI Copilot</span>
          </button>}

          {/* New Trade Proposal Button */}
          {me?.role === 'trader' && <button
            onClick={() => onNavigate('new-trade')}
            className="flex min-h-10 items-center gap-2 rounded-lg border border-sky-200 bg-sky-100 px-3.5 py-2 text-sm font-semibold text-sky-900 transition-colors hover:bg-sky-200"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Trade</span>
          </button>}
          <button onClick={onSignOut} title="Sign out" aria-label="Sign out" className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </div>
    </header>
  );
};
