'use client';

import { useState, useEffect } from 'react';
import { SignalEmailAlertsSettings } from '@/components/settings/SignalEmailAlertsSettings';
import { X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { PRICING } from '@/lib/pricing-config';

type Tab = 'account' | 'emails';

export function OnboardingWelcomeModal() {
    const { getAccessToken } = usePrivy();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('account');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkStatus = async () => {
            const token = await getAccessToken();
            fetch('/api/settings/tier', {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
            })
                .then(res => res.json())
                .then(data => {
                    if (data.hasCompletedOnboarding === false) setIsOpen(true);
                    if (data.hasCompletedOnboarding === true) setLoading(false);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        };
        checkStatus();

        // Listen for manual trigger
        const handleManualOpen = () => setIsOpen(true);
        window.addEventListener('open-onboarding', handleManualOpen);
        return () => window.removeEventListener('open-onboarding', handleManualOpen);
    }, [getAccessToken]);

    const handleComplete = async () => {
        setIsOpen(false);
        try {
            const token = await getAccessToken();
            await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify({ has_completed_onboarding: true }),
            });
        } catch (e) {
            console.error('Failed to save onboarding state', e);
        }
    };



    if (loading || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col shadow-2xl border-tm-purple/30 animate-in fade-in zoom-in-95 duration-300 relative max-h-[90vh]">
                <button 
                    onClick={handleComplete}
                    className="absolute top-4 right-4 p-2 text-tm-muted hover:text-white rounded-full hover:bg-white/10 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-6 pb-0 border-b border-white/5 bg-gradient-to-r from-tm-purple/10 to-transparent relative shrink-0">
                    <h2 className="text-xl font-bold pr-8">Welcome to TradeMind</h2>
                    <p className="text-sm text-tm-muted mt-2">
                        Pick a plan and check out. We simulate every signal against your virtual account with live prices and email you the exact orders to enter at your own brokerage. TradeMind never connects to your brokerage.
                    </p>
                    
                    {/* Tabs */}
                    <div className="flex items-center gap-6 mt-6 text-sm font-semibold border-b border-transparent">
                        <button
                            onClick={() => setActiveTab('account')}
                            className={`pb-3 transition-colors border-b-2 ${activeTab === 'account' ? 'border-tm-purple text-tm-purple' : 'border-transparent text-tm-muted hover:text-white'}`}
                        >
                            1. Your Account
                        </button>
                        <button 
                            onClick={() => setActiveTab('emails')}
                            className={`pb-3 transition-colors border-b-2 ${activeTab === 'emails' ? 'border-tm-purple text-tm-purple' : 'border-transparent text-tm-muted hover:text-white'}`}
                        >
                            2. Emails
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-black/40 overflow-y-auto">
                    {activeTab === 'account' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Choose Your Plan</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Your virtual account is created automatically at checkout: QQQ Basic starts with $10,000, QQQ LEAPS with $25,000. You can adjust the principal, risk level, name, and alert email afterward.
                            </p>

                            <button
                                onClick={() => { handleComplete(); router.push('/upgrade?plan=basic'); }}
                                className="w-full py-3 mb-3 rounded-lg font-bold border border-[#4f8ef7]/50 hover:bg-[#4f8ef7]/10 text-white transition flex items-center justify-between px-4"
                            >
                                <span>QQQ Basic</span>
                                <span className="text-sm text-tm-muted">${PRICING.plans.turbocore_pro_bundle.annual}/yr · no options approval needed</span>
                            </button>
                            <button
                                onClick={() => { handleComplete(); router.push('/upgrade?plan=leaps'); }}
                                className="w-full py-3 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition flex items-center justify-between px-4"
                            >
                                <span>QQQ LEAPS</span>
                                <span className="text-sm opacity-80">${PRICING.plans.qqq_leaps.annual}/yr · options approval required</span>
                            </button>

                            <p className="mt-4 text-[11px] text-tm-muted">
                                Signals process at 3:30 PM ET each trading day and arrive by email. Your card is charged at checkout; cancel within your first month and the payment is refunded in full.
                            </p>
                            <button
                                onClick={() => { handleComplete(); router.push('/accounts'); }}
                                className="w-full mt-4 py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition"
                            >
                                Go to Accounts
                            </button>
                        </div>
                    )}

                    {activeTab === 'emails' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Signal Email Alerts</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Each signal email contains the exact order instructions — ticker, action, contracts, and reference price — so you can enter the trade in your own brokerage account.
                            </p>
                            <SignalEmailAlertsSettings />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
