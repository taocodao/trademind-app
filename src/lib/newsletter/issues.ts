/**
 * Newsletter content model: one structured record per issue.
 * The archive, issue pages, share previews, RSS, and future emails all read
 * from this single source.
 */
import type { Topic } from './topics';
import i1 from './issues/issue-01';
import i2 from './issues/issue-02';
import i3 from './issues/issue-03';
import i4 from './issues/issue-04';
import i5 from './issues/issue-05';
import i6 from './issues/issue-06';
import i7 from './issues/issue-07';
import i8 from './issues/issue-08';

export interface NewsletterIssue {
    number: number;
    slug: string;
    title: string;
    subtitle: string;
    publishDate: string; // yyyy-mm-dd
    readTime: string;
    tags: Topic[] | string[];
    excerpt: string;
    deepLinks: { href: string; label: string }[];
    body: string; // markdown
}

export const ISSUES: NewsletterIssue[] = [i1, i2, i3, i4, i5, i6, i7, i8].map((i) => ({
    ...i,
    tags: [...i.tags],
    deepLinks: i.deepLinks.map((d) => ({ ...d })),
}));

/** Newest first. */
export const ISSUES_DESC: NewsletterIssue[] = [...ISSUES].sort(
    (a, b) => (a.publishDate < b.publishDate ? 1 : -1)
);

export function getIssue(slug: string): NewsletterIssue | undefined {
    return ISSUES.find((i) => i.slug === slug);
}

export function issueUrl(issue: NewsletterIssue): string {
    return `/newsletter/issues/${issue.publishDate}-${issue.slug}`;
}

export function relatedIssues(issue: NewsletterIssue, n = 3): NewsletterIssue[] {
    const tags = new Set(issue.tags);
    return ISSUES_DESC.filter(
        (i) => i.slug !== issue.slug && i.tags.some((t) => tags.has(t))
    ).slice(0, n);
}

export function adjacentIssues(issue: NewsletterIssue): {
    prev?: NewsletterIssue;
    next?: NewsletterIssue;
} {
    const idx = ISSUES.findIndex((i) => i.slug === issue.slug);
    return {
        prev: idx > 0 ? ISSUES[idx - 1] : undefined,
        next: idx < ISSUES.length - 1 ? ISSUES[idx + 1] : undefined,
    };
}

export function formatDate(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

export function monthLabel(iso: string): string {
    return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });
}
