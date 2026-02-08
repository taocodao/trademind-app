'use client';

import { DiagonalSignal } from '@/types/signals';

interface DiagonalSignalDetailsProps {
    signal: DiagonalSignal;
}

export function DiagonalSignalDetails({ signal }: DiagonalSignalDetailsProps) {
    // Determine if this is a directional (PMCC/PMCP) or neutral (calendar-like) trade
    const isDirectional = signal.direction && signal.direction !== 'neutral';
    const strategyLabel = isDirectional
        ? (signal.direction === 'bullish' ? 'PMCC' : 'PMCP')
        : 'Calendar';

    return (
        <div className="space-y-3">
            {/* Strategy Type Badge */}
            <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${signal.direction === 'bullish' ? 'bg-green-100 text-green-800' :
                        signal.direction === 'bearish' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                    }`}>
                    {strategyLabel}
                </span>
                {signal.option_type && (
                    <span className="text-xs text-gray-500">
                        {signal.option_type === 'C' ? 'Calls' : 'Puts'}
                    </span>
                )}
            </div>

            {/* Legs Display */}
            <div className="flex justify-between text-sm">
                <div>
                    <span className="text-gray-600">Short Leg:</span>
                    <span className="ml-2 font-semibold">
                        ${signal.short_strike || signal.strike} @ {signal.short_expiry || signal.front_expiry}
                    </span>
                </div>
                <div>
                    <span className="text-gray-600">Long Leg:</span>
                    <span className="ml-2 font-semibold">
                        ${signal.long_strike || signal.strike} @ {signal.long_expiry || signal.back_expiry}
                    </span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">Max Profit</p>
                    <p className="font-semibold text-green-600">
                        ${signal.max_profit?.toFixed(0) || signal.potential_return?.toFixed(0) || '—'}
                    </p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">Max Loss</p>
                    <p className="font-semibold text-red-600">
                        ${signal.max_loss?.toFixed(0) || signal.cost?.toFixed(0) || '—'}
                    </p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">IV</p>
                    <p className="font-semibold">{signal.iv?.toFixed(1) || '—'}%</p>
                </div>
            </div>

            {/* Cost & Roll Info */}
            <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                <div>
                    <span className="text-gray-700">Net Debit:</span>
                    <span className="ml-2 font-semibold text-blue-700">
                        ${signal.net_debit?.toFixed(2) || signal.cost?.toFixed(2)}
                    </span>
                </div>
                {signal.days_until_roll !== undefined && (
                    <div>
                        <span className="text-gray-700">Roll in:</span>
                        <span className={`ml-2 font-semibold ${signal.roll_action === 'ROLL_SOON' ? 'text-orange-600' : 'text-gray-700'
                            }`}>
                            {signal.days_until_roll}d
                        </span>
                    </div>
                )}
                <div>
                    <span className="text-gray-700">Score:</span>
                    <span className="ml-2 font-semibold">{signal.score?.toFixed(1) || '—'}</span>
                </div>
            </div>
        </div>
    );
}

// Legacy export for backward compatibility
export { DiagonalSignalDetails as CalendarSignalDetails };
