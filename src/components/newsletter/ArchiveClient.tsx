'use client';

/** Archive client: tag filters (any-match), keyword search, month grouping, empty state. */
import { useMemo, useState } from 'react';
import Link from 'next/link';

export interface ArchiveItem {
    slug: string;
    number: number;
    title: string;
    excerpt: string;
    publishDate: string;
    dateLabel: string;
    month: string;
    readTime: string;
    tags: string[];
    href: string;
}

export default function ArchiveClient({ items, topics }: { items: ArchiveItem[]; topics: string[] }) {
    const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
    const [q, setQ] = useState('');

    const toggleTag = (t: string) => {
        setActiveTags((prev) => {
            const next = new Set(prev);
            if (next.has(t)) next.delete(t);
            else next.add(t);
            return next;
        });
    };

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return items.filter((i) => {
            if (activeTags.size > 0 && !i.tags.some((t) => activeTags.has(t))) return false;
            if (needle) {
                const hay = `${i.title} ${i.excerpt} ${i.tags.join(' ')}`.toLowerCase();
                if (!hay.includes(needle)) return false;
            }
            return true;
        });
    }, [items, activeTags, q]);

    // Group by month, preserving newest-first order.
    const grouped = useMemo(() => {
        const out: { month: string; rows: ArchiveItem[] }[] = [];
        for (const item of filtered) {
            const last = out[out.length - 1];
            if (last && last.month === item.month) last.rows.push(item);
            else out.push({ month: item.month, rows: [item] });
        }
        return out;
    }, [filtered]);

    return (
        <div>
            <div className="tm-nl-search">
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search issues"
                    aria-label="Search issues"
                    className="tm-nl-input"
                />
            </div>
            <div className="tm-nl-filters" role="group" aria-label="Filter by topic">
                {topics.map((t) => (
                    <button
                        key={t}
                        type="button"
                        aria-pressed={activeTags.has(t)}
                        onClick={() => toggleTag(t)}
                        className={activeTags.has(t) ? 'tm-nl-tag tm-nl-tag-active' : 'tm-nl-tag'}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {grouped.length === 0 ? (
                <div className="tm-nl-empty">
                    <p style={{ margin: 0, fontWeight: 600, color: '#F8FAFC' }}>
                        No issues match this topic yet.
                    </p>
                    <p style={{ margin: '8px 0 0' }}>
                        Subscribe to get the next one.
                    </p>
                    <p style={{ margin: '18px 0 0' }}>
                        <Link href="/newsletter" className="tm-nl-btn tm-nl-btn-primary" style={{ textDecoration: 'none' }}>
                            Subscribe
                        </Link>
                    </p>
                </div>
            ) : (
                grouped.map((g) => (
                    <section key={g.month}>
                        <h2 className="tm-nl-month">{g.month}</h2>
                        <div className="tm-nl-issuelist">
                            {g.rows.map((i) => (
                                <Link key={i.slug} href={i.href} className="tm-nl-card tm-nl-issuecard">
                                    <p className="tm-nl-meta">
                                        Issue {i.number} · {i.dateLabel} · {i.readTime}
                                    </p>
                                    <h3 className="tm-nl-issue-title">{i.title}</h3>
                                    <p className="tm-nl-issue-excerpt">{i.excerpt}</p>
                                    <span className="tm-nl-issuetags">
                                        {i.tags.map((t) => (
                                            <span key={t} className="tm-nl-tag">{t}</span>
                                        ))}
                                    </span>
                                    <span className="tm-nl-readbtn">Read issue</span>
                                </Link>
                            ))}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
