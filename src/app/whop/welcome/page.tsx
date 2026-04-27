'use client';

/**
 * /whop/welcome — Post-Checkout Welcome Page
 * ============================================
 * Whop redirects here after a successful checkout with:
 *   ?status=success&receipt_id=pay_xxx&payment_id=pay_xxx
 *
 * Flow:
 *   1. Show success animation immediately
 *   2. Ask user to enter the email they used on Whop
 *   3. Poll /api/whop/pending-trial to confirm the webhook landed
 *   4. Once confirmed: trigger Privy email OTP login (useLoginWithEmail)
 *   5. After Privy login: call /api/whop/link-account to merge identities
 *   6. Redirect to /dashboard (now fully authenticated + entitled)
 */

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy, useLoginWithEmail } from '@privy-io/react-auth';
import { CheckCircle, Mail, Loader2, ArrowRight, Zap, Shield, Star } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type Stage =
  | 'landing'      // Initial success screen
  | 'email_input'  // Ask for Whop email
  | 'polling'      // Waiting for webhook
  | 'otp_sent'     // OTP email sent via Privy
  | 'linking'      // Calling link-account API
  | 'done';        // Redirect to dashboard

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Component ──────────────────────────────────────────────────────────────────

export default function WhopWelcomePage() {
    const router  = useRouter();
    const { authenticated, getAccessToken, ready } = usePrivy();
    const { sendCode, loginWithCode, state: privyEmailState } = useLoginWithEmail();

    const [stage, setStage]       = useState<Stage>('landing');
    const [email, setEmail]       = useState('');
    const [otp, setOtp]           = useState('');
    const [error, setError]       = useState('');
    const [trialInfo, setTrialInfo] = useState<{ trialEndsAt?: string; whopUserId?: string } | null>(null);

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── If already authenticated in Privy, go straight to dashboard ──────────
    useEffect(() => {
        if (ready && authenticated) {
            router.replace('/dashboard');
        }
    }, [ready, authenticated, router]);

    // ── Cleanup polling on unmount ────────────────────────────────────────────
    useEffect(() => {
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, []);

    // ── Step 1: User submits their Whop email ─────────────────────────────────
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }
        setError('');
        setStage('polling');
        startPolling(normalizedEmail);
    };

    // ── Step 2: Poll until webhook lands ─────────────────────────────────────
    const startPolling = (normalizedEmail: string) => {
        let attempts = 0;
        const MAX_ATTEMPTS = 20; // 60 seconds max

        pollingRef.current = setInterval(async () => {
            attempts++;
            try {
                const res  = await fetch(`/api/whop/pending-trial?email=${encodeURIComponent(normalizedEmail)}`);
                const data = await res.json();

                if (data.status === 'ready' || data.status === 'migrated') {
                    clearInterval(pollingRef.current!);
                    setTrialInfo({ trialEndsAt: data.trialEndsAt, whopUserId: data.whopUserId });
                    // Webhook confirmed — send Privy OTP
                    await sendPrivyOtp(normalizedEmail);
                } else if (attempts >= MAX_ATTEMPTS) {
                    clearInterval(pollingRef.current!);
                    // Webhook took too long — still send OTP, link will resolve later
                    await sendPrivyOtp(normalizedEmail);
                }
            } catch {
                // Network error — keep polling
            }
        }, 3000);
    };

    // ── Step 3: Send Privy email OTP ─────────────────────────────────────────
    const sendPrivyOtp = async (normalizedEmail: string) => {
        try {
            await sendCode({ email: normalizedEmail });
            setStage('otp_sent');
        } catch (err: any) {
            setError(`Could not send verification code: ${err.message ?? 'Please try again.'}`);
            setStage('email_input');
        }
    };

    // ── Step 4: Verify OTP ────────────────────────────────────────────────────
    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length < 6) {
            setError('Enter the 6-digit code from your email.');
            return;
        }
        setError('');
        try {
            await loginWithCode({ code: otp });
            // loginWithCode resolves → Privy session is now active
            // The useEffect for `authenticated` will handle redirect,
            // but we also need to call link-account first
            setStage('linking');
            await linkAccount();
        } catch (err: any) {
            setError(`Invalid code: ${err.message ?? 'Please try again.'}`);
        }
    };

    // ── Step 5: Link Privy identity to Whop trial record ─────────────────────
    const linkAccount = async () => {
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/whop/link-account', {
                method:  'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type':  'application/json',
                },
                body: JSON.stringify({ whopEmail: email.toLowerCase().trim() }),
            });
            const data = await res.json();
            if (data.linked) {
                setStage('done');
                await sleep(800);
                router.replace('/dashboard');
            } else {
                // Link failed but Privy session exists — send to dashboard anyway
                setStage('done');
                router.replace('/dashboard');
            }
        } catch {
            // Non-fatal — user is authenticated, just redirect
            router.replace('/dashboard');
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <main className="min-h-screen bg-[#070710] flex flex-col items-center justify-center px-4 py-12"
              style={{ fontFamily: "'Inter', -apple-system, sans-serif" }}>

            {/* Animated background glow */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full" />
                <div className="absolute top-2/3 left-1/4 w-[300px] h-[200px] bg-indigo-500/8 blur-[80px] rounded-full" />
            </div>

            <div className="relative z-10 w-full max-w-md">

                {/* ── Stage: Landing ────────────────────────────────────────── */}
                {stage === 'landing' && (
                    <div className="text-center animate-fadeIn">
                        {/* Success badge */}
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 mb-6 mx-auto">
                            <CheckCircle className="w-10 h-10 text-green-400" />
                        </div>

                        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                            Payment confirmed! 🎉
                        </h1>
                        <p className="text-gray-400 mb-8 leading-relaxed">
                            Your 30-day TradeMind trial is active. You now have full access to the{' '}
                            <span className="text-purple-400 font-semibold">Both Bundle</span> — daily signals,
                            TurboCore Pro, LEAPS strategy, and the community.
                        </p>

                        {/* Value props */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[
                                { icon: Zap,    label: 'Daily Signals', sub: '3 PM ET' },
                                { icon: Star,   label: 'Both Bundle',   sub: 'Full access' },
                                { icon: Shield, label: '30 Days',       sub: 'Trial period' },
                            ].map(({ icon: Icon, label, sub }) => (
                                <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <Icon className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                                    <p className="text-white text-xs font-semibold">{label}</p>
                                    <p className="text-gray-500 text-[10px]">{sub}</p>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={() => setStage('email_input')}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.6)]"
                        >
                            Access Your Dashboard <ArrowRight className="w-5 h-5" />
                        </button>
                        <p className="text-gray-600 text-xs mt-3">
                            Takes 30 seconds · No password needed
                        </p>
                    </div>
                )}

                {/* ── Stage: Email Input ────────────────────────────────────── */}
                {stage === 'email_input' && (
                    <div className="animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-purple-500/15 border border-purple-500/30 mb-4 mx-auto">
                                <Mail className="w-7 h-7 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Verify your email</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Enter the <span className="text-white font-medium">same email</span> you used
                                when paying on Whop. This links your trial to your TradeMind account.
                            </p>
                        </div>

                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <div>
                                <input
                                    id="whop-email"
                                    type="email"
                                    value={email}
                                    onChange={e => { setEmail(e.target.value); setError(''); }}
                                    placeholder="you@example.com"
                                    autoFocus
                                    autoComplete="email"
                                    className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                                />
                            </div>

                            {error && (
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-xl transition-all"
                            >
                                Continue <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                )}

                {/* ── Stage: Polling ────────────────────────────────────────── */}
                {stage === 'polling' && (
                    <div className="text-center animate-fadeIn">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/15 border border-purple-500/30 mb-6 mx-auto">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Activating your trial…</h2>
                        <p className="text-gray-400 text-sm">
                            Confirming your payment with Whop. This takes a few seconds.
                        </p>
                        <div className="mt-6 flex justify-center gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-2 h-2 rounded-full bg-purple-500 animate-bounce"
                                     style={{ animationDelay: `${i * 150}ms` }} />
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Stage: OTP Sent ───────────────────────────────────────── */}
                {stage === 'otp_sent' && (
                    <div className="animate-fadeIn">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 mb-4 mx-auto">
                                <Mail className="w-7 h-7 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Check your inbox</h2>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                We sent a 6-digit code to{' '}
                                <span className="text-white font-medium">{email}</span>
                            </p>
                        </div>

                        <form onSubmit={handleOtpSubmit} className="space-y-4">
                            <input
                                id="whop-otp"
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={otp}
                                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                                placeholder="123456"
                                autoFocus
                                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-5 text-white text-center text-2xl font-mono tracking-[0.5em] placeholder-gray-700 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                            />

                            {error && (
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            )}

                            <button
                                type="submit"
                                disabled={otp.length < 6}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-all"
                            >
                                Verify & Access Dashboard <ArrowRight className="w-4 h-4" />
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStage('email_input'); setOtp(''); setError(''); }}
                                className="w-full text-gray-500 text-sm hover:text-gray-300 transition-colors py-2"
                            >
                                ← Use a different email
                            </button>
                        </form>
                    </div>
                )}

                {/* ── Stage: Linking ────────────────────────────────────────── */}
                {(stage === 'linking' || stage === 'done') && (
                    <div className="text-center animate-fadeIn">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/15 border border-green-500/30 mb-6 mx-auto">
                            {stage === 'done'
                                ? <CheckCircle className="w-8 h-8 text-green-400" />
                                : <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />}
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">
                            {stage === 'done' ? 'All set! Redirecting…' : 'Setting up your account…'}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {stage === 'done'
                                ? 'Your Both Bundle trial is active. Welcome to TradeMind.'
                                : 'Linking your trial. This only takes a moment.'}
                        </p>
                    </div>
                )}

                {/* Footer */}
                <p className="text-center text-gray-700 text-xs mt-10">
                    TradeMind · Educational analysis only · Not personalized investment advice
                </p>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
            `}</style>
        </main>
    );
}
