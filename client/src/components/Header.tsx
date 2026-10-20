import React from 'react';
import { ScreenId, MeResponse } from '../types';
import { Bot, PlusCircle, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  me: MeResponse | null;
  activeOperator: string;
  onOperatorChange: (op: string) => void;
  onNavigate: (screen: ScreenId) => void;
  onToggleCopilot: () => void;
  onRefresh: () => void;
  currentScreen: ScreenId;
}

export const Header: React.FC<HeaderProps> = ({
  me,
  activeOperator,
  onOperatorChange,
  onNavigate,
  onToggleCopilot,
  onRefresh,
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-dark via-primary to-accent-cyan p-0.5 shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-xl text-primary-light">
              ⚡
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 font-sans">
                Pay<span className="text-primary-light">Bridge</span> <span className="bg-gradient-to-r from-accent-cyan to-accent-emerald bg-clip-text text-transparent">AI</span>
              </h1>
              <span className="bg-paypal-blue/30 border border-paypal-lightBlue/40 text-paypal-lightBlue text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                PayPal AI Hackathon
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Autonomous Agentic Commerce & Sovereign Cross-Border Treasury Protocol
            </p>
          </div>
        </div>

        {/* Center: Sponsor Eligible Badges Pill Array */}
        <div className="hidden xl:flex items-center gap-1.5 bg-slate-950/70 border border-slate-800/80 px-3 py-1.5 rounded-full text-[11px]">
          <span className="text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-accent-cyan" /> Sponsor Tech:
          </span>
          <span className="bg-primary/20 text-primary-light px-2 py-0.5 rounded-full font-semibold border border-primary/30">PayPal Orders & Payouts</span>
          <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">AG Grid</span>
          <span className="bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-semibold border border-purple-500/30">Bryntum</span>
          <span className="bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-semibold border border-blue-500/30">APIMatic</span>
          <span className="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-500/30">Channel3</span>
          <span className="bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold border border-cyan-500/30">Elastic</span>
          <span className="bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-semibold border border-orange-500/30">Postman</span>
          <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-semibold border border-rose-500/30">Render</span>
        </div>

        {/* Right: Actions, Operator Selector, AI Copilot */}
        <div className="flex items-center gap-3">
          {/* Operator Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <ShieldCheck className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400 hidden sm:inline">Operator:</span>
            <select
              value={activeOperator}
              onChange={(e) => onOperatorChange(e.target.value)}
              className="bg-transparent text-white font-mono font-medium focus:outline-none cursor-pointer text-xs"
            >
              {(me?.identities || ['a1-trader', 'a1-approver', 'b1-trader', 'b1-approver', 'rega-operator', 'regb-operator', 'aud-reader']).map((op) => (
                <option key={op} value={op} className="bg-slate-900 text-white">
                  {op}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            title="Refresh Ledger & Accounts"
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* AI Copilot Toggle Button */}
          <button
            onClick={onToggleCopilot}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-accent-purple/30 to-primary/40 hover:from-accent-purple/40 hover:to-primary/50 text-white text-xs font-semibold border border-accent-purple/40 shadow-glow transition-all"
          >
            <Bot className="w-4 h-4 text-accent-cyan animate-pulse" />
            <span>AI Copilot</span>
          </button>

          {/* New Trade Proposal Button */}
          <button
            onClick={() => onNavigate('new-trade')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-light text-white text-xs font-semibold shadow-glow transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Trade</span>
          </button>
        </div>
      </div>
    </header>
  );
};
