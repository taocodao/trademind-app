'use client';

/**
 * Newsletter signup: email + optional experience level + consent checkbox.
 * Captures UTM and referral parameters for attribution, carries a honeypot
 * field for bots, and offers resend plus a wrong-email path after submit.
 * On submit the server stores a pending subscriber and emails a
 * confirmation link (double opt-in).
 */
import { useState } from 'react';
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

export default function SignupForm({ source, initialEmail, implicitConsent = false, outreachToken = '', nextPath = '', cadence: cadenceProp = 'weekly' }: { source: string; initialEmail?: string; implicitConsent?: boolean; outreachToken?: string; nextPath?: string; cadence?: 'weekly' | 'daily' | 'both' }) {
    const [email, setEmail] = useState(initialEmail ?? '');
    const [wantWeekly, setWantWeekly] = useState(cadenceProp !== 'daily');
    const [wantDaily, setWantDaily] = useState(cadenceProp !== 'weekly');
    const cadence: 'weekly' | 'daily' | 'both' = wantWeekly && wantDaily ? 'both' : wantDaily ? 'daily' : 'weekly';
    const [experience, setExperience] = useState('');
    // The consent sentence sits under the button, so there is no checkbox.
    const consent = true;
    const [honeypot, setHoneypot] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<'pending' | 'already' | 'subscribed' | null>(null);
    const [changeUrl, setChangeUrl] = useState<string | null>(null);
    const [showShare, setShowShare] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
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
                setDone(data.status === 'already-confirmed' ? 'already' : data.status === 'subscribed' ? 'subscribed' : 'pending');
                if (nextPath && (data.status === 'subscribed' || data.status === 'already-confirmed')) {
                    setTimeout(() => {
                        window.location.href = `${nextPath}${nextPath.includes('?') ? '&' : '?'}email=${encodeURIComponent(email)}&sub=1`;
                    }, 1600);
                }
                setChangeUrl(data.changeUrl ?? null);
                trackNewsletter('signup_submitted', { source, experience: experience || null });
            }
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    }

    async function resend() {
        await submit(new Event('submit') as unknown as React.FormEvent);
    }

    if (done) {
        return (
            <div className="tm-nlsignup-done">
                {done === 'subscribed' ? (
                    <p className="tm-nlsignup-done-msg">You are subscribed. Your first issue is on its way, so check your inbox (and the Promotions or Spam folder the first time).</p>
                ) : done === 'pending' ? (
                    <>
                        <p className="tm-nlsignup-done-msg">Check your inbox to confirm and unlock 30% off.</p>
                        <p className="tm-nl-muted" style={{ fontSize: 13.5, margin: '0 0 12px' }}>
                            Nothing arrived?{' '}
                            <button type="button" onClick={resend} className="tm-nl-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                                Resend the confirmation email
                            </button>
                            {changeUrl && (
                                <>
                                    {' · '}
                                    <a href={changeUrl} className="tm-nl-link">Wrong email?</a>
                                </>
                            )}
                        </p>
                    </>
                ) : (
                    <p className="tm-nlsignup-done-msg">You are already subscribed. The next issue lands in your inbox.</p>
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
        <form className="tm-nlsignup" onSubmit={submit}>
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
            <fieldset className="tm-nl-cadence" style={{ border: 'none', padding: 0, margin: '2px 0 4px' }}>
                <legend className="tm-nl-muted" style={{ fontSize: 13.5, padding: 0, marginBottom: 6 }}>What would you like to receive?</legend>
                {([['Weekly', 'one issue a week', wantWeekly, setWantWeekly, wantDaily], ['Daily', 'a short brief every market day', wantDaily, setWantDaily, wantWeekly]] as const).map(([label, hint, on, set, other]) => (
                    <label key={label} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '4px 0', fontSize: 14.5, cursor: 'pointer' }}>
                        <input type="checkbox" checked={on} onChange={(e) => set(e.target.checked || !other)} />
                        <span><strong>{label}</strong> <span className="tm-nl-muted">{hint}</span></span>
                    </label>
                ))}
                <span className="tm-nl-muted" style={{ fontSize: 12.5 }}>Check both to get both. At least one stays selected.</span>
            </fieldset>
            {error && <p className="tm-nl-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy} className="tm-nl-btn tm-nl-btn-primary">
                {busy ? 'Subscribing...' : 'Subscribe'}
            </button>
            <p className="tm-nl-consent" style={{ margin: '4px 0 0' }}>
                By subscribing you agree to receive The AI Systematic Investor and TradeMind offers. Unsubscribe any time.
            </p>
        </form>
    );
}
