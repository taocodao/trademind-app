// Unified Signal Types for All Trading Strategies
// ================================================

// Base signal interface - all strategies extend this
export interface BaseSignal {
    id: string;
    strategy: 'theta' | 'calendar' | 'diagonal' | 'iron_condor' | 'butterfly';
    symbol: string;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'filled' | 'cancelled';
    created_at: string;
    expires_at?: string;

    // Common metrics
    confidence: number;  // 0-100 score
    risk_level: 'low' | 'medium' | 'high';
    capital_required: number;
    expected_return: number;
    return_percent: number;
}

// Theta-specific signal (cash-secured puts)
export interface ThetaSignal extends BaseSignal {
    strategy: 'theta';
    strike: number;
    expiration: string;  // YYYY-MM-DD
    dte: number;  // Days to expiration

    // Pricing
    entry_price: number;  // Bid price we're selling at
    ask: number;
    mid: number;

    // Greeks
    delta: number;
    theta: number;
    vega: number;
    iv: number;  // Implied volatility (as percentage)

    // Position
    contracts: number;
    total_premium: number;
    probability_otm: number;  // Probability of expiring OTM
}

// Diagonal spread signal (unified: PMCC/PMCP + Calendar)
// Replaces the old CalendarSignal - supports both directional and neutral modes
export interface DiagonalSignal extends BaseSignal {
    strategy: 'diagonal' | 'calendar';  // 'calendar' for backward compatibility

    // Long leg (back month)
    long_strike: number;
    long_expiry: string;   // Long leg expiration
    long_dte: number;
    long_price: number;

    // Short leg (front month)
    short_strike: number;
    short_expiry: string;  // Short leg expiration (same as front_expiry)
    short_dte: number;
    short_price: number;

    // Backward compatibility aliases
    strike?: number;        // = short_strike (for neutral/calendar mode)
    front_expiry?: string;  // = short_expiry
    back_expiry?: string;   // = long_expiry

    // Pricing
    cost: number;           // Net debit
    net_debit?: number;     // Same as cost
    max_profit: number;
    max_loss: number;
    break_even: number;
    potential_return: number;

    // Metrics
    theta_edge?: number;   // Daily theta advantage
    iv: number;
    score: number;         // Scanner score

    // Direction (differentiates PMCC/PMCP from neutral calendar)
    direction?: 'bullish' | 'bearish' | 'neutral';
    option_type?: 'C' | 'P';

    // Rolling
    days_until_roll?: number;
    roll_action?: 'HOLD' | 'ROLL_SOON';

    // Position
    contracts: number;
    total_risk: number;
}

// Legacy alias for backward compatibility
export type CalendarSignal = DiagonalSignal;

// Union type for all signals
export type Signal = ThetaSignal | DiagonalSignal;

// Type guards
export function isThetaSignal(signal: Signal): signal is ThetaSignal {
    return signal.strategy === 'theta';
}

export function isDiagonalSignal(signal: Signal): signal is DiagonalSignal {
    return signal.strategy === 'diagonal' || signal.strategy === 'calendar';
}

// Legacy alias for backward compatibility
export function isCalendarSignal(signal: Signal): signal is DiagonalSignal {
    return isDiagonalSignal(signal);
}
