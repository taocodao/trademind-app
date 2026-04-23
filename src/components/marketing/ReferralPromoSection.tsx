'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Gift, ArrowRight, CalendarDays, Users2, Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// matches REFERRAL_FEE env default
const REFERRAL_FEE = 100;
const REFERRAL_HALF = REFERRAL_FEE / 2;

const PLANS = [
    { name: 'TurboCore', price: 29 },
    { name: 'TurboCore Pro', price: 49 },
    { name: 'Full Bundle', price: 69 },
];

function calcDays(credit: number, monthlyPrice: number) {
    return Math.floor(credit / (monthlyPrice / 30));
}

export function ReferralPromoSection() {
    const { t } = useTranslation();
    const PROMO_URL = 'https://trademind.bot/?ref=ACE79';

    // Email capture state
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    async function handleSendLink(e: React.FormEvent) {
        e.preventDefault();
        if (!email) return;
        setStatus('loading');
        setErrorMsg('');
        try {
            const res = await fetch('/api/email/referral-invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send');
            setStatus('success');
        } catch (err: any) {
            setErrorMsg(err.message || 'Something went wrong. Please try again.');
            setStatus('error');
        }
    }

    return (
        <section className="w-full max-w-5xl mx-auto py-12 px-6 relative z-10 text-center">
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-10 flex flex-col items-center shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 blur-[100px] rounded-full pointer-events-none" />

                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-6 border border-purple-500/30 z-10">
                    <Gift className="w-8 h-8 text-purple-400" />
                </div>

                <h2 className="text-3xl font-bold text-white mb-3 z-10">
                    {t('referral.title', 'The $100 Anti-Fraud Referral')}
                </h2>
                <p className="text-zinc-400 max-w-2xl mx-auto mb-2 z-10">
                    {t('referral.desc', `Share your unique link. When a friend signs up using your code, you both get $${REFERRAL_HALF} in free subscription days — no waiting. When their card is first charged, you both receive another $${REFERRAL_HALF}. Total: $${REFERRAL_FEE} each, applied as extended subscription days.`)}
                </p>
                <p className="text-xs text-zinc-500 mb-6 z-10">
                    {t('referral.example', `Credit is applied as free days: credit ÷ plan daily rate. e.g. on TurboCore Monthly ($29/mo), $${REFERRAL_HALF} = ~${calcDays(REFERRAL_HALF, 29)} extra free days.`)}
                </p>

                {/* ── Email Capture Widget ─────────────────────────────── */}
                <div className="w-full max-w-xl z-10 mb-10">
                    <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-6 backdrop-blur-sm shadow-[0_0_40px_rgba(124,58,237,0.1)]">
                        <div className="flex items-center gap-2 justify-center mb-2">
                            <Mail className="w-4 h-4 text-purple-400" />
                            <p className="text-sm font-semibold text-white">
                                {t('referral.email_cta_title', 'Get your $100 referral link sent to your inbox')}
                            </p>
                        </div>
                        <p className="text-xs text-zinc-500 mb-4 text-center">
                            {t('referral.email_cta_desc', "Enter your email and we'll send you the link, simply click on the link and enjoy $100 in free subscription days.")}
                        </p>

                        {status === 'success' ? (
                            <div className="flex flex-col items-center gap-2 py-4">
                                <CheckCircle2 className="w-10 h-10 text-green-400" />
                                <p className="text-green-400 font-semibold text-sm">{t('referral.email_cta_success', 'Link sent! Check your inbox.')}</p>
                                <p className="text-zinc-500 text-xs">{t('referral.email_cta_spam', "Didn't see it? Check spam, or")}&nbsp;
                                    <button
                                        id="referral-resend-email"
                                        className="text-purple-400 underline text-xs"
                                        onClick={() => { setStatus('idle'); setEmail(''); }}
                                    >{t('referral.email_cta_try_again', 'try again')}</button>.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSendLink} className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                                    <input
                                        id="referral-email-input"
                                        type="email"
                                        value={email}
                                        onChange={e => { setEmail(e.target.value); setStatus('idle'); setErrorMsg(''); }}
                                        placeholder={t('referral.email_cta_placeholder', 'your@email.com')}
                                        required
                                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/30 transition-all"
                                    />
                                </div>
                                <button
                                    id="referral-send-link-btn"
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] whitespace-nowrap"
                                >
                                    {status === 'loading'
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('referral.email_cta_sending', 'Sending…')}</>
                                        : <>{t('referral.email_cta_btn', 'Send My Link')} <ArrowRight className="w-4 h-4" /></>}
                                </button>
                            </form>
                        )}

                        {status === 'error' && (
                            <p className="text-red-400 text-xs mt-2 text-center">{errorMsg}</p>
                        )}
                    </div>
                </div>
                {/* ── / Email Capture Widget ───────────────────────────── */}

                {/* Divider */}
                <div className="w-full flex items-center gap-4 mb-8 z-10">
                    <div className="flex-1 h-px bg-white/8" />
                    <span className="text-zinc-600 text-xs uppercase tracking-widest">How it works</span>
                    <div className="flex-1 h-px bg-white/8" />
                </div>

                {/* Two-stage cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left mb-8 w-full z-10">
                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">1</div>
                            <h4 className="font-bold text-white text-sm">{t('referral.stage1_title', 'At Signup — Instant $50 for Both')}</h4>
                        </div>
                        <div className="flex items-start gap-2">
                            <Users2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-zinc-400">
                                {t('referral.stage1_referee', `Referee: gets $${REFERRAL_HALF} worth of extra trial days added on top of the 14-day base trial before their card is charged.`)}
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CalendarDays className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-zinc-400">
                                {t('referral.stage1_referrer', `Referrer: subscription extended by $${REFERRAL_HALF} in free days immediately when friend starts their trial.`)}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white/5 p-5 rounded-xl border border-white/10 flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">2</div>
                            <h4 className="font-bold text-white text-sm">{t('referral.stage2_title', 'At First Charge — Another $50 for Both')}</h4>
                        </div>
                        <div className="flex items-start gap-2">
                            <Users2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-zinc-400">
                                {t('referral.stage2_both', `When the referee's card is first charged after the trial, both parties receive another $${REFERRAL_HALF} in free subscription days automatically.`)}
                            </span>
                        </div>
                        <div className="flex items-start gap-2">
                            <CalendarDays className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                            <span className="text-xs text-zinc-400">
                                {t('referral.stage2_total', `Total reward: $${REFERRAL_FEE} each — fully applied as subscription days, no cash out needed.`)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Days table */}
                <div className="w-full z-10 mb-8 overflow-x-auto">
                    <table className="w-full text-xs text-left border border-white/10 rounded-xl overflow-hidden">
                        <thead>
                            <tr className="bg-white/5">
                                <th className="p-3 text-zinc-400 font-semibold">Your Plan</th>
                                <th className="p-3 text-purple-400 font-semibold">At Signup (+{REFERRAL_HALF})</th>
                                <th className="p-3 text-green-400 font-semibold">At First Charge (+{REFERRAL_HALF})</th>
                                <th className="p-3 text-white font-semibold">Total Days = $100</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06]">
                            {PLANS.map(({ name, price }) => (
                                <tr key={name} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-3 text-white font-medium">{name} <span className="text-zinc-500 font-normal">(${price}/mo)</span></td>
                                    <td className="p-3 text-purple-400 font-bold">+{calcDays(REFERRAL_HALF, price)} days</td>
                                    <td className="p-3 text-green-400 font-bold">+{calcDays(REFERRAL_HALF, price)} days</td>
                                    <td className="p-3 text-white font-black">+{calcDays(REFERRAL_FEE, price)} days</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="text-[10px] text-zinc-600 mt-2 text-center">
                        Formula: days = credit ÷ (monthly price ÷ 30). Applied automatically to subscription renewal date.
                    </p>
                </div>

                <Link href="/refer" className="inline-flex items-center gap-2 bg-white text-[#0A0A0F] hover:bg-gray-200 px-8 py-3 rounded-full font-bold transition-all z-10 shadow-lg shadow-white/10 hover:shadow-white/20">
                    {t('referral.btn', 'Go to Referral Dashboard')} <ArrowRight className="w-5 h-5" />
                </Link>
            </div>
        </section>
    );
}
