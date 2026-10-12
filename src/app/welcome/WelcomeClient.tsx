'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { loginEmailOf, sameEmail } from '@/lib/privy-email';

type Info = { valid: boolean; paid?: boolean; email?: string | null; plan?: string | null };

export default function WelcomeClient() {
    const sessionId = useSearchParams().get('session_id') ?? '';
    const { ready, authenticated, user, login, logout } = usePrivy();
    const signedEmail = authenticated ? loginEmailOf(user) : null;
    const [info, setInfo] = useState<Info | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [claiming, setClaiming] = useState(false);
    const opened = useRef(false);
    const claimed = useRef(false);

    useEffect(() => {
        if (!sessionId) { setInfo({ valid: false }); return; }
        fetch(`/api/stripe/guest-session?session_id=${encodeURIComponent(sessionId)}`)
            .then((r) => r.json()).then(setInfo).catch(() => setInfo({ valid: false }));
    }, [sessionId]);

    const payEmail = info?.valid && info.paid ? (info.email ?? '') : '';
    const planName = info?.plan === 'leaps' ? 'QQQ LEAPS' : 'QQQ Basic';
    const balance = info?.plan === 'leaps' ? '$25,000' : '$10,000';
    const mismatch = authenticated && !!payEmail && !!signedEmail && !sameEmail(payEmail, signedEmail);

    // Straight to the sign in dialog with the paid email filled in.
    useEffect(() => {
        if (ready && !authenticated && payEmail && !opened.current) {
            opened.current = true;
            login({ prefill: { type: 'email', value: payEmail } });
        }
    }, [ready, authenticated, payEmail, login]);

    const claim = async () => {
        if (!payEmail || !signedEmail) return;
        setClaiming(true); setError(null);
        try {
            const res = await fetch('/api/stripe/claim', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, loginEmail: signedEmail }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.accountId) throw new Error(data.error === 'email_mismatch' ? `Sign in with ${payEmail} to finish.` : (data.error || 'Unable to finish setting up your account.'));
            window.location.href = `/account/${data.accountId}`;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to finish setting up your account.');
            setClaiming(false); claimed.current = false;
        }
    };

    useEffect(() => {
        if (ready && authenticated && payEmail && signedEmail && !mismatch && !claimed.current) { claimed.current = true; void claim(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, authenticated, payEmail, signedEmail, mismatch]);

    const shell = (children: React.ReactNode) => (
        <main style={{ minHeight: '100vh', background: '#07080f', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <section style={{ width: '100%', maxWidth: 520, border: '1px solid rgba(255,255,255,0.12)', borderRadius: 16, padding: 28, background: 'rgba(255,255,255,0.03)' }}>{children}</section>
        </main>
    );
    const btn = (primary: boolean): React.CSSProperties => ({ width: '100%', marginTop: 12, borderRadius: 10, padding: '12px 16px', fontWeight: 700, fontSize: 15, cursor: 'pointer', color: '#fff', border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)', background: primary ? '#7c3aed' : 'transparent' });

    if (!info) return shell(<p style={{ color: '#94a3b8' }}>Checking your payment</p>);
    if (!info.valid) return shell(<><h1 style={{ fontSize: 22, fontWeight: 800 }}>We could not find that payment</h1><p style={{ color: '#94a3b8', marginTop: 8 }}>Open the link from your payment confirmation, or choose a plan again.</p><a href="/plans" style={{ ...btn(true), display: 'block', textAlign: 'center', textDecoration: 'none' }}>Back to plans</a></>);
    if (!info.paid) return shell(<><h1 style={{ fontSize: 22, fontWeight: 800 }}>Payment not completed</h1><p style={{ color: '#94a3b8', marginTop: 8 }}>No charge was made. You can choose a plan again.</p><a href={`/plans${info.email ? `?email=${encodeURIComponent(info.email)}` : ''}`} style={{ ...btn(true), display: 'block', textAlign: 'center', textDecoration: 'none' }}>Back to plans</a></>);

    return shell(
        <>
            <p style={{ color: '#a7f3d0', fontWeight: 700, fontSize: 13, margin: 0 }}>Payment received</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '6px 0 10px' }}>One last step: sign in as {payEmail}</h1>
            <p style={{ color: '#cbd5e1', fontSize: 14.5, lineHeight: 1.6, margin: 0 }}>
                Your {planName} subscription is tied to <strong>{payEmail}</strong>. Sign in with that same email, using the one-time code we send to it. There is no password. Your {balance} virtual account is then created automatically.
            </p>
            {mismatch ? (
                <>
                    <p style={{ color: '#fcd34d', fontSize: 13.5, lineHeight: 1.5, marginTop: 14 }}>This browser is signed in as {signedEmail}. Your payment belongs to {payEmail}.</p>
                    <button style={btn(true)} onClick={async () => { await logout(); opened.current = true; login({ prefill: { type: 'email', value: payEmail } }); }}>Sign out and sign in as {payEmail}</button>
                </>
            ) : authenticated ? (
                <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 16 }}>{claiming ? 'Creating your account' : 'Finishing setup'}</p>
            ) : (
                <button style={btn(true)} onClick={() => login({ prefill: { type: 'email', value: payEmail } })}>Sign in as {payEmail}</button>
            )}
            {error && (<><p style={{ color: '#f87171', fontSize: 13.5, marginTop: 12 }}>{error}</p>{authenticated && !mismatch && <button style={btn(false)} onClick={() => { claimed.current = true; void claim(); }}>Try again</button>}</>)}
        </>
    );
}
