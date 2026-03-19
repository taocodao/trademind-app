"use client";

import { useEffect, useState } from 'react';
import { ArrowLeft, TrendingUp, AlertTriangle, Lightbulb, FileText, MessageSquare, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DebriefPage() {
  const router = useRouter();
  const [debrief, setDebrief] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/ai/debrief')
      .then(async r => {
         if (r.status === 403) {
            setError('UPGRADE_REQUIRED');
            return null;
         }
         return r.json();
      })
      .then(data => {
         if (data) {
            setDebrief(data.latest);
            setHistory(data.history);
         }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (error === 'UPGRADE_REQUIRED') {
     return (
        <div className="min-h-screen bg-tm-bg py-24 px-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-tm-purple/20 flex items-center justify-center mb-6 border border-tm-purple/30">
               <Lock className="w-8 h-8 text-tm-purple" />
            </div>
            <h1 className="text-white font-black text-2xl mb-2">Pro Feature</h1>
            <p className="text-tm-muted mb-8 leading-relaxed">
               Weekly Performance Debriefs are available securely to Pro and Bundle subscribers. Upgrade to unlock personalized AI trading coaching.
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
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Weekly Debrief
        </h1>
        <div className="ml-auto flex items-center gap-1.5 text-[10px] font-bold text-tm-purple bg-tm-purple/10 px-2 py-1 rounded-full border border-tm-purple/30 uppercase tracking-wider">
          <Lock className="w-3 h-3" /> PRO
        </div>
      </header>

      {isLoading ? (
         <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-tm-muted" /></div>
      ) : debrief ? (
         <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className={`bg-tm-surface rounded-2xl border ${debrief.content.beatSignal ? 'border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.05)]' : 'border-tm-border'} p-5 relative overflow-hidden`}>
               {debrief.content.beatSignal && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
               )}
               <div className="text-xs text-tm-muted font-bold uppercase tracking-wider mb-4 flex justify-between items-center relative z-10">
                  <span>Week of {new Date(debrief.week_start).toLocaleDateString()}</span>
                  {debrief.content.beatSignal && <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Signal Beaten 🏆</span>}
               </div>

               <div className="grid grid-cols-2 gap-4 mb-5 relative z-10">
                  <div>
                     <div className="text-tm-muted text-xs font-semibold mb-1">Your Portfolio</div>
                     <div className={`text-2xl font-black ${debrief.content.userReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {debrief.content.userReturn >= 0 ? '+' : ''}{debrief.content.userReturn}%
                     </div>
                  </div>
                  <div>
                     <div className="text-tm-muted text-xs font-semibold mb-1">TurboCore </div>
                     <div className={`text-2xl font-black opacity-80 ${debrief.content.signalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {debrief.content.signalReturn >= 0 ? '+' : ''}{debrief.content.signalReturn}%
                     </div>
                  </div>
               </div>

               <div className="bg-tm-bg/50 rounded-xl p-3 border border-tm-border/50 relative z-10">
                  <div className="text-white text-sm font-semibold leading-relaxed">
                     {debrief.content.headline}
                  </div>
               </div>
            </div>

            <div className="bg-tm-surface border border-tm-border rounded-xl p-4 shadow-sm">
               <div className="text-emerald-400 font-bold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> What went right
               </div>
               <p className="text-gray-200 text-sm leading-relaxed">{debrief.content.wentRight}</p>
            </div>

            <div className="bg-tm-surface border border-tm-border rounded-xl p-4 shadow-sm">
               <div className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Pattern to watch
               </div>
               <p className="text-gray-200 text-sm leading-relaxed">{debrief.content.watchOut}</p>
            </div>

            <div className="bg-tm-surface border border-tm-border rounded-xl p-4 shadow-sm">
               <div className="text-tm-purple font-bold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 stroke-[2.5px]" /> This Week's Tip
               </div>
               <p className="text-gray-200 text-sm leading-relaxed">{debrief.content.weeklyTip}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
               <button className="bg-tm-surface hover:bg-tm-surface/80 border border-tm-border rounded-xl p-3 flex items-center justify-center gap-2 text-white text-sm font-medium transition-colors">
                  <FileText className="w-4 h-4 text-tm-muted" /> Download PDF
               </button>
               <button 
                  onClick={() => router.push('/ai/chat?q=Review my weekly debrief with me.')}
                  className="bg-tm-purple/10 hover:bg-tm-purple/20 border border-tm-purple/30 rounded-xl p-3 flex items-center justify-center gap-2 text-tm-purple text-sm font-semibold transition-colors"
               >
                  <MessageSquare className="w-4 h-4" /> Analyze
               </button>
            </div>
         </div>
      ) : (
         <div className="bg-tm-surface border border-tm-border rounded-xl p-8 text-center flex flex-col items-center">
            <TrendingUp className="w-12 h-12 text-tm-muted mb-4 opacity-50" />
            <div className="text-white font-bold mb-2">No Debrief Yet</div>
            <div className="text-tm-muted text-sm px-6">Trade tracking starts this week. Your first personalized debrief will be generated on Sunday at 6 PM ET.</div>
         </div>
      )}

      {history.length > 0 && (
         <div className="pt-8">
            <h3 className="text-white font-bold text-sm mb-4 px-1 opacity-90">Previous Debriefs</h3>
            <div className="space-y-3">
               {history.map((h, i) => (
                  <div key={i} className="bg-tm-surface border border-tm-border p-4 rounded-xl opacity-70 hover:opacity-100 transition-opacity flex flex-col gap-2 cursor-pointer active:scale-[0.99]">
                     <div className="text-xs text-tm-muted font-bold uppercase tracking-wider flex justify-between">
                        <span>Week of {new Date(h.week_start).toLocaleDateString()}</span>
                        <span className={h.content.userReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                           {h.content.userReturn >= 0 ? '+' : ''}{h.content.userReturn}%
                        </span>
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
