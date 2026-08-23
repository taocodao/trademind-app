'use client';

import { useState, useEffect } from 'react';
import { SignalEmailAlertsSettings } from '@/components/settings/SignalEmailAlertsSettings';
import { X, PlusCircle } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { STRATEGIES } from '@/lib/strategies';

type Tab = 'account' | 'emails';
type RiskLevel = 'conservative' | 'moderate' | 'aggressive';

export function OnboardingWelcomeModal() {
    const { getAccessToken, user } = usePrivy();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('account');
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // First-account form
    const [acctName, setAcctName] = useState('');
    const [strategy, setStrategy] = useState(STRATEGIES[0].key);
    const [riskLevel, setRiskLevel] = useState<RiskLevel>('moderate');
    const [principal, setPrincipal] = useState('');
    const [alertEmail, setAlertEmail] = useState('');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [accountCreated, setAccountCreated] = useState(false);

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

    const handleCreateAccount = async () => {
        setCreateError(null);
        const p = parseFloat(principal);
        if (!acctName.trim()) { setCreateError('Give the account a name'); return; }
        if (!isFinite(p) || p <= 0) { setCreateError('Enter a valid initial principal'); return; }
        setCreating(true);
        try {
            const res = await fetch('/api/accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: acctName.trim(),
                    strategy,
                    riskLevel,
                    initialPrincipal: p,
                    alertEmail: alertEmail.trim() || undefined,
                }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to create account');
            }
            setAccountCreated(true);
            setActiveTab('emails');
        } catch (e) {
            setCreateError(e instanceof Error ? e.message : 'Failed to create account');
        } finally {
            setCreating(false);
        }
    };

    const loginEmail = (user?.email?.address as string | undefined) || '';

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
                        Create your first account in two quick steps. We simulate every signal against it with live prices and email you the exact orders to enter in your own brokerage. TradeMind never connects to your brokerage.
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
                    {activeTab === 'account' && !accountCreated && (
                        <div className="animate-in slide-in-from-right-4 duration-300 fade-in">
                            <h3 className="font-semibold mb-3 text-tm-purple">Create Your First Account</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                An account tracks one strategy with its own starting capital and mirrors each signal like a paper trading account. Every account starts with a free month.
                            </p>

                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Account Name</label>
                            <input
                                type="text" value={acctName} onChange={(e) => setAcctName(e.target.value)}
                                placeholder="e.g. My LEAPS Account"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple mb-4"
                            />

                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Strategy</label>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                {STRATEGIES.map((s) => (
                                    <button
                                        key={s.key}
                                        onClick={() => setStrategy(s.key)}
                                        className={`py-2 rounded-lg text-xs font-bold border transition ${strategy === s.key ? 'bg-tm-purple/20 border-tm-purple text-white' : 'bg-white/5 border-white/10 text-tm-muted hover:text-white'}`}
                                    >
                                        {s.label} - ${s.key === 'QQQ_LEAPS' ? 336 : 252}/yr
                                    </button>
                                ))}
                            </div>

                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Risk Level</label>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {(['conservative', 'moderate', 'aggressive'] as RiskLevel[]).map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setRiskLevel(r)}
                                        className={`py-2 rounded-lg text-xs font-bold border capitalize transition ${riskLevel === r ? 'bg-tm-purple/20 border-tm-purple text-white' : 'bg-white/5 border-white/10 text-tm-muted hover:text-white'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Starting Capital ($)</label>
                            <input
                                type="number" min="1" step="100" value={principal} onChange={(e) => setPrincipal(e.target.value)}
                                placeholder="e.g. 25000"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono focus:outline-none focus:border-tm-purple mb-4"
                            />

                            <label className="text-[10px] text-tm-muted uppercase font-bold tracking-wider mb-1 block">Alert Email</label>
                            <input
                                type="email" value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)}
                                placeholder={loginEmail || 'Defaults to your login email'}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-tm-purple mb-4"
                            />

                            {createError && <p className="text-red-400 text-xs mb-3">{createError}</p>}

                            <button
                                onClick={handleCreateAccount} disabled={creating}
                                className="w-full py-3 rounded-lg font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating
                                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    : <><PlusCircle className="w-4 h-4" /> Create Account</>}
                            </button>
                        </div>
                    )}

                    {activeTab === 'account' && accountCreated && (
                        <div className="animate-in fade-in duration-300">
                            <h3 className="font-semibold mb-3 text-tm-purple">Account Created</h3>
                            <p className="text-sm text-zinc-300 mb-4">
                                Your first account is live with a 30-day free month. You can create more accounts any time from the Accounts page; each one keeps its own membership.
                            </p>
                            <button
                                onClick={() => { handleComplete(); router.push('/accounts'); }}
                                className="w-full py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 transition"
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
