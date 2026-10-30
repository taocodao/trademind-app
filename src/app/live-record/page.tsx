/* /live-record - the public live record. A real TradeMind virtual account that
   follows the published signals, shown with a delay. Never the model portfolio.
   COMPLIANCE: the disclaimer must stay directly under the figures. */

import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { LegalFooter } from '@/components/marketing/LegalFooter';
import { getPublicRecord, type PublicAccountRecord } from '@/lib/public-record';
import './live-record.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Live record | TradeMind',
    description:
        'A real TradeMind virtual account that follows every published signal. Every position, every trade, every exit reason, shown with a short delay.',
};

function money(n: number, digits = 0) {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function pct(n: number) {
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function Spark({ series, bench }: { series: Array<{ date: string; value: number }>; bench?: number[] }) {
    const w = 640;
    const h = 120;
    if (series.length < 2) return null;
    const hasBench = !!bench && bench.length === series.length;
    const vals = series.map((p) => p.value).concat(hasBench ? bench! : []);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const line = (get: (i: number) => number) => series.map((_, i) => `${((i / (series.length - 1)) * w).toFixed(1)},${(h - 6 - ((get(i) - min) / range) * (h - 12)).toFixed(1)}`);
    const pts = line((i) => series[i].value);
    const bpts = hasBench ? line((i) => bench![i]) : [];
    return (
        <svg className="lr-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Account value over time">
            {hasBench && <polyline points={bpts.join(' ')} fill="none" stroke="#94A3B8" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />}
            <polyline points={pts.join(' ')} fill="none" stroke="#8B5CF6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function AccountBlock({ a, delay }: { a: PublicAccountRecord; delay: number }) {
    const hasData = a.value != null;
    return (
        <section className="lr-section">
            <h2 className="lr-h2">{a.name}</h2>
            <p className="lr-p">
                {a.sim ? `The first two years, ${a.sim.startDate} to ${a.sim.endDate}, are a simulation that started with ${money(a.sim.startingValue)} and ended at ${money(a.sim.endValue)}. ` : ''}Virtual account started {a.startDate} with {money(a.startingValue)}.
                {hasData
                    ? ` Figures run through ${a.dataThrough}.`
                    : a.firstVisibleOn
                        ? ` Figures appear here from ${a.firstVisibleOn}, once the first daily value is ${delay} days old.`
                        : ` Figures appear here once the first daily value is ${delay} days old.`}
            </p>

            {hasData && (
                <>
                    <div className="lr-metrics">
                        <div className="lr-metric"><span className="lr-k">Account value</span><span className="lr-v">{money(a.value!, 0)}</span></div>
                        <div className="lr-metric">
                            <span className="lr-k">Change since virtual start</span>
                            <span className={`lr-v ${a.returnPct! >= 0 ? 'lr-pos' : 'lr-neg'}`}>{pct(a.returnPct!)}</span>
                        </div>
                        <div className="lr-metric">
                            <span className="lr-k">Largest drop from a peak</span>
                            <span className="lr-v">{a.worstDropPct != null ? `${a.worstDropPct.toFixed(2)}%` : 'Not enough days yet'}</span>
                        </div>
                    </div>
                    {a.sim && a.sim.combinedReturnPct != null && (
                        <div className="lr-metrics">
                            <div className="lr-metric"><span className="lr-k">Simulation, first two years</span><span className={`lr-v ${a.sim.returnPct >= 0 ? 'lr-pos' : 'lr-neg'}`}>{pct(a.sim.returnPct)}</span></div>
                            <div className="lr-metric"><span className="lr-k">Return since original start ({a.sim.startDate})</span><span className={`lr-v ${a.sim.combinedReturnPct >= 0 ? 'lr-pos' : 'lr-neg'}`}>{pct(a.sim.combinedReturnPct)}</span></div>
                            <div className="lr-metric"><span className="lr-k">Largest drop since original start</span><span className="lr-v">{a.sim.combinedWorstDropPct != null ? `${a.sim.combinedWorstDropPct.toFixed(2)}%` : 'Not enough days yet'}</span></div>
                        </div>
                    )}
                    {a.sim && a.sim.benchmarkReturnPct != null && (
                        <div className="lr-metrics">
                            <div className="lr-metric"><span className="lr-k">QQQ buy and hold, first two years</span><span className={`lr-v ${a.sim.benchmarkSimReturnPct >= 0 ? 'lr-pos' : 'lr-neg'}`}>{pct(a.sim.benchmarkSimReturnPct)}</span></div>
                            <div className="lr-metric"><span className="lr-k">QQQ buy and hold since original start</span><span className={`lr-v ${a.sim.benchmarkReturnPct >= 0 ? 'lr-pos' : 'lr-neg'}`}>{pct(a.sim.benchmarkReturnPct)}</span></div>
                            <div className="lr-metric"><span className="lr-k">QQQ largest drop since original start</span><span className="lr-v">{a.sim.benchmarkWorstDropPct!.toFixed(2)}%</span></div>
                        </div>
                    )}
                    <Spark series={a.sim ? a.sim.combinedSeries : a.series} bench={a.sim ? a.sim.benchmarkSeries : undefined} />
                    {a.sim && a.sim.benchmarkSeries.length > 0 && <p className="lr-p">Purple is {a.name}. The grey dashed line is QQQ buy and hold from the same starting amount, with no fees or taxes.</p>}
                    {a.sim && <p className="lr-p">The chart shows the simulation from {a.sim.startDate} to {a.sim.endDate}, then the virtual account. The return since the original start joins both, so only the part after {a.startDate} comes from the virtual account. Simulated results are hypothetical, used model-priced options, and are not a real account.</p>}
                </>
            )}

            {a.strategy === 'QQQ_LEAPS' && (
                <>
                    <h3 className="lr-h3">Positions</h3>
                    {a.lots.length === 0 ? (
                        <p className="lr-p">No position yet. The account buys only when the entry conditions pass, so waiting is part of the record.</p>
                    ) : (
                        <div className="lr-scroll">
                            <table className="lr-table">
                                <thead>
                                    <tr><th>Contract</th><th>Qty</th><th>Bought</th><th>Price</th><th>Sold</th><th>Price</th><th>Why it closed</th></tr>
                                </thead>
                                <tbody>
                                    {a.lots.map((l, i) => (
                                        <tr key={i}>
                                            <td>{l.contract}</td>
                                            <td>{l.contracts}</td>
                                            <td>{l.entryDate}</td>
                                            <td>{money(l.entryPrice, 2)}</td>
                                            <td>{l.open ? 'Still open' : l.exitDate}</td>
                                            <td>{l.exitPrice != null ? money(l.exitPrice, 2) : ''}</td>
                                            <td>{l.exitReason || ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {a.legs.length > 0 && (
                        <>
                            <h3 className="lr-h3">Written calls and spreads</h3>
                            <div className="lr-scroll">
                                <table className="lr-table">
                                    <thead><tr><th>Contract</th><th>Position</th><th>Opened</th><th>Opening price</th></tr></thead>
                                    <tbody>
                                        {a.legs.map((g, i) => (
                                            <tr key={i}><td>{g.contract}</td><td>{g.quantity < 0 ? `Short ${Math.abs(g.quantity)}` : `Long ${g.quantity}`}</td><td>{g.openedOn}</td><td>{money(g.openingPrice, 2)}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </>
            )}

            {(
                <>
                    <h3 className="lr-h3">Trades</h3>
                    {a.trades.length === 0 ? (
                        <p className="lr-p">No trades shown yet.</p>
                    ) : (
                        <div className="lr-scroll">
                            <table className="lr-table">
                                <thead><tr><th>Date</th><th>Action</th><th>Instrument</th><th>Qty</th><th>Price</th></tr></thead>
                                <tbody>
                                    {a.trades.map((t, i) => (
                                        <tr key={i}><td>{t.date}</td><td>{t.side}{t.seed ? ' (simulation seed)' : ''}</td><td>{t.instrument}</td><td>{t.quantity}</td><td>{money(t.price, 2)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {a.trades.some((t) => t.seed) && (
                <p className="lr-note">Rows marked simulation seed opened the account from the simulation. They were not live orders.</p>
            )}

            {a.heldBackEvents > 0 && (
                <p className="lr-note">
                    {a.heldBackEvents} newer {a.heldBackEvents === 1 ? 'trade is' : 'trades are'} held back until {a.heldBackEvents === 1 ? 'it is' : 'they are'} {delay} days old.
                </p>
            )}
        </section>
    );
}

export default async function LiveRecordPage({ searchParams }: { searchParams?: Promise<{ demo?: string }> }) {
    const demo = (await searchParams)?.demo === '1';
    let record: Awaited<ReturnType<typeof getPublicRecord>> | null = null;
    try {
        record = await getPublicRecord();
    } catch {
        record = null;
    }

    return (
        <main className="min-h-screen flex flex-col bg-[#0A0A0F] overflow-x-hidden pt-16">
            <MarketingHeader />
            <div className="lr-wrap">
                {demo && (
                    <div className="lr-demo" role="note">
                        <div>
                            <strong>This page is a demo.</strong> It shows how a TradeMind virtual account looks. These are TradeMind&apos;s own
                            virtual accounts, not yours. Subscribe to a strategy to get an account page of your own that follows the same signals.
                        </div>
                        <Link href="/plans?utm_source=daily&utm_medium=email&utm_campaign=daily_brief&utm_content=demo_banner" className="lr-demo-btn">Subscribe to a strategy</Link>
                    </div>
                )}
                <div className="lr-back-row"><Link href="/" className="lr-back">Back to the home page</Link></div>
                <header>
                    <div className="lr-eyebrow">Live record</div>
                    <h1 className="lr-h1">A real account, following the same signals you get.</h1>
                    <p className="lr-sub">
                        This is a TradeMind virtual account. It receives each signal at the same time as every member, takes the same
                        simulated fill, and is checked by the same exit rules at 9:45 AM Eastern. It is not a backtest.</p>
                </header>

                {record ? (
                    record.accounts.map((a) => <AccountBlock key={a.strategy} a={a} delay={record!.delayDays} />)
                ) : (
                    <p className="lr-p">The record is temporarily unavailable. Please try again in a few minutes.</p>
                )}

                <div className="lr-disclaimer">
                    <p>
                        This is a virtual account. TradeMind never connects to a brokerage or places an order. Each fill is simulated at the middle of the bid
                        and ask when the signal is published. Commissions and slippage are not charged, so real fills at a broker will differ.
                    </p>
                    <p>
                        Results are shown with a {record?.delayDays ?? 5} day delay. A short record says little about the future, and the first weeks of any
                        account can look unusually good or bad. Past results do not predict future results. TradeMind provides educational analysis only, not
                        personalized investment advice.
                    </p>
                </div>
            </div>
            <LegalFooter />
        </main>
    );
}
