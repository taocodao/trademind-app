'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Settings, AlertTriangle, Share2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TastytradeCredentials } from '@/components/settings/TastytradeCredentials';
import { InvestmentPrincipal } from '@/components/dashboard/InvestmentPrincipal';
import { ShadowLedgerPanel } from '@/components/dashboard/ShadowLedgerPanel';
import { TQQQAutoApproveSettings } from '@/components/settings/TQQQAutoApproveSettings';
import { SubscriptionManager } from '@/components/settings/SubscriptionManager';
import { MyStrategies } from '@/components/settings/MyStrategies';
import { SignalEmailAlertsSettings } from '@/components/settings/SignalEmailAlertsSettings';
import { SupportContact } from '@/components/settings/SupportContact';
import { StrategyTabs } from '@/components/ui/StrategyTabs';
import { useStrategyContext } from '@/components/providers/StrategyContext';

export default function SettingsPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const { activeStrategy, setActiveStrategy, enabledStrategies } = useStrategyContext();

    useEffect(() => {
        if (ready && !authenticated) {
            router.push('/');
        }
    }, [ready, authenticated, router]);

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-tm-purple/30 animate-pulse" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-tm-bg max-w-4xl mx-auto w-full pb-24 border-x border-white/5 shadow-2xl relative">
            {/* Header */}
            <header className="px-4 pt-10 pb-5 flex items-center gap-3">
                <Link
                    href="/dashboard"
                    className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center flex-shrink-0"
                >
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Settings</h1>
                    <p className="text-sm text-tm-muted">Configure your strategy</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center flex-shrink-0">
                    <Settings className="w-5 h-5 text-tm-purple" />
                </div>
            </header>

            <div className="px-4 space-y-4">
                
                {/* Subscription Tier Management — self-contained, fetches its own data */}
                <SubscriptionManager />

                {/* My Strategies Subscription */}
                <MyStrategies />
                
                {/* Strategy-Specific Settings (Auto-Approve & Risk) */}
                <TQQQAutoApproveSettings />

                {/* Email Alerts Setup */}
                <SignalEmailAlertsSettings />
                
                {/* Tastytrade Credentials */}
                <TastytradeCredentials />

                {/* Social Connections Link */}
                <Link href="/settings/social-connections" className="block">
                    <section className="glass-card p-4 hover:border-tm-purple/40 hover:bg-tm-surface/60 transition-all group flex items-center justify-between cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-tm-purple/10 flex items-center justify-center text-tm-purple group-hover:scale-110 transition-transform">
                                <Share2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white mb-0.5">Social Connections</h3>
                                <p className="text-xs text-tm-muted">Connect your X, LinkedIn, Facebook accounts</p>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-tm-muted group-hover:text-tm-purple transition-colors" />
                    </section>
                </Link>

                {/* Support & Help */}
                <SupportContact />

                {/* Risk Warning */}
                <section className="glass-card p-4 border border-yellow-500/20">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-400 mb-1 text-sm">Risk Warning</h3>
                            <p className="text-xs text-tm-muted leading-relaxed">
                                TQQQ is a 3× leveraged ETF. Higher risk levels mean larger positions and
                                significantly increased loss exposure during market reversals. Options on
                                leveraged ETFs carry elevated gamma and volatility risk.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Live indicator */}
                <div className="flex items-center gap-1.5 pt-2">
                    <span className="w-2 h-2 rounded-full bg-tm-green animate-pulse" />
                    <span className="text-xs text-tm-green">Live</span>
                </div>
            </div>
        </main>
    );
}
