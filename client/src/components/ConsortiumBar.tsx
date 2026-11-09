import React from 'react';
import { CONSORTIUM_NODES } from '../api';

interface ConsortiumBarProps {
  currentNodeId: string;
  onSelectNode: (nodeId: string, operator: string) => void;
}

export const ConsortiumBar: React.FC<ConsortiumBarProps> = ({ currentNodeId, onSelectNode }) => {
  return (
    <div className="flex flex-col gap-2 overflow-hidden border-b border-slate-200/80 bg-slate-50 px-4 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="flex items-center gap-2 whitespace-nowrap font-medium text-slate-600">
        <span className="inline-block h-2 w-2 rounded-full bg-slate-500" aria-hidden="true"></span>
        <span className="text-[11px] uppercase tracking-wider text-slate-700">Demo identities:</span>
      </div>

      <div className="flex max-w-full items-center gap-2 overflow-x-auto py-1">
        {CONSORTIUM_NODES.map((node) => {
          const isActive = currentNodeId === node.id;
          return (
            <button
              key={node.id}
              onClick={() => onSelectNode(node.id, node.operator)}
              aria-pressed={isActive}
              className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-sky-100 border-sky-200 text-slate-900 shadow-glow'
                  : 'bg-white/60 border-slate-200 text-slate-600 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span>{node.label}</span>
              <span className={`hidden text-[10px] sm:inline ${isActive ? 'text-sky-800 font-semibold' : 'text-slate-600'}`}>
                {node.sublabel}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
};
