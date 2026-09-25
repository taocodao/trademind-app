'use client';

/**
 * Newsletter share component (matches the reference layout):
 * preview card on top, primary buttons always visible, More menu with the
 * long tail of platforms. Every shared URL carries ref + utm parameters.
 */
import { useEffect, useRef, useState } from 'react';
import { trackNewsletter } from './track';

interface ShareProps {
    title: string;
    summary: string;
    /** Canonical path, e.g. /newsletter/issues/2026-09-16-... */
    path: string;
    slug: string;
    compact?: boolean;
    subscriberRef?: string;
}

const BASE = 'https://trademind.bot';

function buildUrl(p: ShareProps): string {
    const url = new URL(BASE + p.path);
    if (p.subscriberRef) url.searchParams.set('ref', p.subscriberRef);
    url.searchParams.set('utm_medium', 'share');
    url.searchParams.set('utm_campaign', p.slug);
    return url.toString();
}

function withSource(u: string, platform: string): string {
    const url = new URL(u);
    url.searchParams.set('utm_source', platform);
    return url.toString();
}

export default function NewsletterShare(props: ShareProps) {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        const onClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, [open]);

    const url = buildUrl(props);
    const share = (platform: string, href?: string) => {
        trackNewsletter('share_clicked', { platform, slug: props.slug });
        if (href) window.open(href, '_blank', 'noopener,noreferrer');
    };

    const copyLink = async () => {
        trackNewsletter('share_clicked', { platform: 'copy', slug: props.slug });
        try {
            await navigator.clipboard.writeText(withSource(url, 'copy_link'));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable */ }
    };

    const enc = encodeURIComponent;
    const text = `${props.title} - The AI Systematic Investor by TradeMind`;
    const links: Record<string, string> = {
        Facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(withSource(url, 'facebook'))}`,
        X: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(withSource(url, 'x'))}`,
        LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(withSource(url, 'linkedin'))}`,
        Email: `mailto:?subject=${enc(text)}&body=${enc(props.summary + '\n\n' + withSource(url, 'email'))}`,
        Bluesky: `https://bsky.app/intent/compose?text=${enc(text + ' ' + withSource(url, 'bluesky'))}`,
        Reddit: `https://www.reddit.com/submit?url=${enc(withSource(url, 'reddit'))}&title=${enc(props.title)}`,
        Pinterest: `https://pinterest.com/pin/create/button/?url=${enc(withSource(url, 'pinterest'))}&description=${enc(text)}`,
        'Hacker News': `https://news.ycombinator.com/submitlink?u=${enc(withSource(url, 'hackernews'))}&t=${enc(props.title)}`,
    };

    const nativeShare = async () => {
        trackNewsletter('share_clicked', { platform: 'message', slug: props.slug });
        if (navigator.share) {
            try {
                await navigator.share({ title: props.title, text: props.summary, url: withSource(url, 'message') });
            } catch { /* dismissed */ }
        }
        setOpen(false);
    };

    const copyEmbed = async () => {
        trackNewsletter('share_clicked', { platform: 'embed', slug: props.slug });
        const snippet = `<iframe src="${BASE}${props.path}" title="${props.title.replace(/"/g, '')}" width="100%" height="480" style="border:1px solid #232333;border-radius:12px"></iframe>`;
        try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable */ }
        setOpen(false);
    };

    const saveBookmark = () => {
        trackNewsletter('share_clicked', { platform: 'save', slug: props.slug });
        copyLink();
    };

    const cls = props.compact ? 'tm-nlshare tm-nlshare-compact' : 'tm-nlshare';

    return (
        <div className={cls} ref={menuRef}>
            {!props.compact && (
                <div className="tm-nlshare-card">
                    <img src="/logo.png" alt="TradeMind" className="tm-nlshare-logo" />
                    <div>
                        <p className="tm-nlshare-name">The AI Systematic Investor</p>
                        <p className="tm-nlshare-by">by TradeMind</p>
                        <p className="tm-nlshare-desc">Weekly research on QQQ, LEAPS, PMCC, and risk control with transparent rules.</p>
                    </div>
                </div>
            )}
            <div className="tm-nlshare-row">
                <button type="button" aria-label="Copy link" onClick={copyLink} className="tm-nlshare-btn">
                    {copied ? 'Link copied' : 'Copy link'}
                </button>
                <button type="button" aria-label="Share on Facebook" onClick={() => share('facebook', links.Facebook)} className="tm-nlshare-btn">Facebook</button>
                <button type="button" aria-label="Share by email" onClick={() => share('email', links.Email)} className="tm-nlshare-btn">Email</button>
                <button type="button" aria-label="Save bookmark" onClick={saveBookmark} className="tm-nlshare-btn">Save</button>
                <div className="tm-nlshare-more-wrap">
                    <button
                        type="button"
                        aria-label="More share options"
                        aria-expanded={open}
                        onClick={() => setOpen((v) => !v)}
                        className="tm-nlshare-btn"
                    >
                        More
                    </button>
                    {open && (
                        <div className="tm-nlshare-menu" role="menu">
                            <button type="button" role="menuitem" aria-label="Share on Bluesky" onClick={() => { share('bluesky', links.Bluesky); setOpen(false); }}>Bluesky</button>
                            <button type="button" role="menuitem" aria-label="Share on X" onClick={() => { share('x', links.X); setOpen(false); }}>X</button>
                            <button type="button" role="menuitem" aria-label="Share on LinkedIn" onClick={() => { share('linkedin', links.LinkedIn); setOpen(false); }}>LinkedIn</button>
                            <button type="button" role="menuitem" aria-label="Share on Reddit" onClick={() => { share('reddit', links.Reddit); setOpen(false); }}>Reddit</button>
                            <button type="button" role="menuitem" aria-label="Share on Pinterest" onClick={() => { share('pinterest', links.Pinterest); setOpen(false); }}>Pinterest</button>
                            <button type="button" role="menuitem" aria-label="Share on Hacker News" onClick={() => { share('hackernews', links['Hacker News']); setOpen(false); }}>Hacker News</button>
                            <button type="button" role="menuitem" aria-label="Send as message" onClick={nativeShare}>Send as message</button>
                            <button type="button" role="menuitem" aria-label="Copy embed code" onClick={copyEmbed}>Embed</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
