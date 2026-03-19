"use client";

import { useEffect, useState } from 'react';
import { ArrowLeft, Sunrise, Calendar, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function BriefingPage() {
  const router = useRouter();
  const [briefing, setBriefing] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For this implementation plan demo, we will check if it's currently available 
  // by hitting a simulated 'read' endpoint or just fetching the latest from DB.
  // We'll create a dedicated GET /api/ai/briefing route to actually fetch them.
  useEffect(() => {
    fetch('/api/ai/briefing')
      .then(r => r.json())
      .then(data => {
         if (data.today) setBriefing(data.today);
         if (data.history) setHistory(data.history);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-tm-bg pb-24 px-4 pt-6 max-w-lg mx-auto flex flex-col">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-xl flex items-center gap-2">
          <Sunrise className="w-5 h-5 text-orange-400" />
          Morning Brief
        </h1>
        <div className="ml-auto text-xs font-medium text-tm-muted bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full border border-emerald-500/20">
          Free
        </div>
      </header>

      {isLoading ? (
         <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-tm-muted" /></div>
      ) : briefing ? (
         <div className="space-y-6 animate-in fade-in duration-500">
            <div className="relative overflow-hidden bg-tm-surface rounded-2xl border border-tm-border p-5 shadow-lg">
               <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full pointer-events-none" />
               <div className="relative z-10">
                  <div className="text-xs text-orange-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                     <Calendar className="w-3.5 h-3.5" />
                     Today's Catalyst
                  </div>
                  <h2 className="text-white font-black text-2xl leading-tight mb-4">
                     {briefing.content.headline}
                  </h2>
                  <p className="text-tm-muted text-sm leading-relaxed mb-6 font-medium">
                     {briefing.content.regimeContext}
                  </p>
                  
                  <div className="space-y-3">
                     {briefing.content.bullets?.map((bull: any, i: number) => (
                        <div key={i} className="flex gap-3 items-start bg-tm-bg p-3 rounded-xl border border-tm-border/50">
                           <span className="text-xl shrink-0 mt-0.5">{bull.emoji}</span>
                           <span className="text-sm text-gray-200 font-medium leading-relaxed">{bull.text}</span>
                        </div>
                     ))}
                  </div>
               </div>
            </div>

            <div className="text-center pt-2">
               <button 
                  onClick={() => router.push('/ai/chat?q=How should I trade the morning brief today?')}
                  className="bg-tm-purple/10 hover:bg-tm-purple/20 text-tm-purple border border-tm-purple/30 text-sm font-semibold rounded-xl px-6 py-2.5 transition-colors"
               >
                  Discuss today's brief
               </button>
            </div>
         </div>
      ) : (
         <div className="bg-tm-surface border border-tm-border rounded-xl p-8 text-center flex flex-col items-center">
            <Sunrise className="w-12 h-12 text-tm-muted mb-4 opacity-50" />
            <div className="text-white font-bold mb-2">No Briefing Yet</div>
            <div className="text-tm-muted text-sm px-6">Today's pre-market briefing is generated automatically at 8:15 AM ET. Check back soon.</div>
         </div>
      )}

      {history.length > 0 && (
         <div className="pt-8">
            <h3 className="text-white font-bold text-sm mb-4 px-1 opacity-90">Previous Briefs</h3>
            <div className="space-y-3">
               {history.map((h, i) => (
                  <div key={i} className="bg-tm-surface border border-tm-border p-4 rounded-xl opacity-70 hover:opacity-100 transition-opacity flex flex-col gap-1.5 cursor-pointer active:scale-[0.99]">
                     <div className="text-xs text-tm-muted font-bold uppercase tracking-wider flex justify-between">
                        <span>{new Date(h.date).toLocaleDateString()}</span>
                        <span className={h.regime === 'BULL' ? 'text-emerald-400' : h.regime === 'BEAR' ? 'text-red-400' : 'text-amber-400'}>{h.regime}</span>
                     </div>
                     <div className="text-white text-sm font-semibold leading-snug line-clamp-2">
                        {h.content.headline}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      )}
    </div>
  );
}
