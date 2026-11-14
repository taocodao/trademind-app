'use client';

/**
 * Opened from a personal link. Subscribes the person at once and shows the confirmation, with no button to press.
 * If the address cannot be subscribed this way, the normal form is shown instead.
 */
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

export default function JoinAuto({ token, fallback }: { token: string; fallback: ReactNode }) {
    const [state, setState] = useState<'working' | 'subscribed' | 'already' | 'form'>('working');
    const [info, setInfo] = useState<{ email: string; next: string }>({ email: '', next: 'seven days from now' });
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    function getIssue() {
        setBusy(true); setNote('Sending...');
        fetch('/api/newsletter/press-subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, action: 'send' }) })
            .then((r) => r.json())
            .then((d) => setNote(d.result === 'sent' ? 'Sent. Check your inbox in a minute.' : d.result === 'wait' ? 'The link was sent a moment ago. Check your inbox, or try again in a few minutes.' : 'We could not send it just now. Please try again in a minute.'))
            .catch(() => setNote('We could not send it just now. Please try again in a minute.'))
            .finally(() => setBusy(false));
    }

    useEffect(() => {
        let live = true;
        fetch('/api/newsletter/press-subscribe', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
        })
            .then((r) => r.json())
            .then((d) => { if (!live) return; setInfo({ email: d.email ?? '', next: d.next ?? 'seven days from now' }); setState(d.result === 'subscribed' || d.result === 'already' ? d.result : 'form'); })
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
            {info.email && <p className="tm-nl-sub" style={{ fontWeight: 700 }}>Subscribed address: {info.email}</p>}
            <p className="tm-nl-sub">Your first issue is on its way now. After that you get one issue a week, exactly seven days after the last one. The next one arrives {info.next}.</p>
            <p style={{ margin: '18px 0' }}>
                <button type="button" className="tm-nl-btn" onClick={getIssue} disabled={busy}>Get issue</button>
                {note && <span className="tm-nl-muted" style={{ marginLeft: 12, fontSize: 14 }}>{note}</span>}
            </p>
            <p style={{ margin: '0 0 18px' }}>
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
