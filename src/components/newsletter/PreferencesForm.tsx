'use client';
import { useState } from 'react';

/** Nothing changes until the reader presses a button, so a link scanner opening the page changes nothing. */
export default function PreferencesForm({ k }: { k: string }) {
    const [state, setState] = useState<'idle' | 'saving' | 'weekly' | 'daily' | 'both' | 'error'>('idle');
    async function choose(cadence: 'weekly' | 'daily' | 'both') {
        setState('saving');
        const r = await fetch('/api/newsletter/cadence', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k, cadence }) }).catch(() => null);
        setState(r && r.ok ? cadence : 'error');
    }
    if (!k) return <p>This link is not valid. Use the link in your latest email.</p>;
    return (
        <div>
            <h1>How often should we email you?</h1>
            <p>Both are free. You can change this at any time from any email.</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '20px 0' }}>
                <button disabled={state === 'saving'} onClick={() => choose('weekly')} className="tm-nl-btn">One brief a week</button>
                <button disabled={state === 'saving'} onClick={() => choose('daily')} className="tm-nl-btn">A short brief every market day</button>
                <button disabled={state === 'saving'} onClick={() => choose('both')} className="tm-nl-btn">Both</button>
            </div>
            {state === 'weekly' && <p>Saved. You will get the weekly brief.</p>}
            {state === 'daily' && <p>Saved. You will get the daily brief.</p>}
            {state === 'both' && <p>Saved. You will get the weekly issue and the daily brief.</p>}
            {state === 'error' && <p>Something went wrong. Please try again, or reply to any of our emails.</p>}
        </div>
    );
}
