"use client";

import { useState } from 'react';
import { ArrowLeft, Calculator, Loader2, Lock, Send, Target, Clock, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Strategy {
  name: string;
  legs: string[];
  netCost: number | null;
  maxGain: number | null;
  breakeven: number | null;
  probabilityOfProfit: number;
  turboAlignment: 'strong' | | 'moderate' | 'neutral' | 'against';
  rationale: string;
  riskReward: string;
}

export default function StrategyPage() {
  const router = useRouter();
  const [ticker, setTicker] = useState('');
  const [thesis, setThesis] = useState('');
  const [timeframe, setTimeframe] = useState('30 DTE');
  const [risk, setRisk] = useState('Medium');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[] | null>(null);

  const handleBuild = async () => {
    if (!ticker.trim() || !thesis.trim() || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    setStrategies(null);

    try {
      const response = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, thesis, timeframe, risk })
      });

      if (response.status === 403) {
         setError('UPGRADE_REQUIRED');
         setIsLoading(false);
         return;
      }
      if (response.status === 402) {
         setError('You have exhausted your AI monthly message limit. Upgrade to Pro for more.');
         setIsLoading(false);
         return;
      }

      if (!response.ok) throw new Error('Failed to generate strategies');
      
      const resData = await response.json();
      if (resData.error) throw new Error(resData.error);
      
      setStrategies(resData.strategies);
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Sorry, there was an error processing your request.');
    } finally {
      setIsLoading(false);
    }
  };

  if (error === 'UPGRADE_REQUIRED') {
     return (
        <div className="min-h-screen bg-tm-bg py-24 px-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-tm-purple/20 flex items-center justify-center mb-6 border border-tm-purple/30">
               <Lock className="w-8 h-8 text-tm-purple" />
            </div>
            <h1 className="text-white font-black text-2xl mb-2">Pro Feature</h1>
            <p className="text-tm-muted mb-8 leading-relaxed">
               The AI Options Strategy Builder is available exclusively to Pro and Bundle subscribers. Upgrade to get instant multi-leg setups aligned with your thesis.
            </p>
            <button 
               onClick={() => router.push('/settings')}
               className="bg-tm-purple text-white px-8 py-3.5 rounded-xl font-bold transition-transform active:scale-95"
            >
               View Plans
            </button>
            <button onClick={() => router.back()} className="mt-6 text-tm-muted text-sm font-medium hover:text-white">
               Go Back
            </button>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-tm-bg pb-24 px-4 pt-6 max-w-lg mx-auto flex flex-col">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-xl flex items-center gap-2">
          <Calculator className="w-5 h-5 text-tm-purple" />
          Strategy Builder
        </h1>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-tm-purple bg-tm-purple/10 px-2 py-1 rounded-full border border-tm-purple/30 uppercase tracking-wider">
          <Lock className="w-3 h-3" /> PRO
        </div>
      </header>

      {error && !error.includes('UPGRADE') && (
         <div className="bg-tm-red/10 border border-tm-red/20 text-tm-red text-sm p-4 rounded-xl mb-4">
            {error}
         </div>
      )}

      {strategies ? (
         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-white font-bold px-1 opacity-90 pb-2">Top 3 Structured Plays</div>
            {strategies.map((strat, i) => (
               <div key={i} className="bg-tm-surface border border-tm-border rounded-xl p-5 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                     <div>
                        <div className="text-xs text-tm-muted font-bold uppercase tracking-wider mb-1">Strategy {i+1}</div>
                        <div className="text-white font-black text-lg">{strat.name}</div>
                     </div>
                     <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                        strat.turboAlignment === 'strong' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        strat.turboAlignment === 'moderate' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border-red-500/20'
                     }`}>
                        {strat.turboAlignment} Align
                     </div>
                  </div>

                  <div className="bg-tm-bg/50 rounded-lg p-3 border border-tm-border/50 mb-4 space-y-1">
                     {strat.legs.map((leg, j) => (
                        <div key={j} className="text-sm text-gray-200 font-medium flex items-center gap-2">
                           <span className="w-1.5 h-1.5 rounded-full bg-tm-purple shrink-0" />
                           {leg}
                        </div>
                     ))}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                     <div className="bg-tm-bg/50 rounded-lg p-2 text-center border border-tm-border/30">
                        <div className="text-[10px] text-tm-muted font-bold uppercase mb-0.5">Debit</div>
                        <div className="text-white text-sm font-bold">${strat.netCost}</div>
                     </div>
                     <div className="bg-tm-bg/50 rounded-lg p-2 text-center border border-tm-border/30">
                        <div className="text-[10px] text-tm-muted font-bold uppercase mb-0.5">Gain</div>
                        <div className="text-emerald-400 text-sm font-bold">${strat.maxGain}</div>
                     </div>
                     <div className="bg-tm-bg/50 rounded-lg p-2 text-center border border-tm-border/30">
                        <div className="text-[10px] text-tm-muted font-bold uppercase mb-0.5">B/E</div>
                        <div className="text-white text-sm font-bold">${strat.breakeven}</div>
                     </div>
                     <div className="bg-tm-bg/50 rounded-lg p-2 text-center border border-tm-border/30">
                        <div className="text-[10px] text-tm-muted font-bold uppercase mb-0.5">POP</div>
                        <div className="text-amber-400 text-sm font-bold">{strat.probabilityOfProfit}%</div>
                     </div>
                  </div>
                  
                  <p className="text-tm-muted text-xs leading-relaxed font-medium">
                     <strong className="text-white">Rationale:</strong> {strat.rationale}
                  </p>
               </div>
            ))}
            <button 
               onClick={() => setStrategies(null)}
               className="w-full mt-4 bg-tm-surface hover:bg-tm-surface/80 border border-tm-border text-white text-sm font-medium rounded-xl py-3.5 transition-colors"
            >
               Build Another
            </button>
         </div>
      ) : (
         <div className="space-y-4">
            <div className="bg-tm-surface p-5 rounded-2xl border border-tm-border/50">
               <div className="mb-4">
                  <label className="text-xs text-tm-muted font-bold uppercase tracking-wider pl-1 mb-1.5 block flex items-center gap-1.5">
                     <Target className="w-3.5 h-3.5" /> Ticker
                  </label>
                  <input 
                     type="text"
                     value={ticker}
                     onChange={e => setTicker(e.target.value.toUpperCase())}
                     placeholder="e.g. NVDA"
                     className="w-full bg-tm-bg text-white font-bold placeholder:text-tm-muted/50 p-3.5 uppercase rounded-xl border-none focus:ring-1 focus:ring-tm-purple"
                  />
               </div>

               <div className="mb-4">
                  <label className="text-xs text-tm-muted font-bold uppercase tracking-wider pl-1 mb-1.5 block flex items-center gap-1.5">
                     <MessageSquare className="w-3.5 h-3.5" /> Your Thesis
                  </label>
                  <textarea 
                     value={thesis}
                     onChange={e => setThesis(e.target.value)}
                     placeholder="Expecting a violent post-earnings move but IV is too high..."
                     className="w-full bg-tm-bg text-sm text-white placeholder:text-tm-muted/50 p-3.5 resize-none rounded-xl border-none focus:ring-1 focus:ring-tm-purple"
                     rows={3}
                  />
               </div>

               <div className="grid grid-cols-2 gap-3 mb-6">
                  <div>
                     <label className="text-[10px] text-tm-muted font-bold uppercase tracking-wider pl-1 mb-1.5 block flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Timeframe
                     </label>
                     <select 
                        value={timeframe}
                        onChange={e => setTimeframe(e.target.value)}
                        className="w-full bg-tm-bg text-white text-sm p-3 rounded-xl border-none focus:ring-1 focus:ring-tm-purple appearance-none"
                     >
                        <option>0-7 DTE</option>
                        <option>14-30 DTE</option>
                        <option>30-60 DTE</option>
                        <option>LEAPS (1yr+)</option>
                     </select>
                  </div>
                  <div>
                     <label className="text-[10px] text-tm-muted font-bold uppercase tracking-wider pl-1 mb-1.5 block flex items-center gap-1.5">
                        <ShieldAlert className="w-3 h-3" /> Max Risk
                     </label>
                     <select 
                        value={risk}
                        onChange={e => setRisk(e.target.value)}
                        className="w-full bg-tm-bg text-white text-sm p-3 rounded-xl border-none focus:ring-1 focus:ring-tm-purple appearance-none"
                     >
                        <option>Low Defined</option>
                        <option>Medium</option>
                        <option>High Defined</option>
                        <option>Undefined Risk</option>
                     </select>
                  </div>
               </div>

               <button 
                  onClick={handleBuild}
                  disabled={isLoading || !ticker.trim() || !thesis.trim()}
                  className="w-full bg-tm-purple hover:bg-tm-purple/90 text-white font-bold text-sm rounded-xl py-4 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 shadow-lg shadow-tm-purple/20"
               >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Structure Plays (Cost: 2 msgs)'}
               </button>
            </div>
         </div>
      )}
    </div>
  );
}
