/**
 * Shared account-signal order types.
 *
 * These types describe broker-neutral instructions generated for named
 * accounts. They deliberately carry no login-level virtual-account state.
 */

export interface SignalLeg {
    symbol: string;
    target_pct: number;
    leg_type: 'equity' | 'options';
}

export interface GenericSignal {
    id: string;
    strategy: string;
    regime?: string;
    confidence?: number;
    rationale?: string;
    legs: SignalLeg[];
    type?: string;
    contracts?: number;
    cost?: number;
    symbol?: string;
    action?: string;
    strike?: number;
    expiry?: string;
    entry_px?: number;
    exit_px?: number;
    [key: string]: unknown;
}

export interface DeltaOrder {
    symbol: string;
    action: 'buy' | 'sell';
    quantity: number;
    price: number;
    instruction: string;
}

export interface OptionsOrder {
    action: 'Buy to Open' | 'Sell to Open' | 'Buy to Close' | 'Sell to Close' | 'Buy' | 'Sell';
    symbol: string;
    quantity: number;
    limitPrice: number;
    instrumentType: 'Equity Option' | 'Equity';
    priceEffect: 'Debit' | 'Credit';
    instruction: string;
}

export interface AccountOrders {
    equityOrders: DeltaOrder[];
    optionsOrders: OptionsOrder[];
    virtualNlv: number;
    cashBalance: number;
    skipOptions: boolean;
    skipReason?: string;
}
