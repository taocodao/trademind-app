'use client';

/**
 * Newsletter signup: email + optional experience level.
 * Captures UTM and referral parameters for attribution, carries a honeypot
 * field for bots, and offers resend plus a wrong-email path after submit.
 * Two buttons, Subscribe weekly and Subscribe daily. Pressing one subscribes at once (no confirmation
 * step) and goes to the thank-you page, which points to the current issue.
 */
import { useRef, useState } from 'react';
import { trackNewsletter } from './track';
import NewsletterShare from './NewsletterShare';

const EXPERIENCE_LEVELS = [
    { value: '', label: 'Experience level (optional)' },
    { value: 'new', label: 'New to options' },
    { value: 'intermediate', label: 'Some options experience' },
    { value: 'advanced', label: 'Experienced options trader' },
];

function attribution() {
    if (typeof window === 'undefined') return {};
    const p = new URLSearchParams(window.location.search);
    return {
        medium: p.get('utm_medium'),
        campaign: p.get('utm_campaign'),
        referralId: p.get('ref'),
        referringIssue: p.get('utm_campaign'),
        outreachToken: p.get('t'),
    };
}

export default function SignupForm({ source, initialEmail, implicitConsent = false, outreachToken = '', nextPath = '', cadence: _cadenceHint = 'weekly' }: { source: string; initialEmail?: string; implicitConsent?: boolean; outreachToken?: string; nextPath?: string; cadence?: 'weekly' | 'daily' | 'both' }) {
    const [email, setEmail] = useState(initialEmail ?? '');
    const [experience, setExperience] = useState('');
    // The consent sentence sits under the button, so there is no checkbox.
    const consent = true;
    const [honeypot, setHoneypot] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<'already' | 'subscribed' | null>(null);
    const [showShare, setShowShare] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(cadence: 'weekly' | 'daily') {
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    experience: experience || null,
                    consent,
                    website: honeypot, // honeypot; always empty for humans
                    source,
                    cadence,
                    ...attribution(),
                    ...(outreachToken ? { outreachToken } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error ?? 'Something went wrong. Try again.');
            } else {
                const instantDone = data.status === 'subscribed' || data.status === 'already-confirmed';
                if (instantDone && !nextPath && data.redirect) { window.location.href = data.redirect; return; }
                setDone(data.status === 'already-confirmed' ? 'already' : 'subscribed');
                if (nextPath && (data.status === 'subscribed' || data.status === 'already-confirmed')) {
                    setTimeout(() => {
                        window.location.href = `${nextPath}${nextPath.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}&sub=1`;
                    }, 1600);
                }
                trackNewsletter('signup_submitted', { source, experience: experience || null });
            }
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    }

    // The browser's own email check runs when a button is pressed.
    const formRef = useRef<HTMLFormElement | null>(null);
    function formOk() { return formRef.current ? formRef.current.reportValidity() : true; }

    if (done) {
        return (
            <div className="tm-nlsignup-done">
                {done === 'subscribed' ? (
                    <p className="tm-nlsignup-done-msg">You are subscribed. A link to the current issue is on its way to your inbox.</p>
                ) : (
                    <p className="tm-nlsignup-done-msg">You are already subscribed.</p>
                )}
                {!showShare ? (
                    <button type="button" className="tm-nl-btn tm-nl-btn-ghost" onClick={() => setShowShare(true)}>
                        Spread the word
                    </button>
                ) : (
                    <div className="tm-nlshare-panel">
                        <NewsletterShare
                            title="The AI Systematic Investor"
                            summary="Weekly research on QQQ, LEAPS, PMCC, and risk control, with every rule and result published."
                            path="/newsletter"
                            slug="newsletter"
                        />
                        <button type="button" className="tm-nl-btn tm-nl-btn-ghost" onClick={() => setShowShare(false)}>
                            Maybe later
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <form ref={formRef} className="tm-nlsignup" onSubmit={(e) => e.preventDefault()}>
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => trackNewsletter('signup_started', { source })}
                placeholder="you@example.com"
                aria-label="Email address"
                className="tm-nl-input"
            />
            {/* Honeypot: visually hidden, bots fill it, server silently accepts-and-drops */}
            <input
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
            />
            <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                aria-label="Experience level (optional)"
                className="tm-nl-input"
            >
                {EXPERIENCE_LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                ))}
            </select>
            {error && <p className="tm-nl-error" role="alert">{error}</p>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" disabled={busy} onClick={() => { if (formOk()) void submit('weekly'); }} className="tm-nl-btn tm-nl-btn-primary">
                    {busy ? 'Subscribing...' : 'Subscribe free'}
                </button>
            </div>
            <p className="tm-nl-consent" style={{ margin: '4px 0 0' }}>
                By subscribing you agree to receive The AI Systematic Investor and TradeMind offers. Unsubscribe any time.
            </p>
        </form>
    );
}
