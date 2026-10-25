import type { Metadata } from 'next';
import OutreachEngage from '@/components/newsletter/OutreachEngage';

export const metadata: Metadata = {
    title: 'Start here | TradeMind',
    description: 'A plain-English tour of TradeMind: the weekly brief, the strategies, the rules, a challenge, and a research panel.',
    robots: { index: false },
};

export default function StartLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0b0f17] text-gray-100">
            <div className="mx-auto max-w-2xl px-5 pt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                    AI Investor Copilot <span className="font-normal normal-case text-gray-400">by <a href="/" className="underline">TradeMind</a></span>
                </p>
            </div>
            {children}
            <OutreachEngage />
        </div>
    );
}
