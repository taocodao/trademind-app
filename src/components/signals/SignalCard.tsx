'use client';

import { Signal, isThetaSignal, isDiagonalSignal } from '@/types/signals';
import { ThetaSignalDetails } from './ThetaSignalDetails';
import { DiagonalSignalDetails } from './DiagonalSignalDetails';

interface SignalCardProps {
    signal: Signal;
    onApprove: (signal: Signal) => void;
    onReject: (signal: Signal) => void;
    loading?: boolean;
}

export function SignalCard({ signal, onApprove, onReject, loading }: SignalCardProps) {
    const getRiskLevelColor = (level: string) => {
        switch (level) {
            case 'low': return 'text-green-600 bg-green-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'high': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getStatusBadge = (status: Signal['status']) => {
        switch (status) {
            case 'approved':
            case 'executed':
            case 'filled':
                return <span className="text-green-600 font-medium">✅ {status}</span>;
            case 'rejected':
                return <span className="text-red-600 font-medium">❌ Rejected</span>;
            case 'cancelled':
                return <span className="text-gray-600 font-medium">⊘ Cancelled</span>;
            default:
                return <span className="text-blue-600 font-medium">⏳ Pending</span>;
        }
    };

    return (
        <div className="border rounded-lg p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{signal.symbol}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 capitalize">{signal.strategy}</span>
                        <span className={`text-xs px-2 py-1 rounded capitalize ${getRiskLevelColor(signal.risk_level)}`}>
                            {signal.risk_level} Risk
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-green-600 font-bold text-xl">
                        +${signal.expected_return.toFixed(0)}
                    </p>
                    <p className="text-sm text-gray-500">
                        ({signal.return_percent.toFixed(1)}% return)
                    </p>
                </div>
            </div>

            {/* Strategy-Specific Details */}
            {isThetaSignal(signal) && <ThetaSignalDetails signal={signal} />}
            {isDiagonalSignal(signal) && <DiagonalSignalDetails signal={signal} />}

            {/* Common Metrics */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t">
                <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600 text-xs">Confidence Score</p>
                    <p className="font-bold text-lg">{signal.confidence}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                    <p className="text-gray-600 text-xs">Capital Required</p>
                    <p className="font-bold text-lg">${signal.capital_required.toLocaleString()}</p>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
                {signal.status === 'pending' && (
                    <>
                        <button
                            onClick={() => onApprove(signal)}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Executing...' : 'Approve & Execute'}
                        </button>
                        <button
                            onClick={() => onReject(signal)}
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                        >
                            Reject
                        </button>
                    </>
                )}
                {signal.status !== 'pending' && (
                    <div className="flex-1 text-center py-2">
                        {getStatusBadge(signal.status)}
                    </div>
                )}
            </div>

            {/* Timestamp & Auto-Approve */}
            <div className="mt-4 pt-3 flex justify-between items-center text-xs text-gray-500 border-t">
                <div>
                    Generated: {new Date(signal.created_at || (signal as any).createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ET
                </div>
                {(signal as any).autoApproved && (
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded border border-purple-200 font-medium">
                        🤖 Auto-Approved
                    </span>
                )}
            </div>
        </div>
    );
}
