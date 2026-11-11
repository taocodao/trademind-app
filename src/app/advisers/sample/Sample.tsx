'use client';
import { useState } from 'react';

type Fmt = 'weekly' | 'daily';
const CONTEXTS = [
    { key: 'default', label: 'Untailored', line: 'The issue as published, with no context added.' },
    { key: 'starter', label: 'Building an investing routine', line: 'Framed around a long time horizon and the habit of following written rules.' },
    { key: 'builder', label: 'Balancing competing priorities', line: 'Framed around limited time and several goals competing for the same savings.' },
    { key: 'accelerator', label: 'Reviewing a growing portfolio', line: 'Framed around checking whether a larger portfolio still follows a clear plan.' },
    { key: 'finisher', label: 'Preparing for withdrawals', line: 'Framed around how declines are handled shortly before spending begins.' },
    { key: 'grower', label: 'Managing an ongoing retirement portfolio', line: 'Framed around keeping declines in view while savings continue to be invested.' },
];

export default function Sample({ subscribeUrl, subscribeDailyUrl, bookUrl }: { subscribeUrl: string; subscribeDailyUrl: string; bookUrl: string }) {
    const [fmt, setFmt] = useState<Fmt>('weekly');
    const [ctx, setCtx] = useState('default');
    const cur = CONTEXTS.find((c) => c.key === ctx)!;
    const tab = (on: boolean) => `rounded-full border px-4 py-1.5 text-sm font-semibold ${on ? 'border-[#2f6bff] bg-[#2f6bff] text-white' : 'border-[#3a4a70] bg-[#121826] text-[#7aa2ff]'}`;
    const btnP = 'inline-block rounded-[10px] bg-[#2f6bff] px-5 py-3 text-center text-[15px] font-extrabold text-white no-underline';
    const btnS = 'inline-block rounded-[10px] border border-[#3a4a70] bg-[#121826] px-5 py-3 text-center text-[15px] font-extrabold text-[#7aa2ff] no-underline';
    const card = 'mt-4 rounded-2xl border border-[#232c3d] bg-[#121826] p-5';
    const pill = 'text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#7aa2ff]';
    const h2 = 'mt-3 text-[22px] font-extrabold leading-snug text-[#f3f5f9] scroll-mt-20';
    const link = 'text-[#7aa2ff] underline';
    const Buttons = () => (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <a href={subscribeUrl} className={btnP}>Subscribe weekly</a>
            <a href={subscribeDailyUrl} className={btnP}>Subscribe daily</a>
            <a href={bookUrl} className={btnS}>Book 20 minutes</a>
        </div>
    );
    return (
        <div className="min-h-screen bg-[#0b0f17]"><main className="mx-auto max-w-[640px] px-4 py-8 text-[15px] leading-relaxed text-[#d5dae3]" style={{ fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif" }}>
            <div className="flex items-center justify-between">
                <a href="https://trademind.bot" className="text-lg font-extrabold text-[#f3f5f9] no-underline">TradeMind<span className="text-[#7aa2ff]">.bot</span></a>
                <span className="rounded-full border border-[#3a4a70] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#7aa2ff]">Research for advisers</span>
            </div>
            <a href="https://trademind.bot" className={`mt-3 inline-block text-sm font-semibold ${link}`}>TradeMind.bot, back to home</a>
            <h1 className="mt-6 text-[26px] font-extrabold leading-tight text-[#f3f5f9]">A QQQ research sample <span className="text-[#7aa2ff]">you can read before any call</span></h1>
            <p className="mt-3">Nothing on this page is gated. Read an actual issue, see how the same facts can be explained for different client contexts, and inspect the record and its limits.</p>
            <nav className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[#7aa2ff]">
                <a href="#sample">Sample issue</a><a href="#record">Method and records</a><a href="#client">Client-ready example</a><a href="#ira">IRA sample</a><a href="#overview">Overview and agenda</a>
            </nav>
            <Buttons />

            <div className={card}><p className={pill}>Sample issue</p><h2 id="sample" className={h2}>The sample issue</h2>
            <div className="mt-3 flex gap-2"><button className={tab(fmt === 'weekly')} onClick={() => setFmt('weekly')}>Weekly</button><button className={tab(fmt === 'daily')} onClick={() => setFmt('daily')}>Daily</button></div>
            <iframe title="Sample issue" src={fmt === 'weekly' ? '/newsletter/current?embed=1' : '/advisers/sample-daily.html'} className="mt-4 h-[760px] w-full rounded-xl border border-[#232c3d] bg-[#0b0f17]" /></div>

            <div className={card}><p className={pill}>Client-ready example</p><h2 id="client" className={h2}>One worked client-ready example</h2>
            <p className="mt-3">Choose how the same issue is explained. You choose the version for a conversation. It is never assigned from a client&apos;s age.</p>
            <div className="mt-3 flex flex-wrap gap-2">{CONTEXTS.map((c) => <button key={c.key} className={tab(ctx === c.key)} onClick={() => setCtx(c.key)}>{c.label}</button>)}</div>
            <p className="mt-3 rounded-xl border border-[#232c3d] bg-[#0b0f17] p-4 text-sm">{cur.line}</p>
            <table className="mt-4 w-full text-left text-sm">
                <thead><tr className="text-[#9aa4b5]"><th className="py-2 pr-4">What changes</th><th className="py-2">What does not</th></tr></thead>
                <tbody className="align-top"><tr className="border-t border-[#232c3d]"><td className="py-2 pr-4">The opening framing and the examples</td><td className="py-2">Facts, numbers, model status, risks and limitations</td></tr></tbody>
            </table>
            <p className="mt-3 text-sm text-[#9aa4b5]">Branding, revisions and distribution rights for client-ready editions would be agreed separately.</p></div>

            <div className={card}><p className={pill}>Method and records</p><h2 id="record" className={h2}>Method and records</h2>
            <ul className="mt-3 list-disc space-y-3 pl-5">
                <li><strong className="text-[#f3f5f9]">Simulation.</strong> October 14, 2024 to October 13, 2026: QQQ LEAPS +229.48% with a largest decline of 14.59%. QQQ buy and hold +49.46% with a largest decline of 22.88%. Hypothetical results from a simulation, not a real account. Options were model-priced, the rules were developed with hindsight, and this was one favorable period for QQQ and semiconductors.</li>
                <li><strong className="text-[#f3f5f9]">Forward virtual accounts.</strong> Tracked since mid October 2026. The record is short and includes losing stretches. A virtual account is not an audited client result.</li>
                <li><strong className="text-[#f3f5f9]">Operational history.</strong> Every published model status, including no-change days and runs that did not complete their data checks.</li>
            </ul>
            <p className="mt-3"><a href="/simulated-record" className="text-[#7aa2ff] underline">Open the full simulated record</a> &middot; <a href="/live-record" className="text-[#7aa2ff] underline">Open the virtual account ledger</a></p></div>

            <div className={card}><p className={pill}>IRA sample</p><h2 id="ira" className={h2}>IRA sample</h2>
            <div className="mt-3 space-y-3">
                <p><strong className="text-[#f3f5f9]">QQQ Defensive</strong> allocates among QQQ, QLD, TQQQ and SGOV. It includes leveraged ETFs and does not require options permission.</p>
                <p><strong className="text-[#f3f5f9]">QQQ LEAPS</strong> combines a long-dated QQQ call with shorter-dated written calls. The custodian confirms permissions and the exact options structure for the account.</p>
                <p>Questions for the custodian: which positions are permitted, how option legs are treated, what happens at expiration or assignment, and which costs and restrictions apply. Neither strategy fits every IRA.</p>
            </div></div>

            <div className={card}><p className={pill}>Overview and agenda</p><h2 id="overview" className={h2}>Overview and 20 minute agenda</h2>
            <p className="mt-3">Three arrangements could be discussed. Pricing is not published here.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
                <li><strong className="text-[#f3f5f9]">A. Research access.</strong> You read the publication and evaluate it inside your own process.</li>
                <li><strong className="text-[#f3f5f9]">B. Client-ready research.</strong> A defined edition your firm can share, with branding and rights agreed separately.</li>
                <li><strong className="text-[#f3f5f9]">C. Model delivery.</strong> A standard update file that your firm reviews and acts on. TradeMind does not connect to brokerage accounts and does not place orders.</li>
            </ul>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
                <li>Minutes 0 to 3: your intended use.</li><li>Minutes 3 to 8: inspect an issue.</li><li>Minutes 8 to 13: the record and its limits.</li><li>Minutes 13 to 17: workflow and commercial needs.</li><li>Minutes 17 to 20: the next step.</li>
            </ol>
            <Buttons /></div>
            <p className="mt-8 text-xs text-[#9aa4b5]">TradeMind publishes educational research, not personalized investment advice. Performance shown is hypothetical simulation unless labeled as a virtual account. Options and leveraged ETFs involve substantial risk, including loss of the amount invested. TradeMind never connects to a broker and never places trades.</p>
        </main></div>
    );
}
