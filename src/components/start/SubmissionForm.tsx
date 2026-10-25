'use client';

import { useState } from 'react';
import { useToken } from './TokenLink';

const KINDS: [string, string][] = [
    ['verify', 'I reproduced (or tried to reproduce) a number'],
    ['challenge', 'I want to challenge an assumption or a rule'],
    ['advice', 'I have advice on the model'],
    ['feedback', 'Feedback on a briefing or page'],
    ['error', 'I found an error'],
];

export default function SubmissionForm() {
    const tok = useToken();
    const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
    const [msg, setMsg] = useState('');

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setState('sending');
        const r = await fetch('/api/start/submission', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                kind: f.get('kind'), name: f.get('name'), email: f.get('email'), body: f.get('body'),
                public_credit: f.get('public_credit') === 'on', website: f.get('website'), t: tok,
            }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) { setState('done'); setMsg('Thank you. I read every submission.'); } else { setState('error'); setMsg(j.error || 'Something went wrong. Please try again.'); }
    }

    if (state === 'done') return <p className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-green-200">{msg}</p>;
    const field = 'mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm';
    return (
        <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm">What are you sending?
                <select name="kind" className={field} defaultValue="verify">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="block text-sm">Your email address
                <input name="email" type="email" required maxLength={200} className={field} />
            </label>
            <label className="block text-sm">Your first name (optional)
                <input name="name" maxLength={80} className={field} />
            </label>
            <label className="block text-sm">What you found, and how (method, data source, numbers)
                <textarea name="body" required minLength={20} maxLength={4000} rows={7} className={field} />
            </label>
            <label className="flex items-start gap-2 text-sm text-gray-300">
                <input type="checkbox" name="public_credit" className="mt-1" />
                <span>You may list my first name on the public changelog if my finding is used.</span>
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <p className="text-xs text-gray-400">Sending a finding earns a seat in the next research panel group, and once you are a member, 30 days of free access. This does not depend on whether your finding helps or hurts TradeMind. Nothing here is a payment, and no card is needed.</p>
            {state === 'error' && <p className="text-sm text-red-300">{msg}</p>}
            <button disabled={state === 'sending'} className="rounded-lg bg-[#2f6bff] px-5 py-3 font-semibold text-white disabled:opacity-60">{state === 'sending' ? 'Sending' : 'Send'}</button>
        </form>
    );
}
