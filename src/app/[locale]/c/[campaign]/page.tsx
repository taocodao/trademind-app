'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrivy } from '@privy-io/react-auth';
import { Check, Star, ChevronLeft } from 'lucide-react';

// ── Supported locales ──────────────────────────────────────────────────────
const SUPPORTED_LOCALES = ['en', 'es', 'zh'] as const;
type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// ── Campaign content ───────────────────────────────────────────────────────
const CAMPAIGNS: Record<string, {
    image: string;
    hookHeader: Record<SupportedLocale, string>;
    content: Record<SupportedLocale, string[]>;
}> = {
    compounding: {
        image: '/campaigns/compounding.png',
        hookHeader: {
            en: 'How to build generational wealth starting with $5,000.',
            es: 'Cómo construir riqueza generacional comenzando con $5,000.',
            zh: '如何从5000美元开始积累世代财富。',
        },
        content: {
            en: [
                'The math behind algorithmic compounding is undeniable.',
                'A 19-year-old investing $5,000 at a 39% annual return becomes a millionaire at 41.',
                'No inheritance. No lucky stock pick. Just time doing what time does.',
                'TradeMind closes that gap. Every trading day at 3PM, our AI sends a clear signal: BULL, SIDEWAYS, or BEAR.',
                '7-year backtest: 39% annualized return. 3x the S&P 500. In 2022 when QQQ lost 33%: our system returned +21.4%.',
                'Takes under 2 minutes to act on.',
            ],
            es: [
                'Las matemáticas del interés compuesto algorítmico son innegables.',
                'Un joven de 19 años que invierte $5,000 al 39% anual se convierte en millonario a los 41.',
                'Sin herencias. Sin golpes de suerte. Solo el tiempo haciendo lo que hace.',
                'TradeMind cierra esa brecha. Cada día bursátil a las 3PM, nuestra IA envía una señal clara: BULL, SIDEWAYS o BEAR.',
                'Backtest de 7 años: 39% de retorno anualizado. 3x el S&P 500. En 2022 cuando el QQQ perdió 33%: nuestro sistema retornó +21.4%.',
                'Requiere menos de 2 minutos para actuar.',
            ],
            zh: [
                '算法复利背后的数学不可否认。',
                '一个19岁的年轻人以39%的年回报率投资5000美元，将在41岁成为百万富翁。',
                '无需遗产，无需幸运选股，只需时间做它该做的事。',
                'TradeMind弥合了这一差距。每个交易日下午3点，我们的AI发出清晰信号：牛市、横盘或熊市。',
                '7年回测：39%年化回报，是标普500的3倍。2022年QQQ下跌33%时，我们的系统回报+21.4%。',
                '不到2分钟即可执行。',
            ],
        },
    },
};

// ── Pricing data ───────────────────────────────────────────────────────────
const TIERS = [
    {
        id: 'turbocore',
        name: 'TurboCore',
        tagline: 'AI-powered daily signals. Any brokerage.',
        monthly: 29,
        annual: 249,
        monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_MONTHLY_PRICE_ID || '',
        annualPriceId: process.env.NEXT_PUBLIC_STRIPE_TURBOCORE_ANNUAL_PRICE_ID || '',
        features: ['Daily AI regime signal (BULL / SIDEWAYS / BEAR)', 'ML confidence score 0–100', 'Virtual portfolio management', 'Works with any brokerage'],
        popular: false,
    },
    {
        id: 'turbocore_pro',
        name: 'TurboCore Pro',
        tagline: 'LEAPS-powered alpha. 3× QQQ returns.',
        monthly: 49,
        annual: 399,
        monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID || '',
        annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID || '',
        features: ['Everything in TurboCore', 'QQQ LEAPS options (3–4× leverage, no daily decay)', '39.3% historical CAGR', 'Dynamic VIX-adjusted sizing'],
        popular: false,
    },
    {
        id: 'both_bundle',
        name: 'Full Strategy Bundle',
        tagline: 'Every signal. Every strategy.',
        monthly: 69,
        annual: 549,
        monthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_BUNDLE_MONTHLY_PRICE_ID || '',
        annualPriceId: process.env.NEXT_PUBLIC_STRIPE_BUNDLE_ANNUAL_PRICE_ID || '',
        features: ['TurboCore + TurboCore Pro running in parallel', 'Unified virtual portfolio across both strategies', 'Tastytrade one-click auto-execution', 'Live P&L dashboard'],
        popular: true,
    },
];

// ── Helper: calculate referral bonus days ─────────────────────────────────
const REFERRAL_FEE = 100;
const REFERRAL_HALF = REFERRAL_FEE / 2;

function calcBonusDays(monthlyPrice: number): number {
    const dailyRate = monthlyPrice / 30;
    return Math.floor(REFERRAL_HALF / dailyRate);
}

// ── Locale-aware Campaign Page ────────────────────────────────────────────
// Route: /[locale]/c/[campaign]?ref=CODE
// The [locale] segment is set by middleware on first visit.
// Users can also switch language manually via the language bar.
export default function LocaleCampaignPage({
    params,
}: {
    params: { locale: string; campaign: string };
}) {
    const { i18n } = useTranslation();
    const { login, authenticated, getAccessToken, ready } = usePrivy();

    const [refCode, setRefCode] = useState('');
    const [showPricing, setShowPricing] = useState(false);
    const [isAnnual, setIsAnnual] = useState(false);
    const [loadingTier, setLoadingTier] = useState<string | null>(null);

    // ── Initialise locale from the URL segment on mount ────────────────────
    // This ensures the referee sees the page in the language detected by middleware,
    // independent of any other session state.
    useEffect(() => {
        const urlLocale = (SUPPORTED_LOCALES as readonly string[]).includes(params.locale)
            ? params.locale
            : 'en';
        if (i18n.language?.slice(0, 2) !== urlLocale) {
            i18n.changeLanguage(urlLocale);
        }
    }, [params.locale, i18n]);

    // ── Read ref code from URL ─────────────────────────────────────────────
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const ref = searchParams.get('ref') || searchParams.get('code') || '';
        setRefCode(ref.toUpperCase());
        if (ref) localStorage.setItem('tm_referralCode', ref.toUpperCase());
    }, []);

    // ── Resume checkout after login ────────────────────────────────────────
    useEffect(() => {
        if (!ready || !authenticated) return;
        const pendingTierId = sessionStorage.getItem('pendingCampaignTier');
        const pendingAnnual = sessionStorage.getItem('pendingCampaignAnnual') === 'true';
        if (pendingTierId) {
            sessionStorage.removeItem('pendingCampaignTier');
            sessionStorage.removeItem('pendingCampaignAnnual');
            const tier = TIERS.find(t => t.id === pendingTierId);
            if (tier) handleSubscribe(tier, pendingAnnual);
        }
    }, [ready, authenticated]);

    const campaignId = params.campaign?.toLowerCase() || 'compounding';
    const campaign = CAMPAIGNS[campaignId];
    if (!campaign) return null;

    const activeLang = (i18n.language?.slice(0, 2) || 'en') as SupportedLocale;
    const safeLang: SupportedLocale = SUPPORTED_LOCALES.includes(activeLang) ? activeLang : 'en';

    const handleSubscribe = async (tier: typeof TIERS[0], annual = isAnnual) => {
        const priceId = annual ? tier.annualPriceId : tier.monthlyPriceId;
        if (!priceId) { alert('Plan not configured.'); return; }

        if (!authenticated) {
            sessionStorage.setItem('pendingCampaignTier', tier.id);
            sessionStorage.setItem('pendingCampaignAnnual', String(annual));
            login();
            return;
        }

        setLoadingTier(tier.id);
        try {
            const token = await getAccessToken();
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    priceId,
                    isAnnual: annual,
                    referralCode: refCode,
                    locale: safeLang,
                    isReferralSignup: !!refCode,
                }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error(data.error || 'Checkout failed');
            }
        } catch (err) {
            console.error(err);
            alert('Could not start checkout. Please try again.');
        } finally {
            setLoadingTier(null);
        }
    };

    // ── Labels by locale ───────────────────────────────────────────────────
    const labels: Record<SupportedLocale, {
        liveNow: string;
        signIn: string;
        startFreeCredit: string;
        startFreeTrial: string;
        back: string;
        choosePlan: string;
        cardCharged: string;
        monthly: string;
        annually: string;
        save: string;
        referralCreditTitle: string;
        atSignup: string;
        atSignupDesc: string;
        afterCharge: string;
        afterChargeDesc: string;
        eg: string;
        refAutoApplied: string;
        yourExtendedTrial: string;
        daysBase: string;
        referralBonus: string;
        startTrial: (days: number) => string;
        start14Trial: string;
        redirecting: string;
        billedMonthly: string;
        billedAnnually: (yr: number) => string;
        trialTagline: (refCode: boolean) => string;
        finePrint: (haRef: boolean, minDays: number, maxDays: number) => string;
    }> = {
        en: {
            liveNow: 'Live Now',
            signIn: 'Sign In',
            startFreeCredit: 'Start with $100 Free Credit →',
            startFreeTrial: 'Start Free Trial →',
            back: 'Back',
            choosePlan: 'Choose Your Plan',
            cardCharged: 'Card collected now — charged after your extended free trial.',
            monthly: 'Monthly',
            annually: 'Annually',
            save: 'SAVE',
            referralCreditTitle: '🎁 Your $100 Referral Credit — Applied Automatically',
            atSignup: 'At signup:',
            atSignupDesc: 'Get $50 worth of extra free days added to your trial (on top of 14 days)',
            afterCharge: 'After first charge:',
            afterChargeDesc: 'Get another $50 in free days credited to your subscription',
            eg: 'e.g. on TurboCore ($29/mo): +51 days at signup → your trial = 65 days. Then +51 more after first charge.',
            refAutoApplied: 'Referral code auto-applied.',
            yourExtendedTrial: '🎁 Your Extended Trial',
            daysBase: '14d base',
            referralBonus: 'd referral bonus',
            startTrial: (d) => `Start ${d}-day Trial`,
            start14Trial: 'Start 14-day Trial',
            redirecting: 'Redirecting...',
            billedMonthly: 'Billed monthly',
            billedAnnually: (yr) => `$${yr}/yr billed annually`,
            trialTagline: (hasRef) => hasRef
                ? 'All plans include 14-day base trial + $50 bonus days'
                : 'All plans include a 14-day free trial',
            finePrint: (hasRef, mn, mx) => hasRef
                ? `Your $50 referral bonus is pre-loaded. Card collected now, charged only after your ${mn}-${mx} day trial.`
                : 'Card collected now, charged only after your 14-day free trial. Cancel anytime before.',
        },
        es: {
            liveNow: 'En vivo',
            signIn: 'Iniciar sesión',
            startFreeCredit: 'Empezar con $100 de crédito gratis →',
            startFreeTrial: 'Prueba gratuita →',
            back: 'Volver',
            choosePlan: 'Elige tu plan',
            cardCharged: 'Tarjeta recopilada ahora — cobrada después de tu prueba extendida.',
            monthly: 'Mensual',
            annually: 'Anual',
            save: 'AHORRA',
            referralCreditTitle: '🎁 Tu crédito de referido de $100 — Aplicado automáticamente',
            atSignup: 'Al registrarte:',
            atSignupDesc: 'Obtén $50 en días gratis adicionales añadidos a tu prueba (además de 14 días)',
            afterCharge: 'Después del primer cargo:',
            afterChargeDesc: 'Obtén otros $50 en días gratis acreditados en tu suscripción',
            eg: 'Ej. en TurboCore ($29/mes): +51 días al registrarte → tu prueba = 65 días. Luego +51 más después del primer cargo.',
            refAutoApplied: 'Código de referido aplicado automáticamente.',
            yourExtendedTrial: '🎁 Tu prueba extendida',
            daysBase: '14d base',
            referralBonus: 'd bono referido',
            startTrial: (d) => `Iniciar prueba de ${d} días`,
            start14Trial: 'Iniciar prueba de 14 días',
            redirecting: 'Redirigiendo...',
            billedMonthly: 'Facturado mensualmente',
            billedAnnually: (yr) => `$${yr}/año facturado anualmente`,
            trialTagline: (hasRef) => hasRef
                ? 'Todos los planes incluyen 14 días base + días de bono por referido'
                : 'Todos los planes incluyen 14 días de prueba gratuita',
            finePrint: (hasRef, mn, mx) => hasRef
                ? `Tu bono de $50 ya está cargado. Tarjeta recopilada ahora, cobrada solo después de tu prueba de ${mn}-${mx} días.`
                : 'Tarjeta recopilada ahora, cobrada solo después de tu prueba gratuita de 14 días. Cancela en cualquier momento.',
        },
        zh: {
            liveNow: '立即上线',
            signIn: '登录',
            startFreeCredit: '开始享受$100免费信用 →',
            startFreeTrial: '开始免费试用 →',
            back: '返回',
            choosePlan: '选择您的计划',
            cardCharged: '现在收集信用卡 — 在延长免费试用后收费。',
            monthly: '月付',
            annually: '年付',
            save: '节省',
            referralCreditTitle: '🎁 您的$100推荐信用 — 自动应用',
            atSignup: '注册时：',
            atSignupDesc: '在试用期（14天基础）上额外获得价值$50的免费天数',
            afterCharge: '首次扣款后：',
            afterChargeDesc: '再获得$50的免费天数添加到您的订阅',
            eg: '例如TurboCore ($29/月)：注册时+51天 → 您的试用期=65天。首次扣款后再+51天。',
            refAutoApplied: '推荐码已自动应用。',
            yourExtendedTrial: '🎁 您的延长试用',
            daysBase: '14天基础',
            referralBonus: '天推荐奖励',
            startTrial: (d) => `开始${d}天试用`,
            start14Trial: '开始14天试用',
            redirecting: '跳转中...',
            billedMonthly: '按月计费',
            billedAnnually: (yr) => `$${yr}/年按年计费`,
            trialTagline: (hasRef) => hasRef
                ? '所有计划包含14天基础试用 + 推荐奖励天数'
                : '所有计划包含14天免费试用',
            finePrint: (hasRef, mn, mx) => hasRef
                ? `您的$50推荐奖励已预加载。现在收集信用卡，仅在${mn}-${mx}天试用后收费。`
                : '现在收集信用卡，仅在14天免费试用后收费。可随时取消。',
        },
    };

    const L = labels[safeLang];

    return (
        <main className="min-h-screen bg-[#07070F] text-zinc-300 antialiased pb-24">

            {/* ── Header with Language Bar ── */}
            <header className="px-6 py-4 flex justify-between items-center max-w-5xl mx-auto border-b border-white/5">
                <Link href="/" className="font-black text-xl tracking-tighter text-white">
                    TradeMind<span className="text-purple-400">.bot</span>
                </Link>

                {/* Language Selector */}
                <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10">
                    {(SUPPORTED_LOCALES as readonly string[]).map((lang) => (
                        <button
                            key={lang}
                            onClick={() => i18n.changeLanguage(lang)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                safeLang === lang ? 'bg-purple-600 text-white shadow' : 'text-zinc-400 hover:text-white'
                            }`}
                        >
                            {lang === 'zh' ? '中文' : lang.toUpperCase()}
                        </button>
                    ))}
                </div>

                <Link href={`/?ref=${refCode}`} className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
                    {L.signIn}
                </Link>
            </header>

            {/* ── Hero Section ── */}
            <div className="max-w-4xl mx-auto px-6 mt-8 md:mt-12 flex flex-col md:flex-row gap-12 items-center">

                {/* Visual */}
                <div className="w-full md:w-1/2 relative">
                    <div className="absolute inset-0 bg-purple-600/20 blur-3xl -z-10 rounded-full" />
                    <div className="bg-black/40 border border-white/10 rounded-3xl p-2 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
                        <Image
                            src={campaign.image}
                            alt={campaign.hookHeader[safeLang]}
                            width={1000}
                            height={1000}
                            className="w-full h-auto rounded-2xl object-cover"
                            priority
                        />
                    </div>
                </div>

                {/* Copy */}
                <div className="w-full md:w-1/2 flex flex-col items-start text-left space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        {L.liveNow}
                    </div>

                    <h1 className="text-3xl lg:text-4xl font-black text-white leading-[1.1] tracking-tight">
                        {campaign.hookHeader[safeLang]}
                    </h1>

                    <div className="space-y-3 text-sm text-zinc-400">
                        {campaign.content[safeLang].map((p, i) => (
                            <p key={i} className="leading-relaxed">{p}</p>
                        ))}
                    </div>

                    {/* ── Referral Credit Badge ── */}
                    {refCode && (
                        <div className="w-full bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                                {L.referralCreditTitle}
                            </div>
                            <div className="text-[11px] text-zinc-400 space-y-1">
                                <p>• <strong className="text-white">{L.atSignup}</strong> {L.atSignupDesc}</p>
                                <p>• <strong className="text-white">{L.afterCharge}</strong> {L.afterChargeDesc}</p>
                                <p className="text-zinc-500">{L.eg}</p>
                            </div>
                            <p className="text-[10px] text-purple-400 font-mono">{L.refAutoApplied} <strong>{refCode}</strong></p>
                        </div>
                    )}

                    {/* CTA Button */}
                    {!showPricing ? (
                        <button
                            onClick={() => setShowPricing(true)}
                            className="w-full flex justify-center items-center py-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.02] active:scale-[0.98] text-base gap-2"
                        >
                            {refCode ? L.startFreeCredit : L.startFreeTrial}
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowPricing(false)}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" /> {L.back}
                        </button>
                    )}

                    {/* Trust indicators */}
                    <div className="flex items-center gap-5 mt-2 opacity-70">
                        <div className="flex -space-x-2">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#07070F] bg-zinc-800 flex items-center justify-center text-[10px]">👤</div>
                            ))}
                        </div>
                        <div className="text-xs">
                            <strong className="text-white block">120+ Active Traders</strong>
                            <span className="text-zinc-500">Trust the algorithm daily</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Inline Pricing Picker ── */}
            {showPricing && (
                <section className="max-w-5xl mx-auto px-6 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-black text-white mb-1">{L.choosePlan}</h2>
                        <p className="text-sm text-zinc-400">{L.cardCharged}</p>

                        {/* Billing toggle */}
                        <div className="inline-flex items-center bg-white/5 p-1 rounded-full border border-white/10 mt-4">
                            <button
                                onClick={() => setIsAnnual(false)}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${!isAnnual ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {L.monthly}
                            </button>
                            <button
                                onClick={() => setIsAnnual(true)}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {L.annually} <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded uppercase">{L.save}</span>
                            </button>
                        </div>
                        <p className="text-xs text-purple-400 font-semibold mt-2 uppercase tracking-wider">
                            {L.trialTagline(!!refCode)}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {TIERS.map(tier => {
                            const price = isAnnual ? (tier.annual / 12).toFixed(2) : tier.monthly;
                            const bonusDays = calcBonusDays(tier.monthly);
                            const totalTrial = bonusDays + 14;

                            return (
                                <div
                                    key={tier.id}
                                    className={`relative flex flex-col p-6 rounded-2xl border transition-all ${
                                        tier.popular
                                            ? 'border-purple-500 bg-purple-500/10 shadow-[0_0_40px_rgba(168,85,247,0.3)]'
                                            : 'border-white/10 bg-white/[0.02] hover:border-purple-500/40 hover:bg-white/[0.04]'
                                    }`}
                                >
                                    {tier.popular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-violet-500 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 rounded-full flex items-center gap-1">
                                            <Star className="w-3 h-3 fill-current" /> Most Popular
                                        </div>
                                    )}

                                    <h3 className="text-lg font-bold text-white mb-1">{tier.name}</h3>
                                    <p className="text-xs text-purple-400/80 italic mb-3">{tier.tagline}</p>

                                    <div className="mb-4">
                                        <div className="flex items-end gap-1">
                                            <span className="text-3xl font-black text-white">${price}</span>
                                            <span className="text-zinc-500 text-sm mb-1">/mo</span>
                                        </div>
                                        <span className="text-xs text-zinc-500">
                                            {isAnnual ? L.billedAnnually(tier.annual) : L.billedMonthly}
                                        </span>
                                    </div>

                                    {refCode && (
                                        <div className="mb-4 bg-purple-900/30 border border-purple-500/20 rounded-lg p-3 text-center">
                                            <div className="text-purple-300 text-xs font-bold">{L.yourExtendedTrial}</div>
                                            <div className="text-white font-black text-xl mt-0.5">{totalTrial} days free</div>
                                            <div className="text-zinc-500 text-[10px]">{L.daysBase} + {bonusDays}{L.referralBonus}</div>
                                        </div>
                                    )}

                                    <ul className="flex flex-col gap-2.5 mb-6 flex-grow">
                                        {tier.features.map((feat, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <Check className={`w-4 h-4 shrink-0 mt-0.5 ${tier.popular ? 'text-purple-400' : 'text-green-400'}`} />
                                                <span className="text-xs text-zinc-300">{feat}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleSubscribe(tier)}
                                        disabled={loadingTier !== null}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                                            tier.popular
                                                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/25'
                                                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-purple-500/40'
                                        }`}
                                    >
                                        {loadingTier === tier.id
                                            ? L.redirecting
                                            : refCode
                                                ? L.startTrial(totalTrial)
                                                : L.start14Trial}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Fine print */}
                    <div className="mt-6 text-center text-xs text-zinc-600 font-mono">
                        {L.finePrint(
                            !!refCode,
                            TIERS[0] ? calcBonusDays(TIERS[0].monthly) + 14 : 14,
                            TIERS[TIERS.length - 1] ? calcBonusDays(TIERS[TIERS.length - 1].monthly) + 14 : 14,
                        )}
                    </div>
                </section>
            )}
        </main>
    );
}
