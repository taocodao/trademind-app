'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Gift, Users } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { ShareSection } from '@/components/referral/ShareSection';

type Account = {
    id: number;
    name: string;
    strategy: string;
    membership?: { plan: 'basic' | 'leaps'; status: string; pending_bonus_days?: number } | null;
};

export default function ReferPage() {
    const { authenticated, ready } = usePrivy();
    const router = useRouter();
    const [data, setData] = useState<any>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // Per-event apply state: chosen account, dollar amount, saving flag
    const [applyChoice, setApplyChoice] = useState<Record<string, number | ''>>({});
    const [applyAmount, setApplyAmount] = useState<Record<string, string>>({});
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [applyMessage, setApplyMessage] = useState<string | null>(null);

    const load = useCallback(async () => {
        const [referralResponse, accountsResponse] = await Promise.all([fetch('/api/referrals'), fetch('/api/accounts')]);
        if (!referralResponse.ok) throw new Error('Unable to load referral details');
        if (!accountsResponse.ok) throw new Error('Unable to load your accounts');
        const [referralData, accountsData] = await Promise.all([referralResponse.json(), accountsResponse.json()]);
        setData(referralData);
        setAccounts(accountsData.accounts ?? []);
    }, []);

    useEffect(() => {
        if (ready && !authenticated) {
            router.push('/signin');
            return;
        }
        if (ready && authenticated) {
            load().catch((err) => setError(err.message)).finally(() => setLoading(false));
        }
    }, [authenticated, load, ready, router]);

    async function applyReward(eventId: string) {
        const accountId = applyChoice[eventId];
        const dollars = Number(applyAmount[eventId]);
        if (!accountId || !dollars || dollars <= 0) return;
        setApplyingId(eventId);
        setApplyMessage(null);
        setError(null);
        try {
            const response = await fetch('/api/referrals/apply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId, accountId, dollars }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? 'Unable to apply reward');
            await load();
            setApplyMessage(result.parked
                ? `${result.days} days parked on that account for its next checkout${result.remainingDollars > 0 ? `, $${result.remainingDollars} still available` : ''}.`
                : `${result.days} days added to that account's subscription${result.remainingDollars > 0 ? `, $${result.remainingDollars} still available` : ''}.`);
        } catch (err: any) {
            setError(err.message ?? 'Unable to apply reward');
        } finally {
            setApplyingId(null);
        }
    }

    // Live conversion preview for the amount input: dollars -> days at the
    // selected account's plan rate ($21/mo Basic, $28/mo LEAPS effective).
    function daysPreview(eventId: string): string | null {
        const accountId = applyChoice[eventId];
        const dollars = Number(applyAmount[eventId]);
        if (!accountId || !dollars || dollars <= 0) return null;
        const account = accounts.find((a) => a.id === accountId);
        if (!account) return null;
        const monthly = account.membership?.plan === 'leaps' ? 28 : 21;
        const days = Math.floor((dollars * 30) / monthly);
        return days > 0 ? `= ${days} days on ${account.name}` : null;
    }

    if (!ready || loading) {
        return <div className="flex min-h-screen items-center justify-center bg-tm-bg"><div className="h-8 w-8 animate-spin rounded-full border-4 border-tm-purple border-t-transparent" /></div>;
    }
    if (error && !data) return <div className="flex min-h-screen items-center justify-center bg-tm-bg px-6 text-red-400">{error}</div>;

    const program = data?.program;

    return (
        <main className="mx-auto min-h-screen max-w-4xl bg-tm-bg px-4 pb-24 pt-6 text-white">
            <header className="mb-8 flex items-center gap-3">
                <button aria-label="Return to accounts" onClick={() => router.push('/accounts')} className="-ml-2 p-2 text-tm-muted transition-colors hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
                <h1 className="text-2xl font-bold">Referral dashboard</h1>
            </header>

            <section className="mb-6 overflow-hidden rounded-2xl border border-tm-purple/30 bg-gradient-to-br from-tm-purple/15 to-transparent p-6">
                <div className="mb-4 flex items-center gap-3"><Gift className="h-6 w-6 text-purple-300" /><h2 className="text-xl font-bold">Give a friend extra time. Earn your own.</h2></div>
                <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">Your friend starts with the same free month. When they subscribe, we add about two extra months to their plan, a $50 grant in subscription days ({program?.refereeDaysBasic ?? 71} days on QQQ Basic or {program?.refereeDaysLeaps ?? 53} on QQQ LEAPS).</p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">Once they stay active for {program?.vestingDays ?? 14} days, you get a $100 grant in subscription days, about four months ({program?.referrerDaysBasic ?? 142} days on QQQ Basic or {program?.referrerDaysLeaps ?? 107} on QQQ LEAPS). Apply any amount of it to any of your accounts, whenever you like.</p>
            </section>

            {data?.code ? <div className="mb-6"><ShareSection promoCode={data.code} referralLink={data.shareLink} userTier="member" isCreator={false} /></div> : null}

            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-tm-border bg-tm-surface p-5"><Users className="mb-3 h-5 w-5 text-blue-400" /><p className="text-xs uppercase tracking-wide text-tm-muted">Successful referrals</p><p className="mt-1 text-2xl font-black">{data?.totalReferrals ?? 0}</p></div>
                <div className="rounded-xl border border-tm-border bg-tm-surface p-5"><Gift className="mb-3 h-5 w-5 text-emerald-400" /><p className="text-xs uppercase tracking-wide text-tm-muted">Days earned</p><p className="mt-1 text-2xl font-black">{data?.totalEarnedDays ?? 0}</p></div>
                <div className="rounded-xl border border-tm-border bg-tm-surface p-5"><Clock className="mb-3 h-5 w-5 text-amber-400" /><p className="text-xs uppercase tracking-wide text-tm-muted">Days pending</p><p className="mt-1 text-2xl font-black">{data?.pendingDays ?? 0}</p></div>
            </section>

            <section className="rounded-2xl border border-tm-border bg-tm-surface p-5">
                <h2 className="mb-4 text-lg font-bold">Referral activity</h2>
                {!data?.recentEvents?.length ? <p className="text-sm text-tm-muted">No referrals yet. Share your link above to get started.</p> : (
                    <div className="space-y-3">
                        {data.recentEvents.map((event: any) => {
                            const grant = Number(event.grant_dollars ?? program?.referrerDollars ?? 100);
                            const appliedDollars = Number(event.applied_dollars ?? 0);
                            const remainingDollars = Math.round((grant - appliedDollars) * 100) / 100;
                            const claimable = event.status === 'vested' && !event.void_reason && remainingDollars > 0.004;
                            const fullyApplied = event.status === 'vested' && !event.void_reason && remainingDollars <= 0.004 && appliedDollars > 0;
                            return (
                                <div key={event.id} className="flex flex-col gap-2 rounded-xl border border-tm-border/70 bg-tm-bg/40 p-4">
                                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold capitalize">
                                                {claimable ? `Reward ready - $${remainingDollars} available` : fullyApplied ? 'Applied' : event.status}
                                            </p>
                                            <p className="text-xs text-tm-muted">
                                                {event.status === 'pending'
                                                    ? `Vests ${event.vests_at ? new Date(event.vests_at).toLocaleDateString() : `after ${program?.vestingDays ?? 14} active days`}`
                                                    : event.void_reason
                                                        ? `Not granted: ${event.void_reason.replace('_', ' ')}`
                                                        : appliedDollars > 0
                                                            ? `$${appliedDollars} applied (${event.referrer_days ?? 0} days)${claimable ? `, $${remainingDollars} left` : ''}`
                                                            : ''}
                                            </p>
                                        </div>
                                        <p className="text-xs text-tm-muted">{event.converted_at ? new Date(event.converted_at).toLocaleDateString() : 'Awaiting first payment'}</p>
                                    </div>
                                    {claimable && (
                                        accounts.length === 0 ? (
                                            <p className="text-xs text-amber-200">Create an account to apply this reward. It stays here waiting.</p>
                                        ) : (
                                            <div>
                                                <div className="flex flex-col gap-2 sm:flex-row">
                                                    <label className="sr-only" htmlFor={`apply-account-${event.id}`}>Apply to account</label>
                                                    <select
                                                        id={`apply-account-${event.id}`}
                                                        value={applyChoice[event.id] ?? ''}
                                                        onChange={(e) => setApplyChoice((prev) => ({ ...prev, [event.id]: Number(e.target.value) || '' }))}
                                                        className="min-w-0 flex-1 rounded-xl border border-tm-border bg-tm-bg px-3 py-2.5 text-sm text-white focus:border-tm-purple focus:outline-none"
                                                    >
                                                        <option value="">Apply to account...</option>
                                                        {accounts.map((account) => (
                                                            <option key={account.id} value={account.id}>
                                                                {account.name} ({account.membership?.plan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic'})
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="flex items-center gap-1 rounded-xl border border-tm-border bg-tm-bg px-3 py-2.5">
                                                        <span className="text-sm text-tm-muted">$</span>
                                                        <label className="sr-only" htmlFor={`apply-amount-${event.id}`}>Amount in dollars</label>
                                                        <input
                                                            id={`apply-amount-${event.id}`}
                                                            type="number" min={1} max={remainingDollars} step="0.01"
                                                            placeholder={remainingDollars.toFixed(0)}
                                                            value={applyAmount[event.id] ?? ''}
                                                            onChange={(e) => setApplyAmount((prev) => ({ ...prev, [event.id]: e.target.value }))}
                                                            className="w-20 bg-transparent text-sm text-white focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setApplyAmount((prev) => ({ ...prev, [event.id]: String(remainingDollars) }))}
                                                            className="text-[10px] font-bold uppercase text-tm-purple hover:text-white"
                                                        >
                                                            Max
                                                        </button>
                                                    </div>
                                                    <button
                                                        disabled={!applyChoice[event.id] || !(Number(applyAmount[event.id]) > 0) || Number(applyAmount[event.id]) > remainingDollars || applyingId === event.id}
                                                        onClick={() => applyReward(event.id)}
                                                        className="rounded-xl bg-tm-purple px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-tm-purple/90 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        {applyingId === event.id ? 'Applying' : 'Apply'}
                                                    </button>
                                                </div>
                                                {daysPreview(event.id) && (
                                                    <p className="mt-1.5 text-[11px] text-tm-muted">{daysPreview(event.id)}</p>
                                                )}
                                            </div>
                                        )
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                {applyMessage && <p className="mt-3 text-xs text-emerald-400">{applyMessage}</p>}
                {error && data && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </section>

            <p className="mt-6 text-center text-xs text-tm-muted">Day grants are subscription benefits, not cash. <Link href="/terms" className="text-tm-purple hover:underline">Terms apply.</Link></p>
        </main>
    );
}
