'use client';

import { useState } from 'react';
import { CreditCard, CheckCircle, ArrowRight } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export function SubscriptionManager({ currentTier }: { currentTier: string }) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleCheckout = async (priceId: string, isAnnual: boolean = false) => {
        setLoading(priceId);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priceId, isAnnual }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error);
            }
        } catch (err) {
            console.error('Checkout failed', err);
            alert('Failed to initiate checkout. Check console for details.');
        } finally {
            setLoading(null);
        }
    };

    const isCompounder = currentTier === 'compounder' || currentTier === 'compounder_family';

    return (
        <section className="glass-card overflow-hidden relative">
            {isCompounder && (
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-tm-purple to-pink-500" />
            )}

            <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                    <CreditCard className="w-5 h-5 text-tm-purple" />
                    <h3 className="font-semibold text-sm">Subscription Plan</h3>
                </div>

                {isCompounder ? (
                    <div className="bg-tm-green/10 border border-tm-green/20 rounded-xl p-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-tm-green font-bold flex items-center gap-1.5">
                                    <CheckCircle className="w-4 h-4" /> Compounder Tier Active
                                </p>
                                <p className="text-xs text-tm-muted mt-1 leading-relaxed">
                                    You have full access to automated executions, live position management, and premium signals.
                                </p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs text-tm-muted">
                            You are currently on the free <strong className="text-tm-text">Observer</strong> tier.
                            Upgrade to unlock automated live trading on Tastytrade.
                        </p>

                        <div className="bg-tm-bg/50 border border-white/5 rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold">Compounder Monthly</h4>
                                    <p className="text-2xl font-black font-mono mt-1">$59<span className="text-sm font-normal text-tm-muted">/mo</span></p>
                                </div>
                                <button
                                    onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_COMPOUNDER_MONTHLY_PRICE_ID || '')}
                                    disabled={loading !== null}
                                    className="btn-primary text-xs flex items-center gap-1"
                                >
                                    {loading === process.env.NEXT_PUBLIC_STRIPE_COMPOUNDER_MONTHLY_PRICE_ID ? 'Loading...' : 'Upgrade'} <ArrowRight className="w-3 h-3" />
                                </button>
                            </div>

                            <hr className="border-white/5" />

                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-bold flex items-center gap-2">
                                        Compounder Annual
                                        <span className="text-[9px] bg-tm-green/20 text-tm-green px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Save $309</span>
                                    </h4>
                                    <p className="text-2xl font-black font-mono mt-1">$399<span className="text-sm font-normal text-tm-muted">/yr</span></p>
                                    <p className="text-xs text-tm-muted mt-1">Eligible for Afterpay & Klarna</p>
                                </div>
                                <button
                                    onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_COMPOUNDER_ANNUAL_PRICE_ID || '', true)}
                                    disabled={loading !== null}
                                    className="px-4 py-2 bg-gradient-to-r from-tm-purple to-pink-600 hover:from-tm-purple/90 hover:to-pink-600/90 text-white text-xs font-bold rounded-xl shadow-lg shadow-tm-purple/20 transition-all flex hidden items-center gap-1"
                                    style={{ display: 'flex' }}
                                >
                                    {loading === process.env.NEXT_PUBLIC_STRIPE_COMPOUNDER_ANNUAL_PRICE_ID ? 'Loading...' : 'Go Annual'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
