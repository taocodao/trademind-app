import { notFound } from 'next/navigation';
import ExploreRow from '@/components/start/ExploreRow';
import StartVisit from '@/components/start/StartVisit';
import SubmissionForm from '@/components/start/SubmissionForm';
import TokenLink from '@/components/start/TokenLink';
import { isSection, SECTION_LIST, SectionKey, TASKS } from '@/lib/start/sections';
import { LIMITS, NOBROKER, PARTS, RESULT_H, RESULT_P1, RESULT_P2 } from '@/lib/outreach/copy-v8';
import { ALT as WAIT_ALT, CAP as WAIT_CAP, IMG as WAIT_IMG, P2 as WAIT_P2 } from '@/lib/outreach/copy-ws';

export function generateStaticParams() { return SECTION_LIST.map((s) => ({ section: s.key })); }

const btn = 'inline-block rounded-lg bg-[#2f6bff] px-6 py-3 font-semibold text-white';
const link = 'text-blue-300 underline';
const card = 'rounded-xl border border-white/10 bg-white/5 p-4';

function SimBox() {
    return (
        <div className="mt-6 rounded-lg border-l-4 border-[#2f6bff] bg-[#1a2540] p-4">
            <p className="text-xs font-extrabold uppercase tracking-wide text-blue-300">{RESULT_H}</p>
            <p className="mt-2 text-sm leading-relaxed">{RESULT_P1}</p>
            <p className="mt-2 text-sm leading-relaxed">{RESULT_P2}</p>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">{LIMITS}</p>
        </div>
    );
}

function Body({ section }: { section: SectionKey }) {
    switch (section) {
        case 'brief':
            return (
                <>
                    <p className="mt-4 text-gray-300">AI Investor Copilot is a free weekly brief for self-directed investors. Each issue explains current market conditions, what the model indicates, scenarios to watch, and what could go wrong.</p>
                    <ul className="mt-5 space-y-2">
                        {PARTS.map(([k, n, d]) => <li key={k} className={card}><b>{n}</b><span className="text-gray-300">: {d}</span></li>)}
                    </ul>
                    <p className="mt-5 text-gray-300">Read a complete sample issue before deciding whether to subscribe. It is free, and you can unsubscribe at any time.</p>
                    <p className="mt-5 flex flex-wrap items-center gap-4">
                        <TokenLink href="/newsletter/start-here" param="t" className={btn}>Read the sample issue</TokenLink>
                        <TokenLink href="/newsletter/join" param="t" className={link}>Subscribe free</TokenLink>
                    </p>
                </>
            );
        case 'strategies':
            return (
                <>
                    <p className="mt-4 text-gray-300">QQQ holds the Nasdaq-100, the heart of high tech. TradeMind publishes rules for two strategies built on it. Both are optional and separate from the free brief.</p>
                    <div className={`${card} mt-5`}>
                        <h2 className="font-semibold">QQQ LEAPS</h2>
                        <p className="mt-2 text-sm text-gray-300">Owns a long-dated QQQ call option, which multiplies QQQ&apos;s moves, and sells covered calls against it to collect premium during temporary pullbacks. It needs options permission. A test-phase sleeve of SMH put spreads has never traded in a real account.</p>
                    </div>
                    <div className={`${card} mt-4`}>
                        <h2 className="font-semibold">QQQ Defensive</h2>
                        <p className="mt-2 text-sm text-gray-300">Moves among QQQ, QLD, TQQQ and SGOV, including leveraged ETFs, and is built to keep its declines shallow. It needs no options permission.</p>
                    </div>
                    <SimBox />
                    <p className="mt-5 text-gray-300">{NOBROKER}</p>
                    <p className="mt-5 flex flex-wrap items-center gap-4">
                        <TokenLink href="/newsletter/verify" param="t" className={btn}>How it works, step by step</TokenLink>
                        <TokenLink href="/simulated-record" param="t" className={link}>Open the simulated record</TokenLink>
                    </p>
                </>
            );
        case 'rules':
            return (
                <>
                    <p className="mt-4 text-gray-300">Here is how TradeMind works, in four rules.</p>
                    <ol className="mt-4 list-decimal space-y-3 pl-6 text-gray-200">
                        <li>The rules are written before a signal is published, and each change is time-stamped on a <a href="/verify/ledger" className={link}>public ledger</a>.</li>
                        <li>You place every order yourself, in your own account. We never connect to a broker.</li>
                        <li>Many days the answer is &ldquo;no change&rdquo;. That is the model working as designed, not a gap in the service.</li>
                        <li>The model can be wrong. The sample shows what we would tell you on a day it changes its mind.</li>
                    </ol>
                    <h2 className="mt-8 text-lg font-semibold">The optional plans</h2>
                    <p className="mt-2 text-gray-300">The Research plan sends one briefing each market day: the instruction first, then labeled context that is never an extra instruction. The Tracking plan adds a virtual account so you can see how the rules would have performed. Current prices are on the <a href="/pricing" className={link}>pricing page</a>.</p>
                    <p className="mt-5"><TokenLink href="/founding/sample" param="t" className={btn}>See a sample daily briefing</TokenLink></p>
                </>
            );
        case 'challenge':
            return (
                <>
                    <p className="mt-4 text-gray-300">Here is the part of our simulation I would look at first: the long flat stretch at the start.</p>
                    <p className="mt-3 text-gray-300">{WAIT_P2}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={WAIT_IMG} alt={WAIT_ALT} className="mt-5 w-full rounded-lg border border-white/10" />
                    <p className="mt-2 text-xs text-gray-400">{WAIT_CAP}</p>
                    <h2 className="mt-8 text-lg font-semibold">Would you have kept following it?</h2>
                    <div className="mt-3 flex flex-col items-start gap-3">
                        <TokenLink href="/start/challenge/answer?a=a" className={btn}>A. Yes, I would have waited</TokenLink>
                        <TokenLink href="/start/challenge/answer?a=b" className={btn}>B. I would have asked for a clearer explanation first</TokenLink>
                        <TokenLink href="/start/challenge/answer?a=c" className={btn}>C. I would have walked away</TokenLink>
                    </div>
                    <p className="mt-5 text-sm text-gray-400">There is no right answer, and any answer is welcome. This is a simulation, not a real account. The rules were developed with hindsight, options were model-priced, and the later result came in one favorable window for QQQ and semiconductors.</p>
                </>
            );
        case 'verify':
            return (
                <>
                    <p className="mt-4 text-gray-300">A simulation is worth more when someone else can reproduce it. This is the kit: the figures to match, where the data comes from, and how to send what you find.</p>
                    <h2 className="mt-8 text-lg font-semibold">The figures to match</h2>
                    <p className="mt-1 text-sm text-gray-400">Simulated, October 14, 2024 to October 13, 2026. Not live trading.</p>
                    <table className="mt-3 w-full text-sm">
                        <thead><tr className="border-b border-white/10 text-left text-gray-400"><th className="py-2"></th><th className="py-2 text-right">Total return</th><th className="py-2 text-right">Largest decline</th></tr></thead>
                        <tbody>
                            <tr className="border-b border-white/10"><td className="py-2">QQQ LEAPS (with the SMH sleeve)</td><td className="py-2 text-right">229.48%</td><td className="py-2 text-right">14.59%</td></tr>
                            <tr><td className="py-2">QQQ buy and hold</td><td className="py-2 text-right">49.46%</td><td className="py-2 text-right">22.88%</td></tr>
                        </tbody>
                    </table>
                    <h2 className="mt-8 text-lg font-semibold">Three things you can check</h2>
                    <ol className="mt-3 list-decimal space-y-3 pl-6 text-gray-200">
                        <li><b>The QQQ buy-and-hold line.</b> Download QQQ daily closing prices for the period from any price source. Compute the total return and the largest decline from a previous high, and compare with 49.46% and 22.88%. You need only a spreadsheet.</li>
                        <li><b>The dated trades.</b> Open the <TokenLink href="/simulated-record" param="t" className={link}>simulated record</TokenLink> and check each entry and exit date against QQQ and SMH prices on that day. Does anything look unreasonable?</li>
                        <li><b>The assumptions.</b> Options were priced with a model (Black-Scholes) from prices, volatility and interest rates, not from real quotes. Read the <TokenLink href="/newsletter/verify" param="t" className={link}>plain-English rules and assumptions</TokenLink> and the <a href="/newsletter/research/backtest-validation" className={link}>Backtest Validation page</a>, then decide which assumption you trust least.</li>
                    </ol>
                    <p className="mt-4 text-sm text-gray-400">The strategy figures depend on the option pricing model, so a different but reasonable model will give different numbers. Tell us what you used.</p>
                    <h2 className="mt-8 text-lg font-semibold">Send what you find</h2>
                    <div className="mt-4"><SubmissionForm /></div>
                </>
            );
        case 'panel':
            return (
                <>
                    <p className="mt-4 text-gray-300">I am building a small research panel of QQQ investors. Members try Research and Tracking free for 30 days and help me test the model. The first group is 30 people.</p>
                    <h2 className="mt-8 text-lg font-semibold">Tasks, all optional</h2>
                    <ul className="mt-3 space-y-2">
                        {TASKS.map((t) => <li key={t.task} className={card}><b>{t.task}</b> <span className="text-xs text-gray-400">({t.effort})</span><p className="mt-1 text-sm text-gray-300">{t.counts}</p></li>)}
                    </ul>
                    <h2 className="mt-8 text-lg font-semibold">The terms</h2>
                    <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-300">
                        <li>Free for 30 days. No card is needed to apply, and nothing turns into a paid plan automatically.</li>
                        <li>Each completed task earns 30 days of free access, up to six months in total. A task counts when you complete it, whatever you conclude. Your answer is never judged on whether it is favorable to TradeMind.</li>
                        <li>After the first 30 days you choose: keep going by doing one task a month, or take a founding price (from $19 per month) with no tasks at all.</li>
                        <li>You never need to trade, refer anyone, or write a review.</li>
                    </ul>
                    <p className="mt-5 text-sm text-gray-400">Every TradeMind result shown so far comes from a simulation, not live trading. {NOBROKER}</p>
                    <p className="mt-6 flex flex-wrap items-center gap-4">
                        <TokenLink href="/founding?source=start" param="t" className={btn}>Apply to the research panel</TokenLink>
                        <TokenLink href="/founding/sample" param="t" className={link}>See a sample daily briefing</TokenLink>
                    </p>
                </>
            );
    }
}

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
    const { section } = await params;
    if (!isSection(section)) notFound();
    const meta = SECTION_LIST.find((s) => s.key === section)!;
    return (
        <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
            <p className="text-sm"><a href="/start" className={link}>Start here</a></p>
            <h1 className="mt-2 text-3xl font-semibold">{meta.headline}</h1>
            <Body section={section} />
            <p className="mt-10 text-xs text-gray-500">Education only, not investment advice. Investing involves risk, including loss.</p>
            <ExploreRow current={section} />
            <StartVisit section={section} />
        </main>
    );
}
