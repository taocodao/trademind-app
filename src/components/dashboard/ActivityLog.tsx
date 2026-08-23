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

type ActivityItem = TradeMindActivity & { _sortDate: number };

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

export function ActivityLog({ limit = 20 }: { limit?: number }) {
    const [items, setItems] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            // Fetch TradeMind signal executions
            const tmRes = await fetch(`/api/activity?limit=${limit}`);
            const tmData = tmRes.ok ? await tmRes.json() : { activities: [] };

            // Activity records are kept in TradeMind's account-centric ledger.
            const tmItems: ActivityItem[] = (tmData.activities || []).map((a: TradeMindActivity) => ({
                ...a,
                _sortDate: new Date(a.created_at).getTime(),
            }));
            setItems(tmItems.sort((a, b) => b._sortDate - a._sortDate).slice(0, limit));
        } catch (e) {
            console.error('Failed to load activity', e);
        } finally {
            setLoading(false);
        }
    }, [limit]);

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
                        const tmItem = item as TradeMindActivity;

                        return (
                            <div
                                key={`${item.source}-${item.id}`}
                                className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0"
                            >
                                <div className="flex items-center gap-3">
                                    {tmItem.status === 'executed' ? (
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
                                        </p>
                                        <p className="text-xs text-tm-muted">
                                            {tmItem.status === 'executed'
                                                ? `Order #${tmItem.order_id}`
                                                : tmItem.status}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-tm-muted whitespace-nowrap">
                                    {getRelativeTime(tmItem.created_at)}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
