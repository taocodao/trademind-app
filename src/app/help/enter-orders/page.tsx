import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import OrderEntryGuide from '@/components/help/OrderEntryGuide';
import { LegalFooter } from '@/components/marketing/LegalFooter';

export const metadata: Metadata = {
    title: 'How to Enter Your Orders | TradeMind@bot',
    description:
        'Step-by-step order entry walkthroughs for QQQ LEAPS and QQQ Basic signals at Charles Schwab, tastytrade, Fidelity, Robinhood, and Interactive Brokers, including the approval level each order type requires.',
};

export default function EnterOrdersHelpPage() {
    return (
        <main className="min-h-screen bg-[#05050A] text-white flex flex-col">
            <header className="px-6 pt-10 pb-6 flex items-center border-b border-white/10 max-w-6xl mx-auto w-full">
                <Link href="/" className="flex items-center gap-2 text-tm-muted hover:text-white transition group font-medium text-sm">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Back to TradeMind@bot
                </Link>
            </header>

            <div className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
                    How to enter your orders
                </h1>
                <p className="text-tm-muted max-w-3xl leading-relaxed mb-2">
                    Every TradeMind email tells you exactly what to place at your own broker: the contract or shares,
                    the action, and the limit price. This guide shows you where each piece goes, step by step, at the
                    five major brokers our subscribers use.
                </p>
                <p className="text-tm-muted max-w-3xl leading-relaxed mb-10 text-sm">
                    TradeMind never connects to your brokerage and never places orders for you. You stay in control of
                    every order, and you can adjust or skip any of them.
                </p>

                {/* Universal mapping table */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-white mb-4">Your email, translated to any broker</h2>
                    <div className="overflow-x-auto rounded-2xl border border-white/10">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-white/[0.05] text-left">
                                    <th className="px-4 py-3 font-semibold text-white">In your signal email</th>
                                    <th className="px-4 py-3 font-semibold text-white">At your broker</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-white/80">
                                <tr>
                                    <td className="px-4 py-3">Buy to open (LEAPS call)</td>
                                    <td className="px-4 py-3">Action: Buy to Open, on the Calls side of the chain, far-dated January expiration</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">Sell to open (short call / PMCC overlay)</td>
                                    <td className="px-4 py-3">Action: Sell to Open, nearer expiration and higher strike than your LEAPS. Brokers treat the pair as a diagonal spread.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">Roll the short call</td>
                                    <td className="px-4 py-3">One order with two legs: Buy to Close the expiring call, Sell to Open the new one, at a single net price</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">Buy / sell shares (QQQ or SGOV)</td>
                                    <td className="px-4 py-3">A plain stock order: symbol, quantity in shares, limit price</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">Limit price</td>
                                    <td className="px-4 py-3">Always choose Limit as the order type and enter the price from the email. Never use market orders for options.</td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3">Day order</td>
                                    <td className="px-4 py-3">Time in force: Day. If it does not fill today, tomorrow&apos;s email will have fresh prices.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Animated guide */}
                <section className="mb-12">
                    <h2 className="text-xl font-bold text-white mb-1">Pick your broker and order type</h2>
                    <p className="text-tm-muted text-sm mb-6">
                        The walkthrough plays automatically. Use the arrows to step through at your own pace.
                    </p>
                    <OrderEntryGuide />
                </section>

                {/* Approval explainer */}
                <section className="mb-12 max-w-3xl">
                    <h2 className="text-xl font-bold text-white mb-4">Getting the right trading permissions</h2>
                    <div className="space-y-4 text-sm text-white/80 leading-relaxed">
                        <p>
                            QQQ Basic (ETF rebalances) needs no options approval at all. Any brokerage account can
                            follow it.
                        </p>
                        <p>
                            QQQ LEAPS has two kinds of orders. Buying the LEAPS call itself is the lowest options
                            tier everywhere. Selling the short call against it (the PMCC overlay) is where brokers
                            differ most: Schwab approves it at Level 2, tastytrade at its Basic tier with margin,
                            Fidelity at Tier 2 plus margin, Robinhood at Level 3 with margin, and Interactive Brokers
                            at Level 4. If you are opening a new account specifically for this strategy, Schwab and
                            tastytrade have the smoothest approval path, including inside IRAs.
                        </p>
                        <p>
                            When a broker&apos;s application asks about experience, answer honestly. Approval levels
                            exist to match strategies to your situation, and overstating experience can create real
                            risk if you take on orders you do not understand.
                        </p>
                    </div>
                </section>

                {/* Email help box */}
                <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 max-w-3xl">
                    <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 border border-emerald-400/30">
                            <Mail className="w-5 h-5 text-emerald-300" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white mb-1">Stuck on an order?</h2>
                            <p className="text-sm text-tm-muted leading-relaxed">
                                Reply to any signal email and tell us which broker and which step you are on. We will
                                walk you through it. If a broker rejects an order, send us the exact rejection
                                message; it usually tells us precisely which permission or setting is missing.
                            </p>
                        </div>
                    </div>
                </section>
            </div>

            <LegalFooter />
        </main>
    );
}
