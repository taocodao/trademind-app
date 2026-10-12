'use client';

import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

interface AccountMembership {
    account_id: number;
    account_name: string;
    account_strategy: string;
    plan: 'basic' | 'leaps';
    status: 'free_month' | 'awaiting_payment' | 'active' | 'past_due' | 'canceled' | 'expired';
    free_month_ends_at: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    stripe_subscription_id: string | null;
    entitled: boolean;
}

const planLabel = (plan: AccountMembership['plan']) => plan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic';
const formatDate = (date: string | null) => date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

export function SubscriptionManager() {
    const { getAccessToken } = usePrivy();
    const [memberships, setMemberships] = useState<AccountMembership[]>([]);
    const [loading, setLoading] = useState(true);
    const [workingAccount, setWorkingAccount] = useState<number | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);

    const refresh = async () => {
        setLoading(true);
        try {
            const token = await getAccessToken();
            const response = await fetch('/api/memberships', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await response.json();
            if (response.ok) setMemberships(data.memberships || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void refresh(); }, []);

    const call = async (membership: AccountMembership, method: 'POST' | 'PUT', extra: Record<string, unknown>) => {
        setWorkingAccount(membership.account_id);
        try {
            const token = await getAccessToken();
            const response = await fetch('/api/stripe/cancel', {
                method,
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ accountId: membership.account_id, ...extra }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Unable to update your subscription');
            if (data.refunded === true) alert('Canceled within your first month: the full payment has been refunded and access is now off.');
            await refresh();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Unable to update your subscription');
        } finally {
            setWorkingAccount(null);
        }
    };

    // Auto renew only: never refunds and never ends access early.
    const setAutoRenew = (membership: AccountMembership, enabled: boolean) =>
        call(membership, enabled ? 'PUT' : 'POST', enabled ? {} : { autoRenewOnly: true });

    // Cancel: full refund and access off if within the first month, otherwise stops renewal and access runs to the end date.
    const cancelSubscription = (membership: AccountMembership) => {
        if (!window.confirm('Cancel this subscription?\n\nIf your first payment was less than a month ago, you get a full refund and access ends right away. After that, the plan stops renewing and stays active until the end of the paid year.')) return;
        void call(membership, 'POST', {});
    };

    const openPortal = async () => {
        setPortalLoading(true);
        try {
            const token = await getAccessToken();
            const response = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({}),
            });
            const data = await response.json();
            if (data.url) window.location.href = data.url;
        } finally {
            setPortalLoading(false);
        }
    };

    return (
        <section className="glass-card overflow-hidden relative">
            <div className="p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-tm-purple" />
                        <h3 className="font-semibold text-sm">Account memberships</h3>
                    </div>
                    <button onClick={openPortal} disabled={portalLoading} className="flex items-center gap-1 text-xs font-semibold text-tm-purple hover:text-purple-300 disabled:opacity-60">
                        {portalLoading ? 'Opening' : 'Billing portal'} <ExternalLink className="w-3 h-3" />
                    </button>
                </div>

                {loading ? (
                    <div className="py-6 text-center text-xs text-tm-muted">Loading memberships</div>
                ) : memberships.length === 0 ? (
                    <div className="rounded-lg border border-white/10 p-4 text-xs text-tm-muted">
                        No memberships yet. Subscribe to a plan and the account is created automatically.
                        <a href="/plans" className="ml-2 text-tm-purple font-semibold">See pricing</a>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {memberships.map((membership) => {
                            const date = membership.status === 'free_month'
                                ? formatDate(membership.free_month_ends_at)
                                : formatDate(membership.current_period_end);
                            const subscribed = Boolean(membership.stripe_subscription_id) && ['active', 'past_due', 'canceled'].includes(membership.status);
                            const autoOn = subscribed && !membership.cancel_at_period_end;
                            const busy = workingAccount === membership.account_id;
                            return (
                                <div key={membership.account_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{membership.account_name}</p>
                                            <p className="text-[11px] text-tm-muted">{planLabel(membership.plan)}</p>
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-wide font-bold ${membership.entitled ? 'text-tm-green' : 'text-tm-muted'}`}>
                                            {subscribed ? (membership.cancel_at_period_end ? 'Ends ' + (date ?? '') : 'Active') : 'Not subscribed'}
                                        </span>
                                    </div>
                                    {subscribed ? (
                                        <div className="mt-3 space-y-3">
                                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                                                <span className="text-xs text-white">
                                                    Auto renew yearly
                                                    <span className="block text-[11px] text-tm-muted">
                                                        {autoOn ? (date ? `Renews on ${date}` : 'Renews yearly') : `Will not renew. Access ends ${date ?? 'at the end of the paid year'}`}
                                                    </span>
                                                </span>
                                                <input type="checkbox" checked={autoOn} disabled={busy}
                                                    onChange={() => void setAutoRenew(membership, !autoOn)}
                                                    className="w-5 h-5 accent-purple-500 shrink-0" />
                                            </label>
                                            {membership.entitled && (
                                                <button onClick={() => cancelSubscription(membership)} disabled={busy}
                                                    className="w-full rounded-lg border border-red-500/40 text-red-300 hover:bg-red-500/10 text-xs font-semibold py-2 disabled:opacity-60">
                                                    {busy ? 'Working' : 'Cancel subscription'}
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-tm-muted">
                                            <span>No active subscription for this account.</span>
                                            <a href="/plans" className="text-tm-purple hover:text-purple-300 font-semibold">Choose a plan</a>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
