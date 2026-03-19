"use client";

import { useState, useEffect } from 'react';
import { Camera, Bot, ArrowLeft, Send, Loader2, Lock } from 'lucide-react';
import { SignalContextBadge } from '@/components/ui/SignalContextBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScreenshotPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [streamData, setStreamData] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featureAccess, setFeatureAccess] = useState({ isLocked: false, freeRemaining: 0, loading: true });

  useEffect(() => {
    fetch('/api/ai/features')
      .then(res => res.json())
      .then(resData => {
         const feature = resData.features?.find((f: any) => f.key === 'screenshot');
         setFeatureAccess({
            isLocked: feature ? !feature.isActive : true,
            freeRemaining: resData.freeRemaining || 0,
            loading: false
         });
      })
      .catch(() => setFeatureAccess(prev => ({ ...prev, loading: false })));
  }, []);

  // Mocked state for UI testing
  const turboSignal = { regime: 'BULL', confidence: 87, mlScore: 92, allocation: { TQQQ: 80, HYG: 20 } };

  const handleAnalyze = async () => {
    if (!description.trim() || isStreaming) return;
    setIsStreaming(true);
    setStreamData('');
    setError(null);

    try {
      const response = await fetch('/api/ai/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: description }]
        })
      });

      if (response.status === 403) {
         setError('FEATURE_LOCKED');
         setIsStreaming(false);
         return;
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        
        // Parse SSE chunk (Perplexity uses standard OpenAI-like streaming)
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.replace(/^data: /, '') === '[DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace(/^data: /, ''));
              if (data.choices?.[0]?.delta?.content) {
                setStreamData(prev => prev + data.choices[0].delta.content);
              }
            } catch (e) {
               // ignore split payload errors
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
      setStreamData('Sorry, there was an error processing your request.');
    } finally {
      setIsStreaming(false);
    }
  };

  if (featureAccess.loading) {
     return (
        <div className="min-h-screen bg-tm-bg py-24 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-tm-purple animate-spin" />
        </div>
     );
  }

  if (featureAccess.isLocked || error === 'FEATURE_LOCKED') {
     const isFree = featureAccess.freeRemaining > 0;
     return (
        <div className="min-h-screen bg-tm-bg py-24 px-6 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-tm-purple/20 flex items-center justify-center mb-6 border border-tm-purple/30">
               <Lock className="w-8 h-8 text-tm-purple" />
            </div>
            <h1 className="text-white font-black text-2xl mb-2">Feature Locked</h1>
            <p className="text-tm-muted mb-8 leading-relaxed">
               You haven't unlocked the Screenshot Analyzer yet. 
            </p>
            <button 
               onClick={() => router.push('/ai')}
               className="bg-tm-purple hover:bg-tm-purple/90 text-white px-8 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
            >
               {isFree ? "Add for FREE" : "Unlock for $5/mo"}
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
        <button onClick={() => router.back()} className="p-2 -ml-2 text-tm-muted hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-bold text-xl flex items-center gap-2">
          <Camera className="w-5 h-5 text-emerald-400" />
          Analyzer
        </h1>
      </header>

      <div className="mb-4">
        <SignalContextBadge signal={turboSignal} />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
         {streamData && (
            <div className="bg-purple-600/10 border border-tm-purple/20 rounded-xl p-4 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
               {streamData}
               {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-tm-purple animate-pulse align-middle" />}
            </div>
         )}
      </div>

      <div className="mt-auto bg-tm-surface p-3 rounded-2xl border border-tm-border/50">
         <div className="flex items-center gap-2 mb-3 px-2">
            <button className="w-10 h-10 rounded-full bg-tm-bg border border-tm-border flex items-center justify-center text-tm-muted hover:text-white transition-colors">
               <Camera className="w-4 h-4" />
            </button>
            <span className="text-xs text-tm-muted">Upload Chart (Coming Soon)</span>
         </div>
         <div className="relative">
            <textarea 
               value={description}
               onChange={e => setDescription(e.target.value)}
               placeholder="Or describe the position you are considering..."
               className="w-full bg-tm-bg text-sm text-white rounded-xl placeholder:text-tm-muted/50 p-3 pr-12 resize-none border-none focus:ring-1 focus:ring-tm-purple"
               rows={3}
            />
            <button 
               onClick={handleAnalyze}
               disabled={isStreaming || !description.trim()}
               className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-tm-purple flex items-center justify-center text-white disabled:opacity-50 disabled:bg-tm-surface"
            >
               {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
         </div>
      </div>
    </div>
  );
}
