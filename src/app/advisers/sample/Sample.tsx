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

export default function Sample({ subscribeUrl, bookUrl }: { subscribeUrl: string; bookUrl: string }) {
    const [fmt, setFmt] = useState<Fmt>('weekly');
    const [ctx, setCtx] = useState('default');
    const cur = CONTEXTS.find((c) => c.key === ctx)!;
    const tab = (on: boolean) => `rounded-full border px-4 py-1.5 text-sm ${on ? 'border-blue-400 bg-blue-500/20 text-white' : 'border-white/15 text-gray-300'}`;
    const btnP = 'inline-block rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white';
    const btnS = 'inline-block rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold text-white';
    const h2 = 'mt-12 text-2xl font-semibold scroll-mt-20';
    return (
        <main className="mx-auto max-w-3xl px-5 py-12 text-gray-200">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Research for advisers</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">A QQQ research sample you can read before any call</h1>
            <p className="mt-4">Nothing on this page is gated. Read an actual issue, see how the same facts can be explained for different client contexts, and inspect the record and its limits.</p>
            <nav className="mt-5 flex flex-wrap gap-4 text-sm text-blue-300 underline">
                <a href="#sample">Sample issue</a><a href="#record">Method and records</a><a href="#client">Client-ready example</a><a href="#ira">IRA sample</a><a href="#overview">Overview and agenda</a>
            </nav>
            <div className="mt-6 flex flex-wrap gap-3"><a href={subscribeUrl} className={btnP}>Subscribe</a><a href={bookUrl} className={btnS}>Book 20 minutes</a></div>

            <h2 id="sample" className={h2}>The sample issue</h2>
            <div className="mt-3 flex gap-2"><button className={tab(fmt === 'weekly')} onClick={() => setFmt('weekly')}>Weekly</button><button className={tab(fmt === 'daily')} onClick={() => setFmt('daily')}>Daily</button></div>
            <iframe title="Sample issue" src={fmt === 'weekly' ? '/advisers/sample-weekly.html' : '/advisers/sample-daily.html'} className="mt-4 h-[720px] w-full rounded-xl border border-white/10 bg-[#0b0f17]" />

            <h2 id="client" className={h2}>One worked client-ready example</h2>
            <p className="mt-3">Choose how the same issue is explained. You choose the version for a conversation. It is never assigned from a client&apos;s age.</p>
            <div className="mt-3 flex flex-wrap gap-2">{CONTEXTS.map((c) => <button key={c.key} className={tab(ctx === c.key)} onClick={() => setCtx(c.key)}>{c.label}</button>)}</div>
            <p className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">{cur.line}</p>
            <table className="mt-4 w-full text-left text-sm">
                <thead><tr className="text-gray-400"><th className="py-2 pr-4">What changes</th><th className="py-2">What does not</th></tr></thead>
                <tbody className="align-top"><tr className="border-t border-white/10"><td className="py-2 pr-4">The opening framing and the examples</td><td className="py-2">Facts, numbers, model status, risks and limitations</td></tr></tbody>
            </table>
            <p className="mt-3 text-sm text-gray-400">Branding, revisions and distribution rights for client-ready editions would be agreed separately.</p>

            <h2 id="record" className={h2}>Method and records</h2>
            <ul className="mt-3 list-disc space-y-3 pl-5">
                <li><strong className="text-white">Simulation.</strong> October 14, 2024 to October 13, 2026: QQQ LEAPS +229.48% with a largest decline of 14.59%. QQQ buy and hold +49.46% with a largest decline of 22.88%. Hypothetical results from a simulation, not a real account. Options were model-priced, the rules were developed with hindsight, and this was one favorable period for QQQ and semiconductors.</li>
                <li><strong className="text-white">Forward virtual accounts.</strong> Tracked since mid October 2026. The record is short and includes losing stretches. A virtual account is not an audited client result.</li>
                <li><strong className="text-white">Operational history.</strong> Every published model status, including no-change days and runs that did not complete their data checks.</li>
            </ul>
            <p className="mt-3"><a href="/simulated-record" className="text-blue-300 underline">Open the full simulated record</a> &middot; <a href="/live-record" className="text-blue-300 underline">Open the virtual account ledger</a></p>

            <h2 id="ira" className={h2}>IRA sample</h2>
            <div className="mt-3 space-y-3">
                <p><strong className="text-white">QQQ Defensive</strong> allocates among QQQ, QLD, TQQQ and SGOV. It includes leveraged ETFs and does not require options permission.</p>
                <p><strong className="text-white">QQQ LEAPS</strong> combines a long-dated QQQ call with shorter-dated written calls. The custodian confirms permissions and the exact options structure for the account.</p>
                <p>Questions for the custodian: which positions are permitted, how option legs are treated, what happens at expiration or assignment, and which costs and restrictions apply. Neither strategy fits every IRA.</p>
            </div>

            <h2 id="overview" className={h2}>Overview and 20 minute agenda</h2>
            <p className="mt-3">Three arrangements could be discussed. Pricing is not published here.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
                <li><strong className="text-white">A. Research access.</strong> You read the publication and evaluate it inside your own process.</li>
                <li><strong className="text-white">B. Client-ready research.</strong> A defined edition your firm can share, with branding and rights agreed separately.</li>
                <li><strong className="text-white">C. Model delivery.</strong> A standard update file that your firm reviews and acts on. TradeMind does not connect to brokerage accounts and does not place orders.</li>
            </ul>
            <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
                <li>Minutes 0 to 3: your intended use.</li><li>Minutes 3 to 8: inspect an issue.</li><li>Minutes 8 to 13: the record and its limits.</li><li>Minutes 13 to 17: workflow and commercial needs.</li><li>Minutes 17 to 20: the next step.</li>
            </ol>
            <div className="mt-8 flex flex-wrap gap-3"><a href={subscribeUrl} className={btnP}>Subscribe</a><a href={bookUrl} className={btnS}>Book 20 minutes</a></div>
            <p className="mt-10 text-xs text-gray-500">TradeMind publishes educational research, not personalized investment advice. Performance shown is hypothetical simulation unless labeled as a virtual account. Options and leveraged ETFs involve substantial risk, including loss of the amount invested. TradeMind never connects to a broker and never places trades.</p>
        </main>
    );
}
