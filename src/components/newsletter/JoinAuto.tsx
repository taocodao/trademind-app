'use client';

/**
 * Opened from a personal link. Subscribes the person at once and shows the confirmation, with no button to press.
 * If the address cannot be subscribed this way, the normal form is shown instead.
 */
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

export default function JoinAuto({ token, fallback }: { token: string; fallback: ReactNode }) {
    const [state, setState] = useState<'working' | 'subscribed' | 'already' | 'form'>('working');

    useEffect(() => {
        let live = true;
        fetch('/api/newsletter/press-subscribe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
        })
            .then((r) => r.json())
            .then((d) => { if (live) setState(d.result === 'subscribed' || d.result === 'already' ? d.result : 'form'); })
            .catch(() => { if (live) setState('form'); });
        return () => { live = false; };
    }, [token]);

    if (state === 'form') return <>{fallback}</>;
    if (state === 'working') {
        return (
            <>
                <h1 className="tm-nl-h1">Subscribing you now</h1>
                <p className="tm-nl-sub">One moment.</p>
            </>
        );
    }
    return (
        <>
            <h1 className="tm-nl-h1">Thank you, you are subscribed</h1>
            <p className="tm-nl-sub">
                {state === 'already'
                    ? 'You were already on the list, so there is nothing more to do. The next issue arrives in your inbox.'
                    : 'You are in. The next issue arrives in your inbox, and we also emailed you the link to the current issue.'}
            </p>
            <p style={{ margin: '18px 0' }}>
                <Link href="/newsletter/current" className="tm-nl-link">Read the current issue</Link>
            </p>
            <p className="tm-nl-offerline">
                Confirmed subscribers are entitled to 30% off the first year of a yearly TradeMind Strategy subscription, using the same email within 90 days of subscribing.
                {' '}<Link href="/newsletter/offer" className="tm-nl-link">Offer terms</Link>
            </p>
            <p className="tm-nl-muted" style={{ fontSize: 13.5 }}>You can unsubscribe at any time from the link at the bottom of every email.</p>
        </>
    );
}
