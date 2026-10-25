import type { Metadata } from 'next';
import OutreachEngage from '@/components/newsletter/OutreachEngage';

export const metadata: Metadata = {
    title: 'TradeMind Founding Member Program',
    robots: { index: false },
};

export default function FoundingLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#0b0f17] text-gray-100">
            {children}
            <OutreachEngage />
        </div>
    );
}
