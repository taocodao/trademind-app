'use client';

import { usePrivy } from '@privy-io/react-auth';
import { ArrowRight, TrendingUp, Shield, Zap, TrendingDown, CheckCircle2, Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CompoundingCalculator from '@/components/ui/CompoundingCalculator';

export default function LandingPage() {
    const { login, authenticated, ready } = usePrivy();
    const router = useRouter();

    useEffect(() => {
        // Only redirect automatically if they are fully authenticated and hit the root page.
        // We will keep them here if there's a marketing intent, but for now we auto-redirect to dashboard when logged in.
        // If we want the landing page available to logged in users, we can remove this.
        if (ready && authenticated) {
            router.push('/dashboard');
        }
    }, [ready, authenticated, router]);

    if (!ready) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-tm-bg">
                <div className="w-12 h-12 rounded-full border-4 border-tm-border border-t-tm-purple animate-spin" />
            </main>
        );
    }

    if (authenticated) return null;

    return (
        <main className="min-h-screen flex flex-col bg-tm-bg overflow-x-hidden pt-16">

            {/* 1. HERO SECTION */}
            <section className="relative px-6 py-20 lg:py-32 flex flex-col items-center justify-center text-center max-w-5xl mx-auto">
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-tm-purple/20 via-tm-bg to-tm-bg blur-3xl rounded-full opacity-50"></div>

                <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight mb-6">
                    Turn Options Into a <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-tm-purple to-[#9d63f5]">Compounding Machine</span>
                </h1>

                <p className="text-lg md:text-xl text-tm-muted max-w-2xl mb-10">
                    A volatility-adaptive engine targeting +20% annualized growth. Automated. Defined-risk. Supported by a rigorous 7-year track record.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button onClick={login} className="btn-primary px-8 py-4 text-lg font-semibold flex items-center gap-2 shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:shadow-[0_0_30px_rgba(124,58,237,0.6)] transition-all">
                        Start Free <span className="text-sm font-normal opacity-70">→ Observer</span>
                    </button>
                    <a href="#performance" className="px-8 py-4 text-tm-purple font-semibold hover:text-white transition-colors">
                        See 7-year results ↓
                    </a>
                </div>

                <div className="mt-12 flex flex-wrap justify-center gap-6 md:gap-12 text-sm text-tm-muted font-mono bg-tm-card/50 border border-tm-border px-6 py-3 rounded-full backdrop-blur-sm">
                    <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-tm-green" /> Sharpe Ratio 6.01</div>
                    <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-tm-purple" /> 7 Years Backtested</div>
                    <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /> Defined Risk</div>
                </div>
            </section>

            {/* 2. COMPOUNDING CALCULATOR */}
            <section className="px-6 py-16 w-full max-w-6xl mx-auto">
                <CompoundingCalculator />
            </section>

            {/* 3. HOW IT WORKS */}
            <section className="px-6 py-24 bg-tm-card/30 border-y border-tm-border">
                <div className="max-w-5xl mx-auto flex flex-col items-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-16 text-center">How The Engine Works</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full text-center">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-2xl bg-tm-bg border border-tm-border flex items-center justify-center mb-6 shadow-lg shadow-black/50">
                                <TrendingDown className="w-10 h-10 text-tm-red" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">1. Markets Overreact</h3>
                            <p className="text-tm-muted">When panic or greed spikes, assets stretch too far from their historical baseline, creating mathematical exhaustion.</p>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-2xl bg-tm-purple/10 border border-tm-purple/50 flex items-center justify-center mb-6 shadow-lg shadow-tm-purple/20">
                                <Zap className="w-10 h-10 text-tm-purple" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">2. Catch The Snapback</h3>
                            <p className="text-tm-muted">TurboBounce executes a highly leveraged, defined-risk options trade just as momentum fades, capturing the violent mean-reversion.</p>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 rounded-2xl bg-tm-bg border border-tm-border flex items-center justify-center mb-6 shadow-lg shadow-black/50">
                                <TrendingUp className="w-10 h-10 text-tm-green" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">3. Compound The Growth</h3>
                            <p className="text-tm-muted">Trades resolve in 3–12 days. Capital is freed up and aggressively rotated back into the market dozens of times per year.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. PERFORMANCE */}
            <section id="performance" className="px-6 py-24 max-w-6xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 text-center">7-Year Track Record</h2>
                <p className="text-tm-muted text-center max-w-2xl mx-auto mb-16">
                    A brutally strict analysis. No hindsight bias. Compounding forward daily over 1,274 trades across real historical market data (2019-2025).
                </p>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 25K Track */}
                    <div className="glass-card p-8 border-tm-purple/30">
                        <h3 className="text-xl font-bold text-white mb-2 flex justify-between items-center">
                            Standard $25K Track
                            <span className="text-tm-green text-sm font-mono">+366.1% Return</span>
                        </h3>
                        <p className="text-tm-muted text-sm mb-6 pb-6 border-b border-tm-border">Sufficient capital to allocate perfectly into lower-volatility institutional LEAPS immediately.</p>

                        <div className="space-y-4 font-mono text-sm">
                            <div className="flex justify-between"><span className="text-tm-muted">CAGR:</span> <span className="text-white font-bold">+24.6%</span></div>
                            <div className="flex justify-between"><span className="text-tm-muted">Final Capital:</span> <span className="text-white font-bold">$116,516.71</span></div>
                            <div className="flex justify-between"><span className="text-tm-muted">Win Rate:</span> <span className="text-white">47.4%</span></div>
                            <div className="flex justify-between"><span className="text-tm-muted">Total Trades:</span> <span className="text-white">1,274</span></div>
                        </div>
                    </div>

                    {/* 5K Track */}
                    <div className="glass-card p-8">
                        <h3 className="text-xl font-bold text-white mb-2 flex justify-between items-center">
                            Small $5K Track
                            <span className="text-tm-green text-sm font-mono">+336.2% Return</span>
                        </h3>
                        <p className="text-tm-muted text-sm mb-6 pb-6 border-b border-tm-border">Slightly higher chop early on due to restricted buying power, slingshotting once it clears $15k.</p>

                        <div className="space-y-4 font-mono text-sm">
                            <div className="flex justify-between"><span className="text-tm-muted">CAGR:</span> <span className="text-white font-bold">+23.4%</span></div>
                            <div className="flex justify-between"><span className="text-tm-muted">Final Capital:</span> <span className="text-white font-bold">$21,811.20</span></div>
                            <div className="flex justify-between"><span className="text-tm-muted">Win Rate:</span> <span className="text-white">50.5%</span></div>
                            <div className="flex justify-between"><span className="text-tm-muted">Total Trades:</span> <span className="text-white">1,078</span></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. CHAMELEON ENGINE */}
            <section className="px-6 py-24 bg-[#100D23] border-y border-tm-border overflow-hidden">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">The Chameleon Engine</h2>
                            <p className="text-tm-muted text-lg mb-6">
                                The failure point of most quantitative funds is rigidity. They always buy. Or they always sell premium. This destroys capital when market regimes flip.
                            </p>
                            <p className="text-tm-muted text-lg mb-8">
                                TurboBounce uses a Volatility-Adaptive Options Engine. It mathematically asks the market: <span className="text-white font-medium italic">"Is insurance cheap or expensive today?"</span>
                            </p>
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded bg-tm-green/20 text-tm-green flex items-center justify-center font-bold flex-shrink-0">L</div>
                                    <div>
                                        <h4 className="font-bold text-white">Low Volatility (Complacent)</h4>
                                        <p className="text-tm-muted text-sm">Options are cheap. We buy deep ITM long options (NAKED_LONG) for highly leveraged, defined-risk stock replacement.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-8 h-8 rounded bg-tm-red/20 text-tm-red flex items-center justify-center font-bold flex-shrink-0">H</div>
                                    <div>
                                        <h4 className="font-bold text-white">High Volatility (Panicked)</h4>
                                        <p className="text-tm-muted text-sm">Options are wildly overpriced. We become the house, systematically selling premium (Diagonals / PMCCs / Credit Spreads) to harvest the IV crush.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visual Node Graph Placeholder */}
                        <div className="relative h-96 w-full glass-card flex items-center justify-center p-8 bg-[url('/bg-grid.svg')] bg-[length:30px_30px] shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-tm-purple/10 to-transparent rounded-xl"></div>

                            <div className="relative w-full h-full flex flex-col justify-between">
                                <div className="self-center bg-tm-card border border-tm-border px-6 py-3 rounded-full text-white font-bold z-10 shadow-lg">MARKET EXHAUSTION DETECTED</div>

                                <div className="flex-1 flex items-center justify-between px-8 relative mt-4">
                                    {/* Lines */}
                                    <div className="absolute left-1/2 top-0 w-px h-1/2 bg-tm-border -mt-4"></div>
                                    <div className="absolute left-[calc(25%)] right-[calc(25%)] top-1/2 h-px bg-tm-border"></div>
                                    <div className="absolute left-[calc(25%)] top-1/2 w-px h-full bg-tm-border"></div>
                                    <div className="absolute right-[calc(25%)] top-1/2 w-px h-full bg-tm-border"></div>

                                    <div className="bg-tm-bg border-2 border-tm-green px-4 py-2 rounded-lg text-tm-green font-mono text-sm z-10 font-bold bg-opacity-90">VIX &lt; 20</div>
                                    <div className="bg-tm-bg border-2 border-tm-red px-4 py-2 rounded-lg text-tm-red font-mono text-sm z-10 font-bold bg-opacity-90">VIX &gt; 20</div>
                                </div>

                                <div className="flex justify-between px-2 pb-4">
                                    <div className="glass-card px-4 py-3 text-center border-tm-green/30 w-[45%] shadow-lg shadow-tm-green/5">
                                        <div className="text-white font-bold text-sm">BUY DEEP ITM PUTS</div>
                                        <div className="text-tm-muted text-xs mt-1">Naked Long Structure</div>
                                    </div>
                                    <div className="glass-card px-4 py-3 text-center border-tm-red/30 w-[45%] shadow-lg shadow-tm-red/5">
                                        <div className="text-white font-bold text-sm">SELL CALL PREMIUM</div>
                                        <div className="text-tm-muted text-xs mt-1">Diagonal / Spread Structure</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. CRASH PROOF */}
            <section className="px-6 py-24 max-w-5xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">"What about 2022?"</h2>
                <p className="text-tm-muted text-lg max-w-2xl mx-auto mb-12">
                    In 2022, the Nasdaq crashed 33%+. Retail investors were wiped out. TurboBounce's $25K standard portfolio sustained a highly contained -27.7% drawdown, violently rebounding the very next year.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-12">
                    <div className="glass-card p-6 flex flex-col justify-center border-red-900/50 bg-red-950/20">
                        <div className="text-tm-red font-bold font-mono text-xl">-79.0%</div>
                        <div className="text-tm-muted text-sm mt-1">TQQQ (Buy & Hold)</div>
                    </div>
                    <div className="glass-card p-6 flex flex-col justify-center border-red-900/50 bg-red-950/20">
                        <div className="text-tm-red font-bold font-mono text-xl">-33.0%</div>
                        <div className="text-tm-muted text-sm mt-1">QQQ (Buy & Hold)</div>
                    </div>
                    <div className="glass-card p-6 flex flex-col justify-center border-yellow-900/50 bg-yellow-950/20">
                        <div className="text-yellow-500 font-bold font-mono text-xl">-27.7%</div>
                        <div className="text-tm-muted text-sm mt-1">TurboBounce ($25K)</div>
                    </div>
                    <div className="glass-card p-6 flex flex-col justify-center border-tm-green/30 bg-tm-green/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                        <div className="text-tm-green font-bold font-mono text-xl">+65.8%</div>
                        <div className="text-tm-muted text-sm mt-1">TurboBounce 2023 Recovery</div>
                    </div>
                </div>

                <div className="max-w-xl mx-auto border-l-4 border-tm-purple px-6 py-2 text-left italic text-tm-muted">
                    "If you panic-quit the strategy in December 2022, you missed the two best years in our history: +65% in 2023 and +93% in 2024. The engine survives the crash so you can profit off the recovery."
                </div>
            </section>

            {/* 7. TRUST & BADGES */}
            <section className="px-6 py-12 bg-black border-y border-white/5">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">You Retain Full Control. Always.</h3>
                        <p className="text-tm-muted text-sm">All trade signals automatically execute on your own brokerage account. We never touch your money. Funds remain safe at E*TRADE or Tastytrade.</p>
                    </div>
                    <div className="flex items-center gap-8 opacity-60">
                        <div className="font-bold text-xl tracking-tighter">tasty<span className="text-red-500">trade</span></div>
                        <div className="font-bold text-xl tracking-tighter text-blue-500">stripe</div>
                    </div>
                </div>
            </section>

            {/* 8. PRICING */}
            <section className="px-6 py-24 max-w-6xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Pricing</h2>
                    <p className="text-tm-muted">Simple, transparent, and built to pay for itself.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Observer */}
                    <div className="glass-card p-8 flex flex-col">
                        <h3 className="text-2xl font-bold text-white mb-2">Observer</h3>
                        <div className="text-3xl font-bold text-white mb-6">$0</div>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-muted" /> 24h Delayed Signals</li>
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-muted" /> Compounding Tracking Tools</li>
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-muted" /> 30-Day Delayed Quarterly Letters</li>
                        </ul>
                        <button onClick={login} className="w-full py-3 rounded-lg border border-tm-border text-white font-semibold hover:bg-tm-card transition-colors">Start Free</button>
                    </div>

                    {/* Builder */}
                    <div className="glass-card p-8 flex flex-col">
                        <h3 className="text-2xl font-bold text-white mb-2">Builder</h3>
                        <div className="text-3xl font-bold text-white mb-1"><span className="text-lg text-tm-muted font-normal mr-1">$</span>29<span className="text-lg text-tm-muted font-normal">/mo</span></div>
                        <p className="text-tm-muted text-sm mb-6">For accounts $1K - $5K</p>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-purple" /> Real-time Trade Alerts (SMS/Push)</li>
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-purple" /> Discord Access</li>
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-purple" /> Instant Quarterly Letters</li>
                        </ul>
                        <button onClick={login} className="w-full py-3 rounded-lg border border-tm-purple text-tm-purple font-semibold hover:bg-tm-purple hover:text-white transition-colors">Start Building</button>
                    </div>

                    {/* Compounder (Hero) */}
                    <div className="glass-card p-8 flex flex-col border-tm-purple relative shadow-[0_0_30px_rgba(124,58,237,0.15)] translate-y-[-16px]">
                        <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-3 bg-tm-purple text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">Most Popular</div>
                        <h3 className="text-2xl font-bold text-white mb-2">Compounder</h3>
                        <div className="flex items-end gap-2 mb-1">
                            <div className="text-3xl font-bold text-white"><span className="text-lg text-tm-muted font-normal mr-1">$</span>399<span className="text-lg text-tm-muted font-normal">/yr</span></div>
                            <span className="text-tm-green text-sm font-bold pb-1 bg-tm-green/10 px-2 rounded">Save 30%</span>
                        </div>
                        <p className="text-tm-muted text-sm mb-6">Full API Auto-Execution Setup</p>
                        <ul className="space-y-4 mb-8 flex-1">
                            <li className="flex gap-3 text-white"><Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" /> Full Auto-Execution via Tastytrade</li>
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-purple" /> All Strategy Layers Active</li>
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-purple" /> Priority Support</li>
                            <li className="flex gap-3 text-tm-muted"><CheckCircle2 className="w-5 h-5 text-tm-purple" /> Eligible for Family Board</li>
                        </ul>
                        <button onClick={login} className="btn-primary w-full py-3 font-semibold shadow-[0_0_15px_rgba(124,58,237,0.4)]">Subscribe</button>
                    </div>
                </div>
            </section>

            {/* 9. FAMILY SECTION */}
            <section className="px-6 py-24 bg-gradient-to-b from-[#100D23] to-tm-bg border-t border-tm-border">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1">
                        <Lock className="w-12 h-12 text-tm-purple mb-6" />
                        <h2 className="text-3xl font-bold text-white mb-4">Teach & Trade Together.</h2>
                        <p className="text-tm-muted text-lg mb-6">
                            Want to teach your child how professional investing actually works, without blowing up margin accounts on memes? TurboBounce supports custodial accounts.
                        </p>
                        <p className="text-tm-muted mb-8">
                            Get the <strong className="text-white">Family Bundle</strong>: Link 2 Compounder accounts and get 20% off forever. Monitor both equity curves side-by-side from the parent dashboard.
                        </p>
                        <button onClick={login} className="text-tm-purple font-semibold hover:text-white transition-colors flex items-center gap-2">
                            Explore the Family Bundle <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 w-full max-w-sm glass-card border-tm-border/50 p-6 flex flex-col gap-4 rotate-3 transform shadow-2xl">
                        <div className="flex justify-between items-center pb-4 border-b border-tm-border">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold">M</div>
                                <div>
                                    <div className="text-white font-semibold text-sm">Mom's Account</div>
                                    <div className="text-tm-muted text-xs">$25k Track</div>
                                </div>
                            </div>
                            <div className="text-tm-green font-mono text-sm">+32% YTD</div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center text-yellow-400 font-bold">S</div>
                                <div>
                                    <div className="text-white font-semibold text-sm">Sam's Custodial</div>
                                    <div className="text-tm-muted text-xs">$3k Start | College</div>
                                </div>
                            </div>
                            <div className="text-tm-green font-mono text-sm">+29% YTD</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 10. FINAL CTA */}
            <section className="px-6 py-32 text-center max-w-3xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to let math do the work?</h2>
                <p className="text-xl text-tm-muted mb-10">One decision now. Thousands of smart trades over the next decade.</p>

                <button
                    onClick={login}
                    className="btn-primary px-10 py-5 text-xl font-bold flex items-center gap-3 mx-auto shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] transition-all"
                >
                    Launch Your Engine <ArrowRight className="w-6 h-6" />
                </button>
            </section>

            <footer className="py-8 border-t border-tm-border bg-tm-bg text-center text-tm-muted text-sm px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Image src="/logo.png" alt="Logo" width={24} height={24} className="rounded" />
                        <span className="font-bold text-white">TurboBounce</span>
                    </div>
                    <div className="flex gap-6">
                        <Link href="/how-it-works" className="hover:text-white transition-colors">Mechanics</Link>
                        <Link href="/results" className="hover:text-white transition-colors">Results</Link>
                        <Link href="/refer" className="hover:text-white transition-colors">Affiliates</Link>
                        <Link href="/family" className="hover:text-white transition-colors">Family</Link>
                    </div>
                    <p>© 2026 TurboBounce Engine. All rights reserved.</p>
                </div>
                <p className="mt-8 text-xs opacity-50 max-w-4xl mx-auto leading-relaxed">
                    Disclaimer: Options trading entails significant risk and is not appropriate for all investors. Certain complex options strategies carry additional risk. TurboBounce relies on historical backtested data which is strictly hypothetical and not a guarantee of future performance. Past performance fails to reflect material market variables and cannot predict the future. All signals are provided for informational purposes only. You remain solely responsible for any decisions made in your connected brokerage account.
                </p>
            </footer>

        </main>
    );
}
