'use client';

/** "Check my eligibility" field for the offer terms page. */
import { useState } from 'react';

interface EligibilityResponse {
    state: 'eligible' | 'pending' | 'expired' | 'not-found';
    until?: string;
}

export default function EligibilityChecker() {
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<EligibilityResponse | null>(null);

    async function check(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setResult(null);
        try {
            const res = await fetch(`/api/newsletter/eligibility?email=${encodeURIComponent(email)}`);
            setResult(await res.json());
        } catch {
            setResult({ state: 'not-found' });
        } finally {
            setBusy(false);
        }
    }

    const message = (() => {
        if (!result) return null;
        switch (result.state) {
            case 'eligible':
                return `Eligible until ${new Date(result.until!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
            case 'pending':
                return 'Pending confirmation. Check your inbox for the confirmation email.';
            case 'expired':
                return 'Expired. The 3-month offer window has passed for this address.';
            default:
                return 'Not found. This address is not on the newsletter list yet.';
        }
    })();

    return (
        <form className="tm-nlsignup" onSubmit={check}>
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className="tm-nl-input"
            />
            <button type="submit" disabled={busy} className="tm-nl-btn tm-nl-btn-primary">
                {busy ? 'Checking...' : 'Check my eligibility'}
            </button>
            {message && (
                <p className={`tm-nl-elig tm-nl-elig-${result?.state ?? 'not-found'}`} role="status">
                    {message}
                </p>
            )}
        </form>
    );
}
