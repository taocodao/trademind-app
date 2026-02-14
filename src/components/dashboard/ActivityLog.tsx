'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';


interface ActivityItem {
    id: number;
    signal_id: string;
    status: string;
    order_id: string | null;
    created_at: string;
    symbol?: string; // Enriched on fetch
    strategy?: string;
    source?: string; // 'manual' | 'auto'
}

// Helper for relative time
function getRelativeTime(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export function ActivityLog({ limit = 5 }: { limit?: number }) {
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchActivity = async () => {
            try {
                const res = await fetch(`/api/activity?limit=${limit}`);
                if (res.ok) {
                    const data = await res.json();
                    setActivities(data.activities);
                }
            } catch (e) {
                console.error('Failed to load activity', e);
            } finally {
                setLoading(false);
            }
        };

        fetchActivity();
        const interval = setInterval(fetchActivity, 10000); // 10s refresh
        return () => clearInterval(interval);
    }, [limit]);

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
            <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-tm-purple" />
                <h3 className="font-bold text-lg">Recent Activity</h3>
            </div>

            <div className="space-y-4">
                {activities.length === 0 ? (
                    <p className="text-tm-muted text-sm text-center py-4">No recent activity</p>
                ) : (
                    activities.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                {item.status === 'executed' ? (
                                    <CheckCircle className="w-4 h-4 text-tm-green" />
                                ) : item.status === 'failed' ? (
                                    <XCircle className="w-4 h-4 text-tm-red" />
                                ) : (
                                    <Clock className="w-4 h-4 text-tm-muted" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {item.status === 'executed' ? 'Trade Executed' : 'Execution Failed'}
                                    </p>
                                    <p className="text-xs text-tm-muted flex items-center gap-1">
                                        {item.symbol && <span className="text-white font-mono">{item.symbol}</span>}
                                        {item.source === 'auto_approve' && (
                                            <span className="bg-tm-purple/20 text-tm-purple px-1.5 rounded text-[10px]">AUTO</span>
                                        )}
                                        {item.order_id && <span>#{item.order_id}</span>}
                                    </p>
                                </div>
                            </div>
                            <span className="text-xs text-tm-muted whitespace-nowrap">
                                {getRelativeTime(item.created_at)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
