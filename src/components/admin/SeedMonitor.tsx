'use client';

/**
 * Seed monitor panel: real inbox placement for mail that shows as delivered.
 * Seeds are mailboxes we own. After each send, the server signs in over IMAP
 * (read only) and records Inbox, Promotions, Spam, Other or Missing.
 */
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type Seed = { email: string; provider: string; active: boolean; last_checked_at: string | null; last_error: string | null };
type Check = {
    seed_email: string; issue_number: number | null; sent_at: string; placement: string;
    folder: string | null; labels: string | null; spf: string | null; dkim: string | null; dmarc: string | null;
    received_at: string | null;
};
type Pending = { seed_email: string; issue_number: number | null; sent_at: string };
type Report = { seeds: Seed[]; checks: Check[]; pending: Pending[]; tally: Record<string, number>; secretConfigured: boolean };

const LABEL: Record<string, string> = {
    inbox: 'Inbox', promotions: 'Promotions', spam: 'Spam', other: 'Other folder', missing: 'Missing',
};
const COLOR: Record<string, string> = {
    inbox: 'text-green-300', promotions: 'text-yellow-300', spam: 'text-red-300', other: 'text-orange-300', missing: 'text-red-300',
};

function fmt(d: string | null) {
    return d ? new Date(d).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
}

export default function SeedMonitor() {
    const [report, setReport] = useState<Report | null>(null);
    const [msg, setMsg] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [provider, setProvider] = useState('gmail');
    const [host, setHost] = useState('');
    const [pw, setPw] = useState('');
    const [busy, setBusy] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await adminFetch('/api/admin/newsletter?seeds=1');
            const data = await res.json();
            if (res.ok) setReport(data); else setMsg(data?.error ?? 'Failed to load');
        } catch { setMsg('Failed to load'); }
    }, []);
    useEffect(() => { void load(); }, [load]);

    async function post(body: Record<string, unknown>) {
        const res = await adminFetch('/api/admin/newsletter', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        return { ok: res.ok, data: await res.json() };
    }

    async function addSeed() {
        if (!email.trim() || !pw.trim()) return;
        if (!window.confirm(`Add ${email.trim()} as a seed? It becomes a subscriber and receives issue 1 now.`)) return;
        setBusy(true); setMsg('Checking the sign in...');
        try {
            const { ok, data } = await post({ action: 'add-seed', email: email.trim(), appPassword: pw, provider, host });
            if (!ok) { setMsg(data?.error ?? 'Failed'); return; }
            const o = data.send;
            setMsg(o?.result === 'sent' ? `Seed added. Issue ${o.issue} sent; placement appears in a few minutes.` : `Seed added. ${data.subscriber ?? `Not sent: ${o?.reason ?? 'see history'}`}`);
            setEmail(''); setPw(''); await load();
        } finally { setBusy(false); }
    }

    async function checkNow() {
        setBusy(true); setMsg('Reading the seed mailboxes...');
        try {
            const { ok, data } = await post({ action: 'check-seeds' });
            setMsg(ok ? `Checked ${data.seeds} seed(s), recorded ${data.saved} new result(s).${data.errors?.length ? ' Errors: ' + data.errors.join('; ') : ''}` : (data?.error ?? 'Failed'));
            await load();
        } finally { setBusy(false); }
    }

    async function remove(e: string) {
        if (!window.confirm(`Remove seed ${e}? Its stored password is deleted.`)) return;
        await post({ action: 'remove-seed', email: e }); await load();
    }

    const total = report ? Object.values(report.tally).reduce((a, b) => a + b, 0) : 0;
    const field = 'rounded-lg border border-[#232333] bg-[#0A0A0F] px-3 py-1.5 text-xs text-white';

    return (
        <section className="mt-10 rounded-2xl border border-[#232333] bg-[#14141f] p-6">
            <h2 className="text-base font-bold text-white">Inbox placement (seed monitor)</h2>
            <p className="mt-1 text-xs text-[#8B95A9]">
                Delivered means the receiving server accepted the message. Seeds are mailboxes we own: after each send the
                server reads them (read only) and records the folder. Only these results show real placement.
            </p>

            {report && !report.secretConfigured && (
                <p className="mt-2 text-xs text-red-300">No server secret is configured, so seed passwords cannot be stored.</p>
            )}

            <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto]">
                <input className={field} placeholder="seed@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                <select className={field} value={provider} onChange={(e) => setProvider(e.target.value)}>
                    <option value="gmail">Gmail</option><option value="yahoo">Yahoo</option>
                    <option value="icloud">iCloud</option><option value="other">Other IMAP</option>
                </select>
                <input className={field} type="password" autoComplete="new-password" placeholder="App password (not the normal password)" value={pw} onChange={(e) => setPw(e.target.value)} />
                <button type="button" disabled={busy} onClick={addSeed}
                    className="rounded-lg bg-[#8B5CF6] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Add seed</button>
            </div>
            {provider === 'other' && (
                <input className={`${field} mt-2 w-full`} placeholder="IMAP host, for example imap.example.com" value={host} onChange={(e) => setHost(e.target.value)} />
            )}
            <p className="mt-1.5 text-[11px] text-[#8B95A9]">
                Use throwaway mailboxes only. Gmail: turn on 2-Step Verification, then create an app password. Yahoo and iCloud: create an app password in account security.
                The password is stored encrypted and is never shown again.
            </p>
            {msg && <p className="mt-2 text-xs text-[#BCC6D8]">{msg}</p>}

            <div className="mt-4 flex items-center gap-3">
                <button type="button" disabled={busy} onClick={checkNow}
                    className="rounded-lg border border-[#232333] px-3 py-1 text-xs font-semibold text-white hover:border-[#8B5CF6] disabled:opacity-50">Check now</button>
                <button type="button" onClick={() => void load()}
                    className="rounded-lg border border-[#232333] px-3 py-1 text-xs font-semibold text-white hover:border-[#8B5CF6]">Refresh</button>
            </div>

            {report && (
                <div className="mt-4 space-y-4 text-[11px] text-[#BCC6D8]">
                    <p>
                        {total === 0 ? 'No results yet.' : `${total} result(s): `}
                        {Object.entries(report.tally).map(([k, v]) => (
                            <span key={k} className={`mr-3 ${COLOR[k] ?? ''}`}>{LABEL[k] ?? k} {v} ({Math.round((100 * v) / total)}%)</span>
                        ))}
                        {report.pending.length > 0 && <span className="text-[#8B95A9]">Waiting for {report.pending.length} message(s) to appear.</span>}
                    </p>

                    {report.seeds.length > 0 && (
                        <table className="w-full text-left">
                            <thead className="text-[#8B95A9]"><tr><th className="py-1">Seed</th><th>Provider</th><th>Last read</th><th>Status</th><th /></tr></thead>
                            <tbody>
                                {report.seeds.map((s) => (
                                    <tr key={s.email} className="border-t border-[#232333]">
                                        <td className="py-1">{s.email}</td><td>{s.provider}</td><td>{fmt(s.last_checked_at) || 'never'}</td>
                                        <td className={s.last_error ? 'text-red-300' : ''}>{s.last_error ?? 'ok'}</td>
                                        <td><button type="button" onClick={() => remove(s.email)} className="text-[#8B95A9] hover:text-white">Remove</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {report.checks.length > 0 && (
                        <table className="w-full text-left">
                            <thead className="text-[#8B95A9]">
                                <tr><th className="py-1">Sent (ET)</th><th>Seed</th><th>Issue</th><th>Placement</th><th>SPF</th><th>DKIM</th><th>DMARC</th><th>Folder and labels</th></tr>
                            </thead>
                            <tbody>
                                {report.checks.map((c, i) => (
                                    <tr key={i} className="border-t border-[#232333]">
                                        <td className="py-1">{fmt(c.sent_at)}</td><td>{c.seed_email}</td><td>{c.issue_number ?? ''}</td>
                                        <td className={COLOR[c.placement]}>{LABEL[c.placement] ?? c.placement}</td>
                                        <td>{c.spf ?? '-'}</td><td>{c.dkim ?? '-'}</td><td>{c.dmarc ?? '-'}</td>
                                        <td className="text-[#8B95A9]">{[c.folder, c.labels].filter(Boolean).join(' | ')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </section>
    );
}
