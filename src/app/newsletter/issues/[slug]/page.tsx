import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import '../../newsletter.css';
import {
    ISSUES,
    getIssue,
    issueUrl,
    formatDate,
    relatedIssues,
    adjacentIssues,
} from '@/lib/newsletter/issues';
import { GUIDES, RESEARCH_PAGES } from '@/lib/newsletter/topics';
import NewsletterShare from '@/components/newsletter/NewsletterShare';
import { NewsletterFooter, Breadcrumb, OfferBlock } from '@/components/newsletter/NewsletterShell';
import { IssueCard } from '@/components/newsletter/IssueCard';

const BASE = 'https://trademind.bot';

function findByDatedSlug(dated: string) {
    return ISSUES.find((i) => `${i.publishDate}-${i.slug}` === dated);
}

export function generateStaticParams() {
    return ISSUES.map((i) => ({ slug: `${i.publishDate}-${i.slug}` }));
}

export async function generateMetadata({
    params,
}: {
    params: Promise<{ slug: string }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const issue = findByDatedSlug(slug);
    if (!issue) return {};
    const url = BASE + issueUrl(issue);
    return {
        title: `${issue.title} - The AI Systematic Investor`,
        description: issue.excerpt,
        openGraph: {
            title: issue.title,
            description: issue.excerpt,
            type: 'article',
            url,
            publishedTime: issue.publishDate,
            authors: ['TradeMind'],
            tags: issue.tags as string[],
        },
        twitter: {
            card: 'summary_large_image',
            title: issue.title,
            description: issue.excerpt,
        },
        alternates: { canonical: url },
    };
}

/** Resolve a deep-link path to a human title for the callout box. */
function deepLinkTitle(href: string): string {
    const guide = GUIDES.find((g) => g.href === href);
    if (guide) return guide.title;
    const research = RESEARCH_PAGES.find((r) => r.href === href);
    if (research) return research.title;
    if (href === '/newsletter/start-here') return 'Start Here';
    return 'Related reading';
}

/** Split body sections so the offer block sits mid-article. */
function splitBody(body: string): { first: string; rest: string } {
    const sections = body.split(/(?=^## )/m).filter((s) => s.trim().length > 0);
    const half = Math.ceil(sections.length / 2);
    return { first: sections.slice(0, half).join('\n'), rest: sections.slice(half).join('\n') };
}

export default async function IssuePage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const issue = findByDatedSlug(slug);
    if (!issue) notFound();

    const url = BASE + issueUrl(issue);
    const { first, rest } = splitBody(issue.body);
    const related = relatedIssues(issue);
    const { prev, next } = adjacentIssues(issue);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: issue.title,
        description: issue.excerpt,
        datePublished: issue.publishDate,
        author: { '@type': 'Organization', name: 'TradeMind', url: BASE },
        publisher: { '@type': 'Organization', name: 'TradeMind', url: BASE },
        mainEntityOfPage: url,
        isPartOf: { '@type': 'Blog', name: 'The AI Systematic Investor', url: `${BASE}/newsletter` },
    };

    return (
        <main className="tm-nl">
            <div className="tm-nl-wrap-narrow">
                <Breadcrumb
                    items={[
                        { label: 'Newsletter', href: '/newsletter' },
                        { label: 'All issues', href: '/newsletter/issues' },
                        { label: `Issue ${issue.number}` },
                    ]}
                />

                <p className="tm-nl-meta">
                    Issue {issue.number} · {formatDate(issue.publishDate)} · {issue.readTime}
                </p>
                <h1 className="tm-nl-h1" style={{ fontSize: 'clamp(26px, 3.6vw, 38px)' }}>
                    {issue.title}
                </h1>
                <p className="tm-nl-sub">{issue.subtitle}</p>
                <span className="tm-nl-issuetags" style={{ display: 'flex', marginBottom: 22 }}>
                    {issue.tags.map((t) => (
                        <span key={t} className="tm-nl-tag">{t}</span>
                    ))}
                </span>

                <NewsletterShare
                    title={issue.title}
                    summary={issue.excerpt}
                    path={issueUrl(issue)}
                    slug={issue.slug}
                    compact
                />

                <article className="tm-nl-article">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{first}</ReactMarkdown>

                    {issue.deepLinks.length > 0 && (
                        <div className="tm-nl-callout">
                            Go deeper:{' '}
                            {issue.deepLinks.map((href, i) => (
                                <span key={href}>
                                    {i > 0 && ' · '}
                                    <Link href={href} className="tm-nl-link">{deepLinkTitle(href)}</Link>
                                </span>
                            ))}
                        </div>
                    )}

                    <OfferBlock />

                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{rest}</ReactMarkdown>
                </article>

                <div style={{ textAlign: 'center', margin: '40px 0' }}>
                    <Link href="/newsletter/offer" className="tm-nl-btn tm-nl-btn-primary" style={{ textDecoration: 'none' }}>
                        Start my annual subscription at 30% off
                    </Link>
                </div>

                <NewsletterShare
                    title={issue.title}
                    summary={issue.excerpt}
                    path={issueUrl(issue)}
                    slug={issue.slug}
                />

                <div className="tm-nl-prevnext">
                    {prev ? (
                        <Link href={issueUrl(prev)}>Previous: {prev.title}</Link>
                    ) : <span />}
                    {next ? (
                        <Link href={issueUrl(next)} style={{ textAlign: 'right' }}>Next: {next.title}</Link>
                    ) : <span />}
                </div>

                {related.length > 0 && (
                    <section className="tm-nl-section">
                        <h2 className="tm-nl-h2">Related issues</h2>
                        <div className="tm-nl-related">
                            {related.map((r) => (
                                <Link key={r.slug} href={issueUrl(r)} className="tm-nl-card tm-nl-issuecard">
                                    <p className="tm-nl-meta">Issue {r.number} · {formatDate(r.publishDate)}</p>
                                    <h3 className="tm-nl-issue-title" style={{ fontSize: 15 }}>{r.title}</h3>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                <NewsletterFooter />
            </div>
        </main>
    );
}
