'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';

type Me = {
    member: boolean; email?: string; path?: string; access?: string; free_access_ends?: string;
    paid?: boolean;
    activities?: { month: number; due: string; done: boolean }[];
};

const date = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');
const btn = 'rounded-lg px-4 py-2 text-sm font-medium';

export default function ChoosePage() {
    const { ready, authenticated, login, getAccessToken } = usePrivy();
    const [me, setMe] = useState<Me | null>(null);
    const [msg, setMsg] = useState('');
    const [items, setItems] = useState<string[]>(['', '', '']);

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

    async function stepAway() {
        setMsg('');
        const r = await call('/api/program/choose', { method: 'POST', body: JSON.stringify({ action: 'path', path: 'free' }) });
        setMsg(r.ok ? 'Saved. Your preview access has ended.' : (await r.json().catch(() => ({}))).error || 'Failed.');
        await load();
    }
    async function complete(month: number) {
        setMsg('');
        const r = await call('/api/program/choose', { method: 'POST', body: JSON.stringify({ action: 'activity', month, answers: { items: items.map((x) => x.trim()) } }) });
        setMsg(r.ok ? 'Thank you. Your access has been extended.' : (await r.json().catch(() => ({}))).error || 'Failed.');
        if (r.ok) setItems(['', '', '']);
        await load();
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

    const active = me.access === 'research_plus_tracking';

    return (
        <main className="mx-auto max-w-xl px-5 py-12">
            <h1 className="text-2xl font-semibold">Your TradeMind 4 month study</h1>
            <p className="mt-3 text-gray-300">
                {me.paid ? 'You have a paid plan.' : active ? `Your free study access runs until ${date(me.free_access_ends)}. No card is on file.` : 'Your free study access has ended. You are not being charged.'}
            </p>
            {msg && <p className="mt-3 text-sm text-blue-300">{msg}</p>}

            {!me.paid && me.path !== 'free' && (
                <section className="mt-8">
                    <h2 className="text-lg font-semibold">Monthly surveys</h2>
                    <p className="mt-1 text-sm text-gray-300">To pass a month, send at least 3 pieces of feedback: suggestions, problems you hit in the app and questions all count. Each month you pass adds 3 free months for one account, worth about $90 on QQQ Defensive or $120 on QQQ LEAPS. Stay 2 months and pass both, and you have 2 months plus 6 months. You can leave at any time. A real attempt counts, and "I did not use it" is a valid answer.</p>
                    <ul className="mt-3 space-y-3 text-sm text-gray-300">
                        {me.activities!.map((a) => {
                            const open = !a.done && new Date() >= new Date(a.due);
                            return (
                                <li key={a.month} className="rounded-xl border border-white/10 p-3">
                                    Month {a.month} survey: {a.done ? 'completed' : open ? 'open now' : `opens ${date(a.due)}`}
                                    {open && (
                                        <div className="mt-2">
                                            <p className="mb-2 text-xs text-gray-400">Send at least 3 pieces of feedback. A suggestion, a problem you hit while using the app or a question each count as one.</p>
                                            {items.map((v, i) => (
                                                <textarea key={i} value={v} onChange={(e) => setItems(items.map((x, j) => (j === i ? e.target.value : x)))} rows={2} placeholder={`Feedback ${i + 1}: a suggestion, an issue or a question`} className="mb-2 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm" />
                                            ))}
                                            <button type="button" className="mb-2 text-xs text-blue-300 underline" onClick={() => setItems([...items, ''])}>Add another</button><br />
                                            <button className={`${btn} mt-2 bg-blue-600`} onClick={() => complete(a.month)}>Submit</button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            {!me.paid && (
                <section className="mt-8 space-y-3">
                    <h2 className="text-lg font-semibold">Keep the signals</h2>
                    <p className="text-sm text-gray-300">You can buy a plan yourself at any time. Newsletter subscribers pay 30% less. Nothing is charged unless you complete checkout.</p>
                    <a href="/plans" className={`${btn} inline-block bg-blue-600`}>See plans</a>
                    {me.path !== 'free' && <div><button className={`${btn} mt-2 bg-white/10`} onClick={stepAway}>End my study access now</button></div>}
                    <p className="text-xs text-gray-400">If you do nothing, access ends on the date above and you are not charged.</p>
                </section>
            )}

            <p className="mt-10 text-xs text-gray-500">Educational research, not investment advice. TradeMind never connects to a brokerage; you place every order yourself. Results shown so far are simulated, not live trading.</p>
        </main>
    );
}
