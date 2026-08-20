'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';

// ── /signin ─────────────────────────────────────────────────────────────────
// Dedicated auth entry point. The marketing homepage at '/' is now a static
// landing page (public/landing/index.html) with no Privy runtime, so app pages
// redirect unauthenticated visitors here. Privy's modal handles both sign-in
// and account creation; once authenticated we send the user to the dashboard.

export default function SignInPage() {
    const { ready, authenticated, login } = usePrivy();
    const router = useRouter();

    useEffect(() => {
        if (ready && authenticated) {
            router.push('/dashboard');
        }
    }, [ready, authenticated, router]);

    return (
        <div className="min-h-screen bg-tm-bg flex flex-col items-center justify-center px-6">
            <div className="w-full max-w-sm text-center">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-10">
                    <svg viewBox="0 0 32 32" fill="none" aria-label="TradeMind logo" className="w-8 h-8">
                        <path d="M4 24 L12 12 L18 18 L28 4" stroke="#e0a458" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="28" cy="4" r="2.6" fill="#e0a458" />
                    </svg>
                    <span className="text-tm-text text-xl font-bold">TradeMind</span>
                </div>

                <h1 className="text-tm-text text-2xl font-bold mb-2">Sign in to TradeMind</h1>
                <p className="text-tm-muted text-sm mb-8">
                    One account for your signals, virtual accounts, and subscription.
                    New here? The same button creates your account.
                </p>

                <button
                    onClick={login}
                    disabled={!ready}
                    className="w-full bg-tm-green hover:opacity-90 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl transition-opacity"
                >
                    {ready ? 'Sign in / Create account' : 'Loading…'}
                </button>

                <a
                    href="/"
                    className="inline-block mt-6 text-tm-muted hover:text-tm-text text-sm transition-colors"
                >
                    ← Back to homepage
                </a>
            </div>
        </div>
    );
}
