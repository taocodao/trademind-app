'use client';

/**
 * Change-email, two flows:
 * - from-pending: the original pending address is closed, a fresh pending
 *   record carries the attribution, and the window starts at the new
 *   confirmation (nothing was ever confirmed).
 * - from-confirmed: the record moves to email_change_pending, issues keep
 *   going to the old address, the new address must confirm, and the original
 *   first-confirmation time and 90-day window never change.
 */
import { useEffect, useState } from 'react';

type State =
    | { kind: 'loading' }
    | { kind: 'ready'; flow: 'from-pending' | 'from-confirmed'; currentEmail: string }
    | { kind: 'done'; flow: 'from-pending' | 'from-confirmed'; newEmail: string }
    | { kind: 'invalid'; message: string };

function mask(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '***';
    return `${email.slice(0, 1)}***${email.slice(at)}`;
}

export default function ChangeEmailClient({ token }: { token: string }) {
    const [state, setState] = useState<State>({ kind: 'loading' });
    const [email, setEmail] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setState({ kind: 'invalid', message: 'This link is missing its token.' });
            return;
        }
        fetch(`/api/newsletter/change-email?token=${encodeURIComponent(token)}`)
            .then(async (res) => {
                const data = await res.json();
                if (!res.ok || !data.valid) {
                    setState({ kind: 'invalid', message: 'This link is not valid or has already been used.' });
                } else {
                    setState({ kind: 'ready', flow: data.flow, currentEmail: data.currentEmail });
                }
            })
            .catch(() => setState({ kind: 'invalid', message: 'Something went wrong loading this link.' }));
    }, [token]);

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/newsletter/change-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, email }),
            });
            const data = await res.json();
            if (!res.ok) setError(data?.error ?? 'Change failed. Try again.');
            else setState({ kind: 'done', flow: data.flow, newEmail: data.email ?? email });
        } catch {
            setError('Network error. Try again.');
        } finally {
            setBusy(false);
        }
    }

    if (state.kind === 'loading') return <p className="tm-nl-muted">Loading...</p>;

    if (state.kind === 'invalid') {
        return (
            <div>
                <h1 className="tm-nl-h1">This link cannot be used.</h1>
                <p className="tm-nl-sub">{state.message}</p>
            </div>
        );
    }

    if (state.kind === 'done') {
        return (
            <div>
                <h1 className="tm-nl-h1">Check {state.newEmail} to confirm.</h1>
                <p className="tm-nl-sub">
                    {state.flow === 'from-pending'
                        ? 'The original address has been invalidated. Your 90-day offer window starts when the new address is confirmed.'
                        : `Issues keep going to your current address until the new one confirms. Your original signup date and offer window stay exactly the same. A notice was sent to your old address with a "This wasn't me" link.`}
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="tm-nl-h1">Use a different email address.</h1>
            <p className="tm-nl-sub">
                {state.flow === 'from-pending' ? (
                    <>
                        You signed up with <strong>{mask(state.currentEmail)}</strong>, which is still pending
                        confirmation. Enter the address you want to use instead.
                    </>
                ) : (
                    <>
                        Your subscription currently goes to <strong>{mask(state.currentEmail)}</strong>.
                        Enter the new address. Your offer window does not restart.
                    </>
                )}
            </p>
            <form className="tm-nlsignup" onSubmit={submit}>
                <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="new@example.com"
                    aria-label="New email address"
                    className="tm-nl-input"
                />
                {error && <p className="tm-nl-error" role="alert">{error}</p>}
                <button type="submit" disabled={busy} className="tm-nl-btn tm-nl-btn-primary">
                    {busy ? 'Updating...' : 'Send confirmation to the new address'}
                </button>
            </form>
        </div>
    );
}
