'use client';

import { ThetaSignal } from '@/types/signals';

interface ThetaSignalDetailsProps {
    signal: ThetaSignal;
}

export function ThetaSignalDetails({ signal }: ThetaSignalDetailsProps) {
    return (
        <div className="space-y-3">
            {/* Primary Info */}
            <div className="flex justify-between text-sm">
                <div>
                    <span className="text-gray-600">Strike:</span>
                    <span className="ml-2 font-semibold">${signal.strike}</span>
                </div>
                <div>
                    <span className="text-gray-600">Expiration:</span>
                    <span className="ml-2 font-semibold">{signal.expiration} ({signal.dte}  DTE)</span>
                </div>
            </div>

            {/* Greeks Grid */}
            <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">Delta</p>
                    <p className="font-semibold">{signal.delta.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">Theta</p>
                    <p className="font-semibold">${signal.theta.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">IV</p>
                    <p className="font-semibold">{signal.iv.toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">Prob OTM</p>
                    <p className="font-semibold">{signal.probability_otm.toFixed(0)}%</p>
                </div>
            </div>

            {/* Pricing */}
            <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                <div>
                    <span className="text-gray-700">Entry Price:</span>
                    <span className="ml-2 font-semibold text-blue-700">${signal.entry_price.toFixed(2)}</span>
                </div>
                <div>
                    <span className="text-gray-700">Contracts:</span>
                    <span className="ml-2 font-semibold text-blue-700">{signal.contracts}</span>
                </div>
                <div>
                    <span className="text-gray-700">Total Premium:</span>
                    <span className="ml-2 font-semibold text-green-700">${signal.total_premium.toFixed(0)}</span>
                </div>
            </div>
        </div>
    );
}
