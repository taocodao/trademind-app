'use client';

import { Layers, Activity } from 'lucide-react';
import { useSettings } from '@/components/providers/SettingsProvider';

type AllocationMode = 'MODE_A' | 'MODE_B';

const TURBOBOUNCE_MODES: Record<AllocationMode, {
    label: string;
    icon: React.ReactNode;
    description: string;
    metrics: { tqqq: string; multi: string; totalSlots: string };
}> = {
    MODE_A: {
        label: 'Dedicated 50/50',
        icon: <Layers className="w-5 h-5" />,
        description: 'Hard partition separating TQQQ and Multi-Ticker allocations.',
        metrics: { tqqq: '50% (Max 3)', multi: '50% (Max 3)', totalSlots: '6 trades' }
    },
    MODE_B: {
        label: 'Unified 100%',
        icon: <Activity className="w-5 h-5" />,
        description: 'Survival of the fittest: TQQQ competes directly with all tickers.',
        metrics: { tqqq: 'Variable', multi: 'Variable', totalSlots: '6 trades' }
    }
};

const MODE_COLORS: Record<AllocationMode, { border: string; bg: string; text: string; icon: string }> = {
    MODE_A: { border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', icon: 'text-blue-400' },
    MODE_B: { border: 'border-tm-purple', bg: 'bg-tm-purple/10', text: 'text-tm-purple', icon: 'text-tm-purple' }
};

export function TurboBounceAllocationSettings() {
    const { settings, setTurboBounceMode } = useSettings();
    const currentMode = settings.turboBounceMode || 'MODE_B';
    const profile = TURBOBOUNCE_MODES[currentMode];

    return (
        <div className="space-y-3">
            <div className="glass-card p-4">
                <h3 className="font-semibold text-sm mb-3">TurboBounce Allocation Mode</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                    {(Object.keys(TURBOBOUNCE_MODES) as AllocationMode[]).map(mode => {
                        const mInfo = TURBOBOUNCE_MODES[mode];
                        const colors = MODE_COLORS[mode];
                        const isActive = currentMode === mode;

                        return (
                            <button
                                key={mode}
                                onClick={() => setTurboBounceMode(mode)}
                                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${isActive
                                    ? `${colors.border} ${colors.bg}`
                                    : 'border-white/10 bg-tm-bg/50 hover:border-white/20'
                                    }`}
                            >
                                <span className={isActive ? colors.icon : 'text-tm-muted'}>
                                    {mInfo.icon}
                                </span>
                                <span className={`text-xs font-bold mt-1 ${isActive ? colors.text : 'text-tm-muted'}`}>
                                    {mInfo.label}
                                </span>
                                <span className={`text-[10px] text-center mt-1 text-tm-muted leading-tight px-1`}>
                                    {mInfo.description}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Active profile detail */}
                <div className="mt-3 pt-3 border-t border-white/5 text-xs space-y-1">
                    <div className="flex justify-between">
                        <span className="text-tm-muted">TQQQ Limits</span>
                        <span className="font-semibold">{profile.metrics.tqqq}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-tm-muted">Multi-Ticker Limits</span>
                        <span className="font-semibold">{profile.metrics.multi}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-tm-muted">Total Max Positions</span>
                        <span className="font-semibold text-tm-purple">{profile.metrics.totalSlots}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
