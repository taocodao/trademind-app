import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';
import OutreachEngage from '@/components/newsletter/OutreachEngage';
import data from '@/data/simulated-record.json';

export const metadata: Metadata = {
    title: 'Check the QQQ LEAPS backtest yourself - AI Investor Copilot',
    description: 'How QQQ LEAPS works in plain English, the assumptions behind the simulated result, and a checklist for trying to break it.',
    robots: { index: false, follow: false },
};

type S = { key: string; name: string; principal: number; finalValue: number; pnlPct: number; maxDrawdownPct: number; benchmarkFinal: number; benchmarkPct: number; benchmarkMaxDrawdownPct: number };
const strategies = data.strategies as unknown as S[];
const leaps = strategies.find((s) => s.key === 'QQQ_LEAPS')!;
const defensive = strategies.find((s) => s.key !== 'QQQ_LEAPS')!;
const annual = (Math.pow(1 + leaps.pnlPct / 100, 1 / 2) - 1) * 100;
const growth = (years: number) => 1000 * Math.pow(1 + annual / 100, years);
const yearsToMillion = Math.log(1000) / Math.log(1 + annual / 100);
const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const roughly = (n: number) => `$${(Math.round(n / 500) * 500).toLocaleString('en-US')}`;
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const drop = (n: number) => `${n.toFixed(2)}%`;

const th = { padding: '12px 18px', color: '#8B95A9', fontWeight: 500, textAlign: 'left' as const };
const td = { padding: '12px 18px' };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
    const { t } = await searchParams;
    const q = t && /^[a-z2-9]{10}$/.test(t) ? `?t=${t}` : '';
    return (
        <main className="tm-nl">
            <OutreachEngage />
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Check it yourself' }]} />
                <p className="tm-nl-eyebrow">Check it yourself</p>
                <h1 className="tm-nl-h1">How QQQ LEAPS works, and how to try to break it</h1>
                <p className="tm-nl-sub">
                    A simulated result means little until you can see the rules and the assumptions behind it. This page shows both, in plain English,
                    then gives you a checklist for testing the claim. Nothing here requires a sign-up.
                </p>

                <section className="tm-nl-section" style={{ marginTop: 36 }}>
                    <h2 className="tm-nl-h2">The rules, in plain English</h2>
                    <div className="tm-nl-card">
                        <p style={{ margin: '0 0 14px' }}><b>1. The core: a long-dated QQQ call (a LEAPS).</b> A LEAPS is a call option with a long time to expiry. It gives upside exposure to QQQ,
                            which holds the 100 large Nasdaq companies, for much less money than buying the shares. The most you can lose on that option is what you paid for it.
                            We buy after pullbacks that pass a set of gates (trend, volatility, regime and a machine learning confidence check), not all the time.</p>
                        <p style={{ margin: '0 0 14px' }}><b>2. The income: shorter calls sold against it.</b> When conditions allow, we sell a shorter call against the LEAPS. Time decay works for the seller,
                            and the premium softens small declines. It does not stop large ones, and we skip the sale when a strong trend and cheap premium make it a poor trade.</p>
                        <p style={{ marginBottom: 0 }}><b>3. The semiconductor sleeve: SMH put spreads.</b> Weekly, about 14 days to expiry, we sell a put spread on SMH
                            (a semiconductor ETF) with a short put near a 0.25 delta and a protective put $30 lower. It earns a small premium when semiconductors hold steady or rise,
                            and the loss is capped by the spread. A losing spread is closed at twice the credit received. This sleeve switches on only once the account reaches $25,000.
                            It is in a test phase and has never traded in a real account.</p>
                    </div>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">The numbers, side by side</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 12 }}>Simulated backtest, October 14, 2024 to October 13, 2026. Not actual trading.</p>
                    <div className="tm-nl-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #232333' }}>
                                    <th style={th}></th><th style={{ ...th, textAlign: 'right' }}>Total return</th><th style={{ ...th, textAlign: 'right' }}>Largest drop</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #232333' }}><td style={td}>QQQ LEAPS (with the SMH sleeve)</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pct(leaps.pnlPct)}</td><td style={{ ...td, textAlign: 'right' }}>-{drop(Math.abs(leaps.maxDrawdownPct))}</td></tr>
                                <tr style={{ borderBottom: '1px solid #232333' }}><td style={td}>QQQ Defensive</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pct(defensive.pnlPct)}</td><td style={{ ...td, textAlign: 'right' }}>-{drop(Math.abs(defensive.maxDrawdownPct))}</td></tr>
                                <tr><td style={td}>QQQ buy and hold</td><td style={{ ...td, textAlign: 'right', fontWeight: 700 }}>{pct(leaps.benchmarkPct)}</td><td style={{ ...td, textAlign: 'right' }}>-{drop(Math.abs(leaps.benchmarkMaxDrawdownPct))}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: '#C9D2E3', fontSize: 15, lineHeight: 1.6, marginTop: 16 }}>
                        LEAPS returned about {(leaps.pnlPct / leaps.benchmarkPct).toFixed(1)} times the percentage return of QQQ buy and hold (not {(leaps.pnlPct / leaps.benchmarkPct).toFixed(1)} times the ending account value).
                        Over two years that is about {annual.toFixed(1)}% a year. Defensive had a smaller drop but returned less than buy and hold.
                    </p>
                    <h3 style={{ fontSize: 16, margin: '22px 0 8px' }}>The compounding arithmetic</h3>
                    <p style={{ color: '#C9D2E3', fontSize: 15, lineHeight: 1.6, marginTop: 0 }}>
                        If a pace of {annual.toFixed(1)}% a year were repeated, $1,000 would become about {roughly(growth(7))} after 7 years and pass $1,000,000 after about {yearsToMillion.toFixed(1)} years.
                        That is multiplication on a two-year simulation, not a forecast. Two years is a short sample, and returns this high are unlikely to repeat for a decade.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">The assumptions and limits</h2>
                    <ul style={{ color: '#C9D2E3', fontSize: 15, lineHeight: 1.7, paddingLeft: 22, listStyle: 'disc' }}>
                        <li style={{ marginBottom: 8 }}>These are hypothetical results, not returns earned in a real account.</li>
                        <li style={{ marginBottom: 8 }}>Option prices were set by a model at mid-price, not taken from real quotes. A version with realistic slippage ends near $71,884 from $25,000 instead of {money(leaps.finalValue)}.</li>
                        <li style={{ marginBottom: 8 }}>The rules were developed with hindsight, in a period that favored QQQ and semiconductors.</li>
                        <li style={{ marginBottom: 8 }}>The semiconductor sleeve closed 71 spreads, 59 of them profitable. Most of its profit came in the last six months of the window.</li>
                        <li style={{ marginBottom: 8 }}>A separate 15-month test on real option quotes showed a deeper drop than the model backtest. See the{' '}
                            <Link href="/newsletter/research/backtest-validation" className="tm-nl-link">Backtest Validation page</Link>.</li>
                        <li style={{ marginBottom: 8 }}>Do not read these figures as after-cost subscriber returns. Actual results can differ substantially, and losses can exceed the simulated drop.</li>
                    </ul>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Try to break it</h2>
                    <div className="tm-nl-card">
                        <ol style={{ color: '#C9D2E3', fontSize: 15, lineHeight: 1.75, paddingLeft: 22, margin: 0, listStyle: 'decimal' }}>
                            <li style={{ marginBottom: 8 }}>Open the <Link href={`/simulated-record${q}`} className="tm-nl-link">simulated record</Link> and read the dated trades one by one. Does any entry or exit look unreasonable to you?</li>
                            <li style={{ marginBottom: 8 }}>Rerun the arithmetic yourself with the start and end values above. Check the percentages and the compounding.</li>
                            <li style={{ marginBottom: 8 }}>Compare the largest drops, not only the returns. Ask what a drop deeper than the simulated one would have felt like.</li>
                            <li style={{ marginBottom: 8 }}>Read the <Link href="/newsletter/research/backtest-validation" className="tm-nl-link">Backtest Validation</Link> page and the <Link href="/verify" className="tm-nl-link">public record page</Link>, then decide which assumption you trust least.</li>
                            <li style={{ marginBottom: 8 }}>Email me the assumption you would challenge first. I answer every reply.</li>
                        </ol>
                        <p style={{ marginTop: 18, marginBottom: 0 }}>
                            <a className="tm-nl-btn tm-nl-btn-primary" href="mailto:eric@trademind.bot?subject=The%20assumption%20I%20would%20challenge%20first">Email Eric your challenge</a>
                        </p>
                    </div>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">If you want the weekly brief</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 14 }}>
                        AI Investor Copilot is free, weekly, and covers the market view, what the model indicates, one strategy idea and what could go wrong.
                        Confirm your signup to get 30% off a yearly TradeMind strategy plan. Use the code with the same email address within 3 months of confirmation.
                        Unsubscribe any time. You keep your broker and place every order yourself.
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        <Link href={`/newsletter/join${q}`} className="tm-nl-btn tm-nl-btn-primary">Subscribe free</Link>
                        <Link href={`/newsletter/start-here${q}`} className="tm-nl-btn tm-nl-btn-ghost">Read a sample issue first</Link>
                    </div>
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
