'use client';

/** Consumes ?token= on /newsletter/confirm and shows the outcome. */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import NewsletterShare from './NewsletterShare';

type State =
    | { kind: 'loading' }
    | { kind: 'confirmed'; email: string; offerExpires: string }
    | { kind: 'expired'; email?: string }
    | { kind: 'invalid' };

export default function ConfirmClient({ token }: { token: string }) {
    const [state, setState] = useState<State>({ kind: 'loading' });

    useEffect(() => {
        if (!token) {
            setState({ kind: 'invalid' });
            return;
        }
        fetch('/api/newsletter/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        })
            .then(async (res) => {
                const data = await res.json();
                if (data.outcome === 'confirmed' || data.outcome === 'already-confirmed') {
                    setState({ kind: 'confirmed', email: data.email, offerExpires: data.offerExpires });
                } else if (data.outcome === 'expired') {
                    setState({ kind: 'expired', email: data.email });
                } else {
                    setState({ kind: 'invalid' });
                }
            })
            .catch(() => setState({ kind: 'invalid' }));
    }, [token]);

    if (state.kind === 'loading') {
        return <p className="tm-nl-muted">Confirming your subscription...</p>;
    }

    if (state.kind === 'confirmed') {
        const until = state.offerExpires
            ? new Date(state.offerExpires).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
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
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                    <Link href="/upgrade" className="tm-nl-btn tm-nl-btn-primary" style={{ textDecoration: 'none' }}>
                        Claim 30% off now
                    </Link>
                    <Link
                        href="/newsletter/issues/2026-08-05-process-before-prediction"
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
                    Confirmation links are valid for 7 days.{' '}
                    <Link href="/newsletter" className="tm-nl-link">Subscribe again</Link> with the same
                    address to get a fresh link.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="tm-nl-h1">This link is not valid.</h1>
            <p className="tm-nl-sub">
                It may have already been replaced by a newer one. Check your inbox for the latest
                confirmation email, or <Link href="/newsletter" className="tm-nl-link">subscribe again</Link>.
            </p>
        </div>
    );
}
