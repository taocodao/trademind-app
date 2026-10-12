'use client';

import { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { PRICING } from '@/lib/pricing-config';
import { loginEmailOf, sameEmail } from '@/lib/privy-email';

type Plan = 'basic' | 'leaps';

const CARDS: Array<{ plan: Plan; name: string; blurb: string; regular: number; price: number; start: string; points: string[]; note: string }> = [
    {
        plan: 'basic', name: PRICING.plans.turbocore_pro_bundle.label, blurb: 'Regime-aware ML signal. Any brokerage account works.',
        regular: PRICING.plans.turbocore_pro_bundle.regularAnnual, price: PRICING.plans.turbocore_pro_bundle.annual,
        start: '$10,000 virtual account',
        points: ['Signal processed at 3:30 PM ET each trading day', 'Email order instructions you enter at your own broker', 'No options approval needed'],
        note: 'No options approval needed.',
    },
    {
        plan: 'leaps', name: PRICING.plans.qqq_leaps.label, blurb: 'ML-powered long-term options on QQQ.',
        regular: PRICING.plans.qqq_leaps.regularAnnual, price: PRICING.plans.qqq_leaps.annual,
        start: '$25,000 virtual account',
        points: ['Signal processed at 3:30 PM ET each trading day', 'Email order instructions you enter at your own broker', 'Requires options approval at your broker (long calls)'],
        note: 'Requires options approval at your broker.',
    },
];

export default function PlansClient({ linkEmail }: { linkEmail: string }) {
    const { ready, authenticated, user, login, logout } = usePrivy();
    const signedEmail = authenticated ? loginEmailOf(user) : null;
    const [useSigned, setUseSigned] = useState(false);
    // The address the plan will be created for when signing in. Starts as the address in the link; the visitor can change it.
    const [chosen, setChosen] = useState(linkEmail);
    const [editing, setEditing] = useState(!linkEmail);
    const [draft, setDraft] = useState('');
    const [draftError, setDraftError] = useState<string | null>(null);
    const wantedEmail = (typeof window !== 'undefined' && authenticated ? (() => { try { return JSON.parse(sessionStorage.getItem('tm_pending_plan') || 'null')?.email as string | undefined; } catch { return undefined; } })() : undefined) || linkEmail;
    const mismatch = authenticated && !!wantedEmail && !!signedEmail && !sameEmail(wantedEmail, signedEmail) && !useSigned;
    const target = useSigned ? (signedEmail ?? '') : (wantedEmail || signedEmail || '');

    const go = (plan: Plan) => {
        window.location.href = `/upgrade?plan=${plan}${target ? `&email=${encodeURIComponent(target)}` : ''}`;
    };

    const choose = (plan: Plan) => {
        if (!authenticated) {
            if (editing && !chosen) { setDraftError('Enter the email address you want to use first.'); return; }
            try { sessionStorage.setItem('tm_pending_plan', JSON.stringify({ plan, email: chosen, ts: Date.now() })); } catch { /* ignore */ }
            login(chosen ? { prefill: { type: 'email', value: chosen } } : {});
            return;
        }
        if (!mismatch) go(plan);
    };

    // After sign in, carry on to payment for the plan that was chosen.
    useEffect(() => {
        if (!authenticated) return;
        let pending: { plan?: string; email?: string; ts?: number } | null = null;
        try {
            const raw = sessionStorage.getItem('tm_pending_plan');
            pending = raw ? JSON.parse(raw) : null;
        } catch { /* ignore */ }
        if (!pending || Date.now() - (pending.ts ?? 0) > 10 * 60 * 1000) return;
        const wanted = pending.email || linkEmail;
        if (wanted && signedEmail && !sameEmail(wanted, signedEmail)) return; // mismatch box decides
        try { sessionStorage.removeItem('tm_pending_plan'); } catch { /* ignore */ }
        if (pending.plan === 'basic' || pending.plan === 'leaps') {
            window.location.href = `/upgrade?plan=${pending.plan}&email=${encodeURIComponent(signedEmail || wanted || '')}`;
        }
    }, [authenticated, linkEmail, signedEmail]);

    const switchLogin = async () => {
        await logout();
        login(linkEmail ? { prefill: { type: 'email', value: linkEmail } } : {});
    };

    return (
        <main style={{ minHeight: '100vh', background: '#07080f', color: '#fff', padding: '48px 20px 120px' }}>
            <div style={{ maxWidth: 880, margin: '0 auto' }}>
                <p style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a78bfa', fontWeight: 700 }}>TradeMind plans</p>
                <h1 style={{ fontSize: 34, margin: '10px 0 8px', fontWeight: 800 }}>Choose your plan</h1>
                <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, maxWidth: 640 }}>
                    TradeMind is a signal service, not auto-trading. Each trading day we process the signal at 3:30 PM ET and email you the exact order to enter at your own broker. Annual billing only. Your card is charged at checkout, and if you cancel within the first month the payment is refunded in full.
                </p>

                <div style={{ margin: '22px 0', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', fontSize: 14 }}>
                    {!ready ? (
                        <span style={{ color: '#94a3b8' }}>Checking your sign in</span>
                    ) : mismatch ? (
                        <>
                            <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                                You are signed in as <strong>{signedEmail}</strong>, but this offer was sent to <strong>{linkEmail}</strong>. Which login should hold your subscription?
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <button onClick={() => void switchLogin()} style={btn(true)}>Sign out and continue as {linkEmail}</button>
                                <button onClick={() => setUseSigned(true)} style={btn(false)}>Continue as {signedEmail}</button>
                            </div>
                        </>
                    ) : authenticated ? (
                        <span>Your subscription will be created for the login <strong>{signedEmail ?? 'on this device'}</strong>.</span>
                    ) : editing ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                const v = draft.trim();
                                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { setDraftError('Enter a valid email address.'); return; }
                                setChosen(v); setEditing(false); setDraftError(null);
                            }}
                        >
                            <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                                Enter the email you want for your TradeMind login. Your signals will be sent there, and the 30% subscriber price applies to any email you use.
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <input
                                    type="email" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="you@example.com" autoFocus
                                    style={{ flex: '1 1 240px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', padding: '10px 12px', fontSize: 14 }}
                                />
                                <button type="submit" style={btn(true)}>Use this email</button>
                                {linkEmail && <button type="button" onClick={() => { setChosen(linkEmail); setEditing(false); setDraftError(null); }} style={btn(false)}>Keep {linkEmail}</button>}
                            </div>
                            {draftError && <p style={{ color: '#f87171', margin: '8px 0 0', fontSize: 13 }}>{draftError}</p>}
                        </form>
                    ) : (
                        <>
                            <p style={{ margin: '0 0 10px', lineHeight: 1.5 }}>
                                Your plan will be created for the login <strong>{chosen}</strong>. Is this the email you want to use?
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ alignSelf: 'center', color: '#a7f3d0', fontSize: 13 }}>Yes: choose a plan below</span>
                                <button onClick={() => { setDraft(''); setEditing(true); }} style={btn(false)}>No, use a different email</button>
                            </div>
                        </>
                    )}
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
                            <p style={{ color: '#a78bfa', fontSize: 13, margin: '6px 0 14px' }}>Newsletter subscriber price, billed annually. Starts with a {c.start}.</p>
                            <ul style={{ paddingLeft: 18, color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>
                                {c.points.map((p) => <li key={p}>{p}</li>)}
                            </ul>
                            <button onClick={() => choose(c.plan)} disabled={mismatch || !ready} style={{ ...btn(c.plan === 'leaps'), width: '100%', opacity: mismatch || !ready ? 0.5 : 1 }}>
                                {authenticated ? `Continue to payment, ${c.name}` : `Sign in${chosen ? ` as ${chosen}` : ''} and continue`}
                            </button>
                        </section>
                    ))}
                </div>
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
