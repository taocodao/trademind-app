'use client';

/**
 * Unsubscribe runs automatically when the page loads: click the link in the
 * email and the success confirmation is what you see. Mail scanners only GET
 * the page HTML, so auto-running the POST on mount is safe.
 */
import { useEffect, useRef, useState } from 'react';

export default function AutoUnsubscribe({ token }: { token: string }) {
    const [state, setState] = useState<'busy' | 'done' | 'missing'>('busy');
    const ran = useRef(false);

    useEffect(() => {
        if (ran.current) return;
        ran.current = true;
        if (!token) { setState('missing'); return; }
        (async () => {
            try {
                const res = await fetch('/api/newsletter/unsubscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token }),
                });
                setState(res.ok ? 'done' : 'missing');
            } catch {
                setState('missing');
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
            </div>
        );
    }
    if (state === 'missing') {
        return (
            <div>
                <h1 className="tm-nl-h1">This link has already been used.</h1>
                <p className="tm-nl-sub">
                    If you still get the newsletter after a few days, reply to any issue
                    and we will take you off the list.
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
