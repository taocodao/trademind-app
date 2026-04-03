'use client';

import { useState, useEffect } from 'react';
import { SignalEmailAlertsSettings } from '@/components/settings/SignalEmailAlertsSettings';
import { InvestmentPrincipal } from '@/components/dashboard/InvestmentPrincipal';
import { TQQQAutoApproveSettings } from '@/components/settings/TQQQAutoApproveSettings';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

export function OnboardingWelcomeModal() {
    const { ready, authenticated } = usePrivy();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ready || !authenticated) return;
        
        fetch('/api/settings/tier')
            .then(res => res.json())
            .then(data => {
                if (data.hasCompletedOnboarding === false) {
                    setIsOpen(true);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [ready, authenticated]);

    const handleComplete = async () => {
        setIsOpen(false);
        try {
            await fetch('/api/settings/notifications', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ has_completed_onboarding: true }),
            });
        } catch (e) {
            console.error('Failed to save onboarding state', e);
        }
    };

    if (loading || !isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300">
            <div className="glass-card w-full max-w-lg overflow-hidden flex flex-col shadow-2xl border-tm-purple/30 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 border-b border-white/5 bg-gradient-to-r from-tm-purple/10 to-transparent relative">
                    <h2 className="text-xl font-bold">Welcome to TradeMind 👋</h2>
                    <p className="text-sm text-tm-muted mt-2">
                        Let's quickly configure your automated trading environment so we can hit the ground running.
                    </p>
                    {/* Stepper indicator */}
                    <div className="flex items-center gap-2 mt-4 text-xs font-semibold">
                        <span className={step >= 1 ? 'text-tm-purple' : 'text-tm-muted'}>Emails</span>
                        <div className="w-4 h-[1px] bg-white/10" />
                        <span className={step >= 2 ? 'text-tm-purple' : 'text-tm-muted'}>Principal</span>
                        <div className="w-4 h-[1px] bg-white/10" />
                        <span className={step >= 3 ? 'text-tm-purple' : 'text-tm-muted'}>Auto-Approve</span>
                        <div className="w-4 h-[1px] bg-white/10" />
                        <span className={step >= 4 ? 'text-tm-purple' : 'text-tm-muted'}>Broker</span>
                    </div>
                </div>

                <div className="p-6 bg-black/40 min-h-[300px]">
                    {step === 1 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Step 1: Signal Email Alerts</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Add your email addresses and turn on the switch to ensure you never miss a signal notification when you are offline!
                            </p>
                            <SignalEmailAlertsSettings />
                        </div>
                    )}

                    {step === 2 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Step 2: Investment Principal</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Set the base capital you'd like to dedicate per strategy. This is used strictly for position sizing math and trailing stops.
                            </p>
                            <InvestmentPrincipal />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Step 3: Auto-Approval Settings</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Configure how aggressively the system automatically approves trades matching your strategies. Leave it universally enabled for a hands-off experience!
                            </p>
                            <TQQQAutoApproveSettings />
                        </div>
                    )}

                    {step === 4 && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in h-full flex flex-col justify-center text-center px-4">
                            <div className="w-16 h-16 rounded-full bg-tm-purple/20 flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl">🏦</span>
                            </div>
                            <h3 className="font-semibold mb-3 text-lg text-white">One Last Thing...</h3>
                            <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
                                Want to trade with real money? You can securely connect your <strong>Tastytrade</strong> account in the <strong>Settings</strong> page at any time to switch from Virtual trading to Live execution!
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/5 flex gap-3 justify-end bg-black/60">
                     {step > 1 && (
                         <button
                            onClick={() => setStep(step - 1)}
                            className="px-4 py-2 text-sm font-medium text-tm-muted hover:text-white transition-colors"
                         >
                             Back
                         </button>
                     )}
                     
                     {step < 4 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="px-6 py-2 bg-tm-purple text-white rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-tm-purple/80 transition-all shadow-lg shadow-tm-purple/20"
                        >
                            Next Step
                            <ArrowRight className="w-4 h-4" />
                        </button>
                     ) : (
                        <button
                            onClick={handleComplete}
                            className="px-6 py-2 bg-tm-green text-black rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-tm-green/90 transition-all shadow-lg shadow-tm-green/20"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Finish Onboarding
                        </button>
                     )}
                </div>
            </div>
        </div>
    );
}
