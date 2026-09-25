'use client';

/**
 * Change-email flow: the original pending email gets invalidated and the
 * replacement address receives its own confirmation link. The 3-month offer
 * window starts at the new confirmation.
 */
import { useEffect, useState } from 'react';

type State =
    | { kind: 'loading' }
    | { kind: 'ready'; currentEmail: string }
    | { kind: 'done'; newEmail: string }
    | { kind: 'invalid'; message: string };

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
                if (!res.ok) {
                    setState({ kind: 'invalid', message: 'This link is not valid or has already been used.' });
                } else if (data.status === 'confirmed') {
                    setState({ kind: 'invalid', message: `${data.email} is already confirmed, so it cannot be changed here.` });
                } else {
                    setState({ kind: 'ready', currentEmail: data.email });
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
            else setState({ kind: 'done', newEmail: data.email });
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
                    The original address has been invalidated. Your 3-month offer window starts when the
                    new address is confirmed.
                </p>
            </div>
        );
    }

    return (
        <div>
            <h1 className="tm-nl-h1">Use a different email address.</h1>
            <p className="tm-nl-sub">
                You signed up with <strong>{state.currentEmail}</strong>, which is still pending
                confirmation. Enter the address you want to use instead.
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
