'use client';

import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { PricingSection } from '@/components/marketing/PricingSection';
import { ReferralPromoSection } from '@/components/marketing/ReferralPromoSection';
import { TrustBadges } from '@/components/marketing/TrustBadges';
import { LegalFooter } from '@/components/marketing/LegalFooter';
import { StoryLanding } from '@/components/marketing/story/StoryLanding';
import { CoPilotHero } from '@/components/marketing/CoPilotHero';
import { ModelTrustSection } from '@/components/marketing/ModelTrustSection';
import { PatienceSection } from '@/components/marketing/PatienceSection';
import { MillionaireCalc } from '@/components/marketing/MillionaireCalc';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import '@/components/marketing/story/story.css';

export default function SinglePageMarketing() {
    const { t } = useTranslation();
    const { login, authenticated, ready } = usePrivy();
    const router = useRouter();
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (ready) {
            if (authenticated && window.location.hash !== '#pricing') {
                router.push('/dashboard');
            } else {
                setShouldRender(true);
                // Explicitly scroll to hash after render because loading spinner blocks native browser jump
                if (window.location.hash) {
                    setTimeout(() => {
                        const el = document.getElementById(window.location.hash.substring(1));
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }, 200);
                }
            }
        }
    }, [ready, authenticated, router]);

    // ── TikTok / dark social attribution capture + Whop redirect ─────────────────
    // Store UTM params + referral code in localStorage on first visit.
    // These survive multi-session paths (user watches TikTok, visits days later, signs up).
    // Also: if Whop redirects here after checkout (checkout_status=success),
    // forward to /whop/welcome with all params preserved.
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);

            // ── Whop checkout redirect ─────────────────────────────────────────
            const checkoutStatus = params.get('checkout_status') ?? params.get('status');
            const receiptId = params.get('receipt_id') ?? params.get('payment_id');
            if (checkoutStatus === 'success' && receiptId) {
                router.replace(`/whop/welcome?${params.toString()}`);
                return;
            }

            // ── Referral code capture ────────────────────────────────────────────
            const ref = params.get('ref') || params.get('code');
            if (ref && !localStorage.getItem('tm_referralCode')) {
                localStorage.setItem('tm_referralCode', ref.toUpperCase());
            }
            // UTM attribution
            const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const;
            utmKeys.forEach(k => {
                const v = params.get(k);
                if (v && !localStorage.getItem(`tm_${k}`)) {
                    localStorage.setItem(`tm_${k}`, v);
                }
            });
        } catch {
            // localStorage may be unavailable in certain browsers, fail silently
        }
    }, [router]);

    if (!ready || !shouldRender) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-tm-bg">
                <div className="w-12 h-12 rounded-full border-4 border-tm-border border-t-tm-purple animate-spin" />
            </main>
        );
    }

    return (
        <main className="min-h-screen flex flex-col bg-[#0A0A0F] overflow-x-hidden pt-16">
            <MarketingHeader />

            {/* Static hero, slogan + co-pilot framing + trust stats */}
            <CoPilotHero />

            {/* The Model, Not the Hype, why signals can be trusted */}
            <ModelTrustSection />

            {/* Patience Is the Strategy, entries timeline */}
            <PatienceSection />

            {/* Narrated scrollytelling track record, the landing story */}
            <StoryLanding
                onCta={() => {
                    const el = document.getElementById('pricing');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    else login();
                }}
                ctaLabel={t('hero.cta', 'Start your account')}
            />

            {/* Run-your-own-numbers tool + share bar (from the static landing) */}
            <MillionaireCalc />

            {/* Conversion & Scaling Layouts */}
            <div className="w-full flex flex-col items-center justify-center z-10">
                <PricingSection />
                <ReferralPromoSection />
            </div>

            {/* Bottom CTA & Trust Section */}
            <div className="z-10 mt-20 mb-10 w-full flex flex-col items-center">
                <button
                    onClick={login}
                    className="btn-primary px-10 py-5 text-xl font-bold flex items-center gap-3 shadow-[0_0_30px_rgba(124,58,237,0.5)] hover:shadow-[0_0_50px_rgba(124,58,237,0.7)] hover:scale-[1.02] transition-all mx-auto"
                >
                    {t('hero.cta')} <ArrowRight className="w-6 h-6" />
                </button>
                <TrustBadges />
            </div>

            {/* Regulatory Disclaimers */}
            <LegalFooter />
        </main>
    );
}
