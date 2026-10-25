'use client';

/**
 * Review console for the daily briefing. Phase 1: drafts are internal only. Approve, edit or hold each draft;
 * every approval and edit re-runs the wording checks against the locked facts record.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type Check = { name: string; pass: boolean; detail?: string };
type Issue = {
    id: number; run_date: string; kind: string; status: string; subject: string; text_body: string;
    commentary: string | null; status_only: boolean; checks: Check[]; reviewed_at: string | null;
};

export default function BriefingReview() {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [open, setOpen] = useState<number | null>(null);
    const [draft, setDraft] = useState('');
    const [msg, setMsg] = useState('');

    const load = useCallback(async () => {
        const r = await adminFetch('/api/admin/briefings');
        if (r.ok) setIssues((await r.json()).issues || []);
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function act(id: number, action: 'approve' | 'hold' | 'edit') {
        setMsg('');
        const r = await adminFetch('/api/admin/briefings', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, action, text: action === 'edit' ? draft : undefined }),
        });
        const j = await r.json().catch(() => ({}));
        setMsg(r.ok ? `Saved. Status: ${j.status}` : j.error || 'Failed');
        await load();
    }

    return (
        <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Daily briefing review</h2>
            <p className="mt-1 text-sm text-gray-400">Drafts are internal only. Nothing is emailed from this panel.</p>
            {msg && <p className="mt-2 text-sm text-blue-300">{msg}</p>}
            {issues.length === 0 && <p className="mt-3 text-sm text-gray-400">No drafts yet.</p>}
            <ul className="mt-3 space-y-2">
                {issues.map((i) => {
                    const failed = i.checks.filter((c) => !c.pass);
                    return (
                        <li key={i.id} className="rounded-lg border border-white/10 p-3">
                            <button className="flex w-full items-center justify-between text-left" onClick={() => { setOpen(open === i.id ? null : i.id); setDraft(i.text_body); }}>
                                <span className="text-sm">{i.run_date} · {i.kind} · {i.subject}</span>
                                <span className={`text-xs ${i.status === 'approved' ? 'text-green-300' : i.status === 'held' ? 'text-red-300' : 'text-yellow-300'}`}>
                                    {i.status}{i.status_only ? ' · status only' : ''}
                                </span>
                            </button>
                            {open === i.id && (
                                <div className="mt-3 space-y-3">
                                    <ul className="text-xs">
                                        {i.checks.map((c) => (
                                            <li key={c.name} className={c.pass ? 'text-green-300' : 'text-red-300'}>
                                                {c.pass ? 'Pass' : 'Fail'}: {c.name}{c.detail ? ` (${c.detail})` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                    <textarea className="h-72 w-full rounded bg-black/40 p-2 font-mono text-xs" value={draft} onChange={(e) => setDraft(e.target.value)} />
                                    <div className="flex gap-2">
                                        <button className="rounded bg-blue-600 px-3 py-1 text-sm" onClick={() => act(i.id, 'edit')}>Save edit</button>
                                        <button className="rounded bg-green-700 px-3 py-1 text-sm disabled:opacity-40" disabled={failed.length > 0} onClick={() => act(i.id, 'approve')}>Approve</button>
                                        <button className="rounded bg-red-700 px-3 py-1 text-sm" onClick={() => act(i.id, 'hold')}>Hold</button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
