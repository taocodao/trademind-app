'use client';

import { useState, useEffect } from 'react';
import { SignalEmailAlertsSettings } from '@/components/settings/SignalEmailAlertsSettings';
import { TQQQAutoApproveSettings } from '@/components/settings/TQQQAutoApproveSettings';
import { TastytradeCredentials } from '@/components/settings/TastytradeCredentials';
import { X } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';

type Tab = 'emails' | 'autoApprove' | 'broker';

export function OnboardingWelcomeModal() {
    const { getAccessToken } = usePrivy();
    const [activeTab, setActiveTab] = useState<Tab>('emails');
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
                    <h2 className="text-xl font-bold pr-8">Welcome to TradeMind 👋</h2>
                    <p className="text-sm text-tm-muted mt-2">
                        Let's quickly configure your automated trading environment so we can hit the ground running.
                    </p>
                    
                    {/* Tabs */}
                    <div className="flex items-center gap-6 mt-6 text-sm font-semibold border-b border-transparent">
                        <button 
                            onClick={() => setActiveTab('emails')}
                            className={`pb-3 transition-colors border-b-2 ${activeTab === 'emails' ? 'border-tm-purple text-tm-purple' : 'border-transparent text-tm-muted hover:text-white'}`}
                        >
                            Emails
                        </button>
                        <button 
                            onClick={() => setActiveTab('autoApprove')}
                            className={`pb-3 transition-colors border-b-2 ${activeTab === 'autoApprove' ? 'border-tm-purple text-tm-purple' : 'border-transparent text-tm-muted hover:text-white'}`}
                        >
                            Auto-Approve
                        </button>
                        <button 
                            onClick={() => setActiveTab('broker')}
                            className={`pb-3 transition-colors border-b-2 ${activeTab === 'broker' ? 'border-tm-purple text-tm-purple' : 'border-transparent text-tm-muted hover:text-white'}`}
                        >
                            Broker
                        </button>
                    </div>
                </div>

                <div className="p-6 bg-black/40 overflow-y-auto">
                    {activeTab === 'emails' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Signal Email Alerts</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Add your email addresses and turn on the switch to ensure you never miss a signal notification when you are offline!
                            </p>
                            <SignalEmailAlertsSettings />
                        </div>
                    )}

                    {activeTab === 'autoApprove' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Auto-Approval Settings</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Configure how aggressively the system automatically approves trades matching your strategies. Leave it universally enabled for a hands-off experience!
                            </p>
                            <TQQQAutoApproveSettings />
                        </div>
                    )}

                    {activeTab === 'broker' && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Live Execution</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Connect your Tastytrade account to instantly shift from paper trading to live strategy execution.
                            </p>
                            <TastytradeCredentials />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
