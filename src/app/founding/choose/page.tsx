'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Me = {
    member: boolean; email?: string; path?: string; access?: string; free_access_ends?: string; billing_starts?: string;
    can_check_out?: boolean; paid?: boolean;
    prices?: { research: { month: number; year: number; founding: { month: number; year: number } }; tracking: { month: number; year: number; founding: { month: number; year: number } } };
    activities?: { month: number; due: string; done: boolean }[];
};

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');
const btn = 'rounded-lg px-4 py-2 text-sm font-medium';

export default function ChoosePage() {
    const { ready, authenticated, login, getAccessToken } = usePrivy();
    const [me, setMe] = useState<Me | null>(null);
    const [msg, setMsg] = useState('');
    const [level, setLevel] = useState<'research' | 'tracking'>('research');
    const [interval, setInterval] = useState<'month' | 'year'>('month');

    const call = useCallback(async (url: string, init?: RequestInit) => {
        const token = await getAccessToken();
        return fetch(url, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    }, [getAccessToken]);

    const load = useCallback(async () => {
        const r = await call('/api/program/me');
        if (r.ok) setMe(await r.json());
        else setMsg((await r.json().catch(() => ({}))).error || 'Could not load your program details.');
    }, [call]);

    useEffect(() => { if (ready && authenticated) void load(); }, [ready, authenticated, load]);

    async function choose(path: 'partner' | 'founding' | 'free') {
        setMsg('');
        const r = await call('/api/program/choose', { method: 'POST', body: JSON.stringify({ action: 'path', path, level, interval }) });
        setMsg(r.ok ? 'Saved.' : (await r.json().catch(() => ({}))).error || 'Failed.');
        await load();
    }
    async function checkout() {
        const r = await call('/api/program/checkout', { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.url) window.location.href = j.url; else setMsg(j.error || 'Checkout is not available yet.');
    }
    async function billing() {
        const r = await call('/api/program/portal', { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.url) window.location.href = j.url; else setMsg(j.error || 'No billing record yet.');
    }

    if (!ready) return <main className="mx-auto max-w-xl px-5 py-16 text-gray-400">Loading</main>;
    if (!authenticated) {
        return (
            <main className="mx-auto max-w-xl px-5 py-16">
                <h1 className="text-2xl font-semibold">Your TradeMind program</h1>
                <p className="mt-3 text-gray-300">Sign in with the email address you applied with.</p>
                <button className={`${btn} mt-5 bg-blue-600`} onClick={() => login()}>Sign in</button>
            </main>
        );
    }
    if (!me) return <main className="mx-auto max-w-xl px-5 py-16 text-gray-400">{msg || 'Loading'}</main>;
    if (!me.member) {
        return (
            <main className="mx-auto max-w-xl px-5 py-16">
                <h1 className="text-2xl font-semibold">No program membership found</h1>
                <p className="mt-3 text-gray-300">We could not find a program membership for {me.email}. Sign in with the email you applied with, or apply at <a className="text-blue-300 underline" href="/founding">the program page</a>.</p>
            </main>
        );
    }

    const p = me.prices!;
    const fp = p[level].founding[interval];
    const sp = p[level][interval];
    const free = me.access === 'research_plus_tracking';

    return (
        <main className="mx-auto max-w-xl px-5 py-12">
            <h1 className="text-2xl font-semibold">Your TradeMind program</h1>
            <p className="mt-3 text-gray-300">
                {me.paid ? 'Your founding membership is active.' : free ? `Your free Research and Tracking access runs until ${date(me.free_access_ends)}.` : 'Your free access has ended. You are on Free Weekly and are not being charged.'}
            </p>
            {msg && <p className="mt-3 text-sm text-blue-300">{msg}</p>}

            {!me.paid && (
                <section className="mt-8 space-y-5">
                    <h2 className="text-lg font-semibold">Choose how to continue</h2>
                    <div className="rounded-xl border border-white/10 p-4">
                        <h3 className="font-medium">Research partner</h3>
                        <p className="mt-1 text-sm text-gray-300">Complete one short activity each month. Each one adds 30 more days free, up to six months in total. You never have to give positive feedback.</p>
                        <button className={`${btn} mt-3 bg-white/10`} onClick={() => choose('partner')}>Continue as a partner{me.path === 'partner' ? ' (chosen)' : ''}</button>
                    </div>
                    <div className="rounded-xl border border-white/10 p-4">
                        <h3 className="font-medium">Founding member</h3>
                        <p className="mt-1 text-sm text-gray-300">No feedback tasks. The founding price applies to your first 12 paid months on a monthly plan, or the first year on an annual plan. After that it is the current price.</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-sm">
                            <select className="rounded bg-black/40 px-2 py-1" value={level} onChange={(e) => setLevel(e.target.value as 'research' | 'tracking')}><option value="research">Research</option><option value="tracking">Research and Tracking</option></select>
                            <select className="rounded bg-black/40 px-2 py-1" value={interval} onChange={(e) => setInterval(e.target.value as 'month' | 'year')}><option value="month">Monthly</option><option value="year">Annual</option></select>
                        </div>
                        <p className="mt-2 text-sm">Founding price ${fp} per {interval === 'month' ? 'month' : 'year'}. Current price ${sp}.</p>
                        <p className="mt-1 text-xs text-gray-400">Billing starts only after your free access ends{me.billing_starts ? `, on or after ${date(me.billing_starts)}` : ''}. You start checkout yourself. Cancel online at any time.</p>
                        <button className={`${btn} mt-3 bg-white/10`} onClick={() => choose('founding')}>Choose founding price{me.path === 'founding' ? ' (chosen)' : ''}</button>
                        {me.path === 'founding' && (
                            <button disabled={!me.can_check_out} className={`${btn} ml-2 mt-3 bg-blue-600 disabled:opacity-40`} onClick={checkout}>Start founding membership</button>
                        )}
                    </div>
                    <div className="rounded-xl border border-white/10 p-4">
                        <h3 className="font-medium">Free Weekly</h3>
                        <p className="mt-1 text-sm text-gray-300">Return to the free weekly newsletter. No charge.</p>
                        <button className={`${btn} mt-3 bg-white/10`} onClick={() => choose('free')}>Return to Free Weekly</button>
                    </div>
                    <p className="text-xs text-gray-400">If you do nothing, you return to Free Weekly and are not charged.</p>
                </section>
            )}

            {me.path === 'partner' && !me.paid && (
                <section className="mt-8">
                    <h2 className="text-lg font-semibold">Monthly activities</h2>
                    <ul className="mt-2 space-y-1 text-sm text-gray-300">
                        {me.activities!.map((a) => (<li key={a.month}>Month {a.month}: {a.done ? 'completed' : `opens ${date(a.due)}`}</li>))}
                    </ul>
                </section>
            )}

            {me.paid && <button className={`${btn} mt-6 bg-white/10`} onClick={billing}>Manage billing and cancel</button>}
            <p className="mt-10 text-xs text-gray-500">Educational research, not investment advice. TradeMind never connects to a brokerage; you place every order yourself. Results shown so far are simulated, not live trading.</p>
        </main>
    );
}
