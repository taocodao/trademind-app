'use client';

import { useState } from 'react';

export default function ThanksCadence({ token, initial }: { token: string; initial: 'weekly' | 'daily' }) {
    const [sel, setSel] = useState<'weekly' | 'both'>(initial === 'daily' ? 'both' : 'weekly');
    const [msg, setMsg] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    async function choose(c: 'weekly' | 'both') {
        if (busy) return;
        setBusy(true);
        setMsg(null);
        try {
            const res = await fetch('/api/outreach/cadence', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ t: token, cadence: c }),
            });
            if (res.ok) { setSel(c); setMsg(c === 'both' ? 'Saved. You will get the weekly brief and the daily brief.' : 'Saved. You will get the weekly brief.'); }
            else setMsg('Could not save that just now. You can change it any time from the link in any issue.');
        } catch { setMsg('Could not save that just now. You can change it any time from the link in any issue.'); }
        setBusy(false);
    }

    return (
        <div style={{ margin: '18px 0' }}>
            <p className="tm-nl-sub" style={{ marginBottom: 10 }}>How often would you like to hear from us?</p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" disabled={busy} onClick={() => choose('weekly')}
                    className={sel === 'weekly' ? 'tm-nl-btn tm-nl-btn-primary' : 'tm-nl-btn tm-nl-btn-ghost'}>Weekly brief</button>
                <button type="button" disabled={busy} onClick={() => choose('both')}
                    className={sel === 'both' ? 'tm-nl-btn tm-nl-btn-primary' : 'tm-nl-btn tm-nl-btn-ghost'}>Weekly and daily</button>
            </div>
            {msg && <p className="tm-nl-muted" style={{ fontSize: 13.5, marginTop: 10 }}>{msg}</p>}
        </div>
    );
}
