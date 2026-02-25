"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
    ArrowLeft,
    Activity,
    CheckCircle,
    XCircle,
    Clock,
    Search,
    RefreshCw,
    Trash2,
    Loader2,
    ExternalLink
} from "lucide-react";
import Link from "next/link";

// ---- Types ----------------------------------------------------------------

interface TradeMindItem {
    id: number;
    signal_id: string;
    status: string;
    order_id: string | null;
    created_at: string;
    approved_at?: string;
    executed_at?: string;
    error_message?: string;
    symbol?: string | null;
    strategy?: string | null;
    source: 'trademind';
}

interface TastytradeItem {
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

type AnyItem = (TradeMindItem | TastytradeItem) & { _sortDate: number };

// ---- Helpers ----------------------------------------------------------------

const formatDate = (d?: string) => d ? new Date(d).toLocaleString() : '-';

const strategyBadge = (s?: string | null) => {
    if (!s) return null;
    const colors: Record<string, string> = {
        diagonal: 'bg-purple-500/20 text-purple-300',
        tqqq: 'bg-purple-500/20 text-purple-300',
        theta: 'bg-blue-500/20 text-blue-300',
        calendar: 'bg-green-500/20 text-green-300',
    };
    const c = colors[s.toLowerCase()] || 'bg-gray-500/20 text-gray-300';
    return <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${c}`}>{s}</span>;
};

// ---- Page ----------------------------------------------------------------

export default function ActivityPage() {
    const { ready, authenticated } = usePrivy();
    const router = useRouter();

    const [items, setItems] = useState<AnyItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [clearing, setClearing] = useState(false);
    const [filter, setFilter] = useState('');
    const [accountNumber, setAccountNumber] = useState<string | null>(null);

    useEffect(() => {
        if (ready && !authenticated) router.push("/");
    }, [ready, authenticated, router]);

    // Load account number from Tastytrade account API
    useEffect(() => {
        fetch('/api/tastytrade/account')
            .then(r => r.json())
            .then(d => {
                // Tastytrade API returns: { data: { items: [{ account: { "account-number": "..." } }] } }
                const acct =
                    d?.data?.items?.[0]?.account?.['account-number'] ||
                    d?.accounts?.[0]?.accountNumber ||
                    d?.accountNumber;
                if (acct) setAccountNumber(acct);
            })
            .catch(() => { });
    }, []);

    const fetchAll = useCallback(async () => {
        try {
            // 1. TradeMind signal executions (last 30 days)
            const tmRes = await fetch('/api/activity?limit=50');
            const tmData = tmRes.ok ? await tmRes.json() : { activities: [] };

            // 2. Real Tastytrade transactions
            let ttItems: TastytradeItem[] = [];
            if (accountNumber) {
                const ttRes = await fetch(`/api/tastytrade/transactions?accountNumber=${accountNumber}`);
                if (ttRes.ok) {
                    const ttData = await ttRes.json();
                    ttItems = ttData.transactions || [];
                }
            }

            const tmItems: AnyItem[] = (tmData.activities || []).map((a: TradeMindItem) => ({
                ...a,
                _sortDate: new Date(a.created_at).getTime(),
            }));
            const ttMapped: AnyItem[] = ttItems.map(t => ({
                ...t,
                _sortDate: new Date(t.executed_at).getTime(),
            }));

            const merged = [...tmItems, ...ttMapped].sort((a, b) => b._sortDate - a._sortDate);
            setItems(merged);
        } catch (e) {
            console.error('Failed to load activity', e);
        } finally {
            setLoading(false);
        }
    }, [accountNumber]);

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, 15000);
        return () => clearInterval(id);
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

    const filtered = items.filter(item => {
        const sym = item.symbol?.toLowerCase() || '';
        const strat = item.strategy?.toLowerCase() || '';
        const status = item.source === 'trademind' ? (item as TradeMindItem).status.toLowerCase() : 'executed';
        const q = filter.toLowerCase();
        return sym.includes(q) || strat.includes(q) || status.includes(q);
    });

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
            {/* Header */}
            <header className="px-6 pt-12 pb-4 flex items-center gap-4">
                <Link href="/dashboard" className="w-10 h-10 rounded-full bg-tm-surface flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold">Activity Log</h1>
                    <p className="text-sm text-tm-muted">Track all trade lifecycle events</p>
                </div>
                <div className="flex gap-2 items-center">
                    <button onClick={fetchAll} className="w-9 h-9 rounded-full bg-tm-surface flex items-center justify-center text-tm-muted hover:text-white transition">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={clearStale}
                        disabled={clearing}
                        className="w-9 h-9 rounded-full bg-tm-surface flex items-center justify-center text-tm-muted hover:text-red-400 transition"
                        title="Clear failed/old entries"
                    >
                        {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                    <div className="w-10 h-10 rounded-full bg-tm-purple/20 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-tm-purple" />
                    </div>
                </div>
            </header>

            {/* Search */}
            <div className="px-6 mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tm-muted" />
                    <input
                        placeholder="Filter by symbol, strategy or status..."
                        className="pl-9 h-10 w-full rounded-md border border-white/5 bg-tm-surface px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        value={filter}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="px-6 space-y-3">
                {loading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="glass-card p-5 animate-pulse">
                            <div className="h-4 w-1/3 bg-tm-surface rounded mb-3" />
                            <div className="h-3 w-2/3 bg-tm-surface rounded" />
                        </div>
                    ))
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 glass-card">
                        <Activity className="w-12 h-12 text-tm-muted mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No activity recorded</h3>
                        <p className="text-tm-muted text-sm">Trades and signals will appear here.</p>
                    </div>
                ) : (
                    filtered.map((item) => {
                        const isTT = item.source === 'tastytrade';
                        const tt = item as TastytradeItem;
                        const tm = item as TradeMindItem;

                        return (
                            <div key={`${item.source}-${item.id}`} className="glass-card p-5 hover:bg-tm-surface/50 transition-colors">
                                {/* Header row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-white/5">
                                            {isTT
                                                ? <CheckCircle className="w-5 h-5 text-tm-green" />
                                                : tm.status === 'executed' ? <CheckCircle className="w-5 h-5 text-tm-green" />
                                                    : tm.status === 'failed' ? <XCircle className="w-5 h-5 text-tm-red" />
                                                        : <Clock className="w-5 h-5 text-tm-muted" />
                                            }
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-bold text-base">{item.symbol || 'UNKNOWN'}</h3>
                                                {strategyBadge(item.strategy)}
                                                {isTT && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">LIVE</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-tm-muted capitalize">
                                                {isTT ? `${tt.action} · ${tt.quantity} contracts @ $${tt.price?.toFixed(2)}` : tm.status.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {isTT ? (
                                            <>
                                                <p className="text-xs text-tm-muted font-mono">Order: {tt.order_id}</p>
                                                <p className="text-xs text-tm-green">
                                                    {tt.value > 0 ? `+$${tt.value.toFixed(2)}` : `-$${Math.abs(tt.value).toFixed(2)}`}
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-mono text-sm font-bold text-tm-muted">#{tm.id}</p>
                                                {tm.order_id && <p className="text-xs text-tm-green">Order: {tm.order_id}</p>}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Timeline / detail */}
                                <div className="bg-tm-surface/50 rounded-xl p-4 text-sm space-y-2 relative overflow-hidden">
                                    <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-white/10" />

                                    {isTT ? (
                                        <>
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="w-2 h-2 rounded-full bg-tm-green ring-4 ring-tm-surface" />
                                                <div className="flex-1 flex justify-between">
                                                    <span className="text-tm-green">{tt.description || 'Trade Executed'}</span>
                                                    <span className="font-mono text-xs">{formatDate(tt.executed_at)}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="w-2 h-2 rounded-full bg-tm-purple ring-4 ring-tm-surface" />
                                                <div className="flex-1 flex justify-between">
                                                    <span className="text-tm-muted">Signal Received</span>
                                                    <span className="font-mono text-xs">{formatDate(tm.created_at)}</span>
                                                </div>
                                            </div>
                                            {tm.approved_at && (
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className="w-2 h-2 rounded-full bg-blue-400 ring-4 ring-tm-surface" />
                                                    <div className="flex-1 flex justify-between">
                                                        <span className="text-blue-300">Approved</span>
                                                        <span className="font-mono text-xs text-blue-300">{formatDate(tm.approved_at)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {tm.executed_at && (
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <div className="w-2 h-2 rounded-full bg-tm-green ring-4 ring-tm-surface" />
                                                    <div className="flex-1 flex justify-between">
                                                        <span className="text-tm-green font-medium">Executed</span>
                                                        <span className="font-mono text-xs text-tm-green">{formatDate(tm.executed_at)}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {tm.status === 'failed' && tm.error_message && (
                                                <div className="flex items-start gap-3 relative z-10">
                                                    <div className="w-2 h-2 mt-1 rounded-full bg-tm-red ring-4 ring-tm-surface shrink-0" />
                                                    <div className="flex-1">
                                                        <div className="flex justify-between mb-1">
                                                            <span className="text-tm-red font-medium">Failed</span>
                                                        </div>
                                                        <div className="bg-tm-red/10 border border-tm-red/20 p-2 rounded text-xs text-tm-red font-mono break-all">
                                                            {tm.error_message}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    );
}
