import type { Metadata } from 'next';
import Link from 'next/link';
import '../newsletter.css';
import { ISSUES, getIssue, issueUrl, formatDate } from '@/lib/newsletter/issues';
import { GUIDES, RESEARCH_PAGES } from '@/lib/newsletter/topics';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';
import SignupForm from '@/components/newsletter/SignupForm';

export const metadata: Metadata = {
    title: 'Start Here - The AI Systematic Investor',
    description:
        'The reading order for new subscribers: process before prediction, what the model does, and why backtest assumptions must survive scrutiny.',
};

export default function StartHerePage() {
    const reading = [
        {
            issue: getIssue('why-most-retail-investors-need-a-process')!,
            why: 'The case for a written process before any prediction, indicator, or trade.',
        },
        {
            issue: getIssue('what-machine-learning-can-do-for-investors')!,
            why: 'Exactly where the model helps (ranking and vetoes) and where it never goes (starting trades).',
        },
        {
            issue: getIssue('backtest-results-only-matter-if-assumptions-survive')!,
            why: 'How to read our numbers, and every other backtest you will ever be shown.',
        },
    ];

    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'Start here' }]} />
                <p className="tm-nl-eyebrow">Start Here</p>
                <h1 className="tm-nl-h1">New here? Read these first.</h1>
                <p className="tm-nl-sub">
                    Three issues, in order. Together they explain what this letter believes: process over
                    prediction, models with limits, and numbers you can audit.
                </p>

                <div className="tm-nl-issuelist" style={{ marginTop: 10 }}>
                    {reading.map(({ issue, why }) => (
                        <div key={issue.slug} className="tm-nl-card">
                            <p className="tm-nl-meta">
                                Issue {issue.number} · {formatDate(issue.publishDate)} · {issue.readTime}
                            </p>
                            <h3 className="tm-nl-issue-title">{issue.title}</h3>
                            <p style={{ color: '#BCC6D8', fontSize: 14.5, margin: '0 0 14px' }}>{why}</p>
                            <Link href={issueUrl(issue)} className="tm-nl-link">Read issue</Link>
                        </div>
                    ))}
                </div>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Then the permanent research</h2>
                    <div className="tm-nl-issuelist">
                        {RESEARCH_PAGES.map((r) => (
                            <div key={r.slug} className="tm-nl-card">
                                <h3 className="tm-nl-issue-title">{r.title}</h3>
                                <p style={{ color: '#8B95A9', fontSize: 14, margin: '0 0 12px' }}>{r.blurb}</p>
                                <Link href={r.href} className="tm-nl-link">Read</Link>
                            </div>
                        ))}
                        {GUIDES.map((g) => (
                            <div key={g.slug} className="tm-nl-card">
                                <h3 className="tm-nl-issue-title">{g.title}</h3>
                                <p style={{ color: '#8B95A9', fontSize: 14, margin: '0 0 12px' }}>{g.blurb}</p>
                                <Link href={g.href} className="tm-nl-link">Read</Link>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="tm-nl-section">
                    <h2 className="tm-nl-h2">Get the next issue</h2>
                    <SignupForm source="start-here" />
                    <p className="tm-nl-offerline">
                        Confirmed subscribers get 30% off a one-year TradeMind subscription for 90 days after confirming.
                    </p>
                </section>

                <NewsletterFooter />
            </div>
        </main>
    );
}
