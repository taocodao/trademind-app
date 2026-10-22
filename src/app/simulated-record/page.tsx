/* /simulated-record - a clearly labeled historical SIMULATION of the two strategies.
   It is never live trading and never mixed with /live-record. Every section, chart and table row
   carries a simulation label. COMPLIANCE: the hypothetical-performance notice must stay adjacent
   to the figures, and every figure carries its window label. */

import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { LegalFooter } from '@/components/marketing/LegalFooter';
import data from '@/data/simulated-record.json';
import './simulated-record.css';

export const metadata: Metadata = {
    title: 'Simulated record | TradeMind',
    description: 'A clearly labeled historical simulation of QQQ LEAPS (with its SMH put spread sleeve) and QQQ Defensive. Not live trading.',
    robots: { index: false, follow: false },
};

type Pt = { date: string; value: number; benchmark: number };
type Trade = { date: string; time: string; action: string; instrument: string; quantity: number; price: number; amount: number; realized: number | null; cashAfter: number; why: string };
type Hist = { date: string; cash: number; positions: string; value: number | null };
type OpenPos = { instrument: string; quantity: number; mark: number; value: number };
type Strat = {
    key: string; name: string; principal: number; start: string; end: string; finalValue: number; pnl: number; pnlPct: number;
    maxDrawdownPct: number; benchmarkFinal: number; benchmarkPct: number; benchmarkMaxDrawdownPct: number;
    realizedPnl: number; unrealizedPnl: number; tradeCount: number; buys: number; sells: number; modeledCosts: number; cashEnd: number;
    skippedCount?: number; firstEntryDate?: string; smh?: { closed: number; wins: number; realized: number; realizedQ2Q3_2026: number }; splitJun30?: { valueJun30: number; returnToJun30Pct: number; returnAfterPct: number };
    openPositions: OpenPos[]; daily: Pt[]; trades: Trade[]; positionHistory: Hist[];
};

const WINDOW = 'Oct 14, 2024 to Oct 13, 2026';
const strategies = [...(data.strategies as unknown as Strat[])].sort((x, y) => (x.key === 'QQQ_LEAPS' ? -1 : 0) - (y.key === 'QQQ_LEAPS' ? -1 : 0));

function money(n: number, digits = 0) {
    const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    return `${n < 0 ? '-' : ''}$${s}`;
}
function pct(n: number) {
    return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}
function Badge() {
    return <span className="sr-badge">SIMULATED</span>;
}

function Chart({ s }: { s: Strat }) {
    const W = 900, H = 320, L = 70, R = 16, T = 16, B = 34;
    const pts = s.daily;
    const all = pts.flatMap((p) => [p.value, p.benchmark]);
    const lo = Math.min(...all), hi = Math.max(...all);
    const pad = (hi - lo) * 0.06 || 1;
    const y0 = lo - pad, y1 = hi + pad;
    const x = (i: number) => L + (i / (pts.length - 1)) * (W - L - R);
    const y = (v: number) => T + (1 - (v - y0) / (y1 - y0)) * (H - T - B);
    const line = (k: 'value' | 'benchmark') => pts.map((p, i) => `${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(' ');
    const ticks = [0, 1, 2, 3, 4].map((i) => y0 + ((y1 - y0) * i) / 4);
    const xl = [0, Math.floor(pts.length / 2), pts.length - 1];
    return (
        <>
            <svg className="sr-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Simulated ${s.name} value compared with QQQ buy and hold, ${WINDOW}`}>
                {ticks.map((t, i) => (
                    <g key={i}>
                        <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,.07)" />
                        <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#8E93A8">{money(t)}</text>
                    </g>
                ))}
                {xl.map((i) => (
                    <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#8E93A8">{pts[i].date}</text>
                ))}
                <polyline points={line('benchmark')} fill="none" stroke="#9CA3AF" strokeWidth="1.6" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
                <polyline points={line('value')} fill="none" stroke="#8B5CF6" strokeWidth="2.2" vectorEffect="non-scaling-stroke" />
                <text x={W / 2} y={H / 2 + 18} textAnchor="middle" fontSize="64" fontWeight="800" fill="rgba(245,158,11,.10)" transform={`rotate(-12 ${W / 2} ${H / 2})`}>SIMULATION</text>
            </svg>
            <div className="sr-legend">
                <span><i style={{ background: '#8B5CF6' }} />Simulated {s.name} value</span>
                <span><i style={{ background: '#9CA3AF' }} />QQQ buy and hold, same starting dollars (comparison only)</span>
            </div>
        </>
    );
}

function Metric({ k, v, cls }: { k: string; v: string; cls?: string }) {
    return (
        <div className="sr-metric">
            <span className="sr-k">{k}</span>
            <span className={`sr-v ${cls || ''}`}>{v}</span>
        </div>
    );
}

function Block({ s }: { s: Strat }) {
    const tag = s.key === 'QQQ_LEAPS' ? 'leaps' : 'defensive';
    const files = ['trades', 'daily-value', 'position-history'];
    return (
        <section className="sr-section" id={tag}>
            <h2 className="sr-h2">{s.name} <Badge /></h2>
            <p className="sr-window">SIMULATION, {WINDOW}. Starting amount {money(s.principal)}.</p>
            <div className="sr-adj">
                Hypothetical, simulated results. These are not live trading results, nobody traded this account, and no real fills occurred. Simulated results have inherent limits and do not predict future results.
            </div>

            <div className="sr-metrics">
                <Metric k="Starting amount" v={money(s.principal, 2)} />
                <Metric k="Simulated value at end" v={money(s.finalValue, 2)} />
                <Metric k="Simulated profit or loss" v={`${money(s.pnl, 2)} (${pct(s.pnlPct)})`} cls={s.pnl >= 0 ? 'sr-pos' : 'sr-neg'} />
                <Metric k="Largest simulated drop" v={`${s.maxDrawdownPct.toFixed(1)}%`} />
                <Metric k="QQQ buy and hold, same start" v={`${money(s.benchmarkFinal, 2)} (${pct(s.benchmarkPct)})`} cls={s.benchmarkPct >= 0 ? 'sr-pos' : 'sr-neg'} />
                <Metric k="QQQ largest drop" v={`${s.benchmarkMaxDrawdownPct.toFixed(1)}%`} />
                <Metric k="Realized by closed trades" v={money(s.realizedPnl, 2)} />
                <Metric k="Unrealized on open positions" v={money(s.unrealizedPnl, 2)} />
                <Metric k="Modeled trading costs" v={money(s.modeledCosts, 2)} />
            </div>
            <Chart s={s} />
            <p className="sr-note">SIMULATION. {WINDOW}. Values are end of day. The grey line is a comparison, not a recommendation, and uses dividend adjusted QQQ closing prices.</p>

            {s.key === 'QQQ_LEAPS' ? (
                <div className="sr-adj">
                    This simulation has two parts. The SMH put spread sleeve opened its first spread on Oct 14, 2024 and closed it the next day at a loss. The simulation then held no positions until {s.firstEntryDate}, almost 11 months later, when the QQQ LEAPS and short call part entered because its entry conditions had not passed earlier. On the entry date the simulation was down about 5% from its start, while QQQ buy and hold was up about 14%. Two later LEAPS entry signals on Nov 17 and 18, 2025 were skipped because one contract cost more than the cash available. The SMH sleeve closed {s.smh?.closed} spreads, {s.smh?.wins} at a profit, for {money(s.smh?.realized ?? 0, 2)} in total. About {money(s.smh?.realizedQ2Q3_2026 ?? 0, 0)} of that came between April and September 2026, while SMH itself more than doubled over the window. The SMH sleeve has never traded in a real or paper account.
                </div>
            ) : (
                s.splitJun30 && (
                    <div className="sr-adj">
                        Simulated value on Jun 30, 2026 was {money(s.splitJun30.valueJun30, 2)} ({pct(s.splitJun30.returnToJun30Pct)} since Oct 14, 2024). From Jul 1 to Oct 13, 2026 the simulation changed {pct(s.splitJun30.returnAfterPct)}, while QQQ itself ended that stretch about 1% higher. Losing stretches are shown as they happened.
                    </div>
                )
            )}

            <h3 className="sr-h3">Positions held at the end of the window <Badge /></h3>
            <p className="sr-cap">SIMULATION. Marks as of Oct 13, 2026. Cash at the end: {money(s.cashEnd, 2)}.</p>
            <div className="sr-scroll sr-short">
                <table className="sr-table">
                    <thead><tr><th>Record</th><th>Instrument</th><th>Qty</th><th>Mark</th><th>Value</th></tr></thead>
                    <tbody>
                        {s.openPositions.map((p, i) => (
                            <tr key={i}><td><Badge /></td><td className="sr-wide">{p.instrument}</td><td>{p.quantity}</td><td>{money(p.mark, 2)}</td><td>{money(p.value, 2)}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h3 className="sr-h3">Position history <Badge /></h3>
            <p className="sr-cap">SIMULATION. {WINDOW}. One row for each day the simulated positions changed. Value is the simulated account value at the end of that day.</p>
            <div className="sr-scroll">
                <table className="sr-table">
                    <thead><tr><th>Record</th><th>Date</th><th>Cash</th><th>Positions</th><th>Value</th></tr></thead>
                    <tbody>
                        {s.positionHistory.map((p, i) => (
                            <tr key={i}><td><Badge /></td><td>{p.date}</td><td>{money(p.cash, 2)}</td><td className="sr-wide">{p.positions}</td><td>{p.value != null ? money(p.value, 2) : ''}</td></tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h3 className="sr-h3">Simulated trades <Badge /></h3>
            <p className="sr-cap">
                SIMULATION. {WINDOW}. {s.tradeCount.toLocaleString('en-US')} simulated trades ({s.buys.toLocaleString('en-US')} buys, {s.sells.toLocaleString('en-US')} sells)
                {s.skippedCount ? `, plus ${s.skippedCount} skipped entries shown for completeness` : ''}. Times are Eastern. None of these trades happened.
            </p>
            <div className="sr-scroll">
                <table className="sr-table">
                    <thead>
                        <tr><th>Record</th><th>Date</th><th>Time</th><th>Action</th><th>Instrument</th><th>Qty</th><th>Price</th><th>Amount</th><th>Realized P&amp;L</th><th>Cash after</th><th>Why</th></tr>
                    </thead>
                    <tbody>
                        {s.trades.map((t, i) => (
                            <tr key={i}>
                                <td><Badge /></td><td>{t.date}</td><td>{t.time}</td><td>{t.action}</td><td className="sr-wide">{t.instrument}</td>
                                <td>{t.quantity || ''}</td><td>{money(t.price, 2)}</td><td>{t.amount ? money(t.amount, 2) : ''}</td>
                                <td className={t.realized == null ? '' : t.realized >= 0 ? 'sr-pos' : 'sr-neg'}>{t.realized == null ? '' : money(t.realized, 2)}</td>
                                <td>{money(t.cashAfter, 2)}</td><td className="sr-wide">{t.why}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="sr-dl">
                {files.map((f) => (
                    <a key={f} href={`/simulated/simulated-${tag}-${f}.csv`} download>Download simulated {f.replace('-', ' ')} (CSV, every row marked SIMULATION)</a>
                ))}
            </div>
        </section>
    );
}

export default function SimulatedRecordPage() {
    return (
        <main className="min-h-screen flex flex-col bg-[#0A0A0F] overflow-x-hidden pt-16">
            <MarketingHeader />
            <div className="sr-bar">Simulation. Hypothetical results. Not live trading.</div>
            <div className="sr-wrap">
                <div className="sr-back-row"><Link href="/" className="sr-back">Back to the home page</Link></div>
                <header>
                    <div className="sr-eyebrow">Simulation <Badge /></div>
                    <h1 className="sr-h1">Two years of history, replayed as a simulation.</h1>
                    <p className="sr-sub">
                        Live trading began on Oct 14, 2026. This page shows what both strategies would have done if they had started two years earlier, on Oct 14, 2024, with a default starting amount, using historical data and the same rules the strategies follow today.
                        Every number, chart and table row here is simulated. It is kept apart from the live record on purpose.
                    </p>
                </header>

                <div className="sr-box">
                    <p><strong>What this page is, and is not</strong></p>
                    <ul>
                        <li>It is a simulation built after the fact from historical prices. No account traded these positions and no broker confirmed any fill.</li>
                        <li>The live record is a separate page and starts on Oct 14, 2026. Live figures are never added to, or blended with, the simulated figures here.</li>
                        <li>Hindsight matters: the rules were developed with knowledge of this history, so a simulation looks better than the same rules can be expected to do going forward.</li>
                    </ul>
                </div>

                {strategies.map((s) => <Block key={s.key} s={s} />)}

                <section className="sr-section">
                    <h2 className="sr-h2">How the simulation was built <Badge /></h2>
                    <ul className="sr-list">
                        <li><strong>QQQ LEAPS.</strong> Starting amount $25,000. Options are priced with a model (Black-Scholes) from prices, volatility and interest rates, not from real quotes, and strikes and expiries are theoretical rather than the listed ones. The simulation covers the LEAPS, the short call overlay and a weekly SMH put spread sleeve: sell a put near 0.25 delta, buy a put $30 lower, about 14 days to expiry, close at half the credit, after 14 days, or at a loss limit of twice the credit, using at most 30% of the account as collateral and at most 4 spreads at this account size. SMH option prices are modeled from SMH volatility with a skew markup and were never checked against real SMH quotes. Fills are at the model mid price, with commissions of $1 per QQQ contract and $0.65 per SMH leg. Same engine and settings as the published combined record, run on a fresh $25,000 start.</li>
                        <li><strong>QQQ Defensive.</strong> Starting amount $10,000, whole shares only. The rules decide on hourly bars, so one day can hold several simulated trades, while the live signal email goes out once a day at 3:00 PM Eastern. Trades fill on the next bar. Modeled costs are small bid and ask half spreads, with no commission. Through Jun 30, 2026 the simulation follows the published out-of-sample walk-forward record. For Jul 1 to Oct 13, 2026 the same models, trained on data through Jan 9, 2026, were applied unchanged, with no refitting. Since Aug 13, 2026 the signals actually published each day have been more defensive than this simulation, so this record shows what the validated models produce, not what was published. The live record shows what was published.</li>
                        <li><strong>Benchmark.</strong> QQQ buy and hold uses the same starting dollars and window, with dividend adjusted closing prices. It is shown for context only.</li>
                        <li><strong>Data.</strong> Historical QQQ, volatility and interest rate data from public and broker data feeds. Data errors and revisions would change the results.</li>
                    </ul>
                </section>

                <section className="sr-section">
                    <h2 className="sr-h2">Limits to keep in mind <Badge /></h2>
                    <ul className="sr-list">
                        <li>Simulated trading has no real market impact, no missed fills, no rejected orders and no emotions. Real accounts face all of these.</li>
                        <li>One path through one two year window says little about other periods. QQQ rose strongly across this window, which flatters strategies that hold QQQ calls, and semiconductors rose even more, which flatters the SMH sleeve.</li>
                        <li>Option prices from a model can differ from real quotes by a wide margin, especially for long dated contracts and in fast markets.</li>
                        <li>Small starting amounts force whole share and whole contract rounding that larger accounts would not face.</li>
                    </ul>
                </section>

                <section className="sr-section">
                    <h2 className="sr-h2">Live accounts start from here</h2>
                    <p className="sr-p">
                        The TradeMind virtual accounts for these two strategies begin holding the cash and positions the simulation ended with, with the QQQ Defensive account starting on Oct 14, 2026 and the QQQ LEAPS account including its 4 SMH put spreads from Oct 15, 2026. Positions are mapped to listed contracts, and their cost basis is the simulated closing value, so live profit and loss starts at zero. From then on, results come from the daily signals and are reported separately on the live record. The SMH sleeve is still in a test phase: it has never traded in a real account.
                    </p>
                </section>

                <div className="sr-disclaimer">
                    <p>
                        SIMULATION. Everything on this page is hypothetical performance, produced by running rules on historical data. It was not achieved by any account. Hypothetical results have many inherent limitations: they are prepared with the benefit of hindsight, do not reflect real trading, liquidity, or financial risk, and cannot predict how a strategy will do in the future.
                    </p>
                    <p>
                        TradeMind never connects to a brokerage or places an order. Options can lose their entire value, and leveraged funds can lose money quickly. TradeMind provides educational analysis only, not personalized investment advice.
                    </p>
                </div>
                <div className="sr-back-row sr-back-bottom"><Link href="/" className="sr-back">Back to the home page</Link></div>
            </div>
            <LegalFooter />
        </main>
    );
}
