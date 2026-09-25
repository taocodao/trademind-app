import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';

export const metadata: Metadata = {
    title: 'Disclosures - The AI Systematic Investor',
    description:
        'Full disclosures for The AI Systematic Investor and TradeMind: educational content, hypothetical performance, options risk, and compensation.',
};

const SECTIONS: [string, string[]][] = [
    [
        'Who we are',
        [
            'TradeMind is a software platform for self-directed investors. We are not a broker-dealer, not a registered investment adviser, and we do not manage, custody, or touch client money. Your funds stay at your broker, in your name, under your control.',
        ],
    ],
    [
        'Educational content only',
        [
            'The AI Systematic Investor is an educational research letter. Nothing in it is investment advice, a recommendation to buy or sell any security, or an offer of individualized advice. You are solely responsible for every decision and every order in your account.',
        ],
    ],
    [
        'Hypothetical and simulated performance',
        [
            'Performance figures referenced in the newsletter and on this site are hypothetical or simulated, produced by backtests and model pricing unless explicitly labeled otherwise. Simulated results have inherent limitations: they do not represent actual trading, and may under- or over-compensate for the impact of market factors such as liquidity, spreads, and slippage. Past performance, real or simulated, does not guarantee future results.',
        ],
    ],
    [
        'Options risk',
        [
            'Options involve substantial risk and are not suitable for every investor. Selling options can produce losses greater than the premium received. Prior to buying or selling an option, read the document "Characteristics and Risks of Standardized Options" available from the Options Clearing Corporation.',
        ],
    ],
    [
        'Compensation and offers',
        [
            'TradeMind sells software subscriptions. The newsletter offers (including the 30% annual discount for confirmed subscribers) are commercial offers governed by their posted terms. We have no affiliate relationships with brokers, and we do not receive payment for order flow or trade volume.',
        ],
    ],
];

export default function DisclosuresPage() {
    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Disclosures' }]} />
                <p className="tm-nl-eyebrow">Disclosures</p>
                <h1 className="tm-nl-h1">Disclosures</h1>
                <p className="tm-nl-updated">Last updated: September 2026</p>

                {SECTIONS.map(([heading, paragraphs]) => (
                    <section key={heading} className="tm-nl-section" style={{ marginTop: 40 }}>
                        <h2 className="tm-nl-h2">{heading}</h2>
                        {paragraphs.map((p, i) => (
                            <p key={i} className="tm-nl-sub" style={{ marginBottom: 12, fontSize: 15.5 }}>
                                {p}
                            </p>
                        ))}
                    </section>
                ))}

                <p className="tm-nl-sub" style={{ marginTop: 48 }}>
                    Questions about these disclosures:{' '}
                    <a href="mailto:support@trademind.bot" className="tm-nl-link">support@trademind.bot</a>.
                    Site-wide terms: <Link href="/privacy" className="tm-nl-link">Privacy policy</Link>.
                </p>

                <NewsletterFooter />
            </div>
        </main>
    );
}
