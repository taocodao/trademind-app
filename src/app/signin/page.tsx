'use client';

import { useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import EmailCodeLogin from '@/components/auth/EmailCodeLogin';

// /signin: the one place to sign in or create an account, with step by step instructions.
// Email plus a 6 digit passcode, no password. Once signed in, people with a plan go to their account;
// people without one are sent to the plans page (see /accounts).

function SignInInner() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const params = useSearchParams();
    const email = params.get('email') ?? '';
    const timedOut = params.get('reason') === 'timeout';

    useEffect(() => {
        if (ready && authenticated) router.push('/dashboard');
    }, [ready, authenticated, router]);

    return (
        <div className="min-h-screen bg-tm-bg flex flex-col items-center justify-center px-6 py-10">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center gap-2.5 mb-6">
                    <svg viewBox="0 0 32 32" fill="none" aria-label="TradeMind logo" className="w-8 h-8">
                        <path d="M4 24 L12 12 L18 18 L28 4" stroke="#e0a458" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="28" cy="4" r="2.6" fill="#e0a458" />
                    </svg>
                    <span className="text-tm-text text-xl font-bold">TradeMind</span>
                </div>
                {timedOut && <p className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-center text-sm text-amber-200">You were signed out to keep your account safe. Sign in again to continue.</p>}
                <h1 className="text-tm-text text-2xl font-bold mb-1 text-center">Sign in with your email</h1>
                <p className="text-tm-muted text-sm mb-6 text-center">Newsletter readers and subscribers: use the email your newsletter arrives at.</p>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                    <EmailCodeLogin initialEmail={email} />
                </div>
                <p className="text-center mt-5 text-sm">
                    <a href="/plans" className="text-tm-muted hover:text-tm-text">See plans and pricing</a>
                </p>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return <Suspense fallback={null}><SignInInner /></Suspense>;
}
