'use client';

/** Founding program admin: applications, acceptance, and the invite (test sends and batches). */
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type App = { id: number; email: string; name: string | null; role: string | null; track: string | null; answers: Record<string, unknown>; status: string; created_at: string };
type Part = { email_norm: string; cohort: number; track: string | null; path: string; started_at: string; paid_started_at: string | null };
type Inv = { eligible: number; include_imported: boolean; invited: number; test_addresses: string[] };

export default function ProgramAdmin() {
    const [apps, setApps] = useState<App[]>([]);
    const [parts, setParts] = useState<Part[]>([]);
    const [inv, setInv] = useState<Inv | null>(null);
    const [open, setOpen] = useState<number | null>(null);
    const [cohort, setCohort] = useState(1);
    const [msg, setMsg] = useState('');
    const [testTo, setTestTo] = useState('testtrademind@gmail.com');

    const load = useCallback(async () => {
        const [a, i] = await Promise.all([adminFetch('/api/admin/program'), adminFetch('/api/admin/program/invite')]);
        if (a.ok) { const j = await a.json(); setApps(j.applications); setParts(j.participants); }
        if (i.ok) setInv(await i.json());
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function decide(id: number, action: 'accept' | 'decline') {
        const r = await adminFetch('/api/admin/program', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, cohort }) });
        const j = await r.json().catch(() => ({}));
        setMsg(r.ok ? (action === 'accept' ? `Accepted. Preview ends ${new Date(j.preview_ends).toLocaleDateString()}` : 'Declined') : j.error || 'Failed');
        await load();
    }
    async function invite(body: Record<string, unknown>) {
        const r = await adminFetch('/api/admin/program/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json().catch(() => ({}));
        setMsg(JSON.stringify(j));
        await load();
    }

    return (
        <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Founding program</h2>
            {msg && <p className="mt-2 break-all text-sm text-blue-300">{msg}</p>}

            <h3 className="mt-4 font-medium">Invite</h3>
            {inv && (
                <p className="mt-1 text-sm text-gray-300">
                    {inv.eligible} eligible, {inv.invited} already invited. Imported contacts are {inv.include_imported ? 'included' : 'not included'} (same setting as the newsletter).
                </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <select className="rounded bg-black/40 px-2 py-1" value={testTo} onChange={(e) => setTestTo(e.target.value)}>
                    {(inv?.test_addresses ?? [testTo]).map((a) => <option key={a}>{a}</option>)}
                </select>
                <button className="rounded bg-white/10 px-3 py-1" onClick={() => invite({ action: 'test', to: testTo })}>Send test</button>
                <button className="rounded bg-blue-700 px-3 py-1" onClick={() => { if (confirm('Send the invite to the next 25 eligible people?')) void invite({ action: 'send', max: 25 }); }}>Send next 25</button>
            </div>

            <h3 className="mt-6 font-medium">Applications ({apps.length})</h3>
            <label className="text-xs text-gray-400">Accept into group <input type="number" min={1} value={cohort} onChange={(e) => setCohort(Number(e.target.value) || 1)} className="ml-1 w-14 rounded bg-black/40 px-1" /></label>
            <ul className="mt-2 space-y-2">
                {apps.map((a) => (
                    <li key={a.id} className="rounded-lg border border-white/10 p-3 text-sm">
                        <button className="flex w-full justify-between text-left" onClick={() => setOpen(open === a.id ? null : a.id)}>
                            <span>{a.email} · {a.track} · {a.role}</span><span className="text-xs text-gray-400">{a.status}</span>
                        </button>
                        {open === a.id && (
                            <div className="mt-2 space-y-2">
                                <pre className="whitespace-pre-wrap text-xs text-gray-300">{JSON.stringify(a.answers, null, 2)}</pre>
                                {a.status === 'new' && (
                                    <div className="flex gap-2">
                                        <button className="rounded bg-green-700 px-3 py-1" onClick={() => decide(a.id, 'accept')}>Accept</button>
                                        <button className="rounded bg-red-700 px-3 py-1" onClick={() => decide(a.id, 'decline')}>Decline</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </li>
                ))}
            </ul>

            <h3 className="mt-6 font-medium">Participants ({parts.length})</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-300">
                {parts.map((p) => <li key={p.email_norm}>{p.email_norm} · group {p.cohort} · {p.path}{p.paid_started_at ? ' · paying' : ''}</li>)}
            </ul>
        </section>
    );
}
