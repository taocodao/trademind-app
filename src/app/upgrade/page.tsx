'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { ArrowRight, CreditCard } from 'lucide-react';

function UpgradePageInner() {
    const searchParams = useSearchParams();
    const accountId = searchParams.get('accountId');
    const { ready, authenticated, login, getAccessToken } = usePrivy();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const startCheckout = async () => {
        if (!accountId) return;
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
                body: JSON.stringify({ accountId: Number(accountId) }),
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
        if (ready && authenticated && accountId) void startCheckout();
    }, [ready, authenticated, accountId]);

    if (ready && !authenticated) {
        return (
            <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
                <section className="w-full max-w-md text-center">
                    <h1 className="text-3xl font-bold mb-3">Sign in to continue</h1>
                    <p className="text-sm text-gray-400 mb-8">Subscriptions are attached to individual TradeMind accounts.</p>
                    <button onClick={login} className="w-full rounded-xl bg-tm-purple py-3 font-bold hover:bg-tm-purple/80">Sign in</button>
                    <a href="/accounts" className="inline-block mt-5 text-sm text-gray-400 hover:text-white">Back to accounts</a>
                </section>
            </main>
        );
    }

    if (accountId) {
        return (
            <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
                <section className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                    <CreditCard className="mx-auto mb-4 h-8 w-8 text-tm-purple" />
                    <h1 className="text-2xl font-bold">Preparing secure checkout</h1>
                    <p className="mt-3 text-sm text-gray-400">Your account plan and annual price are selected from its strategy.</p>
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
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-tm-purple">Account memberships</p>
                <h1 className="mt-3 text-3xl font-bold">Choose an account first</h1>
                <p className="mt-4 text-gray-400">Every account has its own annual membership. Create or select an account to get its first 30 days free, then subscribe when you are ready.</p>
                <a href="/accounts" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-tm-purple px-5 py-3 font-bold hover:bg-tm-purple/80">
                    Manage accounts <ArrowRight className="h-4 w-4" />
                </a>
                <p className="mt-5 text-xs text-gray-500">QQQ Basic is $252 per year. QQQ LEAPS is $336 per year. Yearly auto renew starts on by default.</p>
            </section>
        </main>
    );
}

export default function UpgradePage() {
    return <Suspense fallback={<main className="min-h-screen bg-black" />}><UpgradePageInner /></Suspense>;
}
