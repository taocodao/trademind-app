'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { PRICING } from '@/lib/pricing-config';
import { loginEmailOf, sameEmail } from '@/lib/privy-email';

type Plan = 'basic' | 'leaps';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CARDS: Array<{ plan: Plan; name: string; blurb: string; regular: number; price: number; start: string; points: string[] }> = [
    {
        plan: 'basic', name: PRICING.plans.turbocore_pro_bundle.label, blurb: 'Regime-aware ML signal. Any brokerage account works.',
        regular: PRICING.plans.turbocore_pro_bundle.regularAnnual, price: PRICING.plans.turbocore_pro_bundle.annual,
        start: '$10,000',
        points: ['Signal processed at 3:30 PM ET each trading day', 'Email order instructions you enter at your own broker', 'No options approval needed'],
    },
    {
        plan: 'leaps', name: PRICING.plans.qqq_leaps.label, blurb: 'ML-powered long-term options on QQQ.',
        regular: PRICING.plans.qqq_leaps.regularAnnual, price: PRICING.plans.qqq_leaps.annual,
        start: '$25,000',
        points: ['Signal processed at 3:30 PM ET each trading day', 'Email order instructions you enter at your own broker', 'Requires options approval at your broker (long calls)'],
    },
];

const STEPS = [
    ['Confirm your email', 'This address becomes your TradeMind login. There is no password. Your signals are emailed to it too.'],
    ['Pay securely with Stripe', 'Annual plan, charged today at the 30% subscriber price. Cancel within your first month and the payment is refunded in full.'],
    ['Sign in with the same email', 'Right after payment you land on the sign in screen with your email already filled in. Enter the one-time code we send to that address.'],
    ['Your account opens automatically', 'Your virtual account is created for you, $25,000 for QQQ LEAPS or $10,000 for QQQ Basic, and signals arrive by email from the next trading day.'],
];

export default function PlansClient({ linkEmail, justSubscribed = false }: { linkEmail: string; justSubscribed?: boolean }) {
    const { ready, authenticated, user } = usePrivy();
    const signedEmail = authenticated ? loginEmailOf(user) : null;
    const [chosen, setChosen] = useState(linkEmail);
    const [editing, setEditing] = useState(!linkEmail);
    const [draft, setDraft] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState<Plan | null>(null);
    const [elig, setElig] = useState<'unknown' | 'checking' | 'eligible' | 'other'>('unknown');
    const [until, setUntil] = useState<string | null>(null);

    // Signed in with no plan yet: use the login email as the default, and check the newsletter discount.
    useEffect(() => {
        if (ready && authenticated && signedEmail && !linkEmail && !chosen) { setChosen(signedEmail); setEditing(false); }
    }, [ready, authenticated, signedEmail, linkEmail, chosen]);

    useEffect(() => {
        if (!ready || !authenticated || !signedEmail) return;
        if (linkEmail && !sameEmail(linkEmail, signedEmail)) return;
        let cancelled = false;
        (async () => {
            setElig('checking');
            try {
                await fetch('/api/auth/login-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: signedEmail }) }).catch(() => {});
                const r = await (await fetch(`/api/newsletter/eligibility?email=${encodeURIComponent(signedEmail)}`)).json();
                if (cancelled) return;
                if (r.state === 'eligible') { setElig('eligible'); setUntil(r.until ?? null); return; }
                if ((r.state === 'not-found' || r.state === 'pending') && !justSubscribed) {
                    // Not on the newsletter yet: subscribe first, then come back here with the discount.
                    window.location.replace(`/newsletter/join?email=${encodeURIComponent(signedEmail)}&next=${encodeURIComponent('/plans')}`);
                    return;
                }
                setElig('other');
            } catch { if (!cancelled) setElig('other'); }
        })();
        return () => { cancelled = true; };
    }, [ready, authenticated, signedEmail, linkEmail, justSubscribed]);

    const pay = async (plan: Plan) => {
        setError(null);
        if (editing || !EMAIL_RE.test(chosen)) { setError('Confirm the email address you want to use first.'); return; }
        setBusy(plan);
        try {
            const res = await fetch('/api/stripe/guest-checkout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan, email: chosen }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) throw new Error(data.error || 'Unable to start checkout.');
            window.location.href = data.url;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to start checkout.');
            setBusy(null);
        }
    };

    return (
        <main style={{ minHeight: '100vh', background: '#07080f', color: '#fff', padding: '48px 20px 140px' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <p style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a78bfa', fontWeight: 700 }}>TradeMind plans</p>
                <h1 style={{ fontSize: 34, margin: '10px 0 8px', fontWeight: 800 }}>Choose your plan</h1>
                <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, maxWidth: 660 }}>
                    TradeMind is a signal service, not auto-trading. Each trading day we process the signal at 3:30 PM ET and email you the exact order to enter at your own broker.
                </p>

                <ol style={{ listStyle: 'none', padding: 0, margin: '22px 0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                    {STEPS.map(([t, d], i) => (
                        <li key={t} style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)' }}>
                            <div style={{ color: '#a78bfa', fontWeight: 800, fontSize: 12 }}>STEP {i + 1}</div>
                            <div style={{ fontWeight: 700, margin: '4px 0', fontSize: 14 }}>{t}</div>
                            <div style={{ color: '#94a3b8', fontSize: 12.5, lineHeight: 1.5 }}>{d}</div>
                        </li>
                    ))}
                </ol>

                {authenticated && elig === 'checking' && (
                    <p style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: 14 }}>Checking your newsletter subscription for {signedEmail}</p>
                )}
                {authenticated && elig === 'eligible' && (
                    <div style={{ margin: '0 0 14px', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(52,211,153,0.5)', background: 'rgba(52,211,153,0.08)', fontSize: 14, color: '#a7f3d0', lineHeight: 1.5 }}>
                        Your 30% subscriber price is unlocked for {signedEmail}{until ? `, available until ${new Date(until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : ''}.
                    </div>
                )}
                <div style={{ margin: '0 0 22px', padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.08)', fontSize: 14 }}>
                    {editing ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const v = draft.trim();
                                if (!EMAIL_RE.test(v)) { setError('Enter a valid email address.'); return; }
                                setChosen(v); setEditing(false); setError(null);
                            }}
                        >
                            <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                                Step 1. Enter the email you want as your TradeMind login. The 30% subscriber price applies to any email you use.
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <input
                                    type="email" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="you@example.com" autoFocus
                                    style={{ flex: '1 1 240px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', padding: '10px 12px', fontSize: 14 }}
                                />
                                <button type="submit" style={btn(true)}>Use this email</button>
                                {linkEmail && <button type="button" onClick={() => { setChosen(linkEmail); setEditing(false); setError(null); }} style={btn(false)}>Keep {linkEmail}</button>}
                            </div>
                        </form>
                    ) : (
                        <>
                            <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                                Step 1. Your TradeMind login will be <strong>{chosen}</strong>. Is this the email you want to use?
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ color: '#a7f3d0', fontSize: 13 }}>Yes: choose a plan below.</span>
                                <button onClick={() => { setDraft(''); setEditing(true); setError(null); }} style={btn(false)}>No, use a different email</button>
                            </div>
                        </>
                    )}
                    {ready && signedEmail && signedEmail.toLowerCase() !== chosen.toLowerCase() && (
                        <p style={{ margin: '12px 0 0', color: '#fcd34d', fontSize: 13, lineHeight: 1.5 }}>
                            This browser is currently signed in as {signedEmail}. After payment you will be asked to sign in as {chosen || 'your chosen email'}.
                        </p>
                    )}
                    {error && <p style={{ color: '#f87171', margin: '10px 0 0', fontSize: 13 }}>{error}</p>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 18 }}>
                    {CARDS.map((c) => (
                        <section key={c.plan} style={{ border: `1px solid ${c.plan === 'leaps' ? 'rgba(124,58,237,0.6)' : 'rgba(79,142,247,0.45)'}`, borderRadius: 16, padding: 24, background: 'rgba(255,255,255,0.03)' }}>
                            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{c.name}</h2>
                            <p style={{ color: '#94a3b8', fontSize: 14, margin: '6px 0 14px' }}>{c.blurb}</p>
                            <p style={{ margin: 0 }}>
                                <span style={{ fontSize: 38, fontWeight: 800 }}>${c.price}</span>
                                <span style={{ color: '#94a3b8' }}> / year </span>
                                <span style={{ color: '#64748b', textDecoration: 'line-through', marginLeft: 6 }}>${c.regular}</span>
                            </p>
                            <p style={{ color: '#a78bfa', fontSize: 13, margin: '6px 0 14px' }}>Subscriber price, billed annually. Opens a {c.start} virtual account.</p>
                            <ul style={{ paddingLeft: 18, color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>
                                {c.points.map((p) => <li key={p}>{p}</li>)}
                            </ul>
                            <button onClick={() => void pay(c.plan)} disabled={busy !== null} style={{ ...btn(c.plan === 'leaps'), width: '100%', opacity: busy ? 0.6 : 1 }}>
                                {busy === c.plan ? 'Opening secure payment' : `Pay for ${c.name}`}
                            </button>
                        </section>
                    ))}
                </div>
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
                    TradeMind is software for self-directed investors, not investment advice. You place every order yourself at your own broker. Options involve risk.
                </p>
            </div>
        </main>
    );
}

function btn(primary: boolean): React.CSSProperties {
    return {
        borderRadius: 10, padding: '11px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff',
        border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)', background: primary ? '#7c3aed' : 'transparent',
    };
}
