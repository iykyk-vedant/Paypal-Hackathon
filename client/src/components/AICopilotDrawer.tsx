import React, { useState } from 'react';
import { api } from '../api';
import { ScreenId } from '../types';
import { Bot, X, Send, Sparkles, ShieldCheck, CreditCard, RefreshCw, User } from 'lucide-react';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: ScreenId) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionType?: string;
  data?: any;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your **PayBridge AI Copilot**.\n\nI can negotiate B2B trades with institutional volume discounts, screen counterparties for AML compliance, orchestrate treasury liquidity, and execute atomic settlements via the **PayPal Sandbox API**.\n\nTry one of the quick prompts below or ask me anything!',
    },
  ]);

  const quickPrompts = [
    'Negotiate 50,000 SGD trade with Bank B1',
    'Screen trade for AML and sanctions risk',
    'Check PayPal Sandbox settlement status',
    'Rebalance INR and SGD treasury liquidity',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await api.aiCopilot(text);
      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: response.reply,
        actionType: response.actionType,
        data: response.data,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: `⚠️ Error executing copilot request: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between animate-slide-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-purple to-primary flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              PayBridge AI Copilot <span className="bg-primary/20 text-primary-light text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">ONLINE</span>
            </h3>
            <p className="text-[11px] text-slate-400">Natural language trading & settlement assistant</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 text-xs ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-primary-light" />
              </div>
            )}

            <div
              className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-primary text-white font-medium rounded-tr-sm'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-sm whitespace-pre-wrap'
              }`}
            >
              <div>{msg.text}</div>

              {msg.actionType === 'PROPOSAL_GENERATED' && (
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    onClick={() => {
                      onNavigate('new-trade');
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    Open New Trade Desk
                  </button>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 text-xs items-center text-slate-400 font-mono">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-primary-light animate-spin" />
            </div>
            <span>AI Swarm synthesizing deliberation...</span>
          </div>
        )}
      </div>

      {/* Footer: Quick Prompts & Input */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
        {/* Quick Prompt Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white whitespace-nowrap transition-all"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask AI Copilot or instruct trade action..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={loading || !inputMessage.trim()}
            className="p-2 rounded-xl bg-primary hover:bg-primary-light disabled:opacity-50 text-white transition-all shadow-glow"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
