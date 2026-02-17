"use client";

import { useState, useEffect, useMemo } from "react";
import {
    CheckCircle2,
    Sliders,
    DollarSign,
    CheckCircle,
    Loader2,
    Shield,
    Scale,
    Flame,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
} from "lucide-react";

// ─── Risk Profile Presets (from backtested data) ───────────────────────────

const THETA_RISK_PROFILES = {
    LOW: {
        label: "Conservative",
        icon: "🛡️",
        expectedROI: "35%",
        maxDrawdown: "-20%",
        winRate: "96%",
        bestFor: "New traders, capital preservation",
        minConfidence: 75,
        maxCapital: 1000,
        maxContracts: 5,
        maxPositions: 3,
        breachThresholdPct: 2,
        breachConfirmationDays: 3,
        dteExitThreshold: 5,
        maxLossPct: 200,
        vixBlockTrading: 30,
        vixReduceSize: 25,
    },
    MEDIUM: {
        label: "Balanced",
        icon: "⚖️",
        expectedROI: "47%",
        maxDrawdown: "-25%",
        winRate: "95%",
        bestFor: "Most users, balanced approach",
        minConfidence: 70,
        maxCapital: 2000,
        maxContracts: 8,
        maxPositions: 5,
        breachThresholdPct: 2,
        breachConfirmationDays: 3,
        dteExitThreshold: 3,
        maxLossPct: 200,
        vixBlockTrading: 35,
        vixReduceSize: 28,
    },
    HIGH: {
        label: "Aggressive",
        icon: "⚠️",
        expectedROI: "60%",
        maxDrawdown: "-50%",
        winRate: "94%",
        bestFor: "Experienced, high risk tolerance",
        minConfidence: 65,
        maxCapital: 5000,
        maxContracts: 10,
        maxPositions: 6,
        breachThresholdPct: 3,
        breachConfirmationDays: 2,
        dteExitThreshold: 2,
        maxLossPct: 200,
        vixBlockTrading: 40,
        vixReduceSize: 32,
    },
};

const DIAGONAL_RISK_PROFILES = {
    LOW: {
        label: "Conservative",
        icon: "🛡️",
        expectedROI: "25%",
        maxDrawdown: "-15%",
        winRate: "90%",
        bestFor: "Capital preservation",
        minConfidence: 80,
        maxCapital: 500,
        maxContracts: 1,
        maxPositions: 2,
    },
    MEDIUM: {
        label: "Balanced",
        icon: "⚖️",
        expectedROI: "40%",
        maxDrawdown: "-25%",
        winRate: "88%",
        bestFor: "Most users",
        minConfidence: 75,
        maxCapital: 1000,
        maxContracts: 2,
        maxPositions: 3,
    },
    HIGH: {
        label: "Aggressive",
        icon: "⚠️",
        expectedROI: "55%",
        maxDrawdown: "-40%",
        winRate: "85%",
        bestFor: "Experienced traders",
        minConfidence: 70,
        maxCapital: 2000,
        maxContracts: 3,
        maxPositions: 4,
    },
};

const ZEBRA_RISK_PROFILES = {
    LOW: {
        label: "Conservative",
        icon: "🛡️",
        expectedROI: "30%",
        maxDrawdown: "-15%",
        winRate: "75%",
        bestFor: "Steady growth",
        minConfidence: 80,
        maxCapital: 1000,
        maxContracts: 1,
        maxPositions: 1,
        stopLossPct: 15,
        takeProfitPct: 30,
    },
    MEDIUM: {
        label: "Balanced",
        icon: "⚖️",
        expectedROI: "50%",
        maxDrawdown: "-25%",
        winRate: "70%",
        bestFor: "Growth & income",
        minConfidence: 75,
        maxCapital: 2500,
        maxContracts: 2,
        maxPositions: 3,
        stopLossPct: 20,
        takeProfitPct: 50,
    },
    HIGH: {
        label: "Aggressive",
        icon: "⚠️",
        expectedROI: "75%",
        maxDrawdown: "-40%",
        winRate: "65%",
        bestFor: "Max growth",
        minConfidence: 70,
        maxCapital: 5000,
        maxContracts: 3,
        maxPositions: 5,
        stopLossPct: 25,
        takeProfitPct: 100,
    },
};

const DVO_RISK_PROFILES = {
    LOW: {
        label: "Conservative",
        icon: "🛡️",
        expectedROI: "20%",
        maxDrawdown: "-10%",
        winRate: "90%",
        bestFor: "Safety first",
        minConfidence: 80,
        maxCapital: 5000,
        maxContracts: 1,
        maxPositions: 3,
        leverageLimit: 1.0,
    },
    MEDIUM: {
        label: "Balanced",
        icon: "⚖️",
        expectedROI: "35%",
        maxDrawdown: "-20%",
        winRate: "85%",
        bestFor: "Growth",
        minConfidence: 70,
        maxCapital: 10000,
        maxContracts: 2,
        maxPositions: 5,
        leverageLimit: 1.5,
    },
    HIGH: {
        label: "Aggressive",
        icon: "⚠️",
        expectedROI: "50%",
        maxDrawdown: "-35%",
        winRate: "80%",
        bestFor: "Max Alpha",
        minConfidence: 60,
        maxCapital: 20000,
        maxContracts: 3,
        maxPositions: 8,
        leverageLimit: 2.0,
    },
};

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

interface StrategySettings {
    enabled: boolean;
    riskLevel: RiskLevel;
    customOverrides: Record<string, number>;
}

interface AutoApproveSettingsData {
    enabled: boolean;
    theta: StrategySettings;
    diagonal: StrategySettings;
    zebra: StrategySettings;
    dvo: StrategySettings;
}

export function AutoApproveSettings() {
    const [settings, setSettings] = useState<AutoApproveSettingsData>({
        enabled: false,
        theta: { enabled: true, riskLevel: "MEDIUM", customOverrides: {} },
        diagonal: { enabled: false, riskLevel: "MEDIUM", customOverrides: {} },
        zebra: { enabled: false, riskLevel: "MEDIUM", customOverrides: {} },
        dvo: { enabled: false, riskLevel: "MEDIUM", customOverrides: {} },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await fetch("/api/settings/auto-approve");
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            }
        } catch (error) {
            console.error("Failed to fetch auto-approve settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveSettings = async (newSettings: AutoApproveSettingsData) => {
        setSaving(true);
        setSaved(false);
        try {
            const response = await fetch("/api/settings/auto-approve", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newSettings),
            });
            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
            }
        } catch (error) {
            console.error("Failed to save settings:", error);
        } finally {
            setSaving(false);
        }
    };

    const handleGlobalToggle = () => {
        const newSettings = { ...settings, enabled: !settings.enabled };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const handleStrategyToggle = (strategy: "theta" | "diagonal" | "zebra" | "dvo") => {
        const newSettings = {
            ...settings,
            [strategy]: {
                ...settings[strategy],
                enabled: !settings[strategy].enabled,
            },
        };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    const handleRiskLevelChange = (
        strategy: "theta" | "diagonal" | "zebra" | "dvo",
        level: RiskLevel
    ) => {
        const newSettings = {
            ...settings,
            [strategy]: {
                ...settings[strategy],
                riskLevel: level,
                customOverrides: {}, // Reset overrides when changing profile
            },
        };
        setSettings(newSettings);
        saveSettings(newSettings);
    };

    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-6 bg-tm-surface rounded w-1/3 mb-4" />
                <div className="h-20 bg-tm-surface rounded" />
            </div>
        );
    }

    const riskIcons: Record<RiskLevel, React.ReactNode> = {
        LOW: <Shield className="w-4 h-4" />,
        MEDIUM: <Scale className="w-4 h-4" />,
        HIGH: <Flame className="w-4 h-4" />,
    };

    const riskColors: Record<RiskLevel, string> = {
        LOW: "text-tm-green",
        MEDIUM: "text-tm-purple",
        HIGH: "text-red-400",
    };

    return (
        <div className="glass-card p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tm-purple/20 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-tm-purple" />
                    </div>
                    <div>
                        <h3 className="font-semibold">Auto-Approve</h3>
                        <p className="text-sm text-tm-muted">
                            Automatically execute qualifying trade signals
                        </p>
                    </div>
                </div>

                {/* Global Toggle */}
                <button
                    onClick={handleGlobalToggle}
                    className={`relative w-14 h-8 rounded-full transition-colors ${settings.enabled ? "bg-tm-green" : "bg-tm-surface"
                        }`}
                >
                    <div
                        className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.enabled ? "left-7" : "left-1"
                            }`}
                    />
                </button>
            </div>

            {/* Strategy Cards */}
            {settings.enabled && (
                <div className="space-y-4 pt-4 border-t border-white/10">
                    {/* Theta Sprint Card */}
                    <StrategyCard
                        name="Theta Sprint"
                        description="Cash-secured puts"
                        strategy="theta"
                        enabled={settings.theta.enabled}
                        riskLevel={settings.theta.riskLevel}
                        profiles={THETA_RISK_PROFILES}
                        expanded={expandedStrategy === "theta"}
                        riskIcons={riskIcons}
                        riskColors={riskColors}
                        onToggle={() => handleStrategyToggle("theta")}
                        onRiskChange={(level) => handleRiskLevelChange("theta", level)}
                        onExpand={() =>
                            setExpandedStrategy(
                                expandedStrategy === "theta" ? null : "theta"
                            )
                        }
                        showDefensiveExits
                    />

                    {/* Diagonal Spread Card */}
                    <StrategyCard
                        name="Diagonal Spread"
                        description="PMCC — different strikes + expirations"
                        strategy="diagonal"
                        enabled={settings.diagonal.enabled}
                        riskLevel={settings.diagonal.riskLevel}
                        profiles={DIAGONAL_RISK_PROFILES}
                        expanded={expandedStrategy === "diagonal"}
                        riskIcons={riskIcons}
                        riskColors={riskColors}
                        onToggle={() => handleStrategyToggle("diagonal")}
                        onRiskChange={(level) =>
                            handleRiskLevelChange("diagonal", level)
                        }
                        onExpand={() =>
                            setExpandedStrategy(
                                expandedStrategy === "diagonal" ? null : "diagonal"
                            )
                        }
                    />

                    {/* ZEBRA Strat Card */}
                    <StrategyCard
                        name="ZEBRA Strategy"
                        description="Zero Extrinsic Back Ratio - Stock Replacement"
                        strategy="zebra"
                        enabled={settings.zebra.enabled}
                        riskLevel={settings.zebra.riskLevel}
                        profiles={ZEBRA_RISK_PROFILES}
                        expanded={expandedStrategy === "zebra"}
                        riskIcons={riskIcons}
                        riskColors={riskColors}
                        onToggle={() => handleStrategyToggle("zebra")}
                        onRiskChange={(level) => handleRiskLevelChange("zebra", level)}
                        onExpand={() =>
                            setExpandedStrategy(
                                expandedStrategy === "zebra" ? null : "zebra"
                            )
                        }
                    />

                    {/* DVO Strategy Card */}
                    <StrategyCard
                        name="Deep Value Overlay (DVO)"
                        description="Portfolio-Secured Puts on Undervalued Assets"
                        strategy="dvo"
                        enabled={settings.dvo.enabled}
                        riskLevel={settings.dvo.riskLevel}
                        profiles={DVO_RISK_PROFILES}
                        expanded={expandedStrategy === "dvo"}
                        riskIcons={riskIcons}
                        riskColors={riskColors}
                        onToggle={() => handleStrategyToggle("dvo")}
                        onRiskChange={(level) => handleRiskLevelChange("dvo", level)}
                        onExpand={() =>
                            setExpandedStrategy(
                                expandedStrategy === "dvo" ? null : "dvo"
                            )
                        }
                    />

                    {/* Warning */}
                    <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-yellow-400">
                                When enabled, qualifying signals will be executed
                                automatically without confirmation. Make sure you{"'"}re
                                comfortable with the risk settings above.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Status */}
            {(saving || saved) && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                    {saving ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin text-tm-muted" />
                            <span className="text-tm-muted">Saving...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-4 h-4 text-tm-green" />
                            <span className="text-tm-green">Settings saved</span>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Strategy Card Component ───────────────────────────────────────────────

interface StrategyCardProps {
    name: string;
    description: string;
    strategy: string;
    enabled: boolean;
    riskLevel: RiskLevel;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profiles: Record<RiskLevel, any>;
    expanded: boolean;
    riskIcons: Record<RiskLevel, React.ReactNode>;
    riskColors: Record<RiskLevel, string>;
    onToggle: () => void;
    onRiskChange: (level: RiskLevel) => void;
    onExpand: () => void;
    showDefensiveExits?: boolean;
}

function StrategyCard({
    name,
    description,
    enabled,
    riskLevel,
    profiles,
    expanded,
    riskIcons,
    riskColors,
    onToggle,
    onRiskChange,
    onExpand,
    showDefensiveExits,
}: StrategyCardProps) {
    const activeProfile = useMemo(() => profiles[riskLevel], [profiles, riskLevel]);

    return (
        <div
            className={`rounded-xl border transition-all ${enabled
                ? "bg-tm-surface/50 border-tm-purple/30"
                : "bg-tm-surface/20 border-white/5"
                }`}
        >
            {/* Strategy Header */}
            <div className="p-4 flex items-center justify-between">
                <button onClick={onExpand} className="flex items-center gap-3 flex-1">
                    <div className="text-left">
                        <p className="font-semibold">{name}</p>
                        <p className="text-xs text-tm-muted">{description}</p>
                    </div>
                </button>

                <div className="flex items-center gap-3">
                    {enabled && (
                        <button onClick={onExpand} className="text-tm-muted">
                            {expanded ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                        </button>
                    )}
                    <button
                        onClick={onToggle}
                        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-tm-green" : "bg-tm-surface"
                            }`}
                    >
                        <div
                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${enabled ? "left-6" : "left-0.5"
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* Expanded Settings */}
            {enabled && expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
                    {/* Risk Level Selector */}
                    <div>
                        <label className="text-sm text-tm-muted mb-2 block">
                            Risk Profile
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((level) => {
                                const profile = profiles[level];
                                return (
                                    <button
                                        key={level}
                                        onClick={() => onRiskChange(level)}
                                        className={`p-3 rounded-xl border text-center transition-all ${riskLevel === level
                                            ? "bg-tm-purple/20 border-tm-purple/50"
                                            : "bg-tm-surface/50 border-white/10 hover:border-white/20"
                                            }`}
                                    >
                                        <div className="text-lg mb-1">{profile.icon}</div>
                                        <p
                                            className={`text-xs font-semibold ${riskLevel === level
                                                ? riskColors[level]
                                                : "text-white/70"
                                                }`}
                                        >
                                            {level}
                                        </p>
                                        <p className="text-[10px] text-tm-muted mt-0.5">
                                            {profile.expectedROI} ROI
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Profile Summary */}
                    <div className="bg-black/20 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                            <span className={riskColors[riskLevel]}>
                                {riskIcons[riskLevel]}
                            </span>
                            <span className="text-sm font-medium">
                                {activeProfile.label} Profile
                            </span>
                            <span className="text-xs text-tm-muted ml-auto">
                                {activeProfile.bestFor}
                            </span>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-tm-surface/30 rounded-lg p-2">
                                <p className="text-xs text-tm-muted">ROI</p>
                                <p className="text-sm font-bold text-tm-green">
                                    {activeProfile.expectedROI}
                                </p>
                            </div>
                            <div className="bg-tm-surface/30 rounded-lg p-2">
                                <p className="text-xs text-tm-muted">Max DD</p>
                                <p className="text-sm font-bold text-red-400">
                                    {activeProfile.maxDrawdown}
                                </p>
                            </div>
                            <div className="bg-tm-surface/30 rounded-lg p-2">
                                <p className="text-xs text-tm-muted">Win Rate</p>
                                <p className="text-sm font-bold text-tm-purple">
                                    {activeProfile.winRate}
                                </p>
                            </div>
                        </div>

                        {/* Settings Details */}
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-tm-muted flex items-center gap-1.5">
                                    <Sliders className="w-3 h-3" />
                                    Min Confidence
                                </span>
                                <span className="font-mono">
                                    {activeProfile.minConfidence}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-tm-muted flex items-center gap-1.5">
                                    <DollarSign className="w-3 h-3" />
                                    Max Capital / Trade
                                </span>
                                <span className="font-mono">
                                    ${activeProfile.maxCapital.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-tm-muted">Max Contracts</span>
                                <span className="font-mono">
                                    {activeProfile.maxContracts}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-tm-muted">Max Positions</span>
                                <span className="font-mono">
                                    {activeProfile.maxPositions}
                                </span>
                            </div>
                        </div>

                        {/* Theta-specific: Defensive Exits */}
                        {showDefensiveExits && (
                            <div className="pt-2 border-t border-white/5">
                                <p className="text-xs font-semibold text-tm-muted mb-2 uppercase tracking-wider">
                                    Trailing Defense Exits
                                </p>
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-tm-muted">
                                            Breach Threshold
                                        </span>
                                        <span className="font-mono text-yellow-400">
                                            {activeProfile.breachThresholdPct}% below strike
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tm-muted">Confirmation</span>
                                        <span className="font-mono">
                                            {activeProfile.breachConfirmationDays} days
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tm-muted">DTE Exit</span>
                                        <span className="font-mono">
                                            {activeProfile.dteExitThreshold} days
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tm-muted">Max Loss</span>
                                        <span className="font-mono text-red-400">
                                            -{activeProfile.maxLossPct}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-tm-muted">
                                            VIX Block Trading
                                        </span>
                                        <span className="font-mono">
                                            &gt;{activeProfile.vixBlockTrading}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
