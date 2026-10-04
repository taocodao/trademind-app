'use client';

/**
 * Unsubscribe runs automatically when the page loads: click the link in the
 * email and the success confirmation is what you see. Mail scanners only GET
 * the page HTML, so auto-running the POST on mount is safe.
 */
import { useEffect, useRef, useState } from 'react';

const REASONS: { value: string; label: string }[] = [
    { value: 'too_frequent', label: 'Too many emails' },
    { value: 'not_relevant', label: 'Not relevant to me' },
    { value: 'too_advanced', label: 'Too advanced' },
    { value: 'too_basic', label: 'Too basic' },
    { value: 'never_signed_up', label: 'I never signed up' },
    { value: 'other', label: 'Something else' },
];

function ExitSurvey({ token }: { token: string }) {
    const [reason, setReason] = useState('');
    const [note, setNote] = useState('');
    const [sent, setSent] = useState(false);
    if (sent) return <p className="tm-nl-sub">Thank you. That helps us improve.</p>;
    return (
        <div style={{ marginTop: 24 }}>
            <p className="tm-nl-sub" style={{ marginBottom: 8 }}>Optional: what could we have done better?</p>
            <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
                {REASONS.map((r) => (
                    <label key={r.value} style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
                        <input type="radio" name="reason" value={r.value} checked={reason === r.value}
                            onChange={() => setReason(r.value)} />
                        <span>{r.label}</span>
                    </label>
                ))}
            </div>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
                placeholder="Anything else? (optional)"
                style={{ width: '100%', borderRadius: 8, padding: 8, background: 'transparent', color: 'inherit', border: '1px solid rgba(255,255,255,0.2)' }} />
            <div style={{ marginTop: 10 }}>
                <button type="button" disabled={!reason} className="tm-nl-btn tm-nl-btn-secondary"
                    onClick={async () => {
                        try {
                            await fetch('/api/newsletter/unsubscribe/feedback', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ token, reason, note }),
                            });
                        } catch { /* feedback is optional */ }
                        setSent(true);
                    }}>
                    Send feedback
                </button>
            </div>
        </div>
    );
}

export default function AutoUnsubscribe({ token }: { token: string }) {
    const [state, setState] = useState<'busy' | 'done' | 'invalid' | 'error'>('busy');
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;
        if (!token) { setState('invalid'); return; }
        (async () => {
            try {
                const res = await fetch('/api/newsletter/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                setState(res.ok ? 'done' : res.status === 404 || res.status === 400 ? 'invalid' : 'error');
            } catch {
                setState('error');
            }
        })();
    }, [token]);

    if (state === 'done') {
        return (
            <div>
                <h1 className="tm-nl-h1">You are unsubscribed.</h1>
                <p className="tm-nl-sub">
                    Unsubscribe successful. You will not receive The AI Systematic Investor anymore.
                    If your 30% annual offer is still inside its window, it stays valid until it expires.
                </p>
                <a className="tm-nl-btn tm-nl-btn-secondary" href="/newsletter">
                    Back to the newsletter
                </a>
                <ExitSurvey token={token} />
            </div>
        );
    }
    if (state === 'invalid') {
        return (
            <div>
                <h1 className="tm-nl-h1">We could not match this link.</h1>
                <p className="tm-nl-sub">
                    The link may be incomplete or from a test message. Reply to any issue
                    and we will take you off the list.
                </p>
                <a className="tm-nl-btn tm-nl-btn-secondary" href="/newsletter">
                    Back to the newsletter
                </a>
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div>
                <h1 className="tm-nl-h1">Something went wrong.</h1>
                <p className="tm-nl-sub">
                    Nothing was changed. Please reload this page to try again, or reply to
                    any issue and we will take you off the list.
                </p>
                <a className="tm-nl-btn tm-nl-btn-secondary" href="/newsletter">
                    Back to the newsletter
                </a>
            </div>
        );
    }
    return (
        <div>
            <h1 className="tm-nl-h1">Unsubscribing...</h1>
            <p className="tm-nl-sub">One moment please.</p>
        </div>
    );
}
