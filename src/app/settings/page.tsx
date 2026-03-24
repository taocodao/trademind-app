'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowLeft, Settings, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { TastytradeCredentials } from '@/components/settings/TastytradeCredentials';
import { InvestmentPrincipal } from '@/components/dashboard/InvestmentPrincipal';
import { ShadowLedgerPanel } from '@/components/dashboard/ShadowLedgerPanel';
import { TQQQAutoApproveSettings } from '@/components/settings/TQQQAutoApproveSettings';
import { TurboBounceAllocationSettings } from '@/components/settings/TurboBounceAllocationSettings';
import { SubscriptionManager } from '@/components/settings/SubscriptionManager';
import { MyStrategies } from '@/components/settings/MyStrategies';
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
                
                {/* Strategy-Specific Settings */}
                <div className="glass-card p-4">
                    <h3 className="font-semibold mb-3 text-sm">Strategy Configuration</h3>
                    <div className="mb-4">
                        <StrategyTabs
                            strategies={enabledStrategies}
                            activeKey={activeStrategy}
                            onChange={setActiveStrategy}
                        />
                    </div>
                    
                    <div className="space-y-4">
                        {/* Investment Principal */}
                        <InvestmentPrincipal strategy={activeStrategy} />

                        {/* Shadow Ledger — now managed in the Positions tab */}
                        <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
                            <span className="text-lg">💼</span>
                            <span>Shadow Ledger balance &amp; virtual positions are managed in the <strong>Positions</strong> tab.</span>
                        </div>

                        {/* Auto-Approve Settings */}
                        <TQQQAutoApproveSettings />
                    </div>
                </div>

                {/* TurboBounce Multi-Ticker Setup */}
                <TurboBounceAllocationSettings />
                
                {/* Strategy Summary */}
                <section className="glass-card p-4">
                    <h3 className="font-semibold mb-3 text-sm">Strategy Summary</h3>
                    <div className="space-y-2 text-sm">
                        {[
                            ['Strategy', 'TQQQ Dual-Sided Spread'],
                            ['Put Side', 'VIX-Adaptive Credit Spreads'],
                            ['Call Side', 'Bear Call Spreads (HIGH_VOL + CRISIS)'],
                            ['Backtest Return', '+98.3% (Scenario B)'],
                            ['Sharpe Ratio', '6.01'],
                            ['Max Drawdown', '-10.4%'],
                            ['VIX Protection', 'Enabled'],
                        ].map(([label, val]) => (
                            <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                                <span className="text-tm-muted">{label}</span>
                                <span className="font-semibold text-right max-w-[55%] text-xs">{val}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Tastytrade Credentials */}
                <TastytradeCredentials />

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
