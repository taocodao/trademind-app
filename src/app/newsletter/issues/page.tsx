import type { Metadata } from 'next';
import '../newsletter.css';
import { ISSUES_DESC, formatDate, monthLabel } from '@/lib/newsletter/issues';
import { TOPICS } from '@/lib/newsletter/topics';
import { NewsletterFooter, Breadcrumb } from '@/components/newsletter/NewsletterShell';
import ArchiveClient from '@/components/newsletter/ArchiveClient';

export const metadata: Metadata = {
    title: 'Issue Archive - The AI Systematic Investor',
    description:
        'Every issue of The AI Systematic Investor: QQQ research, LEAPS, PMCC, semiconductor put selling, machine learning, backtest audits, and risk management.',
    openGraph: {
        title: 'Issue Archive - The AI Systematic Investor',
        description: 'Every issue of The AI Systematic Investor, filterable by topic.',
        type: 'website',
        url: 'https://trademind.bot/newsletter/issues',
    },
};

export default function NewsletterArchive() {
    // Serialize only what the client needs for filtering and rendering.
    const items = ISSUES_DESC.map((i) => ({
        slug: i.slug,
        number: i.number,
        title: i.title,
        excerpt: i.excerpt,
        publishDate: i.publishDate,
        dateLabel: formatDate(i.publishDate),
        month: monthLabel(i.publishDate),
        readTime: i.readTime,
        tags: i.tags as string[],
        href: `/newsletter/issues/${i.publishDate}-${i.slug}`,
    }));

    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap">
                <Breadcrumb items={[{ label: 'Newsletter', href: '/newsletter' }, { label: 'All issues' }]} />
                <p className="tm-nl-eyebrow">The AI Systematic Investor</p>
                <h1 className="tm-nl-h1">Every issue, every rule on the table.</h1>
                <p className="tm-nl-sub">
                    Filter by topic or search by keyword. Each issue links to its permanent research page.
                </p>
                <ArchiveClient items={items} topics={[...TOPICS]} />
                <NewsletterFooter />
            </div>
        </main>
    );
}
