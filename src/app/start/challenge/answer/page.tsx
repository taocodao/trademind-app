'use client';

import { useEffect, useState } from 'react';
import ExploreRow from '@/components/start/ExploreRow';
import StartVisit from '@/components/start/StartVisit';
import { useToken } from '@/components/start/TokenLink';

const TEXT: Record<string, string> = {
    a: 'You would have waited. Thank you.',
    b: 'You would have asked for a clearer explanation first. Thank you.',
    c: 'You would have walked away. Thank you, that is useful to know.',
};

export default function Answer() {
    const tok = useToken();
    const [a, setA] = useState('');
    const [sent, setSent] = useState(false);
    const [note, setNote] = useState('');
    const [done, setDone] = useState(false);

    useEffect(() => { setA(new URLSearchParams(window.location.search).get('a') ?? ''); }, []);
    useEffect(() => {
        if (!a || !tok || sent || !TEXT[a]) return;
        setSent(true);
        void fetch('/api/start/response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: tok, value: a }) });
    }, [a, tok, sent]);

    async function saveNote(e: React.FormEvent) {
        e.preventDefault();
        await fetch('/api/start/response', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: tok, value: a, note }) });
        setDone(true);
    }

    return (
        <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
            <h1 className="text-3xl font-semibold">{TEXT[a] ?? 'Thank you.'}</h1>
            <p className="mt-4 text-gray-300">There is no right answer. If you want to tell me why, in one line, here is the space. It is optional.</p>
            {done ? (
                <p className="mt-4 text-green-300">Saved. Thank you.</p>
            ) : (
                <form onSubmit={saveNote} className="mt-4 space-y-3">
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
                    <button className="rounded-lg bg-[#2f6bff] px-5 py-2 font-semibold text-white" disabled={!note.trim()}>Send</button>
                </form>
            )}
            <p className="mt-8 text-gray-300">If you want to check the numbers behind the chart, the <a href={tok ? `/start/verify?k=${tok}` : '/start/verify'} className="text-blue-300 underline">verification kit</a> shows how.</p>
            <ExploreRow current="challenge" />
            <StartVisit section="challenge" />
        </main>
    );
}
