"use client";

import { useState } from 'react';
import { Camera, Bot, ArrowLeft, Send, Loader2 } from 'lucide-react';
import { SignalContextBadge } from '@/components/ui/SignalContextBadge';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ScreenshotPage() {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [streamData, setStreamData] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Mocked state for UI testing
  const turboSignal = { regime: 'BULL', confidence: 87, mlScore: 92, allocation: { TQQQ: 80, HYG: 20 } };

  const handleAnalyze = async () => {
    if (!description.trim() || isStreaming) return;
    setIsStreaming(true);
    setStreamData('');

    try {
      const response = await fetch('/api/ai/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: description }]
        })
      });

      if (response.status === 402) {
         setStreamData('You have exhausted your AI message limit for the month. Upgrade to Pro for more messages.');
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
        <div className="ml-auto text-xs font-medium text-tm-muted bg-tm-surface px-2 py-1 rounded-full border border-tm-border">
          Cost: 3 msgs
        </div>
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
