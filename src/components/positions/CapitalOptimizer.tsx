'use client';

interface Position {
    id: string;
    symbol: string;
    strategy: string;
    type?: string;
    short_strike?: number;
    long_strike?: number;
    strike?: number;
    expiry: string;
    quantity: number;
    entry_debit: number;
    current_value?: number;
    unrealized_pnl?: number;
    status: string;
    created_at: string;
}

interface AccountBalance {
    cashAvailable: number;
    buyingPower: number;
    netLiquidation: number;
}

interface CapitalOptimizerProps {
    balance: AccountBalance | null;
    positions: Position[];
}

export function CapitalOptimizer({ balance, positions }: CapitalOptimizerProps) {
    if (!balance) return null;

    // Calculate current allocation by strategy
    const thetaPositions = positions.filter(p =>
        p.strategy?.toLowerCase().includes('theta') ||
        p.strategy?.toLowerCase().includes('put')
    );
    const calendarPositions = positions.filter(p =>
        p.strategy?.toLowerCase().includes('calendar')
    );

    // Theta capital = short_strike/strike × 100 × quantity (collateral required)
    const thetaCapitalUsed = thetaPositions.reduce((sum, p) =>
        sum + ((p.strike || p.short_strike || 0) * 100 * (Math.abs(p.quantity) || 1)), 0
    );

    // Calendar capital = entry debit × 100 × quantity
    const calendarCapitalUsed = calendarPositions.reduce((sum, p) =>
        sum + (Math.abs(p.entry_debit || 0) * 100 * (p.quantity || 1)), 0
    );

    // Optimal allocation based on backtests
    const totalCapital = balance.netLiquidation;
    const optimalThetaPct = 0.30; // 30% for theta
    const optimalCalendarPct = 0.15; // 15% for calendar

    const optimalThetaCapital = totalCapital * optimalThetaPct;
    const optimalCalendarCapital = totalCapital * optimalCalendarPct;

    // Room for more positions
    const thetaRoom = Math.max(0, optimalThetaCapital - thetaCapitalUsed);
    const calendarRoom = Math.max(0, optimalCalendarCapital - calendarCapitalUsed);

    // Average position sizes (based on typical SPY trades)
    const avgThetaCapital = 57500; // SPY put at ~$575
    const avgCalendarDebit = 28500; // ~$285 × 100

    const maxNewThetaPositions = Math.floor(thetaRoom / avgThetaCapital);
    const maxNewCalendarPositions = Math.floor(calendarRoom / avgCalendarDebit);

    // Utilization percentages
    const thetaUtilization = optimalThetaCapital > 0
        ? Math.min((thetaCapitalUsed / optimalThetaCapital) * 100, 100)
        : 0;
    const calendarUtilization = optimalCalendarCapital > 0
        ? Math.min((calendarCapitalUsed / optimalCalendarCapital) * 100, 100)
        : 0;

    return (
        <div className="glass-card p-5 mb-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                📊 Capital Optimizer
            </h3>

            {/* Allocation Bars */}
            <div className="space-y-4 mb-5">
                {/* Theta Allocation */}
                <div>
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">Theta Sprint</span>
                        <span className="text-tm-muted">
                            ${thetaCapitalUsed.toLocaleString()} / ${optimalThetaCapital.toLocaleString()}
                        </span>
                    </div>
                    <div className="w-full bg-tm-surface rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-tm-purple to-tm-purple/70 h-full rounded-full transition-all duration-500"
                            style={{ width: `${thetaUtilization}%` }}
                        />
                    </div>
                </div>

                {/* Calendar Allocation */}
                <div>
                    <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium">Calendar Spreads</span>
                        <span className="text-tm-muted">
                            ${calendarCapitalUsed.toLocaleString()} / ${optimalCalendarCapital.toLocaleString()}
                        </span>
                    </div>
                    <div className="w-full bg-tm-surface rounded-full h-2.5 overflow-hidden">
                        <div
                            className="bg-gradient-to-r from-tm-green to-tm-green/70 h-full rounded-full transition-all duration-500"
                            style={{ width: `${calendarUtilization}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="bg-tm-surface/50 rounded-xl p-4 space-y-2">
                <p className="font-semibold text-sm mb-2">💡 Recommendations</p>

                {maxNewThetaPositions > 0 && (
                    <p className="text-sm flex items-center gap-2">
                        <span className="text-tm-green">✓</span>
                        Can add <span className="font-bold text-tm-green">{maxNewThetaPositions}</span> more Theta position{maxNewThetaPositions > 1 ? 's' : ''}
                    </p>
                )}

                {maxNewCalendarPositions > 0 && (
                    <p className="text-sm flex items-center gap-2">
                        <span className="text-tm-green">✓</span>
                        Can add <span className="font-bold text-tm-green">{maxNewCalendarPositions}</span> more Calendar spread{maxNewCalendarPositions > 1 ? 's' : ''}
                    </p>
                )}

                {maxNewThetaPositions === 0 && maxNewCalendarPositions === 0 && (
                    <p className="text-sm text-tm-muted flex items-center gap-2">
                        <span>⚠️</span>
                        At optimal allocation - monitor positions for exits
                    </p>
                )}

                {/* Idle Capital Warning */}
                {(thetaUtilization < 50 && calendarUtilization < 50) && (
                    <p className="text-sm text-amber-400 flex items-center gap-2 mt-2">
                        <span>💰</span>
                        Capital underutilized - consider opening new positions
                    </p>
                )}
            </div>
        </div>
    );
}
