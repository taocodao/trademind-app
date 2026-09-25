'use client';

/**
 * Admin newsletter tools: subscriber lookup (current or previous email),
 * resend confirmation, extend window, revoke discount, aggregate stats.
 * All actions hit /api/admin/newsletter, gated to support@trademind.bot.
 */
import { useEffect, useState } from 'react';

interface SubscriberView {
    subscriber: Record<string, unknown>;
    emails: { email: string; role: string; added_at: string }[];
    events: { event: string; created_at: string }[];
}

export default function NewsletterTools() {
    const [lookupEmail, setLookupEmail] = useState('');
    const [view, setView] = useState<SubscriberView | null>(null);
    const [lookupError, setLookupError] = useState<string | null>(null);
    const [reason, setReason] = useState('');
    const [days, setDays] = useState(30);
    const [actionMsg, setActionMsg] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [stats, setStats] = useState<Record<string, unknown> | null>(null);
    const [issueNumber, setIssueNumber] = useState('');
    const [previewTo, setPreviewTo] = useState('');

    useEffect(() => {
        fetch('/api/admin/newsletter?aggregate=1')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => d && setStats(d))
            .catch(() => {});
    }, []);

    async function lookup() {
        setBusy(true);
        setLookupError(null);
        setView(null);
        try {
            const res = await fetch(`/api/admin/newsletter?email=${encodeURIComponent(lookupEmail)}`);
            const data = await res.json();
            if (!res.ok) setLookupError(data?.error ?? 'Not found');
            else setView(data);
        } catch {
            setLookupError('Lookup failed');
        } finally {
            setBusy(false);
        }
    }

    async function act(action: string, extra: Record<string, unknown> = {}) {
        if (!view && action !== 'send-issue') return;
        setBusy(true);
        setActionMsg(null);
        try {
            const res = await fetch('/api/admin/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    subscriberId: view ? view.subscriber.id : 0,
                    reason,
                    days,
                    ...extra,
                }),
            });
            const data = await res.json();
            setActionMsg(res.ok ? `${action}: done${data.windowEnd ? ` (window ends ${new Date(data.windowEnd).toLocaleDateString()})` : ''}${data.sent !== undefined ? ` (sent ${data.sent}, failed ${data.failed})` : ''}` : (data?.error ?? 'Failed'));
        } catch {
            setActionMsg('Action failed');
        } finally {
            setBusy(false);
        }
    }

    const s = view?.subscriber as Record<string, string | number | null> | undefined;

    return (
        <section className="rounded-2xl border border-[#232333] bg-[#14141f] p-6 mb-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B95A9] mb-4">
                Newsletter subscribers
            </h2>

            {stats && (
                <div className="mb-5 grid grid-cols-3 gap-2 text-center text-xs text-[#BCC6D8] sm:grid-cols-5">
                    {Object.entries({ ...(stats.subscribers as object), ...(stats.discounts as object) }).map(([k, v]) => (
                        <div key={k} className="rounded-lg border border-[#232333] px-2 py-2">
                            <div className="text-base font-bold text-white">{String(v)}</div>
                            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[#8B95A9]">{k.replace(/_/g, ' ')}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2 mb-4">
                <input
                    type="email"
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="Find subscriber by current or previous email"
                    className="flex-1 rounded-lg border border-[#232333] bg-[#0A0A0F] px-3 py-2 text-sm text-white outline-none focus:border-[#8B5CF6]"
                />
                <button
                    type="button"
                    onClick={lookup}
                    disabled={busy || !lookupEmail.includes('@')}
                    className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                    Look up
                </button>
            </div>
            {lookupError && <p className="text-sm text-red-400 mb-3">{lookupError}</p>}

            {view && s && (
                <div className="rounded-xl border border-[#232333] bg-[#0A0A0F] p-4 text-sm">
                    <div className="grid gap-1.5 text-[#BCC6D8]">
                        <p><span className="text-[#8B95A9]">Email:</span> <span className="text-white">{String(s.email)}</span></p>
                        <p><span className="text-[#8B95A9]">Subscription:</span> <span className="text-white">{String(s.status)}</span>{s.pending_email ? ` (change pending to ${s.pending_email})` : ''}</p>
                        <p><span className="text-[#8B95A9]">Discount:</span> <span className="text-white">{String(s.discount_state ?? 'none')}</span>
                            {s.window_end ? ` until ${new Date(String(s.window_end)).toLocaleDateString()}` : ''}
                            {s.personal_code ? ` · code ${s.personal_code}` : ''}</p>
                        <p><span className="text-[#8B95A9]">First confirmed:</span> {s.first_confirmed_at ? new Date(String(s.first_confirmed_at)).toLocaleString() : 'never'}</p>
                        <p><span className="text-[#8B95A9]">Source:</span> {String(s.source ?? 'website')}{s.partner_id ? ` · partner ${s.partner_id}` : ''}</p>
                    </div>

                    <div className="mt-3 text-xs text-[#8B95A9]">
                        <p className="font-semibold text-[#BCC6D8] mb-1">Email history</p>
                        {view.emails.map((e) => (
                            <p key={e.email + e.role}>{e.email} · {e.role} · since {new Date(e.added_at).toLocaleDateString()}</p>
                        ))}
                    </div>
                    <div className="mt-3 text-xs text-[#8B95A9] max-h-36 overflow-y-auto">
                        <p className="font-semibold text-[#BCC6D8] mb-1">Recent events</p>
                        {view.events.slice(0, 15).map((e, i) => (
                            <p key={i}>{new Date(e.created_at).toLocaleString()} · {e.event}</p>
                        ))}
                    </div>

                    <div className="mt-4 border-t border-[#232333] pt-4">
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (required for extend / revoke)"
                            className="mb-2 w-full rounded-lg border border-[#232333] bg-[#14141f] px-3 py-2 text-xs text-white outline-none focus:border-[#8B5CF6]"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                            <button type="button" onClick={() => act('resend-confirmation')} disabled={busy}
                                className="rounded-lg border border-[#232333] px-3 py-1.5 text-xs font-semibold text-[#BCC6D8] hover:border-[#8B5CF6]">
                                Resend confirmation
                            </button>
                            <button type="button" onClick={() => act('extend-window')} disabled={busy || !reason}
                                className="rounded-lg border border-[#232333] px-3 py-1.5 text-xs font-semibold text-[#BCC6D8] hover:border-[#8B5CF6]">
                                Extend window
                            </button>
                            <input type="number" value={days} onChange={(e) => setDays(Number(e.target.value))} min={1} max={180}
                                className="w-16 rounded-lg border border-[#232333] bg-[#14141f] px-2 py-1.5 text-xs text-white" aria-label="Days to extend" />
                            <button type="button" onClick={() => act('revoke-discount')} disabled={busy || !reason}
                                className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:border-red-400">
                                Revoke discount
                            </button>
                        </div>
                        {actionMsg && <p className="mt-2 text-xs text-[#BCC6D8]">{actionMsg}</p>}
                    </div>
                </div>
            )}

            <div className="mt-5 border-t border-[#232333] pt-4">
                <p className="text-xs font-semibold text-[#BCC6D8] mb-2">Send an issue email</p>
                <div className="flex flex-wrap gap-2">
                    <input type="number" value={issueNumber} onChange={(e) => setIssueNumber(e.target.value)} min={1} max={8}
                        placeholder="Issue #" className="w-24 rounded-lg border border-[#232333] bg-[#0A0A0F] px-3 py-2 text-xs text-white" />
                    <input type="email" value={previewTo} onChange={(e) => setPreviewTo(e.target.value)}
                        placeholder="Preview to (optional email)" className="flex-1 min-w-[180px] rounded-lg border border-[#232333] bg-[#0A0A0F] px-3 py-2 text-xs text-white" />
                    <button type="button" disabled={busy || !issueNumber}
                        onClick={() => {
                            if (!previewTo && !window.confirm(`Send issue ${issueNumber} to ALL confirmed subscribers?`)) return;
                            act('send-issue', {
                                issueNumber: Number(issueNumber),
                                ...(previewTo ? { previewTo } : {}),
                                subscriberId: 1,
                            });
                        }}
                        className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">
                        {previewTo ? 'Send preview' : 'Send to all confirmed'}
                    </button>
                </div>
                <p className="mt-1.5 text-[11px] text-[#8B95A9]">With a preview address it sends only there. Without one it sends to every confirmed, non-suppressed subscriber.</p>
            </div>
        </section>
    );
}
