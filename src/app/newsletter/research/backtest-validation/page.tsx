import type { Metadata } from 'next';
import Link from 'next/link';
import '../../newsletter.css';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Backtest Validation - The AI Systematic Investor',
    description:
        'The methodology, assumptions, stress tests, and limitations behind every TradeMind performance number: test periods, costs, walk-forward design, and the real-quote reconciliation.',
};

const METRICS = [
    ['Annualized return (backtest, model-priced)', '55.1%'],
    ['Max drawdown (backtest)', '-14.5%'],
    ['Sharpe ratio (backtest)', '1.83'],
    ['Calmar ratio (backtest)', '3.79'],
    ['Fills in the ledger', '1,570'],
    ['Test window', 'January 2021 - August 2026'],
    ['Reality check (15-month real-quote tape)', '-30.4% max drawdown'],
];

const LIMITATIONS = [
    'Model-priced fills: backtested entries and exits are priced by a math model, not by live market quotes. Real fills will differ, sometimes meaningfully.',
    'Survivorship of the test window: January 2021 to August 2026 contains specific regimes. A different window would produce different numbers.',
    'Liquidity assumptions: the model assumes orders fill at modeled prices. Fast markets and wide spreads are only approximated.',
    'Parameter selection: every rule was chosen at some point by a human looking at data. Walk-forward testing reduces, but cannot eliminate, this bias.',
    'A backtest cannot see the future: no amount of validation makes a simulated result a promise.',
];

export default function BacktestValidationPage() {
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Backtest Validation' }]} />
                <p className="tm-nl-eyebrow">Permanent Research</p>
                <h1 className="tm-nl-h1">Backtest Validation</h1>
                <p className="tm-nl-updated">Last updated: September 2026</p>
                <p className="tm-nl-sub">
                    Every performance number we publish traces back to this page. Read the assumptions
                    before you read the results.
                </p>

                <section className="tm-nl-section" style={{ marginTop: 36 }}>
                    <h2 className="tm-nl-h2">Test design</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        The backtest simulates the QQQ LEAPS strategy from January 2021 through August 2026.
                        A $10,000 reference account is assumed, with per-position size capped at one third of
                        the account, at most three positions open at once, and a 5% cash reserve. Entry and
                        exit rules are fixed before each walk-forward window, and the ML model is retrained
                        only on data that existed before the period it trades. Commissions and slippage are
                        charged per fill at standard retail option rates, and margin treatment follows
                        standard Reg-T assumptions.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Results</h2>
                    <div className="tm-nl-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
                            <tbody>
                                {METRICS.map(([k, v]) => (
                                    <tr key={k} style={{ borderBottom: '1px solid #232333' }}>
                                        <td style={{ padding: '12px 18px', color: '#8B95A9' }}>{k}</td>
                                        <td style={{ padding: '12px 18px', fontWeight: 700, textAlign: 'right' }}>{v}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p style={{ color: '#8B95A9', fontSize: 12.5, marginTop: 14, lineHeight: 1.6 }}>
                        Hypothetical or simulated performance results have certain inherent limitations.
                        Unlike an actual performance record, simulated results do not represent actual
                        trading and may under- or over-compensate for the impact of certain market factors.
                        Past performance, real or simulated, does not guarantee future results.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">The reality check we publish next to it</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        A model backtest says the worst peak-to-trough drawdown was 14.5%. A separate
                        15-month test of the same rules priced with real market quotes drew down 30.4%.
                        Those are different windows and different pricing, and both numbers are published,
                        side by side, on the landing page and in every issue that mentions performance.
                        If you are comparing us to someone who shows only the better number, ask where the
                        other one is.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Comparisons and stress tests</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        The same window is evaluated against buy-and-hold QQQ, a static LEAPS position
                        without the signal gates, and the strategy with the ML layer removed. The rules
                        were also stress-tested across 21 recombined sub-windows (including 2022's selloff)
                        and held up in 18. Every fill, win or loss, is in the{' '}
                        <Link href="/verify" className="tm-nl-link">public ledger</Link>, including the
                        days the system chose to do nothing.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Limitations</h2>
                    <ul style={{ color: '#BCC6D8', lineHeight: 1.8, fontSize: 15, paddingLeft: 20, margin: 0 }}>
                        {LIMITATIONS.map((l) => (
                            <li key={l}>{l}</li>
                        ))}
                    </ul>
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
