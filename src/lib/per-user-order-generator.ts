/**
 * Compatibility type exports for the protected signal-email module.
 * Order generation is account scoped in account-executor.
 */
export type {
    SignalLeg,
    GenericSignal,
    DeltaOrder,
    OptionsOrder,
    AccountOrders as UserOrders,
} from '@/lib/signal-orders';

export interface OptionsIntent {
    mode: 'A' | 'B' | 'C' | 'D2' | 'D3' | 'NO_ACTION';
    type: 'CSP' | 'ZEBRA' | 'CCS' | 'SQQQ' | null;
    underlying: string;
    delta?: number;
    dte?: number;
    qqq_px?: number;
    qqqm_px?: number;
    tqqq_px?: number;
    sqqq_px?: number;
    iv_short?: number;
    iv_tqqq?: number;
    rf?: number;
    vix?: number;
    vix_vix3m?: number;
}
