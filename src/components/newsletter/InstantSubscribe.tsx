'use client';

/**
 * "Subscribe with your own email" for the web page version of issues and the
 * 30% offer block. Instant mode: no confirmation email. The address is added
 * to the list and issue 1 goes out right away (the server skips the welcome
 * email for this path). Two instances on one page stay in sync: a success in
 * one shows the same confirmation in the other.
 */
import { useEffect, useState } from 'react';
import { trackNewsletter } from './track';

type Props = {
    variant: 'bar' | 'offer';
    /** Where the signup came from, stored as the subscriber source detail. */
    source: string;
    issueSlug?: string;
};

type Done = { email: string; returning: boolean; already: boolean };
const EVENT = 'tm-nl-subscribed';

function attribution() {
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    return {
        medium: p.get('utm_medium'),
        campaign: p.get('utm_campaign'),
        referralId: p.get('ref'),
    };
}

export default function InstantSubscribe({ variant, source, issueSlug }: Props) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [honeypot, setHoneypot] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<Done | null>(null);

    useEffect(() => {
        const onDone = (e: Event) => setDone((e as CustomEvent<Done>).detail);
        window.addEventListener(EVENT, onDone);
        return () => window.removeEventListener(EVENT, onDone);
    }, []);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy || !email.trim()) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    consent: true, // the notice under the button is the consent
                    instant: true,
                    skipWelcome: true,
                    website: honeypot,
                    source,
                    referringIssue: issueSlug ?? null,
                    ...attribution(),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error ?? 'Something went wrong. Try again.');
            } else {
                const detail: Done = {
                    email: email.trim(),
                    returning: data.returning === true,
                    already: data.status === 'already-confirmed',
                };
                trackNewsletter('signup_submitted', { source, instant: true });
                setDone(detail);
                window.dispatchEvent(new CustomEvent<Done>(EVENT, { detail }));
            }
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    }

    if (done) {
        return (
            <div className={`tm-nl-own tm-nl-own-${variant} tm-nl-own-ok`} role="status">
                {done.already ? (
                    <>You are already subscribed. Your next issue arrives on schedule.</>
                ) : done.returning ? (
                    <><strong>Welcome back.</strong> Issue 1 is on its way to {done.email}.</>
                ) : (
                    <>
                        <strong>You are subscribed.</strong> Issue 1 is on its way to {done.email}.
                        Check your inbox in a minute. If you do not see it, check Spam or Promotions and mark it Not spam. Future issues arrive every two days.
                    </>
                )}
            </div>
        );
    }

    const lead = variant === 'bar'
        ? <>Was this forwarded to you?{' '}</>
        : <><strong>Got this from a friend?</strong>{' '}</>;
    const trigger = (
        <button type="button" className="tm-nl-own-link" onClick={() => setOpen(true)} aria-expanded={open}>
            Subscribe with your own email
        </button>
    );

    return (
        <div className={`tm-nl-own tm-nl-own-${variant}`}>
            <div className="tm-nl-own-row">
                <span>
                    {lead}{trigger}
                    {variant === 'offer' && <> to get the 30% off for your address.</>}
                </span>
                {variant === 'bar' && !open && (
                    <span className="tm-nl-own-side">Free. First issue arrives right away.</span>
                )}
            </div>
            {open && (
                <form onSubmit={submit} className="tm-nl-own-form">
                    <input
                        type="email" required autoFocus value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com" aria-label="Your email address"
                        className="tm-nl-own-input"
                    />
                    {/* Honeypot: invisible to people, filled by bots. */}
                    <input
                        type="text" tabIndex={-1} autoComplete="off" aria-hidden="true"
                        value={honeypot} onChange={(e) => setHoneypot(e.target.value)}
                        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                    />
                    <button type="submit" disabled={busy} className="tm-nl-btn tm-nl-btn-primary tm-nl-own-btn">
                        {busy ? 'Subscribing...' : 'Subscribe'}
                    </button>
                    <p className="tm-nl-own-fine">
                        By subscribing you agree to receive The AI Systematic Investor by email.
                        Unsubscribe anytime. Educational content, not investment advice.
                    </p>
                    {error && <p className="tm-nl-own-err" role="alert">{error}</p>}
                </form>
            )}
        </div>
    );
}
