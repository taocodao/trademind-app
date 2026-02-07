// Position type definition for use across components
export interface Position {
    id: string;
    symbol: string;
    strategy: string;
    strike: number;
    front_expiry: string;
    back_expiry?: string;
    quantity: number;
    entry_debit: number;
    current_value?: number;
    unrealized_pnl?: number;
    direction?: string;
    status: string;
    created_at: string;
    trailing_config?: TrailingConfig;
}

export interface TrailingConfig {
    enabled: boolean;
    profitTarget: number;
    stopLoss: number;
    trailTrigger: number;
    trailDistance: number;
}

export interface AccountBalance {
    cashAvailable: number;
    buyingPower: number;
    netLiquidation: number;
    marginUsed: number;
}
