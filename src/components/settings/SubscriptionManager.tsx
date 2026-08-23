'use client';

import { useEffect, useState } from 'react';
import { CreditCard, ExternalLink, RefreshCw } from 'lucide-react';
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

    const setAutoRenew = async (membership: AccountMembership, enabled: boolean) => {
        setWorkingAccount(membership.account_id);
        try {
            const token = await getAccessToken();
            const response = await fetch('/api/stripe/cancel', {
                method: enabled ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ accountId: membership.account_id }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Unable to update auto renew');
            }
            await refresh();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Unable to update auto renew');
        } finally {
            setWorkingAccount(null);
        }
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
                        Create an account to start its 30 day free month.
                        <a href="/accounts" className="ml-2 text-tm-purple font-semibold">Manage accounts</a>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {memberships.map((membership) => {
                            const date = membership.status === 'free_month'
                                ? formatDate(membership.free_month_ends_at)
                                : formatDate(membership.current_period_end);
                            const canToggle = Boolean(membership.stripe_subscription_id) && ['active', 'past_due', 'canceled'].includes(membership.status);
                            return (
                                <div key={membership.account_id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-white">{membership.account_name}</p>
                                            <p className="text-[11px] text-tm-muted">{planLabel(membership.plan)} · {membership.status.replace('_', ' ')}</p>
                                        </div>
                                        <span className={`text-[10px] uppercase tracking-wide font-bold ${membership.entitled ? 'text-tm-green' : 'text-tm-muted'}`}>
                                            {membership.entitled ? 'Entitled' : 'Inactive'}
                                        </span>
                                    </div>
                                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-tm-muted">
                                        <span>{date ? membership.status === 'free_month' ? `Free month ends ${date}` : membership.cancel_at_period_end ? `Access ends ${date}` : `Renews ${date}` : 'Payment required'}</span>
                                        {canToggle && (
                                            <button
                                                onClick={() => void setAutoRenew(membership, membership.cancel_at_period_end)}
                                                disabled={workingAccount === membership.account_id}
                                                className="flex items-center gap-1 text-tm-purple hover:text-purple-300 disabled:opacity-60 font-semibold"
                                            >
                                                <RefreshCw className={`w-3 h-3 ${workingAccount === membership.account_id ? 'animate-spin' : ''}`} />
                                                {membership.cancel_at_period_end ? 'Turn on yearly auto renew' : 'Turn off yearly auto renew'}
                                            </button>
                                        )}
                                        {!membership.stripe_subscription_id && (
                                            <a href={`/upgrade?accountId=${membership.account_id}`} className="text-tm-purple hover:text-purple-300 font-semibold">Subscribe</a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
