'use client';

/**
 * /whop/welcome — Post-Checkout Welcome Page
 * ============================================
 * Whop redirects here after a successful checkout.
 *
 * New Flow (no OTP required):
 *   1. Show success screen immediately
 *   2. Offer "Continue with Google" (one click) OR "Sign in with Email" (magic link)
 *   3. Privy handles authentication — no passcode typing required
 *   4. After login: call /api/whop/link-account to merge Whop email → Privy session
 *   5. Redirect to /dashboard (authenticated + trial active)
 *
 * Why no email-entry step:
 *   Whop already captured the user's email (regardless of whether they used Google,
 *   Discord, or email to sign into Whop) and sent it to us via webhook. We don't
 *   need to ask for it again — the self-healing tier API matches by email automatically.
 */

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { usePrivy, useLoginWithOAuth, useLoginWithEmail } from '@privy-io/react-auth';
import { CheckCircle, Mail, Loader2, ArrowRight, Zap, Shield, Star, Chrome } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

type Stage =
  | 'landing'         // Initial success screen + login options
  | 'email_input'     // Ask for email (for magic link path)
  | 'magic_sent'      // Magic link sent — tell user to check inbox
  | 'linking'         // Calling link-account API
  | 'done';           // Redirect to dashboard

// ── Helpers ────────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Component ──────────────────────────────────────────────────────────────────

function WhopWelcomeContent() {
    const router  = useRouter();
    const params  = useSearchParams();
    const trialDays = parseInt(params.get('days') ?? '30', 10);
    const trialFee  = trialDays === 60 ? 20 : 10;

    const { authenticated, getAccessToken, ready, user } = usePrivy();
    const { initOAuth } = useLoginWithOAuth();
    const { sendCode } = useLoginWithEmail();

    const [stage, setStage]       = useState<Stage>('landing');
    const [email, setEmail]       = useState('');
    const [error, setError]       = useState('');
    const [isGoogleLoading, setGoogleLoading] = useState(false);
    const [isEmailLoading, setEmailLoading]   = useState(false);

    // ── If already authenticated → call link-account then redirect ────────────
    useEffect(() => {
        if (ready && authenticated) {
            // Extract the user's email from Privy user object
            const privyEmail: string =
                (user as any)?.email?.address ||
                (user?.linkedAccounts?.find((a: any) => a.type === 'email') as any)?.address ||
                (user?.linkedAccounts?.find((a: any) => a.type === 'google_oauth') as any)?.email ||
                '';

            if (stage === 'landing') {
                // Already logged in before hitting this page → go straight to dashboard
                router.replace('/dashboard');
            } else {
                // Just completed login via Google or magic link → link account
                setStage('linking');
                linkAccount(privyEmail);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, authenticated]);

    // ── Google OAuth (one click) ──────────────────────────────────────────────
    const handleGoogleLogin = async () => {
        setError('');
        setGoogleLoading(true);
        try {
            // initOAuth triggers Google popup and sets Privy session on completion.
            // The useEffect above handles the post-login redirect.
            await initOAuth({ provider: 'google' });
        } catch (err: any) {
            setError('Google sign-in failed. Please try email below.');
            setGoogleLoading(false);
        }
    };

    // ── Email magic link ──────────────────────────────────────────────────────
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const normalizedEmail = email.toLowerCase().trim();
        if (!normalizedEmail || !normalizedEmail.includes('@')) {
            setError('Please enter a valid email address.');
            return;
        }
        setError('');
        setEmailLoading(true);
        try {
            // sendCode sends a magic link when Privy is configured for magic links,
            // or an OTP otherwise. Either way, no code-typing UI is shown here for
            // the magic link path — user just clicks the link in their inbox.
            await sendCode({ email: normalizedEmail });
            setStage('magic_sent');
        } catch (err: any) {
            setError(`Could not send sign-in link: ${err.message ?? 'Please try again.'}`);
        } finally {
            setEmailLoading(false);
        }
    };

    // ── Link Privy identity to Whop trial record ──────────────────────────────
    const linkAccount = async (privyEmail: string) => {
        try {
            const token = await getAccessToken();
            await fetch('/api/whop/link-account', {
                method:  'POST',
                headers: {
                    'Authorization':  `Bearer ${token}`,
                    'Content-Type':   'application/json',
                    'X-User-Email':   privyEmail,
                },
                body: JSON.stringify({ whopEmail: privyEmail }),
            });
        } catch {
            // Non-fatal — self-healing tier API will reconcile on first dashboard load
        } finally {
            setStage('done');
            await sleep(600);
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

                {/* ── Stage: Landing + Login Options ────────────────────────── */}
                {stage === 'landing' && (
                    <div className="animate-fadeIn">
                        {/* Success badge */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 mb-6 mx-auto">
                                <CheckCircle className="w-10 h-10 text-green-400" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                                Payment confirmed! 🎉
                            </h1>
                            <p className="text-gray-400 leading-relaxed">
                                Your <span className="text-purple-400 font-semibold">{trialDays}-day Full Access trial</span> is active.
                                Sign in below to reach your dashboard — your trial is already linked.
                            </p>
                        </div>

                        {/* Value props */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {[
                                { icon: Zap,    label: 'All 3 Strategies', sub: 'Full Access' },
                                { icon: Star,   label: `${trialDays} Days`,  sub: 'Trial period' },
                                { icon: Shield, label: `$${trialFee} Refunded`, sub: 'As bonus days' },
                            ].map(({ icon: Icon, label, sub }) => (
                                <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                    <Icon className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                                    <p className="text-white text-xs font-semibold">{label}</p>
                                    <p className="text-gray-500 text-[10px]">{sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* ── Sign in with Google (primary CTA) ── */}
                        <button
                            onClick={handleGoogleLogin}
                            disabled={isGoogleLoading}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 disabled:bg-gray-200 text-gray-900 font-bold py-4 px-6 rounded-xl transition-all shadow-lg mb-4"
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                            )}
                            Continue with Google
                        </button>

                        {/* ── Divider ── */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-white/10" />
                            <span className="text-gray-600 text-xs">or sign in with email</span>
                            <div className="flex-1 h-px bg-white/10" />
                        </div>

                        {/* ── Email input (magic link) ── */}
                        <form onSubmit={handleEmailSubmit} className="space-y-3">
                            <input
                                id="whop-email"
                                type="email"
                                value={email}
                                onChange={e => { setEmail(e.target.value); setError(''); }}
                                placeholder="your@email.com"
                                autoComplete="email"
                                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all text-sm"
                            />
                            {error && (
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            )}
                            <button
                                type="submit"
                                disabled={isEmailLoading || !email.includes('@')}
                                className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 disabled:opacity-50 text-purple-300 font-semibold py-3.5 px-6 rounded-xl transition-all text-sm"
                            >
                                {isEmailLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                Send sign-in link
                            </button>
                        </form>

                        <p className="text-gray-600 text-xs text-center mt-4">
                            No passwords · No codes to type · Takes 10 seconds
                        </p>
                    </div>
                )}

                {/* ── Stage: Magic Link Sent ────────────────────────────────── */}
                {stage === 'magic_sent' && (
                    <div className="text-center animate-fadeIn">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-500/15 border border-purple-500/30 mb-6 mx-auto">
                            <Mail className="w-10 h-10 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Check your inbox</h2>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            We sent a sign-in link to{' '}
                            <span className="text-white font-medium">{email}</span>.
                            Click the link to access your dashboard — no code needed.
                        </p>
                        <button
                            onClick={() => { setStage('landing'); setEmail(''); setError(''); }}
                            className="text-gray-500 text-sm hover:text-gray-300 transition-colors"
                        >
                            ← Use a different method
                        </button>
                    </div>
                )}

                {/* ── Stage: Linking / Done ─────────────────────────────────── */}
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
                                ? `Your ${trialDays}-day Full Access trial is active. Welcome to TradeMind.`
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

export default function WhopWelcomePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            </div>
        }>
            <WhopWelcomeContent />
        </Suspense>
    );
}
