'use client';

/**
 * Unsubscribe runs automatically when the page loads: click the link in the
 * email and the success confirmation is what you see. Mail scanners only GET
 * the page HTML, so auto-running the POST on mount is safe.
 */
import { useEffect, useRef, useState } from 'react';

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
