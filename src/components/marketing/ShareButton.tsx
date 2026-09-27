'use client';

/**
 * Header Share button (replaces the Demo tour entry, Sep 2026).
 * Opens a small popover: native share sheet when available, copy link,
 * social targets, and a newsletter email capture that uses the same
 * /api/newsletter/subscribe pipeline as the pricing section.
 */
import { useEffect, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';

const SITE_URL = 'https://trademind.bot';
const SHARE_TITLE = 'TradeMind: signals with discipline, priced and logged before you act';

export default function ShareButton() {
    const [open, setOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [nlEmail, setNlEmail] = useState('');
    const [nlBusy, setNlBusy] = useState(false);
    const [nlMsg, setNlMsg] = useState<string | null>(null);
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

    const enc = encodeURIComponent;
    const url = SITE_URL;
    const links: Record<string, string> = {
        X: `https://twitter.com/intent/tweet?text=${enc(SHARE_TITLE)}&url=${enc(url + '?utm_source=x&utm_medium=share')}`,
        LinkedIn: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url + '?utm_source=linkedin&utm_medium=share')}`,
        Facebook: `https://www.facebook.com/sharer/sharer.php?u=${enc(url + '?utm_source=facebook&utm_medium=share')}`,
        Email: `mailto:?subject=${enc('TradeMind')}&body=${enc(SHARE_TITLE + '\n\n' + url + '?utm_source=email&utm_medium=share')}`,
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(url + '?utm_source=copy_link&utm_medium=share');
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* clipboard unavailable */ }
    };

    const nativeShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({ title: 'TradeMind', text: SHARE_TITLE, url: url + '?utm_source=message&utm_medium=share' });
                setOpen(false);
            } catch { /* dismissed */ }
        }
    };

    const subscribe = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = nlEmail.trim();
        if (nlBusy || !email.includes('@')) return;
        setNlBusy(true);
        setNlMsg(null);
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, consent: true, source: 'header-share' }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(d.error || 'Subscription failed');
            setNlMsg(d.status === 'already-confirmed' ? 'You are already subscribed.' : 'Subscribed. Watch your inbox for the weekly issue.');
            setNlEmail('');
        } catch (err) {
            setNlMsg(err instanceof Error ? err.message : 'Subscription failed');
        } finally {
            setNlBusy(false);
        }
    };

    const monoBtn: React.CSSProperties = {
        display: 'block', width: '100%', textAlign: 'left', padding: '0.45rem 0.75rem',
        borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#E5E7EB',
        background: 'transparent', border: 'none', cursor: 'pointer',
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-label="Share TradeMind"
                className="tm-mh-btn tm-mh-demo"
                style={{
                    border: '1.5px solid #A78BFA',
                    color: '#C4B5FD',
                    background: 'transparent',
                    cursor: 'pointer',
                }}
            >
                <Share2 className="w-4 h-4" style={{ color: '#A78BFA' }} />
                <span className="hidden sm:inline">Share</span>
            </button>

            {open && (
                <div
                    className="absolute left-0 top-12 w-64 rounded-xl p-3 shadow-2xl"
                    style={{ background: '#14141f', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                        <button type="button" onClick={nativeShare} style={{ ...monoBtn, color: '#C4B5FD', fontWeight: 700 }}>
                            Share via apps
                        </button>
                    )}
                    <button type="button" onClick={copyLink} style={monoBtn}>
                        {copied ? 'Link copied' : 'Copy link'}
                    </button>
                    <button type="button" onClick={() => window.open(links.X, '_blank', 'noopener,noreferrer')} style={monoBtn}>X</button>
                    <button type="button" onClick={() => window.open(links.LinkedIn, '_blank', 'noopener,noreferrer')} style={monoBtn}>LinkedIn</button>
                    <button type="button" onClick={() => window.open(links.Facebook, '_blank', 'noopener,noreferrer')} style={monoBtn}>Facebook</button>
                    <button type="button" onClick={() => { window.location.href = links.Email; }} style={monoBtn}>Email</button>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 10, paddingTop: 10 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', margin: '0 0 6px 2px' }}>
                            Get the weekly newsletter
                        </p>
                        <form onSubmit={subscribe}>
                            <input
                                type="email"
                                required
                                value={nlEmail}
                                onChange={(e) => setNlEmail(e.target.value)}
                                placeholder="you@example.com"
                                style={{
                                    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: 13,
                                    background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.12)',
                                    color: '#FFFFFF', outline: 'none', marginBottom: 6, boxSizing: 'border-box',
                                }}
                            />
                            <button
                                type="submit"
                                disabled={nlBusy}
                                style={{
                                    width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: 13,
                                    fontWeight: 700, background: '#8B5CF6', color: '#FFFFFF', border: 'none',
                                    cursor: nlBusy ? 'default' : 'pointer', opacity: nlBusy ? 0.6 : 1,
                                }}
                            >
                                {nlBusy ? 'Subscribing...' : 'Subscribe'}
                            </button>
                        </form>
                        {nlMsg && <p style={{ fontSize: 11, color: '#9AA3B5', margin: '6px 2px 0' }}>{nlMsg}</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
