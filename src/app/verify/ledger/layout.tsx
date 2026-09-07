import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Interactive ledger | TradeMind verify',
    description:
        'All 806 fills of the published QQQ LEAPS backtest, plotted on real QQQ prices with per-fill pricing inputs, costs, and entry-gate status. Hypothetical backtested performance; past performance is not necessarily indicative of future results.',
};

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
    return children;
}
