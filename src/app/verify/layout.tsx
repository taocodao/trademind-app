import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Verify the record | TradeMind',
    description:
        'The complete methodology behind the QQQ LEAPS backtest: data, pricing model, costs, full trade ledger, and the limitations you should weigh before trusting any of it.',
};

export default function VerifyLayout({ children }: { children: React.ReactNode }) {
    return children;
}
