import Link from 'next/link';
import type { NewsletterIssue } from '@/lib/newsletter/issues';
import { issueUrl, formatDate } from '@/lib/newsletter/issues';

/** Archive / listing card for one issue. */
export function IssueCard({ issue, compact }: { issue: NewsletterIssue; compact?: boolean }) {
    return (
        <Link href={issueUrl(issue)} className="tm-nl-card tm-nl-issuecard">
            <p className="tm-nl-meta">
                Issue {issue.number} · {formatDate(issue.publishDate)} · {issue.readTime}
            </p>
            <h3 className="tm-nl-issue-title">{issue.title}</h3>
            {!compact && <p className="tm-nl-issue-excerpt">{issue.excerpt}</p>}
            <span className="tm-nl-issuetags">
                {issue.tags.map((t) => (
                    <span key={t} className="tm-nl-tag">{t}</span>
                ))}
            </span>
            <span className="tm-nl-readbtn">Read issue</span>
        </Link>
    );
}
