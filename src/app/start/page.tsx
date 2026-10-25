import ExploreRow from '@/components/start/ExploreRow';
import { SECTION_LIST } from '@/lib/start/sections';

export default function StartHub() {
    return (
        <main className="mx-auto max-w-2xl px-5 pb-16 pt-6">
            <h1 className="text-3xl font-semibold">Start here</h1>
            <p className="mt-4 text-gray-300">TradeMind publishes rules for QQQ strategies and a free weekly brief for self-directed investors. You place every order yourself. We never connect to your broker. Take the sections in any order.</p>
            <ol className="mt-8 space-y-4">
                {SECTION_LIST.map((s, i) => (
                    <li key={s.key} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <a href={`/start/${s.key}`} className="text-lg font-semibold text-blue-300 hover:underline">{i + 1}. {s.label}</a>
                        <p className="mt-1 text-sm text-gray-300">{s.blurb}</p>
                    </li>
                ))}
            </ol>
            <p className="mt-8 text-sm text-gray-400">Every TradeMind result shown so far comes from a simulation, not live trading. Education only, not investment advice.</p>
            <ExploreRow />
        </main>
    );
}
