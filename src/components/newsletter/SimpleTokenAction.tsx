'use client';

/**
 * Generic token-action page: load shows a button, pressing it POSTs.
 * Used for change-email complete, change-email cancel, and unsubscribe so
 * mail scanners that prefetch links never trigger the action.
 */
import { useState } from 'react';

interface Props {
    token: string;
    endpoint: string;
    heading: string;
    body: string;
    buttonLabel: string;
    successHeading: string;
    successBody: string;
}

export default function SimpleTokenAction({
    token, endpoint, heading, body, buttonLabel, successHeading, successBody,
}: Props) {
    const [state, setState] = useState<'ready' | 'busy' | 'done' | 'error'>('ready');

    async function act() {
        setState('busy');
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            setState(res.ok ? 'done' : 'error');
        } catch {
            setState('error');
        }
    }

    if (state === 'done') {
        return (
            <div>
                <h1 className="tm-nl-h1">{successHeading}</h1>
                <p className="tm-nl-sub">{successBody}</p>
            </div>
        );
    }
    if (state === 'error') {
        return (
            <div>
                <h1 className="tm-nl-h1">This link is not valid anymore.</h1>
                <p className="tm-nl-sub">It may have already been used or superseded by a newer email.</p>
            </div>
        );
    }
    return (
        <div>
            <h1 className="tm-nl-h1">{heading}</h1>
            <p className="tm-nl-sub">{body}</p>
            <button
                type="button"
                onClick={act}
                disabled={state === 'busy'}
                className="tm-nl-btn tm-nl-btn-primary"
            >
                {state === 'busy' ? 'Working...' : buttonLabel}
            </button>
        </div>
    );
}
