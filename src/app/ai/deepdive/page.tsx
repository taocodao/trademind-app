"use client";

import { useState } from 'react';
import { ArrowLeft, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DeepDiveData {
   whyItMoved: string;
   technicalSnapshot: string;
   ivEnvironment: string;
   turboAlignment: string;
   turboStrength: 'strong' | 'moderate' | 'neutral' | 'against';
   strategyHint: string;
   riskScore: number;
   riskRationale: string;
}

export default function DeepDivePage() {
  const router = useRouter();
  const [ticker, setTicker] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DeepDiveData | null>(null);

  const handleSearch = async (forcedTicker?: string) => {
    const searchTicker = (forcedTicker || ticker).trim();
    if (!searchTicker || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setData(null);
    setTicker(searchTicker);

    try {
      const response = await fetch('/api/ai/deepdive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: searchTicker })
      });

      if (response.status === 402) {
         setError('You have exhausted your AI message limit for the month. Upgrade to Pro for more messages.');
         setIsLoading(false);
         return;
      }

      if (!response.ok) throw new Error('Failed to fetch deep dive');
      
      const resData = await response.json();
      if (resData.error) throw new Error(resData.error);
      
      setData(resData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Sorry, there was an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  const recentSearches = ['QQQ', 'NVDA', 'SPY', 'TSLA'];

  return (
    <div className="min-h-screen bg-tm-bg pb-24 px-4 pt-6 max-w-lg mx-auto flex flex-col">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-xl flex items-center gap-2">
          <Search className="w-5 h-5 text-amber-400" />
          Stock Deep Dive
        </h1>
        <div className="ml-auto text-xs font-medium text-tm-muted bg-tm-surface px-2 py-1 rounded-full border border-tm-border">
          Cost: 2 msgs
        </div>
      </header>

      <div className="bg-tm-surface p-2 rounded-2xl border border-tm-border/50 mb-4 flex items-center">
         <div className="pl-3 text-tm-muted shrink-0">
            <Search className="w-5 h-5" />
         </div>
         <input 
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
               if (e.key === 'Enter') handleSearch();
            }}
            placeholder="Enter ticker (e.g. AAPL)"
            className="flex-1 bg-transparent text-white placeholder:text-tm-muted/50 py-3 px-3 uppercase border-none focus:ring-0 text-lg font-bold"
         />
         <button 
            onClick={() => handleSearch()}
            disabled={isLoading || !ticker}
            className="ml-auto bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-colors shrink-0"
         >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Dive'}
         </button>
      </div>

      {!data && !isLoading && (
         <div className="flex gap-2 flex-wrap mb-6 px-1">
            <span className="text-sm text-tm-muted py-1.5 mr-1">Recent:</span>
            {recentSearches.map(t => (
               <button 
                  key={t}
                  onClick={() => handleSearch(t)}
                  className="bg-tm-surface hover:bg-tm-surface/80 border border-tm-border text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors uppercase tracking-wider"
               >
                  {t}
               </button>
            ))}
         </div>
      )}

      {error && (
         <div className="bg-tm-red/10 border border-tm-red/20 text-tm-red text-sm p-4 rounded-xl mt-4">
            {error}
         </div>
      )}

      {data && (
         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-2">
            <div className="flex items-center gap-4 py-2">
               <div className="h-[1px] flex-1 bg-tm-border/80"></div>
               <div className="text-white font-black text-xl tracking-tight">{ticker.toUpperCase()}</div>
               <div className="h-[1px] flex-1 bg-tm-border/80"></div>
            </div>

            <div className="bg-tm-surface border border-tm-border rounded-xl p-4 shadow-sm">
               <div className="text-white font-bold mb-2 flex items-center gap-2">
                  <span>📰</span> Why It Moved
               </div>
               <p className="text-tm-muted text-sm leading-relaxed">{data.whyItMoved}</p>
            </div>

            <div className="bg-tm-surface border border-tm-border rounded-xl p-4 shadow-sm">
               <div className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                  <span>🌡️</span> IV Environment
               </div>
               <p className="text-tm-muted text-sm leading-relaxed">{data.ivEnvironment}</p>
            </div>

            <div className="bg-tm-surface border border-tm-border rounded-xl p-4 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
               <div className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                  <span>🧠</span> TurboCore View ({data.turboStrength})
               </div>
               <p className="text-tm-muted text-sm leading-relaxed">{data.turboAlignment}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
               <div className="bg-tm-surface border border-tm-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                  <div className={`text-3xl font-black mb-1 ${data.riskScore > 7 ? 'text-red-400' : data.riskScore > 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                     {data.riskScore}<span className="text-base text-tm-muted/50 font-bold">/10</span>
                  </div>
                  <div className="text-[10px] text-tm-muted font-bold uppercase tracking-wider">Risk Score</div>
               </div>
               <div className="bg-tm-purple/10 border border-tm-purple/20 rounded-xl p-4 flex flex-col justify-center">
                  <div className="text-[10px] text-tm-purple font-bold uppercase tracking-wider mb-1">Strategy Hint</div>
                  <div className="text-white text-xs leading-relaxed font-medium line-clamp-3">{data.strategyHint}</div>
               </div>
            </div>

            <div className="pt-4">
               <button 
                  onClick={() => router.push(`/ai/chat?q=Tell me more about ${ticker}`)}
                  className="w-full bg-tm-purple/10 hover:bg-tm-purple/20 text-tm-purple border border-tm-purple/30 text-sm font-semibold rounded-xl py-3.5 transition-colors flex justify-center items-center gap-2"
               >
                  <Search className="w-4 h-4" />
                  Ask a follow-up...
               </button>
            </div>
         </div>
      )}

    </div>
  );
}
