import type { Metadata } from 'next';
import Link from 'next/link';
import './newsletter.css';
import { ISSUES_DESC, getIssue, issueUrl, formatDate } from '@/lib/newsletter/issues';
import { GUIDES, RESEARCH_PAGES } from '@/lib/newsletter/topics';
import SignupForm from '@/components/newsletter/SignupForm';
import NewsletterShare from '@/components/newsletter/NewsletterShare';
import { NewsletterFooter, OfferBlock } from '@/components/newsletter/NewsletterShell';
import { IssueCard } from '@/components/newsletter/IssueCard';

export const metadata: Metadata = {
    title: 'The AI Systematic Investor - TradeMind Newsletter',
    description:
        'Weekly research on QQQ, LEAPS, PMCC, semiconductor options, and risk control using machine learning and transparent rules. Replace market opinions with a systematic investment process.',
    openGraph: {
        title: 'The AI Systematic Investor - TradeMind Newsletter',
        description:
            'Weekly research on QQQ, LEAPS, PMCC, semiconductor options, and risk control using machine learning and transparent rules.',
        type: 'website',
        url: 'https://trademind.bot/newsletter',
        images: ['/share-card.png'],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'The AI Systematic Investor - TradeMind Newsletter',
        description:
            'Weekly research on QQQ, LEAPS, PMCC, semiconductor options, and risk control using machine learning and transparent rules.',
        images: ['/share-card.png'],
    },
};

const APPROACH = [
    {
        title: 'Market Regime',
        text: 'Which environment are we actually in, measured instead of guessed.',
        href: '/newsletter/research/backtest-validation',
    },
    {
        title: 'ML Insight',
        text: 'A model that ranks setups and can veto a trade, but never starts one.',
        href: '/newsletter/research/ml-framework',
    },
    {
        title: 'Options Structure',
        text: 'LEAPS, covered calls, and put sleeves with the trade-offs stated up front.',
        href: '/newsletter/guides/leaps',
    },
    {
        title: 'Risk Control',
        text: 'Drawdown limits and exposure caps that apply on the worst day, not just the good ones.',
        href: '/newsletter/research/risk-framework',
    },
];

export default function NewsletterHome() {
    const latest = ISSUES_DESC[0];
    const startHere = [getIssue('process-before-prediction')!, getIssue('what-machine-learning-can-and-cannot-do')!, getIssue('backtest-assumptions-must-survive-scrutiny')!];
    const archivePreview = ISSUES_DESC.slice(0, 6);

    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap">
                {/* Hero */}
                <p className="tm-nl-eyebrow">The AI Systematic Investor</p>
                <h1 className="tm-nl-h1">Replace market opinions with a systematic investment process.</h1>
                <p className="tm-nl-sub">
                    The AI Systematic Investor, by TradeMind. Weekly research on QQQ, LEAPS, PMCC,
                    semiconductor options, and risk control using machine learning and transparent rules.
                </p>
                <SignupForm source="newsletter-home" />
                <p style={{ marginTop: 14 }}>
                    <Link href="/newsletter/issues" className="tm-nl-link">Browse all issues</Link>
                </p>
                <p className="tm-nl-offerline">
                    Confirmed subscribers get 30% off a one-year TradeMind subscription for 3 months after confirming.
                </p>

                {/* The problem */}
                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">The problem</h2>
                    <p className="tm-nl-sub" style={{ marginBottom: 0 }}>
                        Most retail investors sit in one of two traps. Either they hold passive exposure with
                        no way to adjust risk when conditions change, or they make concentrated bets based on
                        unreliable sources, with no written rules for when to enter, how much to risk, or when
                        to exit. Both approaches fail at the same moment: the day the market stops cooperating.
                    </p>
                </section>

                {/* The approach */}
                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">The approach</h2>
                    <div className="tm-nl-grid4">
                        {APPROACH.map((a) => (
                            <div key={a.title} className="tm-nl-card tm-nl-approach">
                                <h3>{a.title}</h3>
                                <p>{a.text}</p>
                                <Link href={a.href} className="tm-nl-link" style={{ fontSize: 13.5 }}>
                                    Read the guide
                                </Link>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Latest issue */}
                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Latest issue</h2>
                    <IssueCard issue={latest} />
                </section>

                {/* Start here */}
                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Start here</h2>
                    <p className="tm-nl-muted" style={{ marginBottom: 16, fontSize: 14.5 }}>
                        New to the letter? These three issues are the suggested first read, in order.
                    </p>
                    <div className="tm-nl-issuelist">
                        {startHere.map((issue) => (
                            <IssueCard key={issue.slug} issue={issue} />
                        ))}
                    </div>
                    <p style={{ marginTop: 16 }}>
                        <Link href="/newsletter/start-here" className="tm-nl-link">See the full reading order</Link>
                    </p>
                </section>

                {/* Archive preview */}
                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">From the archive</h2>
                    <div className="tm-nl-issuelist">
                        {archivePreview.map((issue) => (
                            <IssueCard key={issue.slug} issue={issue} compact />
                        ))}
                    </div>
                    <p style={{ marginTop: 16 }}>
                        <Link href="/newsletter/issues" className="tm-nl-link">View all issues</Link>
                    </p>
                </section>

                {/* Offer block */}
                <section className="tm-nl-section">
                    <OfferBlock />
                </section>

                {/* Share block */}
                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Share this newsletter</h2>
                    <NewsletterShare
                        title="The AI Systematic Investor"
                        summary="Weekly research on QQQ, LEAPS, PMCC, and risk control, with every rule and result published."
                        path="/newsletter"
                        slug="newsletter"
                    />
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
