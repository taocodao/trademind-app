'use client';

import { useEffect, useState } from 'react';
import {
    PRODUCT_LABEL, SUBSCRIBER_DISCOUNT_PCT, dollars, standardCents, subscriberCents,
    type IntervalV2, type ProductV2,
} from '@/lib/pricing-v2';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Card = { id: ProductV2; blurb: string; points: string[]; accent: string };

const CARDS: Card[] = [
    {
        id: 'defensive', accent: '#4f8ef7',
        blurb: 'A rules-based allocation across QQQ, QLD, TQQQ and SGOV that shifts with the market regime.',
        points: ['Signal processed at 3:00 PM ET each trading day', 'Exact order instructions by email', 'No options approval needed', 'Opens a $10,000 virtual account'],
    },
    {
        id: 'leaps', accent: '#7c3aed',
        blurb: 'Long-term call options on QQQ, managed by a machine-learning signal.',
        points: ['Signal processed at 3:30 PM ET each trading day', 'Exact order instructions by email', 'Requires options approval at your broker (long calls)', 'Opens a $25,000 virtual account'],
    },
    {
        id: 'both', accent: '#34d399',
        blurb: 'Both strategies on one subscription: one Defensive account and one LEAPS account.',
        points: ['Both signals, both accounts', 'One payment, one renewal date, one cancellation', 'Opens a $10,000 and a $25,000 virtual account'],
    },
];

const secondary: React.CSSProperties = { color: '#94a3b8' };

/**
 * Pricing v2 plan picker, shared by the landing page and /plans.
 * landing: choose a plan and go to /plans. plans: confirm the email and pay with Stripe.
 */
export default function PricingV2({ mode, linkEmail = '', initialProduct = null, initialInterval = 'month' }: {
    mode: 'landing' | 'plans';
    linkEmail?: string;
    initialProduct?: ProductV2 | null;
    initialInterval?: IntervalV2;
}) {
    const [interval, setIntervalV] = useState<IntervalV2>(initialInterval);
    const [selected, setSelected] = useState<ProductV2 | null>(initialProduct);
    const [email, setEmail] = useState(linkEmail);
    const [subscriber, setSubscriber] = useState<boolean | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const emailOk = EMAIL_RE.test(email.trim());

    useEffect(() => {
        if (mode !== 'plans' || !emailOk) { setSubscriber(null); return; }
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const r = await (await fetch(`/api/stripe/v2/quote?email=${encodeURIComponent(email.trim())}`)).json();
                if (!cancelled) setSubscriber(Boolean(r.subscriber));
            } catch { if (!cancelled) setSubscriber(null); }
        }, 400);
        return () => { cancelled = true; clearTimeout(timer); };
    }, [mode, email, emailOk]);

    const per = interval === 'month' ? 'month' : 'year';

    const go = async (product: ProductV2) => {
        setSelected(product);
        setError(null);
        if (mode === 'landing') {
            const q = new URLSearchParams({ product, interval });
            window.location.href = `/plans?${q.toString()}`;
            return;
        }
        if (!emailOk) { setError('Enter the email you want as your TradeMind login first.'); return; }
        setBusy(true);
        try {
            const res = await fetch('/api/stripe/v2/checkout', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ product, interval, email: email.trim() }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.url) throw new Error(data.error || 'Unable to start checkout.');
            window.location.href = data.url;
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to start checkout.');
            setBusy(false);
        }
    };

    return (
        <div>
            {mode === 'plans' && (
                <div style={{ margin: '0 0 20px', padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(124,58,237,0.5)', background: 'rgba(124,58,237,0.08)', fontSize: 14 }}>
                    <label htmlFor="tm-plan-email" style={{ display: 'block', marginBottom: 8, lineHeight: 1.5 }}>
                        Your TradeMind login email. There is no password, and your signals are emailed here.
                    </label>
                    <input
                        id="tm-plan-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                        style={{ width: '100%', maxWidth: 380, borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: '#fff', padding: '10px 12px', fontSize: 14 }}
                    />
                    {emailOk && subscriber === true && (
                        <p style={{ margin: '10px 0 0', color: '#a7f3d0', fontSize: 13 }}>Your newsletter subscriber price is applied: {SUBSCRIBER_DISCOUNT_PCT}% off, for as long as you stay subscribed to a plan.</p>
                    )}
                    {emailOk && subscriber === false && (
                        <p style={{ margin: '10px 0 0', color: '#fcd34d', fontSize: 13, lineHeight: 1.5 }}>
                            This email is not a confirmed newsletter subscriber, so standard prices apply.{' '}
                            <a href={`/newsletter/join?email=${encodeURIComponent(email.trim())}&next=${encodeURIComponent('/plans')}`} style={{ color: '#fde68a', textDecoration: 'underline' }}>
                                Join the free daily newsletter to get {SUBSCRIBER_DISCOUNT_PCT}% off
                            </a>.
                        </p>
                    )}
                    {error && <p style={{ color: '#f87171', margin: '10px 0 0', fontSize: 13 }}>{error}</p>}
                </div>
            )}

            <div role="group" aria-label="Billing period" style={{ display: 'inline-flex', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 999, padding: 4, marginBottom: 20 }}>
                {(['month', 'year'] as const).map((i) => (
                    <button key={i} onClick={() => setIntervalV(i)} aria-pressed={interval === i}
                        style={{ border: 'none', cursor: 'pointer', borderRadius: 999, padding: '8px 18px', fontWeight: 700, fontSize: 14, color: '#fff', background: interval === i ? '#7c3aed' : 'transparent' }}>
                        {i === 'month' ? 'Monthly' : 'Yearly'}
                    </button>
                ))}
                {interval === 'year' && <span style={{ alignSelf: 'center', padding: '0 12px', color: '#a7f3d0', fontSize: 12, fontWeight: 700 }}>2 months free</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
                {CARDS.map((c) => {
                    const std = standardCents(c.id, interval);
                    const sub = subscriberCents(c.id, interval);
                    const isSel = selected === c.id;
                    const showSub = mode === 'plans' && subscriber === true;
                    return (
                        <section key={c.id} onClick={() => setSelected(c.id)}
                            style={{ border: `${isSel ? 2 : 1}px solid ${c.accent}`, borderRadius: 16, padding: 24, background: isSel ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{PRODUCT_LABEL[c.id]}</h3>
                            <p style={{ ...secondary, fontSize: 14, margin: '6px 0 14px', lineHeight: 1.5 }}>{c.blurb}</p>
                            <p style={{ margin: 0 }}>
                                <span style={{ fontSize: 38, fontWeight: 800 }}>{dollars(showSub ? sub : std)}</span>
                                <span style={secondary}> / {per}</span>
                            </p>
                            {showSub ? (
                                <p style={{ color: '#a7f3d0', fontSize: 13, margin: '6px 0 14px' }}>Subscriber price. Standard price is {dollars(std)}.</p>
                            ) : (
                                <p style={{ color: '#a78bfa', fontSize: 13, margin: '6px 0 14px' }}>
                                    Newsletter subscribers pay {dollars(sub)} / {per}.
                                </p>
                            )}
                            <ul style={{ paddingLeft: 18, color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px', flexGrow: 1 }}>
                                {c.points.map((p) => <li key={p}>{p}</li>)}
                            </ul>
                            <button onClick={(e) => { e.stopPropagation(); void go(c.id); }} disabled={busy}
                                style={{ width: '100%', border: 'none', borderRadius: 10, padding: '12px 16px', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: '#fff', background: c.accent, opacity: busy ? 0.6 : 1 }}>
                                {busy && isSel ? 'Opening secure payment' : mode === 'landing' ? `Choose ${PRODUCT_LABEL[c.id]}` : `Pay for ${PRODUCT_LABEL[c.id]}`}
                            </button>
                        </section>
                    );
                })}
            </div>

            <div style={{ marginTop: 18, padding: '16px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', fontSize: 14, lineHeight: 1.6 }}>
                <strong>Study program (free, no card).</strong>{' '}
                <span style={secondary}>
                    Try the signals for 30 days with a virtual account, with up to 20 seats. Completing activities can extend your access up to 90 days. You only pay if you choose to buy a plan.
                </span>{' '}
                <a href="/founding" style={{ color: '#a78bfa', textDecoration: 'underline' }}>Apply for the study program</a>
            </div>

            <ul style={{ ...secondary, fontSize: 12.5, lineHeight: 1.7, marginTop: 16, paddingLeft: 18 }}>
                <li>Your card is charged at checkout. Cancel within your first month and the payment is refunded in full.</li>
                <li>Yearly billing is ten monthly payments, so you get two months free.</li>
                <li>Want another account? Buy again with the same email. One login can hold many accounts.</li>
                <li>Join the free daily newsletter and pay {SUBSCRIBER_DISCOUNT_PCT}% less for as long as your plan stays active.</li>
            </ul>
        </div>
    );
}
