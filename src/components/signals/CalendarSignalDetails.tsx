'use client';

import { CalendarSignal } from '@/types/signals';

interface CalendarSignalDetailsProps {
    signal: CalendarSignal;
}

export function CalendarSignalDetails({ signal }: CalendarSignalDetailsProps) {
    return (
        <div className="space-y-3">
            {/* Expiration Spread */}
            <div className="flex justify-between text-sm">
                <div>
                    <span className="text-gray-600">Front Leg:</span>
                    <span className="ml-2 font-semibold">{signal.front_expiry}</span>
                </div>
                <div>
                    <span className="text-gray-600">Back Leg:</span>
                    <span className="ml-2 font-semibold">{signal.back_expiry}</span>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">Strike</p>
                    <p className="font-semibold">${signal.strike}</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">Theta Edge</p>
                    <p className="font-semibold">${signal.theta_edge.toFixed(2)}/day</p>
                </div>
                <div className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600 text-xs">IV</p>
                    <p className="font-semibold">{signal.iv.toFixed(1)}%</p>
                </div>
            </div>

            {/* Cost */}
            <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                <div>
                    <span className="text-gray-700">Cost:</span>
                    <span className="ml-2 font-semibold text-blue-700">${signal.cost.toFixed(0)}</span>
                </div>
                <div>
                    <span className="text-gray-700">Target Return:</span>
                    <span className="ml-2 font-semibold text-green-700">${signal.potential_return.toFixed(0)}</span>
                </div>
                <div>
                    <span className="text-gray-700">Score:</span>
                    <span className="ml-2 font-semibold">{signal.score.toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
}
