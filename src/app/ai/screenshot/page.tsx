"use client";

import { useState, useEffect } from 'react';
import { Camera, ArrowLeft, Send, Loader2, Lock, X, Clipboard } from 'lucide-react';
import { SignalContextBadge } from '@/components/ui/SignalContextBadge';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

export default function ScreenshotPage() {
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [streamData, setStreamData] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMediaType, setImageMediaType] = useState<string>('image/jpeg');

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

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (!file) continue;
          setImageMediaType(file.type);
          const reader = new FileReader();
          reader.onload = (ev) => {
            const result = ev.target?.result as string;
            setImageBase64(result.split(',')[1]);
            setImagePreview(result);
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  // Mocked TurboCore signal context
  const turboSignal = { regime: 'BULL', confidence: 87, mlScore: 92, allocation: { TQQQ: 80, HYG: 20 } };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
  };

  const canSubmit = (imageBase64 || description.trim()) && !isStreaming;

  const handleAnalyze = async () => {
    if (!canSubmit) return;
    setIsStreaming(true);
    setStreamData('');
    setError(null);

    try {
      const response = await fetch('/api/ai/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, imageBase64, imageMediaType })
      });

      if (response.status === 403) {
        setError('FEATURE_LOCKED');
        setIsStreaming(false);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Analysis failed');
      }

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);

        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        for (const line of lines) {
          if (line.replace(/^data: /, '') === '[DONE]') continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace(/^data: /, ''));
              if (data.choices?.[0]?.delta?.content) {
                setStreamData(prev => prev + data.choices[0].delta.content);
              }
            } catch {
              // ignore parse errors for split chunks
            }
          }
        }
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Sorry, there was an error processing your request.');
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
        <button onClick={() => router.push('/ai')} className="mt-6 text-tm-muted text-sm font-medium hover:text-white">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tm-bg pb-24 px-4 pt-6 max-w-lg mx-auto flex flex-col">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/ai')} className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
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

      {/* AI Response */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {error && error !== 'FEATURE_LOCKED' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
            {error}
          </div>
        )}
        {streamData && (
          <div className="bg-purple-600/10 border border-tm-purple/20 rounded-xl p-4 text-sm text-gray-200 leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{streamData}</ReactMarkdown>
            {isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-tm-purple animate-pulse align-middle" />}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-auto bg-tm-surface p-3 rounded-2xl border border-tm-border/50">

        {/* Image preview */}
        {imagePreview && (
          <div className="relative mb-3 rounded-xl overflow-hidden border border-tm-border">
            <img src={imagePreview} alt="Chart preview" className="w-full max-h-48 object-cover" />
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
              <span className="text-xs text-white/80 font-medium">Chart ready for analysis</span>
            </div>
          </div>
        )}

        {/* Paste tool tip */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <div className="flex items-center gap-2 text-xs text-tm-muted/60 bg-tm-bg/60 border border-tm-border/40 rounded-lg px-3 py-2">
            <Clipboard className="w-3.5 h-3.5" />
            Paste a screenshot with <kbd className="bg-white/10 px-1 rounded">Ctrl+V</kbd>
          </div>
        </div>

        {/* Text input */}
        <div className="relative">
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); } }}
            placeholder={imageBase64 ? "Add context about this chart (optional)..." : "Or describe the position you are considering..."}
            className="w-full bg-tm-bg text-sm text-white rounded-xl placeholder:text-tm-muted/50 p-3 pr-12 resize-none border-none focus:ring-1 focus:ring-tm-purple"
            rows={3}
          />
          <button
            onClick={handleAnalyze}
            disabled={!canSubmit}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-tm-purple flex items-center justify-center text-white disabled:opacity-40 disabled:bg-tm-surface transition-all hover:bg-tm-purple/90 active:scale-95"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
