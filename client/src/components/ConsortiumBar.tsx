import React from 'react';
import { CONSORTIUM_NODES } from '../api';

interface ConsortiumBarProps {
  currentNodeId: string;
  onSelectNode: (nodeId: string, operator: string) => void;
}

export const ConsortiumBar: React.FC<ConsortiumBarProps> = ({ currentNodeId, onSelectNode }) => {
  return (
    <div className="bg-[#090D1A] border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto gap-4">
      <div className="flex items-center gap-2 text-slate-400 font-medium whitespace-nowrap">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="uppercase tracking-wider text-[11px] text-slate-400">Consortium Nodes:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto py-0.5">
        {CONSORTIUM_NODES.map((node) => {
          const isActive = currentNodeId === node.id;
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id, node.operator)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-primary/20 border-primary text-white shadow-glow'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <span>{node.label}</span>
              <span className={`text-[10px] ${isActive ? 'text-primary-light font-semibold' : 'text-slate-400'}`}>
                {node.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:flex items-center gap-3 text-slate-400 text-[11px] whitespace-nowrap">
        <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-paypal-gold"></span>
          PayPal Sandbox: <strong className="text-slate-200">Connected</strong>
        </span>
        <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan"></span>
          AI Swarm: <strong className="text-slate-200">Autonomous</strong>
        </span>
      </div>
    </div>
  );
};
