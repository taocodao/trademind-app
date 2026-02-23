'use client';

import { Shield, Scale, Flame } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

const TQQQ_RISK_PROFILES: Record<RiskLevel, {
    label: string;
    icon: React.ReactNode;
    description: string;
    riskPct: number;
    backtestReturn: string;
    maxDrawdown: string;
    strategy: string;
}> = {
    LOW: {
        label: 'Conservative',
        icon: <Shield className="w-5 h-5" />,
        description: 'Put spreads only',
        riskPct: 5,
        backtestReturn: '+52%',
        maxDrawdown: '-8%',
        strategy: 'Put Credit only (Scenario A)',
    },
    MEDIUM: {
        label: 'Balanced',
        icon: <Scale className="w-5 h-5" />,
        description: 'Put + Call spreads',
        riskPct: 7.5,
        backtestReturn: '+98%',
        maxDrawdown: '-10%',
        strategy: 'Dual-Sided (Scenario B) ★',
    },
    HIGH: {
        label: 'Aggressive',
        icon: <Flame className="w-5 h-5" />,
        description: 'Full dual-sided',
        riskPct: 10,
        backtestReturn: '+135%',
        maxDrawdown: '-18%',
        strategy: 'Max Exposure',
    },
};

const RISK_COLORS: Record<RiskLevel, { border: string; bg: string; text: string; icon: string }> = {
    LOW: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-400' },
    MEDIUM: { border: 'border-tm-purple', bg: 'bg-tm-purple/10', text: 'text-tm-purple', icon: 'text-tm-purple' },
    HIGH: { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'text-orange-400' },
};

export function TQQQAutoApproveSettings() {
    const { settings, setRiskLevel, setAutoApproval } = useSettings();
    const currentProfile = TQQQ_RISK_PROFILES[settings.riskLevel];

    return (
        <div className="space-y-3">
            {/* Risk Level */}
            <div className="glass-card p-4">
                <h3 className="font-semibold text-sm mb-3">Risk Level</h3>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(TQQQ_RISK_PROFILES) as RiskLevel[]).map(level => {
                        const profile = TQQQ_RISK_PROFILES[level];
                        const colors = RISK_COLORS[level];
                        const isActive = settings.riskLevel === level;

                        return (
                            <button
                                key={level}
                                onClick={() => setRiskLevel(level)}
                                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${isActive
                                        ? `${colors.border} ${colors.bg}`
                                        : 'border-white/10 bg-tm-bg/50 hover:border-white/20'
                                    }`}
                            >
                                <span className={isActive ? colors.icon : 'text-tm-muted'}>
                                    {profile.icon}
                                </span>
                                <span className={`text-xs font-bold mt-1 ${isActive ? colors.text : 'text-tm-muted'}`}>
                                    {profile.label}
                                </span>
                                <span className={`text-[10px] font-mono font-semibold mt-0.5 ${isActive ? 'text-tm-green' : 'text-tm-muted'}`}>
                                    {profile.backtestReturn}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Active profile detail */}
                <div className="mt-3 pt-3 border-t border-white/5 text-xs space-y-1">
                    <div className="flex justify-between">
                        <span className="text-tm-muted">Strategy</span>
                        <span className="font-semibold">{currentProfile.strategy}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-tm-muted">Risk per trade</span>
                        <span className="font-semibold">{currentProfile.riskPct}% of principal</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-tm-muted">Max drawdown</span>
                        <span className="font-semibold text-tm-red">{currentProfile.maxDrawdown}</span>
                    </div>
                </div>
            </div>

            {/* Auto-Approval */}
            <div className="glass-card p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-sm">Auto-Approval</h3>
                        <p className="text-xs text-tm-muted mt-0.5">
                            {settings.autoApproval
                                ? 'Signals execute automatically on Tastytrade'
                                : 'Manually approve each signal before execution'}
                        </p>
                    </div>
                    {/* Toggle switch */}
                    <button
                        onClick={() => setAutoApproval(!settings.autoApproval)}
                        className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${settings.autoApproval ? 'bg-tm-purple' : 'bg-tm-surface'
                            }`}
                        aria-label="Toggle auto-approval"
                    >
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${settings.autoApproval ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                    </button>
                </div>

                {settings.autoApproval && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                        <p className="text-[11px] text-yellow-400/80">
                            ⚠️ Auto-approval requires a linked Tastytrade account. Signals will be submitted as limit orders at mid-price.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
