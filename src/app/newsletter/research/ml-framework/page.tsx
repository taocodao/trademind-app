import type { Metadata } from 'next';
import Link from 'next/link';
import '../../newsletter.css';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'ML Framework - The AI Systematic Investor',
    description:
        'What the TradeMind model classifies and ranks, its inputs, retrain cadence, and explicit limitations. The model can veto a trade; it cannot start one.',
};

const CANNOT = [
    'Start a trade on its own. Every entry requires the full rule set to agree.',
    'Override risk limits. Position caps and drawdown rules live outside the model.',
    'Predict news, earnings surprises, or geopolitical shocks. It reads market data, not headlines.',
    'Guarantee regime detection. It classifies probabilities from history; history changes.',
    'See the future. Every score is a statement about the past rhyming, nothing more.',
];

export default function MLFrameworkPage() {
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'ML Framework' }]} />
                <p className="tm-nl-eyebrow">Permanent Research</p>
                <h1 className="tm-nl-h1">ML Framework</h1>
                <p className="tm-nl-updated">Last updated: September 2026</p>
                <p className="tm-nl-sub">
                    The model earns its place by narrowing decisions and vetoing bad ones. This page says
                    exactly what it does, what it reads, and what it can never do.
                </p>

                <section className="tm-nl-section" style={{ marginTop: 36 }}>
                    <h2 className="tm-nl-h2">What the model does</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        Two jobs, and only two. First, it classifies the current market regime (bull, chop,
                        bear, and transitions between them) from trend, volatility, and breadth inputs.
                        Second, it ranks candidate setups against historical analogs and produces a
                        confidence score. That score is one of the seven entry conditions on the QQQ LEAPS
                        gate: a low score can veto a trade, but a high score alone never starts one.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Inputs</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        Price history, trend structure, realized and implied volatility, and breadth
                        measures. The inputs are deliberately boring: no news sentiment, no social feeds,
                        no alternative data exhaust. Boring inputs age more slowly and can be audited
                        line by line.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Retraining and versioning</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        The model is retrained on a fixed schedule and after material regime breaks, always
                        on data that existed before the window it will trade (walk-forward discipline).
                        Every deployed version is versioned and logged, so any historical signal can be
                        traced to the exact model that informed it.
                    </p>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">What the model cannot do</h2>
                    <ul style={{ color: '#BCC6D8', lineHeight: 1.8, fontSize: 15, paddingLeft: 20, margin: 0 }}>
                        {CANNOT.map((l) => (
                            <li key={l}>{l}</li>
                        ))}
                    </ul>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Change log</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        Material changes to inputs, architecture, or gates are recorded here when deployed.
                        Current production configuration: regime classifier plus confidence scoring on the
                        inputs above, retrained on the standing walk-forward schedule. See the{' '}
                        <Link href="/newsletter/research/backtest-validation" className="tm-nl-link">
                            backtest validation
                        </Link>{' '}
                        page for how the model is evaluated.
                    </p>
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
