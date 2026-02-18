"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    ArrowLeft,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Shield,
    Calendar,
    Search
} from "lucide-react";
import Link from "next/link";


interface ActivityItem {
    id: number;
    signal_id: string;
    status: string;
    order_id: string | null;
    created_at: string;
    approved_at?: string;
    executed_at?: string;
    error_message?: string;
    symbol?: string;
    strategy?: string;
    source?: string;
}

export default function ActivityPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        if (ready && !authenticated) {
            router.push("/");
        }
    }, [ready, authenticated, router]);

    useEffect(() => {
        fetchActivity();
        const interval = setInterval(fetchActivity, 15000); // 15s refresh
        return () => clearInterval(interval);
    }, []);

    const fetchActivity = async () => {
        try {
            const res = await fetch('/api/activity?limit=50');
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

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'executed': return 'text-tm-green';
            case 'approved': return 'text-blue-400';
            case 'failed': return 'text-tm-red';
            case 'rejected': return 'text-tm-red';
            default: return 'text-tm-muted';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'executed': return <CheckCircle className="w-5 h-5 text-tm-green" />;
            case 'approved': return <Clock className="w-5 h-5 text-blue-400" />;
            case 'failed': return <XCircle className="w-5 h-5 text-tm-red" />;
            case 'rejected': return <XCircle className="w-5 h-5 text-tm-red" />;
            default: return <Activity className="w-5 h-5 text-tm-muted" />;
        }
    };

    const filteredActivities = activities.filter(item =>
        item.symbol?.toLowerCase().includes(filter.toLowerCase()) ||
        item.strategy?.toLowerCase().includes(filter.toLowerCase()) ||
        item.status.toLowerCase().includes(filter.toLowerCase())
    );

    if (!ready || !authenticated) {
        return (
            <main className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-tm-purple/30" />
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen pb-6">
            <header className="px-6 pt-12 pb-6 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Activity Log</h1>
                    <p className="text-sm text-tm-muted">Track all trade lifecycle events</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-tm-purple" />
                </div>
            </header>

            <div className="px-6 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tm-muted" />
                    <input
                        placeholder="Filter by symbol, strategy or status..."
                        className="pl-9 h-10 w-full rounded-md border border-white/5 bg-tm-surface px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={filter}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className="px-6 space-y-4">
                {activities.length === 0 && !loading ? (
                    <div className="text-center py-12 glass-card">
                        <Activity className="w-12 h-12 text-tm-muted mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No activity recorded</h3>
                        <p className="text-tm-muted">Trades and signals will appear here.</p>
                    </div>
                ) : (
                    filteredActivities.map((item) => (
                        <div key={item.id} className="glass-card p-5 hover:bg-tm-surface/50 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg bg-white/5 ${getStatusColor(item.status)}`}>
                                        {getStatusIcon(item.status)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">{item.symbol || 'UNKNOWN'}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 uppercase tracking-wider font-mono`}>
                                                {item.strategy || 'SIGNAL'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-tm-muted capitalize">
                                            {item.status.replace('_', ' ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-sm font-bold text-tm-muted">#{item.id}</p>
                                    {item.order_id && (
                                        <p className="text-xs text-tm-green">Order: {item.order_id}</p>
                                    )}
                                </div>
                            </div>

                            {/* Timeline of Events */}
                            <div className="bg-tm-surface/50 rounded-xl p-4 text-sm space-y-3 relative overflow-hidden">
                                {/* Vertical connector line */}
                                <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-white/10" />

                                <div className="flex items-center gap-3 relative z-10">
                                    <div className="w-2 h-2 rounded-full bg-tm-purple ring-4 ring-tm-surface" />
                                    <div className="flex-1 flex justify-between">
                                        <span className="text-tm-muted">Signal Received</span>
                                        <span className="font-mono text-xs">{formatDate(item.created_at)}</span>
                                    </div>
                                </div>

                                {item.approved_at && (
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-2 h-2 rounded-full bg-blue-400 ring-4 ring-tm-surface" />
                                        <div className="flex-1 flex justify-between">
                                            <span className="text-blue-300">Approved</span>
                                            <span className="font-mono text-xs text-blue-300">{formatDate(item.approved_at)}</span>
                                        </div>
                                    </div>
                                )}

                                {item.executed_at && (
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-2 h-2 rounded-full bg-tm-green ring-4 ring-tm-surface" />
                                        <div className="flex-1 flex justify-between">
                                            <span className="text-tm-green font-medium">Executed</span>
                                            <span className="font-mono text-xs text-tm-green">{formatDate(item.executed_at)}</span>
                                        </div>
                                    </div>
                                )}

                                {item.status === 'failed' && item.error_message && (
                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-2 h-2 rounded-full bg-tm-red ring-4 ring-tm-surface" />
                                        <div className="flex-1">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-tm-red font-medium">Failed</span>
                                                <span className="font-mono text-xs text-tm-red">
                                                    {formatDate(item.executed_at || item.approved_at || item.created_at)}
                                                </span>
                                            </div>
                                            <div className="bg-tm-red/10 border border-tm-red/20 p-2 rounded text-xs text-tm-red font-mono break-all">
                                                {item.error_message}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </main>
    );
}
