// Standardized Risk Management Service
// ====================================

export interface RiskParameters {
    profit_target_percent: number;  // e.g., 50%
    trailing_stop_percent: number;  // e.g., 30%
    trailing_activation_percent: number;  // When to activate trailing (default: same as profit target)
    max_hold_days: number;          // e.g., 21
    stop_loss_percent?: number;     // Optional hard stop
}

export interface Position {
    signal_id: string;
    strategy: string;
    symbol: string;
    entry_price: number;
    current_price: number;
    unrealized_pnl_percent: number;
    days_held: number;
    peak_pnl_percent: number;
    trailing_active: boolean;
    entry_date: string;
}

export interface ExitDecision {
    should_exit: boolean;
    reason?: 'profit_target' | 'trailing_stop' | 'max_hold_time' | 'stop_loss';
    message?: string;
}

export class RiskManagementService {
    /**
     * Get default risk parameters for a strategy
     */
    static getDefaultRiskParams(strategy: string): RiskParameters {
        switch (strategy) {
            case 'theta':
                return {
                    profit_target_percent: 50,
                    trailing_stop_percent: 30,
                    trailing_activation_percent: 50,
                    max_hold_days: 21
                };
            case 'calendar':
                return {
                    profit_target_percent: 35,
                    trailing_stop_percent: 25,
                    trailing_activation_percent: 35,
                    max_hold_days: 14
                };
            default:
                return {
                    profit_target_percent: 50,
                    trailing_stop_percent: 30,
                    trailing_activation_percent: 50,
                    max_hold_days: 21
                };
        }
    }

    /**
     * Check if position should be exited based on risk rules
     */
    static shouldExit(
        position: Position,
        riskParams: RiskParameters
    ): ExitDecision {
        // Time-based exit
        if (position.days_held >= riskParams.max_hold_days) {
            return {
                should_exit: true,
                reason: 'max_hold_time',
                message: `Held for ${position.days_held} days (max: ${riskParams.max_hold_days})`
            };
        }

        // Trailing stop exit
        if (position.trailing_active && position.peak_pnl_percent > 0) {
            const retracement = position.peak_pnl_percent - position.unrealized_pnl_percent;
            const retracement_percent = (retracement / position.peak_pnl_percent) * 100;

            if (retracement_percent >= riskParams.trailing_stop_percent) {
                return {
                    should_exit: true,
                    reason: 'trailing_stop',
                    message: `Retraced ${retracement_percent.toFixed(1)}% from peak ${position.peak_pnl_percent.toFixed(1)}%`
                };
            }
        }

        // Stop loss exit (if configured)
        if (riskParams.stop_loss_percent &&
            position.unrealized_pnl_percent <= -riskParams.stop_loss_percent) {
            return {
                should_exit: true,
                reason: 'stop_loss',
                message: `Loss exceeded ${riskParams.stop_loss_percent}%`
            };
        }

        return { should_exit: false };
    }

    /**
     * Update position with new price and check trailing activation
     */
    static updatePosition(
        position: Position,
        current_price: number,
        riskParams: RiskParameters
    ): Position {
        // Calculate P&L (for sold options, profit when price drops)
        const unrealized_pnl_percent =
            ((position.entry_price - current_price) / position.entry_price) * 100;

        // Update peak
        const peak_pnl_percent = Math.max(position.peak_pnl_percent, unrealized_pnl_percent);

        // Activate trailing if profit target reached
        const trailing_active = position.trailing_active ||
            unrealized_pnl_percent >= riskParams.trailing_activation_percent;

        // Calculate days held
        const entry = new Date(position.entry_date);
        const now = new Date();
        const days_held = Math.floor((now.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24));

        return {
            ...position,
            current_price,
            unrealized_pnl_percent,
            peak_pnl_percent,
            trailing_active,
            days_held
        };
    }

    /**
     * Get risk parameters customized by user preferences
     */
    static getCustomRiskParams(
        strategy: string,
        userPreferences?: Partial<RiskParameters>
    ): RiskParameters {
        const defaults = this.getDefaultRiskParams(strategy);
        return { ...defaults, ...userPreferences };
    }
}
