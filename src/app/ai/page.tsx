'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Bot, ShieldCheck, Zap, Maximize, 
  Briefcase, ScanSearch, LineChart, Target,
  FileSearch, MessageSquare, Coffee, ShieldAlert,
  Loader2, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { AIFeatureCard } from '@/components/ui/AIFeatureCard';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

export default function AIHubPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatures = async () => {
    try {
      const res = await fetch('/api/ai/features');
      if (!res.ok) throw new Error('Failed to load features');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && authenticated) {
      fetchFeatures();
    } else if (ready && !authenticated) {
      router.push('/');
    }
  }, [ready, authenticated, router]);

  const handleSubscribe = async (featureKey: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/subscribe-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey })
      });
      
      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Failed to subscribe');
      }
      
      if (json.method === 'paid') {
          setError('Added to your Stripe subscription! ($5/mo)');
      } else {
          setError('Feature added for free!');
      }
      
      await fetchFeatures();
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsubscribe = async (featureKey: string) => {
    if (!confirm('Are you sure you want to remove access to this feature?')) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/unsubscribe-feature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureKey })
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to unsubscribe');
      }
      
      setError('Feature removed.');
      await fetchFeatures();
      
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center bg-tm-bg">
        <Loader2 className="h-8 w-8 animate-spin text-tm-purple mb-4" />
      </div>
    );
  }

  const { tier, features, freeRemaining, freeLimit, chatIncluded } = data || {};
  const isObserver = tier === 'observer';

  return (
    <div className="min-h-screen bg-tm-bg text-white pb-24">
      
      {/* Header section */}
      <header className="px-5 pt-8 pb-6 bg-tm-surface/50 border-b border-tm-border">
        <div className="flex items-center gap-4 mb-2">
            <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center border border-white/5 shadow-sm hover:bg-tm-purple/20 transition-colors">
                <ArrowLeft className="w-5 h-5 text-tm-muted hover:text-white" />
            </Link>
            <div className="flex items-center gap-3 opacity-90">
                <Bot className="text-tm-purple h-8 w-8" />
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">AI Copilot</h1>
            </div>
        </div>
        <p className="text-tm-muted text-sm max-w-sm mt-1 mb-4 leading-relaxed pl-[3.5rem]">
          Your personal market analyst powered by Perplexity Pro real-time engine. 
        </p>

        {error && (
            <div className="mb-4 ml-[3.5rem] p-4 rounded-xl bg-tm-surface border border-white/10 flex items-start gap-3">
                {error.includes('added') || error.includes('removed') ? (
                    <CheckCircle2 className="w-5 h-5 text-tm-green flex-shrink-0 mt-0.5" />
                ) : (
                    <ShieldAlert className="w-5 h-5 text-tm-red flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                    <p className={`text-sm ${error.includes('added') || error.includes('removed') ? 'text-tm-green' : 'text-tm-red'}`}>{error}</p>
                </div>
                <button onClick={() => setError(null)} className="text-tm-muted hover:text-white">
                    &times;
                </button>
            </div>
        )}
        
        {!isObserver && (
          <div className="bg-tm-purple/10 border border-tm-purple/30 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center w-full">
               <span className="text-sm font-medium text-white flex items-center gap-2">
                 <Zap className="h-4 w-4 text-amber-400" /> Subscription Tier: <span className="uppercase text-tm-purple">{tier.replace('_', ' ')}</span>
               </span>
               <span className="text-xs font-semibold bg-tm-purple/20 px-2 py-1 rounded text-tm-purple">
                  {freeRemaining} / {freeLimit} free picks left
               </span>
            </div>
            {freeRemaining > 0 && (
                <p className="text-xs text-tm-muted">You have unused free AI feature picks. Add a feature below for free!</p>
            )}
            {freeRemaining === 0 && freeLimit > 0 && (
                <p className="text-xs text-tm-muted">You have used your free picks. Additional features are $5/mo.</p>
            )}
          </div>
        )}
        
        {isObserver && (
          <div className="bg-tm-surface border border-tm-border rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-tm-purple/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
             <ShieldAlert className="h-6 w-6 text-amber-500 mb-1" />
             <h3 className="font-semibold text-white">Unlock AI Copilot</h3>
             <p className="text-xs text-tm-muted">Subscribe to a base plan to unlock free AI features and the $5/mo add-ons.</p>
             <Link href="/pricing" className="mt-2 text-tm-purple text-sm font-medium hover:underline">View Plans →</Link>
          </div>
        )}
      </header>

      {isProcessing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-tm-purple/30 overflow-hidden">
           <div className="h-full bg-tm-purple animate-pulse w-full"></div>
        </div>
      )}

      {/* Feature Grids */}
      <div className="px-5 py-6 space-y-8">

        {/* PRO TOOLS */}
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <ScanSearch className="h-5 w-5 text-tm-muted" /> Available Features
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {features?.map((f: any) => (
                <AIFeatureCard 
                  key={f.key}
                  title={f.name}
                  featureKey={f.key}
                  price={f.price}
                  description={getDescriptionFor(f.key)}
                  icon={getIconFor(f.key)}
                  isActive={f.isActive}
                  isFreePickAvailable={freeRemaining > 0}
                  userTier={tier}
                  onSubscribe={handleSubscribe}
                  onUnsubscribe={handleUnsubscribe}
                />
            ))}
          </div>
        </div>
        
        {/* FREE CHAT - ALWAYS BOTTOM */}
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
             <MessageSquare className="h-5 w-5 text-tm-muted" /> Included Core
          </h2>
          <div className="grid grid-cols-1 gap-3">
             <AIFeatureCard 
                  title="TradeMind Chat"
                  featureKey="chat"
                  price={0}
                  description="General educational chat with the AI copilot. Always unlimited for all plans."
                  icon={<MessageSquare className="h-6 w-6 text-blue-400" />}
                  isActive={chatIncluded}
                  isFreePickAvailable={false}
                  userTier={tier}
                  href="/ai/chat"
              />
          </div>
        </div>

      </div>
    </div>
  );
}

function getIconFor(key: string) {
    if (key === 'screenshot') return <FileSearch className="h-6 w-6 text-indigo-400" />;
    if (key === 'deepdive') return <LineChart className="h-6 w-6 text-green-400" />;
    if (key === 'briefing') return <Coffee className="h-6 w-6 text-amber-400" />;
    if (key === 'strategy') return <Target className="h-6 w-6 text-rose-400" />;
    if (key === 'debrief') return <Briefcase className="h-6 w-6 text-purple-400" />;
    return <Bot className="h-6 w-6" />;
}

function getDescriptionFor(key: string) {
    if (key === 'screenshot') return "Upload screenshots of trades or charts for instant AI analysis and breakdowns.";
    if (key === 'deepdive') return "In-depth ticker analysis with live news catalysts and options risk profiling.";
    if (key === 'briefing') return "Daily morning market briefing tailored to the active TurboCore regime.";
    if (key === 'strategy') return "Build realistic multi-leg options strategies optimized for your specific thesis.";
    if (key === 'debrief') return "Weekly performance review and educational insights on your closed trades.";
    return "";
}
