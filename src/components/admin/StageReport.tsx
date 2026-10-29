'use client';

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/admin-fetch';

type Row = { contacts: number; sent: number; clicked: number; human: number; signups: number; unsubscribed: number };
const LABEL: Record<string, string> = { starter: 'Starter (under 35)', builder: 'Builder (35 to 44)', accelerator: 'Accelerator (45 to 54)', finisher: 'Finisher (55 to 64)', grower: 'Grower (65+)', unknown: 'No age' };

export default function StageReport() {
    const [data, setData] = useState<Record<string, { stage: Row; control: Row }> | null>(null);
    useEffect(() => { void adminFetch('/api/admin/outreach-stages').then(async (r) => { if (r.ok) setData((await r.json()).stages); }); }, []);
    if (!data) return null;
    const cell = (r: Row) => `${r.sent} sent, ${r.clicked} clicks, ${r.human} human, ${r.signups} signups, ${r.unsubscribed} unsub`;
    return (
        <section className="mt-8 rounded-xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-lg font-semibold">Outreach by life stage</h2>
            <p className="mt-1 text-sm text-white/60">Stage wording versus the generic-copy control group. No winner before 30 confirmed signups per variant.</p>
            <table className="mt-3 w-full text-left text-sm">
                <thead><tr className="text-white/60"><th className="py-1 pr-3">Stage</th><th className="pr-3">Stage wording</th><th>Control (generic)</th></tr></thead>
                <tbody>
                    {Object.entries(data).map(([k, v]) => (
                        <tr key={k} className="border-t border-white/10">
                            <td className="py-2 pr-3 font-medium">{LABEL[k] ?? k}</td>
                            <td className="pr-3">{cell(v.stage)}</td>
                            <td>{k === 'unknown' ? 'n/a' : cell(v.control)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}
