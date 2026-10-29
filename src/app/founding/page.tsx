'use client';

import { useState } from 'react';

const input = 'mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm';

export default function FoundingApply() {
    const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
    const [error, setError] = useState('');

    async function submit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setState('sending');
        const f = new FormData(e.currentTarget);
        const body = {
            email: f.get('email'), name: f.get('name'), role: f.get('role'), track: f.get('track'),
            years_investing: f.get('years'), paid_research_last_year: f.get('paid'),
            used_and_stopped: f.get('stopped'), problem_to_solve: f.get('problem'),
            delivery_preference: f.get('delivery'), can_do_monthly_activity: f.get('activity') === 'yes',
            interview_ok: f.get('interview') === 'on', heard_about_us: f.get('heard'), source: new URLSearchParams(window.location.search).get('source') || '', outreach_token: new URLSearchParams(window.location.search).get('t') || '',
            consent: f.get('consent') === 'on', website: f.get('website'),
        };
        const r = await fetch('/api/program/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (r.ok) setState('done');
        else { setError((await r.json().catch(() => ({}))).error || 'Something went wrong.'); setState('error'); }
    }

    if (state === 'done') {
        return (
            <main className="mx-auto max-w-xl px-5 py-16">
                <h1 className="text-2xl font-semibold">Thank you for applying</h1>
                <p className="mt-3 text-gray-300">We review every application by hand. If you are selected, we email you with the start of your 4 month study. No card is needed and nothing is charged.</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-xl px-5 py-12">
            <h1 className="text-3xl font-semibold">Join the TradeMind 4 month study</h1>
            <p className="mt-4 text-gray-300">
                We are opening a small 4 month study for readers who follow rules based QQQ strategies. There are 20 seats, and we review every application by hand.
                Accepted readers follow the signals with a virtual account for 4 months at no charge. At the end of each month there is a short survey. Every month you pass adds 3 free months for one account at the end. Stay 2 months and pass both, and you have 2 months plus 6 months. Stay all 4 and you have 4 plus 12. You can leave at any time.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-gray-300">
                <li>No card is needed. Nothing turns into a paid plan automatically. You only pay if you choose to buy a plan yourself.</li>
                <li>You never need to trade, deposit money, write a review or refer anyone.</li>
                <li>Honest criticism is welcome.</li>
                <li>TradeMind never connects to your broker. You place every order yourself. Results shown so far are simulated, not live trading.</li>
            </ul>

            <p className="mt-4 text-sm"><a href="/founding/sample" className="text-blue-300 underline">See a sample daily briefing first</a></p>

            <form onSubmit={submit} className="mt-8 space-y-4">
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
                <label className="block text-sm">Email address<input required type="email" name="email" className={input} /></label>
                <label className="block text-sm">Name (optional)<input name="name" className={input} /></label>
                <label className="block text-sm">Your role
                    <select name="role" className={input} defaultValue="self_directed"><option value="self_directed">Self-directed investor</option><option value="educator">Educator or newsletter author</option><option value="other">Other</option></select>
                </label>
                <label className="block text-sm">Track you are most interested in
                    <select required name="track" className={input} defaultValue=""><option value="" disabled>Choose one</option><option value="etf">ETF strategy (QQQ Defensive)</option><option value="options">Options strategy (QQQ LEAPS)</option><option value="research_only">Research only</option></select>
                </label>
                <label className="block text-sm">Years investing on your own<input name="years" className={input} /></label>
                <label className="block text-sm">Paid investment research in the last year?
                    <select name="paid" className={input} defaultValue="no"><option value="no">No</option><option value="yes">Yes</option></select>
                </label>
                <label className="block text-sm">What did you use, and why did you stop?<textarea name="stopped" rows={2} className={input} /></label>
                <label className="block text-sm">What problem do you want solved?<textarea name="problem" rows={3} className={input} /></label>
                <label className="block text-sm">How often do you want to hear from us?
                    <select name="delivery" className={input} defaultValue="daily"><option value="daily">Daily briefing plus alerts</option><option value="weekly">Weekly summary plus alerts</option><option value="alerts">Strategy change alerts only</option></select>
                </label>
                <label className="block text-sm">Could you do one 5 minute survey a month?
                    <select name="activity" className={input} defaultValue="yes"><option value="yes">Yes</option><option value="no">No</option></select>
                </label>
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="interview" className="mt-1" />I am open to an optional short interview.</label>
                <label className="block text-sm">How did you hear about us?<input name="heard" className={input} /></label>
                <p className="text-xs text-gray-400">Please do not share account numbers, balances, broker logins or net worth. We never ask for them.</p>
                <label className="flex items-start gap-2 text-sm"><input required type="checkbox" name="consent" className="mt-1" />I agree that TradeMind may store these answers and contact me about this program. Applying is not a purchase.</label>
                {state === 'error' && <p className="text-sm text-red-300">{error}</p>}
                <button disabled={state === 'sending'} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium disabled:opacity-50">{state === 'sending' ? 'Sending' : 'Apply'}</button>
            </form>
        </main>
    );
}
