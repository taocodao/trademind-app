'use client';

/**
 * Confirmation page, scanner-safe: loading ?token= only previews (GET).
 * The subscription confirms only when the person presses the button (POST).
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import NewsletterShare from './NewsletterShare';

type State =
    | { kind: 'loading' }
    | { kind: 'ready'; email: string }
    | { kind: 'confirming' }
    | { kind: 'confirmed'; offerExpires: string | null; code: string | null }
    | { kind: 'expired'; email?: string }
    | { kind: 'resent' }
    | { kind: 'invalid' };

export default function ConfirmClient({ token }: { token: string }) {
    const [state, setState] = useState<State>({ kind: 'loading' });

    useEffect(() => {
        if (!token) {
            setState({ kind: 'invalid' });
            return;
        }
        fetch(`/api/newsletter/confirm?token=${encodeURIComponent(token)}`)
            .then(async (res) => {
                const data = await res.json();
                if (data.valid) setState({ kind: 'ready', email: data.email ?? '' });
                else if (data.expired) setState({ kind: 'expired', email: data.email });
                else setState({ kind: 'invalid' });
            })
            .catch(() => setState({ kind: 'invalid' }));
    }, [token]);

    async function confirm() {
        setState({ kind: 'confirming' });
        try {
            const res = await fetch('/api/newsletter/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const data = await res.json();
            if (data.outcome === 'confirmed' || data.outcome === 'already-confirmed') {
                setState({ kind: 'confirmed', offerExpires: data.offerExpires ?? null, code: data.code ?? null });
            } else if (data.outcome === 'expired') {
                setState({ kind: 'expired', email: data.email });
            } else {
                setState({ kind: 'invalid' });
            }
        } catch {
            setState({ kind: 'invalid' });
        }
    }

    async function resend() {
        setState({ kind: 'loading' });
        try {
            const res = await fetch('/api/newsletter/confirm', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            setState(res.ok ? { kind: 'resent' } : { kind: 'invalid' });
        } catch {
            setState({ kind: 'invalid' });
        }
    }

    if (state.kind === 'loading' || state.kind === 'confirming') {
        return <p className="tm-nl-muted">{state.kind === 'confirming' ? 'Confirming...' : 'Loading...'}</p>;
    }

    if (state.kind === 'ready') {
        return (
            <div>
                <h1 className="tm-nl-h1">Confirm your subscription.</h1>
                <p className="tm-nl-sub">
                    One click confirms <strong>{state.email}</strong> for The AI Systematic Investor and
                    starts your 90-day 30% annual offer.
                </p>
                <button type="button" onClick={confirm} className="tm-nl-btn tm-nl-btn-primary">
                    Confirm my subscription
                </button>
            </div>
        );
    }

    if (state.kind === 'confirmed') {
        const until = state.offerExpires
            ? new Date(state.offerExpires).toLocaleDateString('en-US', {
                  month: 'long', day: 'numeric', year: 'numeric',
              })
            : null;
        return (
            <div>
                <h1 className="tm-nl-h1">You are confirmed.</h1>
                <p className="tm-nl-sub">
                    {until
                        ? `Your 30% annual offer is valid until ${until}.`
                        : 'Your 30% annual offer is now active.'}
                </p>
                {state.code && (
                    <p className="tm-nl-sub" style={{ fontSize: 15 }}>
                        Your personal code: <strong style={{ letterSpacing: '0.06em' }}>{state.code}</strong>{' '}
                        (also in your welcome email)
                    </p>
                )}
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                    <Link href="/upgrade" className="tm-nl-btn tm-nl-btn-primary" style={{ textDecoration: 'none' }}>
                        View your offer
                    </Link>
                    <Link
                        href="/newsletter/issues/2026-08-06-why-most-investors-need-a-process"
                        className="tm-nl-btn tm-nl-btn-ghost"
                        style={{ textDecoration: 'none' }}
                    >
                        Start with Issue 1
                    </Link>
                </div>
                <h2 className="tm-nl-h2">Share the letter</h2>
                <NewsletterShare
                    title="The AI Systematic Investor"
                    summary="Weekly research on QQQ, LEAPS, PMCC, and risk control, with every rule and result published."
                    path="/newsletter"
                    slug="newsletter"
                />
            </div>
        );
    }

    if (state.kind === 'expired') {
        return (
            <div>
                <h1 className="tm-nl-h1">This confirmation link expired.</h1>
                <p className="tm-nl-sub">
                    Confirmation links are valid for 7 days. Send yourself a fresh one below.
                </p>
                <button type="button" onClick={resend} className="tm-nl-btn tm-nl-btn-primary">
                    Send a new link
                </button>
            </div>
        );
    }

    if (state.kind === 'resent') {
        return (
            <div>
                <h1 className="tm-nl-h1">A new link is on its way.</h1>
                <p className="tm-nl-sub">Check your inbox for a fresh confirmation email.</p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="tm-nl-h1">This link is not valid.</h1>
            <p className="tm-nl-sub">
                It may have already been used or replaced by a newer one. Check your inbox for the latest
                confirmation email, or <Link href="/newsletter" className="tm-nl-link">subscribe again</Link>.
            </p>
        </div>
    );
}
