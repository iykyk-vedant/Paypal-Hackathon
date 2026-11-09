import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Channel3Item, Channel3Quote, ScreenId } from '../types';
import { ShoppingBag, Search, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, X } from 'lucide-react';

interface Channel3SourcingModalProps {
  onNavigate: (screen: ScreenId) => void;
  onInitiateTradeFromQuote?: (quote: Channel3Quote) => void;
}

export const Channel3SourcingModal: React.FC<Channel3SourcingModalProps> = ({
  onNavigate,
  onInitiateTradeFromQuote,
}) => {
  const [items, setItems] = useState<Channel3Item[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeQuote, setActiveQuote] = useState<Channel3Quote | null>(null);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const data = await api.getChannel3Catalog(searchQuery, categoryFilter);
      setItems(data.results || []);
    } catch (err) {
      console.warn('Channel3 fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [categoryFilter]);

  const handleRequestQuote = async (sku: string) => {
    try {
      const quote = await api.getChannel3Quote(sku, 250);
      setActiveQuote(quote);
    } catch (err: any) {
      alert(`Quote error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto w-full">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl border border-amber-200">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Product Catalog</h2>
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">

              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Autonomous AI buyer agents discover wholesale inventory, negotiate institutional quotes, and execute PayPal settlement.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search SKUs, sensors, chips..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCatalog()}
              className="bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-amber-400 w-64"
            />
          </div>
          <button
            onClick={fetchCatalog}
            className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-100 text-slate-900 rounded-lg text-xs font-semibold transition-all"
          >
            Search
          </button>
        </div>
      </div>

      {/* Catalog Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.sku}
            className="glass-panel rounded-2xl p-5 border border-slate-200 hover:border-amber-200 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-amber-800 font-bold">{item.sku}</span>
                <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                  {item.country}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                {item.title}
              </h3>

              <div className="text-[11px] text-slate-600 font-medium">
                Category: <span className="text-slate-700">{item.category}</span>
              </div>

              <div className="text-[11px] text-slate-600">
                Supplier: <span className="text-slate-800 font-semibold">{item.supplierName}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
                {item.specifications}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between font-mono">
                <span className="text-xs text-slate-600">Unit Price:</span>
                <span className="text-sm font-bold text-slate-900">
                  {item.currency === 'INR' ? '₹' : 'S$'} {item.unitPrice.toFixed(2)} {item.currency}
                </span>
              </div>

              <button
                onClick={() => handleRequestQuote(item.sku)}
                className="w-full py-2 bg-gradient-to-r from-amber-100 to-amber-100 hover:from-amber-100 hover:to-amber-100 text-slate-900 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" /> Request Agentic Wholesale Quote
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Active Quote Modal */}
      {activeQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-amber-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setActiveQuote(null)}
              className="absolute top-5 right-5 text-slate-600 hover:text-slate-900"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 font-bold">
                Q
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Supplier quote generated</h3>
                <p className="text-xs text-slate-600 font-mono">Quote ID: {activeQuote.quoteId}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Product:</span>
                <span className="text-slate-900 font-bold">{activeQuote.item.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Quantity:</span>
                <span className="text-slate-900">{activeQuote.quantity} Units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Gross Wholesale:</span>
                <span className="text-slate-900">{activeQuote.currency} {activeQuote.grossAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Volume Discount:</span>
                <span>-{activeQuote.volumeDiscountPct}% Applied</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                <span className="text-slate-700">Net Settlement:</span>
                <span className="text-amber-800">{activeQuote.currency} {activeQuote.netSettlementAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (onInitiateTradeFromQuote) {
                    onInitiateTradeFromQuote(activeQuote);
                  }
                  setActiveQuote(null);
                  onNavigate('new-trade');
                }}
                className="flex-1 py-2.5 bg-sky-100 hover:bg-sky-100 text-slate-900 rounded-xl font-bold text-xs shadow-glow flex items-center justify-center gap-1.5 transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-800" /> Initiate Bilateral Trade & PayPal Settle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
