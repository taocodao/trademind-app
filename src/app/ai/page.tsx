"use client";

import { useSettings } from '@/components/providers/SettingsProvider';
import { AIFeatureCard } from '@/components/ui/AIFeatureCard';
import { Camera, Sunrise, Calculator, Search, TrendingUp, MessageSquare, Bot, ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AIHubPage() {
  const { settings } = useSettings();
  const [budget, setBudget] = useState<{ used: number; limit: number; remaining: number } | null>(null);

  useEffect(() => {
    // Fetch budget on load
    fetch('/api/ai/budget').then(r => r.json()).then(data => {
      if (data.allowed !== undefined) setBudget(data);
    }).catch(console.error);
  }, []);

  const tier = settings?.subscription_tier || 'observer';
  const used = budget?.used || 0;
  const limit = budget?.limit || (tier === 'observer' ? 10 : tier === 'core' ? 50 : tier === 'pro' ? 400 : 1500);
  const percent = Math.min(100, Math.round((used / limit) * 100)) || 0;

  return (
    <div className="min-h-screen bg-tm-bg pb-24 px-4 pt-6 space-y-6 max-w-lg mx-auto">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-white font-bold text-2xl tracking-tight flex items-center gap-2">
          <Bot className="w-7 h-7 text-tm-purple" />
          AI Copilot
        </h1>
      </header>
      
      {/* Budget Card */}
      <div className="bg-tm-surface border border-tm-border rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
        <div className="flex justify-between items-end relative z-10">
          <div>
            <div className="text-white font-bold text-lg">{limit - used} messages left</div>
            <div className="text-tm-muted text-xs mt-0.5">Resets month-end</div>
          </div>
          <div className="text-tm-purple font-semibold text-sm">{percent}% used</div>
        </div>
        
        <div className="h-2 w-full bg-tm-bg rounded-full overflow-hidden relative z-10">
          <div 
            className="h-full bg-tm-purple transition-all duration-1000 ease-out" 
            style={{ width: `${percent}%` }}
          />
        </div>
        
        {/* Decorative background glow */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-tm-purple/10 rounded-full blur-2xl pointer-events-none" />
      </div>

      {tier === 'observer' && (
        <Link href="/settings" className="flex items-center justify-between bg-tm-purple text-white p-3 rounded-xl font-medium shadow-lg shadow-tm-purple/20 active:scale-[0.98] transition-transform">
          <span>Upgrade to unlock full AI powers</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      )}

      {/* AI Features Grid */}
      <div className="space-y-3 pt-2">
        <h2 className="text-white font-semibold text-sm px-1 opacity-90">Core Tools</h2>
        <div className="grid grid-cols-2 gap-3">
          <AIFeatureCard 
            title="Screenshot Analyzer"
            description="Upload any position chart to test alignment"
            icon={<Camera className="w-6 h-6 text-emerald-400" />}
            tier="all"
            messagesRequired={3}
            href="/ai/screenshot"
            userTier={tier}
          />
          <AIFeatureCard 
            title="Deep Dive"
            description="Live web search on catalysts + IV rank"
            icon={<Search className="w-6 h-6 text-amber-400" />}
            tier="all"
            messagesRequired={2}
            href="/ai/deepdive"
            userTier={tier}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <AIFeatureCard 
            title="Morning Brief"
            description="Daily regime summary at 8:15 AM ET"
            icon={<Sunrise className="w-6 h-6 text-orange-400" />}
            tier="all"
            messagesRequired={0}
            href="/ai/briefing"
            userTier={tier}
          />
          <AIFeatureCard 
            title="Strategy Builder"
            description="Options structuring from your thesis"
            icon={<Calculator className="w-6 h-6 text-tm-purple" />}
            tier="pro"
            messagesRequired={2}
            href="/ai/strategy"
            userTier={tier}
          />
        </div>

        <h2 className="text-white font-semibold text-sm px-1 pt-4 opacity-90">Performance Coaching</h2>
        <AIFeatureCard 
          title="Weekly Debrief"
          description="Personalized Sunday review bridging your portfolio vs TurboCore"
          icon={<TrendingUp className="w-6 h-6 text-emerald-400" />}
          tier="pro"
          messagesRequired={0}
          href="/ai/debrief"
          userTier={tier}
        />
      </div>

      <div className="pt-4">
        <Link href="/ai/chat" className="flex items-center gap-3 bg-tm-surface hover:bg-tm-surface/80 border border-tm-border rounded-2xl p-4 transition-colors">
          <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center text-tm-purple shrink-0">
            <MessageSquare className="w-5 h-5 fill-current opacity-80" />
          </div>
          <div>
            <div className="text-white font-medium">Free Chat</div>
            <div className="text-tm-muted text-xs line-clamp-1">Ask any market question (1 message)</div>
          </div>
        </Link>
      </div>

    </div>
  );
}
