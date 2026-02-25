'use client';

import { useEffect, useState, useCallback } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Loader2, Trash2, RefreshCw } from 'lucide-react';

interface TradeMindActivity {
    id: number;
    signal_id: string;
    status: string;
    order_id: string | null;
    created_at: string;
    symbol?: string | null;
    strategy?: string | null;
    source: 'trademind';
}

interface TastytradeTransaction {
    id: string;
    source: 'tastytrade';
    symbol: string;
    description: string;
    action: string;
    quantity: number;
    price: number;
    value: number;
    executed_at: string;
    order_id: string;
    strategy: string;
}

type ActivityItem = (TradeMindActivity | TastytradeTransaction) & { _sortDate: number };

function getRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function strategyBadge(strategy: string | null | undefined) {
    if (!strategy) return null;
    const colors: Record<string, string> = {
        diagonal: 'bg-purple-500/20 text-purple-300',
        tqqq: 'bg-purple-500/20 text-purple-300',
        theta: 'bg-blue-500/20 text-blue-300',
        calendar: 'bg-green-500/20 text-green-300',
        manual: 'bg-gray-500/20 text-gray-300',
    };
    const color = colors[strategy.toLowerCase()] || 'bg-gray-500/20 text-gray-300';
    return (
        <span className={`px-1.5 rounded text-[10px] font-mono uppercase ${color}`}>
            {strategy}
        </span>
    );
}

export function ActivityLog({ limit = 20, accountNumber }: { limit?: number; accountNumber?: string }) {
    const [items, setItems] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            // Fetch TradeMind signal executions
            const tmRes = await fetch(`/api/activity?limit=${limit}`);
            const tmData = tmRes.ok ? await tmRes.json() : { activities: [] };

            // Fetch real Tastytrade transactions (if account number available)
            let ttTransactions: TastytradeTransaction[] = [];
            if (accountNumber) {
                const ttRes = await fetch(`/api/tastytrade/transactions?accountNumber=${accountNumber}`);
                if (ttRes.ok) {
                    const ttData = await ttRes.json();
                    ttTransactions = ttData.transactions || [];
                }
            }

            // Merge and sort by date
            const tmItems: ActivityItem[] = (tmData.activities || []).map((a: TradeMindActivity) => ({
                ...a,
                _sortDate: new Date(a.created_at).getTime(),
            }));
            const ttItems: ActivityItem[] = ttTransactions.map((t: TastytradeTransaction) => ({
                ...t,
                _sortDate: new Date(t.executed_at).getTime(),
            }));

            const merged = [...tmItems, ...ttItems].sort((a, b) => b._sortDate - a._sortDate);
            setItems(merged.slice(0, limit));
        } catch (e) {
            console.error('Failed to load activity', e);
        } finally {
            setLoading(false);
        }
    }, [limit, accountNumber]);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 30000); // 30s refresh
        return () => clearInterval(interval);
    }, [fetchAll]);

    const clearStale = async () => {
        setClearing(true);
        try {
            await fetch('/api/activity?mode=failed', { method: 'DELETE' });
            await fetchAll();
        } finally {
            setClearing(false);
        }
    };

    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-6 w-1/3 bg-tm-surface mb-4 rounded" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-10 bg-tm-surface rounded" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-tm-purple" />
                    <h3 className="font-bold text-lg">Recent Activity</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={fetchAll}
                        className="text-xs text-tm-muted hover:text-white transition flex items-center gap-1"
                        title="Refresh"
                    >
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    <button
                        onClick={clearStale}
                        disabled={clearing}
                        className="text-xs text-tm-muted hover:text-red-400 transition flex items-center gap-1"
                        title="Clear failed/old entries"
                    >
                        {clearing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Clear stale
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {items.length === 0 ? (
                    <p className="text-tm-muted text-sm text-center py-4">No recent activity</p>
                ) : (
                    items.map((item) => {
                        const isTT = item.source === 'tastytrade';
                        const ttItem = item as TastytradeTransaction;
                        const tmItem = item as TradeMindActivity;

                        return (
                            <div
                                key={`${item.source}-${item.id}`}
                                className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0"
                            >
                                <div className="flex items-center gap-3">
                                    {isTT ? (
                                        <CheckCircle className="w-4 h-4 text-tm-green shrink-0" />
                                    ) : tmItem.status === 'executed' ? (
                                        <CheckCircle className="w-4 h-4 text-tm-green shrink-0" />
                                    ) : tmItem.status === 'failed' ? (
                                        <XCircle className="w-4 h-4 text-tm-red shrink-0" />
                                    ) : (
                                        <Clock className="w-4 h-4 text-tm-muted shrink-0" />
                                    )}
                                    <div>
                                        <p className="font-medium flex items-center gap-1.5">
                                            {item.symbol && (
                                                <span className="text-white font-mono">{item.symbol}</span>
                                            )}
                                            {strategyBadge(item.strategy)}
                                            {isTT && (
                                                <span className="bg-emerald-500/20 text-emerald-400 px-1.5 rounded text-[10px]">
                                                    LIVE
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-tm-muted">
                                            {isTT
                                                ? `${ttItem.action} ${ttItem.quantity} @ $${ttItem.price?.toFixed(2)}`
                                                : tmItem.status === 'executed'
                                                    ? `Order #${tmItem.order_id}`
                                                    : tmItem.status}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-tm-muted whitespace-nowrap">
                                    {getRelativeTime(isTT ? ttItem.executed_at : tmItem.created_at)}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
