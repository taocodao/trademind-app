'use client';

/**
 * Newsletter signup: email + optional experience level + consent checkbox.
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

export default function SignupForm({ source }: { source: string }) {
    const [email, setEmail] = useState('');
    const [experience, setExperience] = useState('');
    const [consent, setConsent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(false);
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
                body: JSON.stringify({ email, experience: experience || null, consent }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data?.error ?? 'Something went wrong. Try again.');
            } else {
                setDone(true);
                trackNewsletter('signup_submitted', { source, experience: experience || null });
            }
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    }

    if (done) {
        return (
            <div className="tm-nlsignup-done">
                <p className="tm-nlsignup-done-msg">Check your inbox to confirm and unlock 30% off.</p>
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
            <label className="tm-nl-consent">
                <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                />
                <span>Send me The AI Systematic Investor and TradeMind offers</span>
            </label>
            {error && <p className="tm-nl-error" role="alert">{error}</p>}
            <button type="submit" disabled={busy || !consent} className="tm-nl-btn tm-nl-btn-primary">
                {busy ? 'Subscribing...' : 'Subscribe'}
            </button>
        </form>
    );
}
