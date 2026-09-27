'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowRight, CreditCard } from 'lucide-react';
import { PRICING } from '@/lib/pricing-config';

function UpgradePageInner() {
    const searchParams = useSearchParams();
    const accountId = searchParams.get('accountId');
    const planParam = searchParams.get('plan');
    const emailParam = searchParams.get('email');
    const { ready, authenticated, login, getAccessToken } = usePrivy();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const plan = planParam === 'leaps' ? 'leaps' : planParam === 'basic' ? 'basic' : null;
    const planInfo = plan === 'leaps'
        ? { label: PRICING.plans.qqq_leaps.label, price: PRICING.plans.qqq_leaps.annual }
        : plan === 'basic'
            ? { label: PRICING.plans.turbocore_pro_bundle.label, price: PRICING.plans.turbocore_pro_bundle.annual }
            : null;

    const startCheckout = async () => {
        if (!accountId && !plan) return;
        setLoading(true);
        setError(null);
        try {
            const token = await getAccessToken();
            const response = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    ...(accountId ? { accountId: Number(accountId) } : {}),
                    ...(plan ? { plan } : {}),
                    ...(emailParam ? { newsletterEmail: emailParam } : {}),
                }),
            });
            const data = await response.json();
            if (!response.ok || !data.url) throw new Error(data.error || 'Unable to start checkout');
            window.location.href = data.url;
        } catch (checkoutError) {
            setError(checkoutError instanceof Error ? checkoutError.message : 'Unable to start checkout');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ready && authenticated && (accountId || plan)) void startCheckout();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, authenticated, accountId, plan]);

    if (ready && !authenticated) {
        return (
            <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
                <section className="w-full max-w-md text-center">
                    <h1 className="text-3xl font-bold mb-3">Sign in to continue</h1>
                    <p className="text-sm text-gray-400 mb-8">
                        {planInfo
                            ? emailParam
                                ? `${planInfo.label} is $${planInfo.price} per year after a free first month. Sign in with ${emailParam}; it is already filled in for you, then check out.`
                                : `${planInfo.label} is $${planInfo.price} per year after a free first month. Log in with the email that gets your signal alerts, then check out.`
                            : 'Log in to subscribe or manage a plan.'}
                    </p>
                    <button
                        onClick={() => login(emailParam && emailParam.includes('@') ? { prefill: { type: 'email', value: emailParam } } : {})}
                        className="w-full rounded-xl bg-tm-purple py-3 font-bold hover:bg-tm-purple/80"
                    >Sign in</button>
                    <a href="/#pricing" className="inline-block mt-5 text-sm text-gray-400 hover:text-white">Back to pricing</a>
                </section>
            </main>
        );
    }

    if (accountId || plan) {
        return (
            <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
                <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <CreditCard className="mx-auto mb-4 h-8 w-8 text-tm-purple" />
                    <h1 className="text-2xl font-bold">Preparing secure checkout</h1>
                    <p className="mt-3 text-sm text-gray-400">
                        {planInfo
                            ? `${planInfo.label}: free for the first month, then $${planInfo.price} per year. No charge today. Turn off auto renew any time and access runs to the end of the free month.`
                            : 'Free for the first month. No charge today. Turn off auto renew any time and access runs to the end of the free month.'}
                    </p>
                    {error ? (
                        <>
                            <p className="mt-4 text-sm text-tm-red">{error}</p>
                            <button onClick={() => void startCheckout()} disabled={loading} className="mt-5 rounded-lg bg-tm-purple px-4 py-2 text-sm font-bold disabled:opacity-60">
                                {loading ? 'Trying again' : 'Try again'}
                            </button>
                        </>
                    ) : (
                        <div className="mt-6 h-6 w-6 mx-auto animate-spin rounded-full border-2 border-tm-purple/30 border-t-tm-purple" />
                    )}
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
            <section className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-tm-purple">TradeMind plans</p>
                <h1 className="mt-3 text-3xl font-bold">Pick a plan to start</h1>
                <p className="mt-4 text-gray-400">Your account is created automatically when checkout completes, with signal defaults you can adjust afterward. Each plan is its own annual membership.</p>
                <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                    <a href="/upgrade?plan=basic" className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#4f8ef7]/50 px-5 py-3 font-bold hover:bg-[#4f8ef7]/10">
                        QQQ Basic ${PRICING.plans.turbocore_pro_bundle.annual}/yr <ArrowRight className="h-4 w-4" />
                    </a>
                    <a href="/upgrade?plan=leaps" className="inline-flex items-center justify-center gap-2 rounded-xl bg-tm-purple px-5 py-3 font-bold hover:bg-tm-purple/80">
                        QQQ LEAPS ${PRICING.plans.qqq_leaps.annual}/yr <ArrowRight className="h-4 w-4" />
                    </a>
                </div>
                <p className="mt-5 text-xs text-gray-500">Signals process at 3:30 PM ET each trading day and arrive by email. First month free; the first yearly charge comes on day 30. Yearly auto renew starts on by default, and you can turn it off any time.</p>
            </section>
        </main>
    );
}

export default function UpgradePage() {
    return <Suspense fallback={<main className="min-h-screen bg-black" />}><UpgradePageInner /></Suspense>;
}
