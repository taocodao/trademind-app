/* /advisers/sample - the page the Preview button in the adviser outreach email opens.
   COMPLIANCE: every performance figure here is SIMULATED, carries its window, and sits next to its notice.
   Figures come from src/data/simulated-record.json so they always match /simulated-record. */

import type { Metadata } from 'next';
import data from '@/data/simulated-record.json';
import { Tracker } from './Tracker';
import './advisers.css';

export const metadata: Metadata = {
    title: 'Adviser sample | TradeMind',
    description: 'How TradeMind reads QQQ conditions, how its two rules-based strategies work, and a simulated record you can check against a public ledger.',
    robots: { index: false, follow: false },
};

type S = { key: string; name: string; principal: number; finalValue: number; pnlPct: number; maxDrawdownPct: number; benchmarkPct: number; benchmarkMaxDrawdownPct: number };
const strat = data.strategies as unknown as S[];
const leaps = strat.find((s) => s.key === 'QQQ_LEAPS')!;
const def = strat.find((s) => s.key === 'QQQ_DEFENSIVE')!;
const WINDOW = 'Oct 14, 2024 to Oct 13, 2026';
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
const dd = (n: number) => `${n.toFixed(1)}%`;
const CAL = 'https://calendar.app.google/iybGJcd2AC1Wr7Tk7';

const CHIPS: [string, string, string][] = [
    ['regime-snapshot', 'Regime snapshot', 'model classification and timestamp'],
    ['signal-rationale', 'Signal rationale', 'what changed and what did not'],
    ['strategy-framework', 'Strategy framework', 'rules, instruments, intended use'],
    ['risk-limitations', 'Risk and limitations', 'stress periods and model weaknesses'],
    ['simulated-results', 'Simulated results', 'hypothetical backtest and assumptions'],
];

export default function AdviserSample() {
    return (
        <main className="adv">
            <Tracker />
            <div className="adv-strip">Adviser sample. Research reference only. TradeMind publishes signals for self-directed investors. It does not manage money, connect to brokerage accounts or place trades.</div>
            <div className="adv-wrap">
                <p className="adv-eyebrow">TRADEMIND RESEARCH <span>QQQ market regimes and signal rationale</span></p>
                <h1>A research sample: how the model reads QQQ</h1>
                <p className="adv-lead">The model's regime classification, what changes a signal, where the interpretation can be wrong, and a hypothetical backtest shown with its assumptions.</p>

                <nav className="adv-chips" aria-label="Sections">
                    {CHIPS.map(([id, name, d]) => (
                        <a key={id} href={`#${id}`} data-track={id} data-kind="chip"><b>{name} &rsaquo;</b><span>{d}</span></a>
                    ))}
                </nav>
                <p className="adv-hint">Tap any part to see what it covers.</p>

                <section id="regime-snapshot" className="adv-sec">
                    <h2>Regime snapshot</h2>
                    <p>The model's classification of current QQQ conditions: trend, volatility and the other inputs the rules watch, and what would move the classification to the next state. It describes conditions. It is not a forecast.</p>
                    <p>The classification and its time stamp are on each day&rsquo;s signal. Every signal is recorded in the public ledger: <a href="/verify/ledger" data-track="ledger-weather" data-kind="link">open the public ledger</a>.</p>
                </section>

                <section id="signal-rationale" className="adv-sec">
                    <h2>Signal rationale</h2>
                    <p>Each signal comes with its rationale: what changed, which rule fired, what would reverse it. The explanation text only restates reasons the rules actually recorded.</p>
                    <p>See how a signal is time-stamped and checked: <a href="/verify" data-track="verify" data-kind="link">how verification works</a>.</p>
                </section>

                <section id="strategy-framework" className="adv-sec">
                    <h2>Strategy framework: the two strategies</h2>
                    <h3>QQQ Defensive</h3>
                    <p><b>What it holds.</b> QQQ, QLD (2x), TQQQ (3x) and SGOV, a Treasury bill ETF used as cash. Whole shares only, no options permission needed.</p>
                    <p><b>What triggers a change.</b> The rules read market conditions. The published signal goes out once a day at 3:00 PM ET and on most days says hold. When conditions change, the target mix moves toward more or less leverage, or more SGOV.</p>
                    <p><b>In a drawdown.</b> It is built to cut leverage as conditions weaken, and it can still lose money. Leveraged ETFs reset daily and can fall quickly.</p>
                    <p><b>Not for.</b> Investors who cannot hold leveraged ETFs, who need income, or who expect to beat QQQ every year. It can lag QQQ in strong markets.</p>
                    <h3>QQQ LEAPS</h3>
                    <p><b>What it holds.</b> Long-dated QQQ call options, entered on rare, gated signals, with a covered-call overlay while held. The simulated record also includes a weekly SMH put spread sleeve, described below.</p>
                    <p><b>What triggers a change.</b> Entries wait for the strategy&rsquo;s entry conditions and can sit in cash for weeks or months. The overlay and the long calls are managed by their own rules.</p>
                    <p><b>In a drawdown.</b> Options can lose value faster than QQQ itself. Income from the short calls offsets only part of a fall.</p>
                    <p><b>Not for.</b> Accounts without options approval, small accounts (one contract covers 100 shares), or investors who cannot handle assignment, rolls and expiry.</p>
                    <p className="adv-note">The SMH put spread sleeve is still in a test phase and has never traded in a real account.</p>
                </section>

                <section id="risk-limitations" className="adv-sec">
                    <h2>Risk and limitations <span className="adv-badge">SIMULATED</span></h2>
                    <p className="adv-window">{WINDOW}</p>
                    <div className="adv-grid">
                        <div><span>QQQ LEAPS (simulated)</span><b>{dd(leaps.maxDrawdownPct)}</b></div>
                        <div><span>QQQ Defensive (simulated)</span><b>{dd(def.maxDrawdownPct)}</b></div>
                        <div><span>QQQ buy and hold</span><b>{dd(leaps.benchmarkMaxDrawdownPct)}</b></div>
                    </div>
                    <p className="adv-note">Largest peak-to-trough drop in each simulated window. The next drop could be deeper than any shown here, and a model can be wrong in ways its own history does not show.</p>
                </section>

                <section id="simulated-results" className="adv-sec">
                    <h2>Simulated results <span className="adv-badge">SIMULATED</span></h2>
                    <p className="adv-window">{WINDOW}</p>
                    <div className="adv-grid">
                        <div><span>QQQ LEAPS (simulated, from ${leaps.principal.toLocaleString('en-US')})</span><b>{pct(leaps.pnlPct)}</b></div>
                        <div><span>QQQ Defensive (simulated, from ${def.principal.toLocaleString('en-US')})</span><b>{pct(def.pnlPct)}</b></div>
                        <div><span>QQQ buy and hold</span><b>{pct(leaps.benchmarkPct)}</b></div>
                    </div>
                    <div className="adv-box">
                        <p><b>What this is.</b> A simulation built after the fact from historical prices. No account traded these positions and no broker confirmed any fill.</p>
                        <p><b>QQQ LEAPS.</b> Options are priced with a model, not real quotes, and strikes and expiries are theoretical. The result includes the QQQ calls, the covered-call overlay and the SMH put spread sleeve, whose prices were never checked against real SMH quotes. QQQ rose strongly across this window, which flatters call strategies, and semiconductors rose even more, which flatters the SMH sleeve.</p>
                        <p><b>QQQ Defensive.</b> It trailed QQQ buy and hold over this window. Since Aug 13, 2026 the signals actually published have been more defensive than this simulation, so the live record shows what was published.</p>
                        <p><b>What it does not show.</b> Results from real accounts, taxes, real fills, other periods, or what will happen next. Simulated results do not predict future results.</p>
                    </div>
                    <p className="adv-links">
                        <a href="/simulated-record" data-track="simulated-record" data-kind="link">Full simulated record &rsaquo;</a>
                        <a href="/verify" data-track="verify" data-kind="link">How verification works &rsaquo;</a>
                        <a href="/verify/ledger" data-track="ledger" data-kind="link">Public signal ledger &rsaquo;</a>
                    </p>
                </section>

                <section className="adv-sec">
                    <h2>Who this may be relevant to</h2>
                    <p>If QQQ or Nasdaq exposure comes up in your work, it may serve as a second view on market conditions. It is general research, not advice for any specific client.</p>
                </section>

                <section className="adv-sec adv-next">
                    <h2>Next steps</h2>
                    <a className="adv-btn" href={CAL} data-track="call" data-kind="cta">Book a 20-minute intro call</a>
                    <a className="adv-btn adv-btn2" href="mailto:eric@trademind.bot?subject=Weekly%20brief" data-track="brief" data-kind="cta">Get the weekly brief</a>
                    <a className="adv-btn adv-btn2" href="mailto:eric@trademind.bot?subject=Other%20ways%20to%20work%20together" data-track="cooperate" data-kind="cta">Other ways to work together</a>
                    <p className="adv-note">More about TradeMind: <a href="https://trademind.bot" data-track="site" data-kind="link">trademind.bot</a></p>
                </section>

                <footer className="adv-foot">
                    All performance figures on this page are simulated, not results from real accounts, and are shown with their window. This page is general information, not investment advice or an offer of any security. No firm has approved or endorsed TradeMind. TradeMind, 151-58 24th Rd, Whitestone, NY 11357. To stop receiving these emails, reply &quot;unsubscribe&quot; to eric@trademind.bot.
                </footer>
            </div>
        </main>
    );
}
