import Link from 'next/link';
import { ArrowRight, CalendarDays, Gift, Users2 } from 'lucide-react';

const REFERRER_DAYS_BASIC = 142;
const REFERRER_DAYS_LEAPS = 107;
const REFEREE_DAYS_BASIC = 71;
const REFEREE_DAYS_LEAPS = 53;
const VESTING_DAYS = 75;

export function ReferralPromoSection() {
    return (
        <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12 text-center">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-purple-500/10 to-blue-500/10 p-10 shadow-2xl">
                <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-purple-500/20 blur-[100px]" />
                <div className="relative mx-auto flex max-w-3xl flex-col items-center">
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/20"><Gift className="h-8 w-8 text-purple-300" /></div>
                    <h2 className="mb-3 text-3xl font-bold text-white">Refer a friend, earn subscription days</h2>
                    <p className="max-w-2xl text-zinc-300">Your friend gets the same 30-day free month. When they subscribe, a $50 day grant (about {REFEREE_DAYS_BASIC} days on QQQ Basic or {REFEREE_DAYS_LEAPS} days on QQQ LEAPS) is added to their plan, and your $100 grant starts vesting.</p>
                    <p className="mt-3 max-w-2xl text-sm text-zinc-400">After your friend stays active for {VESTING_DAYS} days, your selected reward account receives a $100 day grant, about {REFERRER_DAYS_BASIC} days on QQQ Basic or {REFERRER_DAYS_LEAPS} days on QQQ LEAPS.</p>

                    <div className="my-8 grid w-full grid-cols-1 gap-4 text-left md:grid-cols-3">
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5"><Users2 className="mb-3 h-5 w-5 text-purple-300" /><h3 className="text-sm font-bold text-white">Share your link</h3><p className="mt-2 text-xs leading-relaxed text-zinc-400">Choose a reward account, then share your personal link.</p></div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5"><CalendarDays className="mb-3 h-5 w-5 text-purple-300" /><h3 className="text-sm font-bold text-white">Friend pays first</h3><p className="mt-2 text-xs leading-relaxed text-zinc-400">Their $50 grant is applied as extra subscription days at first payment.</p></div>
                        <div className="rounded-xl border border-white/10 bg-white/5 p-5"><Gift className="mb-3 h-5 w-5 text-emerald-300" /><h3 className="text-sm font-bold text-white">Your days vest</h3><p className="mt-2 text-xs leading-relaxed text-zinc-400">Your $100 grant lands after {VESTING_DAYS} active days.</p></div>
                    </div>
                    <Link href="/refer" className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-bold text-[#0A0A0F] shadow-lg shadow-white/10 transition-all hover:bg-gray-200">Choose your reward account <ArrowRight className="h-5 w-5" /></Link>
                    <p className="mt-4 text-xs text-zinc-500">Subscription day grants have no cash value.</p>
                </div>
            </div>
        </section>
    );
}
