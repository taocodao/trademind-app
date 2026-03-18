'use client';

import { useState } from 'react';
import { Wallet, ArrowDownToLine, ArrowUpFromLine, RefreshCcw } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export function ShadowLedgerPanel({ strategy = 'default' }: { strategy?: string }) {
    const { settings, updateShadowLedger } = useSettings();
    const ledger = (settings.shadowLedger as unknown as Record<string, any>)[strategy] || (settings.shadowLedger as unknown as Record<string, any>)['default'] || { balance: 0, positions: {} };

    const [amount, setAmount] = useState('');
    const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');

    const handleTransaction = () => {
        const num = parseFloat(amount.replace(/[^0-9.]/g, ''));
        if (isNaN(num) || num <= 0) return;

        let newBalance = ledger.balance;
        if (action === 'deposit') {
            newBalance += num;
        } else if (action === 'withdraw') {
            newBalance = Math.max(0, newBalance - num);
        }

        updateShadowLedger(strategy, { balance: newBalance });
        setAmount('');
    };

    // Calculate total portfolio value roughly (assuming 1 position unit = $1 just for rendering scale if we don't have live prices here)
    // Wait, since we don't have live prices in SettingsProvider, we can just show the cash balance 
    // and the share counts.

    // Check if there are any positions
    const hasPositions = Object.keys(ledger.positions).length > 0;

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg">Shadow Ledger</h3>
                        <p className="text-xs text-tm-muted">Virtual account sync (Tier 2b)</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-tm-muted mb-1">Cash Balance</p>
                    <p className="text-2xl font-mono font-bold text-tm-green">
                        ${ledger.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            <div className="bg-black/30 rounded-xl p-4 mb-4 border border-white/5">
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setAction('deposit')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${action === 'deposit' ? 'bg-tm-green/20 text-tm-green' : 'bg-white/5 text-tm-muted hover:bg-white/10'}`}
                    >
                        <ArrowDownToLine className="w-3 h-3" /> Deposit
                    </button>
                    <button
                        onClick={() => setAction('withdraw')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 ${action === 'withdraw' ? 'bg-tm-purple/20 text-tm-purple' : 'bg-white/5 text-tm-muted hover:bg-white/10'}`}
                    >
                        <ArrowUpFromLine className="w-3 h-3" /> Withdraw
                    </button>
                </div>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tm-muted">$</span>
                        <input
                            type="text"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                            placeholder="0.00"
                            className="w-full bg-tm-bg border border-white/10 rounded-xl py-2 pl-7 pr-3 text-sm font-mono focus:outline-none focus:border-tm-purple/50 transition-colors"
                        />
                    </div>
                    <button
                        onClick={handleTransaction}
                        className="px-4 bg-tm-purple/80 hover:bg-tm-purple text-white rounded-xl text-sm font-semibold transition-colors"
                    >
                        Save
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <h4 className="text-xs font-semibold text-tm-muted uppercase tracking-wider mb-2">Virtual Positions</h4>
                {!hasPositions ? (
                    <div className="text-sm text-center text-tm-muted/50 py-4 bg-white/5 border border-white/10 border-dashed rounded-xl">
                        No positions held in virtual ledger.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {Object.entries(ledger.positions as Record<string, number>).map(([symbol, shares]) => (
                            <div key={symbol} className="bg-white/5 border border-white/10 rounded-lg p-3 flex justify-between items-center">
                                <span className="font-bold">{symbol}</span>
                                <span className="font-mono text-tm-muted">{shares} sh</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <RefreshCcw className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-200">
                    Keep this balance updated to match your external brokerage. TradeMind will size the required shares based on this virtual Net Liq.
                </p>
            </div>
        </div>
    );
}
