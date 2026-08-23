/**
 * Compatibility type export for the protected signal-email module.
 * Position exits are now recorded in the account activity ledger.
 */
export interface CloseLeg {
    action: 'Buy to Close' | 'Sell to Close' | 'Sell';
    symbol: string;
    quantity: number;
    instrumentType: 'Equity Option' | 'Equity';
    instruction: string;
    reason: string;
}
