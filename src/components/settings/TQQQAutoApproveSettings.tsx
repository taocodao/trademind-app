'use client';

import { Shield, Scale, Flame, Target, Clock, TrendingUp } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useStrategyContext } from '@/components/providers/StrategyContext';
import { AUTO_APPROVE_ENABLED } from '@/lib/feature-flags';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

// ── TurboCore (Equity) Risk Profiles ─────────────────────────────────────────
const TURBOCORE_RISK_PROFILES: Record<RiskLevel, {
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
        description: 'Lower allocation, reduced volatility',
        riskPct: 5,
        backtestReturn: '+117%',
        maxDrawdown: '-4.7%',
        strategy: 'Max 25% TQQQ',
    },
    MEDIUM: {
        label: 'Balanced',
        icon: <Scale className="w-5 h-5" />,
        description: 'Moderate TQQQ/QLD mix',
        riskPct: 7.5,
        backtestReturn: '+98%',
        maxDrawdown: '-10%',
        strategy: 'ML Allocation ★',
    },
    HIGH: {
        label: 'Aggressive',
        icon: <Flame className="w-5 h-5" />,
        description: 'Full TQQQ on strong signals',
        riskPct: 10,
        backtestReturn: '+135%',
        maxDrawdown: '-18%',
        strategy: 'Max Exposure',
    },
};

// ── QQQ Basic (ML Allocation) Risk Profiles ────────────────────────────────
// Backtest figures: 2021–2026 walk-forward, per-tier (CAGR / max drawdown).
const PRO_RISK_PROFILES: Record<RiskLevel, {
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
        description: 'Lower leverage, faster defense',
        riskPct: 5,
        backtestReturn: '+10.1%/yr',
        maxDrawdown: '-12.7%',
        strategy: 'QQQ/QLD tilt + SGOV defense',
    },
    MEDIUM: {
        label: 'Balanced',
        icon: <Scale className="w-5 h-5" />,
        description: 'Moderate TQQQ/QLD mix',
        riskPct: 7.5,
        backtestReturn: '+13.7%/yr',
        maxDrawdown: '-15.0%',
        strategy: 'ML Allocation ★',
    },
    HIGH: {
        label: 'Aggressive',
        icon: <Flame className="w-5 h-5" />,
        description: 'Full TQQQ on strong signals',
        riskPct: 10,
        backtestReturn: '+17.8%/yr',
        maxDrawdown: '-22.3%',
        strategy: 'Max Exposure',
    },
};

// ── QQQ LEAPS Plan Profiles ────────────────────────────────────────────────
type LeapsDelta = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
const LEAPS_PROFILES: Record<LeapsDelta, {
    label: string;
    icon: React.ReactNode;
    deltaTarget: string;
    dte: string;
    description: string;
}> = {
    CONSERVATIVE: {
        label: 'Deep ITM',
        icon: <Shield className="w-5 h-5" />,
        deltaTarget: '0.90 Δ',
        dte: '12–18 months',
        description: 'Very high delta, stock-like exposure, lower theta risk',
    },
    MODERATE: {
        label: 'ITM Call',
        icon: <Target className="w-5 h-5" />,
        deltaTarget: '0.80 Δ',
        dte: '9–12 months',
        description: 'Balanced delta and leverage, recommended default ★',
    },
    AGGRESSIVE: {
        label: 'ATM Call',
        icon: <TrendingUp className="w-5 h-5" />,
        deltaTarget: '0.70 Δ',
        dte: '6 months',
        description: 'Higher leverage, more sensitive to price moves',
    },
};

const RISK_COLORS: Record<RiskLevel | LeapsDelta, { border: string; bg: string; text: string; icon: string }> = {
    LOW:          { border: 'border-blue-500',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: 'text-blue-400'   },
    MEDIUM:       { border: 'border-tm-purple',  bg: 'bg-tm-purple/10',  text: 'text-tm-purple',  icon: 'text-tm-purple'  },
    HIGH:         { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'text-orange-400' },
    CONSERVATIVE: { border: 'border-blue-500',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   icon: 'text-blue-400'   },
    MODERATE:     { border: 'border-tm-purple',  bg: 'bg-tm-purple/10',  text: 'text-tm-purple',  icon: 'text-tm-purple'  },
    AGGRESSIVE:   { border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-400', icon: 'text-orange-400' },
};

// ── LEAPS Settings Panel ───────────────────────────────────────────────────
function LEAPSSettings() {
    const { settings, setRiskLevel } = useSettings();
    // Re-use riskLevel mapped to LEAPS delta profiles
    const levelMap: Record<RiskLevel, LeapsDelta> = {
        LOW: 'CONSERVATIVE', MEDIUM: 'MODERATE', HIGH: 'AGGRESSIVE',
    };
    const deltaMap: Record<LeapsDelta, RiskLevel> = {
        CONSERVATIVE: 'LOW', MODERATE: 'MEDIUM', AGGRESSIVE: 'HIGH',
    };
    const currentDelta = levelMap[settings.riskLevel];
    const currentProfile = LEAPS_PROFILES[currentDelta];

    return (
        <div className="space-y-3">
            {/* LEAPS Profile Selector */}
            <div className="glass-card p-4">
                <h3 className="font-semibold text-sm mb-1">LEAPS Call Profile</h3>
                <p className="text-xs text-tm-muted mb-3">Select your preferred delta and DTE target for QQQ call positions.</p>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(LEAPS_PROFILES) as LeapsDelta[]).map(level => {
                        const profile = LEAPS_PROFILES[level];
                        const colors = RISK_COLORS[level];
                        const isActive = currentDelta === level;
                        return (
                            <button
                                key={level}
                                onClick={() => setRiskLevel(deltaMap[level])}
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
                                    {profile.deltaTarget}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Active profile detail */}
                <div className="mt-3 pt-3 border-t border-white/5 text-xs space-y-1">
                    <div className="flex justify-between">
                        <span className="text-tm-muted">Delta target</span>
                        <span className="font-semibold">{currentProfile.deltaTarget}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-tm-muted flex items-center gap-1"><Clock className="w-3 h-3" /> DTE target</span>
                        <span className="font-semibold">{currentProfile.dte}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-tm-muted">Style</span>
                        <span className="font-semibold text-amber-400">{currentProfile.description}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}

// ── QQQ Basic Shared Panel ─────────────────────────────────────────────────
function EquityOrProSettings({
    strategyKey,
    profiles,
}: {
    strategyKey: string;
    profiles: typeof TURBOCORE_RISK_PROFILES;
}) {
    const { settings, setRiskLevel } = useSettings();
    const currentProfile = profiles[settings.riskLevel];

    return (
        <div className="space-y-3">
            {/* Risk Level */}
            <div className="glass-card p-4">
                <h3 className="font-semibold text-sm mb-3">Risk Level</h3>
                <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(profiles) as RiskLevel[]).map(level => {
                        const profile = profiles[level];
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

        </div>
    );
}

// ── Main Export ────────────────────────────────────────────────────────────
export function TQQQAutoApproveSettings() {
    // Signals-only product model — Auto-Approve UI is disabled everywhere.
    // Source kept for future reactivation via @/lib/feature-flags.
    if (!AUTO_APPROVE_ENABLED) return null;
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { activeStrategy } = useStrategyContext();

    if (activeStrategy === 'QQQ_LEAPS') {
        return <LEAPSSettings />;
    }

    // Default: QQQ Basic (base TurboCore strategy removed)
    return (
        <EquityOrProSettings
            strategyKey="TQQQ_TURBOCORE_PRO"
            profiles={PRO_RISK_PROFILES}
        />
    );
}
