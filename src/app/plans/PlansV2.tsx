'use client';

import PricingV2 from '@/components/marketing/PricingV2';
import type { IntervalV2, ProductV2 } from '@/lib/pricing-v2';

export default function PlansV2({ linkEmail, product, interval }: { linkEmail: string; product: ProductV2 | null; interval: IntervalV2 }) {
    return (
        <main style={{ minHeight: '100vh', background: '#07080f', color: '#fff', padding: '48px 20px 140px' }}>
            <div style={{ maxWidth: 1000, margin: '0 auto' }}>
                <p style={{ fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a78bfa', fontWeight: 700 }}>TradeMind plans</p>
                <h1 style={{ fontSize: 34, margin: '10px 0 8px', fontWeight: 800 }}>Choose your plan</h1>
                <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6, maxWidth: 680, marginBottom: 22 }}>
                    TradeMind is a signal service, not auto-trading. Each trading day we process the signal (3:00 PM ET for QQQ Defensive, 3:30 PM ET for QQQ LEAPS) and email you the exact order to enter at your own broker. After payment, sign in with the same email and your virtual account opens automatically.
                </p>
                <PricingV2 mode="plans" linkEmail={linkEmail} initialProduct={product} initialInterval={interval} />
                <p style={{ color: '#64748b', fontSize: 12, marginTop: 22, lineHeight: 1.6 }}>
                    TradeMind is software for self-directed investors, not investment advice. You place every order yourself at your own broker. Options involve risk.
                </p>
            </div>
        </main>
    );
}
