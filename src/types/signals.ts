// Unified Signal Types for All Trading Strategies
// ================================================

// Base signal interface - all strategies extend this
export interface BaseSignal {
    id: string;
    strategy: 'theta' | 'calendar' | 'iron_condor' | 'butterfly';
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

// Calendar spread signal
export interface CalendarSignal extends BaseSignal {
    strategy: 'calendar';
    strike: number;
    front_expiry: string;  // Short leg expiration
    back_expiry: string;   // Long leg expiration

    // Pricing
    cost: number;  // Net debit
    potential_return: number;

    // Metrics
    theta_edge: number;  // Daily theta advantage
    iv: number;
    score: number;  // Scanner score
}

// Union type for all signals
export type Signal = ThetaSignal | CalendarSignal;

// Type guards
export function isThetaSignal(signal: Signal): signal is ThetaSignal {
    return signal.strategy === 'theta';
}

export function isCalendarSignal(signal: Signal): signal is CalendarSignal {
    return signal.strategy === 'calendar';
}
