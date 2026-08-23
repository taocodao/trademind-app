'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Gift, Users } from 'lucide-react';
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
    const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const [referralResponse, accountsResponse] = await Promise.all([fetch('/api/referrals'), fetch('/api/accounts')]);
        if (!referralResponse.ok) throw new Error('Unable to load referral details');
        if (!accountsResponse.ok) throw new Error('Unable to load your accounts');
        const [referralData, accountsData] = await Promise.all([referralResponse.json(), accountsResponse.json()]);
        setData(referralData);
        setAccounts(accountsData.accounts ?? []);
        setSelectedAccountId(referralData.rewardAccount?.accountId ?? null);
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

    async function saveRewardAccount() {
        if (!selectedAccountId) return;
        setSaving(true);
        setMessage(null);
        try {
            const response = await fetch('/api/referrals', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId: selectedAccountId }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error ?? 'Unable to save reward account');
            await load();
            setMessage('Reward account saved. New vested referral days will be sent there.');
        } catch (err: any) {
            setError(err.message ?? 'Unable to save reward account');
        } finally {
            setSaving(false);
        }
    }

    if (!ready || loading) {
        return <div className="flex min-h-screen items-center justify-center bg-tm-bg"><div className="h-8 w-8 animate-spin rounded-full border-4 border-tm-purple border-t-transparent" /></div>;
    }
    if (error && !data) return <div className="flex min-h-screen items-center justify-center bg-tm-bg px-6 text-red-400">{error}</div>;

    const program = data?.program;
    const rewardAccount = data?.rewardAccount;
    const configured = Boolean(rewardAccount);
    const accountName = accounts.find((account) => account.id === rewardAccount?.accountId)?.name;

    return (
        <main className="mx-auto min-h-screen max-w-4xl bg-tm-bg px-4 pb-24 pt-6 text-white">
            <header className="mb-8 flex items-center gap-3">
                <button aria-label="Return to dashboard" onClick={() => router.push('/dashboard')} className="-ml-2 p-2 text-tm-muted transition-colors hover:text-white"><ArrowLeft className="h-5 w-5" /></button>
                <h1 className="text-2xl font-bold">Referral dashboard</h1>
            </header>

            <section className="mb-6 overflow-hidden rounded-2xl border border-tm-purple/30 bg-gradient-to-br from-tm-purple/15 to-transparent p-6">
                <div className="mb-4 flex items-center gap-3"><Gift className="h-6 w-6 text-purple-300" /><h2 className="text-xl font-bold">Give days, earn days</h2></div>
                <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">Your friend receives a $50 day grant after their first payment, about {program?.refereeDaysBasic ?? 71} days on QQQ Basic or {program?.refereeDaysLeaps ?? 53} days on QQQ LEAPS. Referred friends skip the free month and pay when they subscribe.</p>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">You receive a $100 day grant on your selected reward account after your friend stays active for {program?.vestingDays ?? 75} days, about {program?.referrerDaysBasic ?? 142} days on QQQ Basic or {program?.referrerDaysLeaps ?? 107} days on QQQ LEAPS.</p>
            </section>

            <section className="mb-6 rounded-2xl border border-tm-border bg-tm-surface p-5">
                <div className="mb-4 flex items-start gap-3"><CalendarDays className="mt-0.5 h-5 w-5 text-tm-purple" /><div><h2 className="font-bold">Choose your reward account</h2><p className="mt-1 text-xs leading-relaxed text-tm-muted">Vested $100 day grants go to this account. If it has no paid subscription yet, days are parked for its next checkout.</p></div></div>
                {accounts.length === 0 ? (
                    <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">Create an account before sharing a referral link.</p>
                ) : (
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <label className="sr-only" htmlFor="reward-account">Reward account</label>
                        <select id="reward-account" value={selectedAccountId ?? ''} onChange={(event) => setSelectedAccountId(Number(event.target.value) || null)} className="min-w-0 flex-1 rounded-xl border border-tm-border bg-tm-bg px-3 py-3 text-sm text-white focus:border-tm-purple focus:outline-none">
                            <option value="">Select an account</option>
                            {accounts.map((account) => <option key={account.id} value={account.id}>{account.name} · {account.strategy.replace('_', ' ')} · {account.membership?.plan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic'}</option>)}
                        </select>
                        <button disabled={!selectedAccountId || saving} onClick={saveRewardAccount} className="rounded-xl bg-tm-purple px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-tm-purple/90 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving' : 'Save account'}</button>
                    </div>
                )}
                {configured && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-400"><CheckCircle2 className="h-4 w-4" />Reward account: {accountName ?? `Account ${rewardAccount.accountId}`}{rewardAccount.pendingBonusDays ? `, ${rewardAccount.pendingBonusDays} days parked` : ''}</p>}
                {message && <p className="mt-3 text-xs text-emerald-400">{message}</p>}
                {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
            </section>

            {configured ? <div className="mb-6"><ShareSection promoCode={data.code} referralLink={data.shareLink} userTier="member" isCreator={false} /></div> : <section className="mb-6 rounded-2xl border border-dashed border-tm-border p-5 text-sm text-tm-muted">Select and save a reward account to reveal your referral link.</section>}

            <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-tm-border bg-tm-surface p-5"><Users className="mb-3 h-5 w-5 text-blue-400" /><p className="text-xs uppercase tracking-wide text-tm-muted">Successful referrals</p><p className="mt-1 text-2xl font-black">{data?.totalReferrals ?? 0}</p></div>
                <div className="rounded-xl border border-tm-border bg-tm-surface p-5"><Gift className="mb-3 h-5 w-5 text-emerald-400" /><p className="text-xs uppercase tracking-wide text-tm-muted">Days vested</p><p className="mt-1 text-2xl font-black">{data?.totalEarnedDays ?? 0}</p></div>
                <div className="rounded-xl border border-tm-border bg-tm-surface p-5"><Clock className="mb-3 h-5 w-5 text-amber-400" /><p className="text-xs uppercase tracking-wide text-tm-muted">Days pending</p><p className="mt-1 text-2xl font-black">{data?.pendingDays ?? 0}</p></div>
            </section>

            <section className="rounded-2xl border border-tm-border bg-tm-surface p-5">
                <h2 className="mb-4 text-lg font-bold">Referral activity</h2>
                {!data?.recentEvents?.length ? <p className="text-sm text-tm-muted">No referrals yet. Share your link after choosing a reward account.</p> : <div className="space-y-3">{data.recentEvents.map((event: any) => <div key={event.id} className="flex flex-col gap-1 rounded-xl border border-tm-border/70 bg-tm-bg/40 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold capitalize">{event.status}</p><p className="text-xs text-tm-muted">{event.status === 'pending' ? `Referrer grant vests after ${program?.vestingDays ?? 75} active days` : event.void_reason ? `Not granted: ${event.void_reason.replace('_', ' ')}` : `${event.referrer_days ?? 0} days granted`}</p></div><p className="text-xs text-tm-muted">{event.converted_at ? new Date(event.converted_at).toLocaleDateString() : 'Awaiting first payment'}</p></div>)}</div>}
            </section>

            <p className="mt-6 text-center text-xs text-tm-muted">Day grants are subscription benefits, not cash. <Link href="/terms" className="text-tm-purple hover:underline">Terms apply.</Link></p>
        </main>
    );
}
