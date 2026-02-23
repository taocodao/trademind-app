'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Check } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

export function InvestmentPrincipal() {
    const { settings, setInvestmentPrincipal } = useSettings();
    const [inputValue, setInputValue] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setInputValue(settings.investmentPrincipal.toLocaleString());
    }, [settings.investmentPrincipal]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Strip non-numeric except digits
        const raw = e.target.value.replace(/[^0-9]/g, '');
        const num = parseInt(raw, 10);
        if (!isNaN(num)) {
            setInputValue(num.toLocaleString());
        } else {
            setInputValue('');
        }
    };

    const handleSave = () => {
        const num = parseInt(inputValue.replace(/[^0-9]/g, ''), 10);
        if (!isNaN(num) && num >= 1000) {
            setInvestmentPrincipal(num);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    const riskPct = settings.riskLevel === 'LOW' ? 5 : settings.riskLevel === 'MEDIUM' ? 7.5 : 10;
    const principal = parseInt(inputValue.replace(/[^0-9]/g, ''), 10) || 0;
    const maxRisk = (principal * riskPct / 100);

    return (
        <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-tm-purple/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-tm-purple" />
                </div>
                <span className="text-sm font-semibold">Investment Principal</span>
            </div>

            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-tm-muted text-lg">$</span>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={handleChange}
                        className="w-full bg-tm-bg border border-white/10 rounded-xl py-3 pl-8 pr-4 text-xl font-mono font-bold focus:outline-none focus:border-tm-purple/50 transition-colors"
                        placeholder="25,000"
                    />
                </div>
                <button
                    onClick={handleSave}
                    className={`px-4 rounded-xl font-semibold text-sm transition-all ${saved
                            ? 'bg-tm-green/20 text-tm-green'
                            : 'btn-primary'
                        }`}
                >
                    {saved ? <Check className="w-5 h-5" /> : 'Set'}
                </button>
            </div>

            {principal >= 1000 && (
                <div className="mt-3 flex items-center justify-between text-xs text-tm-muted">
                    <span>
                        Max risk per trade: <span className="text-tm-text font-mono">${maxRisk.toLocaleString()}</span>
                    </span>
                    <span className="text-tm-purple">{riskPct}% risk level</span>
                </div>
            )}
        </div>
    );
}
