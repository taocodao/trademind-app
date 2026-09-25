import type { Metadata } from 'next';
import Link from 'next/link';
import '../../newsletter.css';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Risk Framework - The AI Systematic Investor',
    description:
        'Drawdown tolerance, per-position and per-sleeve exposure limits, combined tech and semiconductor caps, and the rules for reducing, pausing, or standing down.',
};

const RULES = [
    ['Per-position cap', 'One third of the account, maximum, in any single position.'],
    ['Open positions', 'At most three positions at once. Fewer, better-sized decisions.'],
    ['Cash reserve', '5% of the account stays in cash at all times.'],
    ['Stop rule', 'Every loser is cut at twice the credit received. No averaging into losers.'],
    ['Correlation budget', 'QQQ LEAPS, PMCC overlays, and semiconductor put positions are counted together for total tech and semiconductor exposure.'],
];

export default function RiskFrameworkPage() {
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Risk Framework' }]} />
                <p className="tm-nl-eyebrow">Permanent Research</p>
                <h1 className="tm-nl-h1">Risk Framework</h1>
                <p className="tm-nl-updated">Last updated: September 2026</p>
                <p className="tm-nl-sub">
                    Returns are what remain after risk is controlled. These limits exist so the strategy is
                    still alive to compound after its worst month.
                </p>

                <section className="tm-nl-section" style={{ marginTop: 36 }}>
                    <h2 className="tm-nl-h2">Why risk comes first</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        A 30% drawdown needs a 43% gain to recover; a 50% drawdown needs 100%. The math of
                        recovery is unforgiving, so the framework is built around drawdown tolerance first:
                        how much the account is permitted to lose before the system steps in, measured
                        peak to trough, not month to month.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Standing limits</h2>
                    <div className="tm-nl-card" style={{ padding: 0, overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14.5 }}>
                            <tbody>
                                {RULES.map(([k, v]) => (
                                    <tr key={k} style={{ borderBottom: '1px solid #232333' }}>
                                        <td style={{ padding: '12px 18px', fontWeight: 700, width: '36%' }}>{k}</td>
                                        <td style={{ padding: '12px 18px', color: '#BCC6D8' }}>{v}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">De-risking rules</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        When limits are approached, the system acts in a fixed order: first reduce size on
                        new entries, then pause new entries entirely, then stand down existing exposure
                        according to the stop rules. The model cannot override this order. A confident
                        model on a losing streak is exactly the case these rules were written for.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">What this costs in good times</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        Caps and cash reserves drag on returns in strong bull markets. That drag is the
                        insurance premium, paid deliberately. The framework is designed to keep drawdowns
                        survivable, not to win every rally. Both the cost and the payoff are visible in
                        the <Link href="/verify" className="tm-nl-link">public ledger</Link> and the{' '}
                        <Link href="/newsletter/research/backtest-validation" className="tm-nl-link">
                            backtest validation
                        </Link>.
                    </p>
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
