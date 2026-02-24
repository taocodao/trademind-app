'use client';

import { useState, useEffect } from 'react';
import { Link2, Link2Off, RefreshCw, Loader2, CheckCircle, ExternalLink } from 'lucide-react';

interface TastytradeStatus {
    linked: boolean;
    accountNumber?: string;
    username?: string;
    linkedAt?: string;
}

export function TastytradeCredentials() {
    const [status, setStatus] = useState<TastytradeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [disconnecting, setDisconnecting] = useState(false);
    const [reconnecting, setReconnecting] = useState(false);

    // Fetch link status on mount
    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/tastytrade/status');
            if (res.ok) {
                setStatus(await res.json());
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect Tastytrade? You can reconnect anytime.')) return;
        try {
            setDisconnecting(true);
            const res = await fetch('/api/tastytrade/disconnect', { method: 'POST' });
            if (res.ok) {
                setStatus({ linked: false });
            }
        } catch {
            // ignore
        } finally {
            setDisconnecting(false);
        }
    };

    const handleReconnect = async () => {
        try {
            setReconnecting(true);
            const res = await fetch('/api/tastytrade/oauth/url');
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch {
            setReconnecting(false);
        }
    };

    if (loading) {
        return (
            <section className="glass-card p-5 border border-purple-500/20">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-tm-purple animate-spin" />
                    <span className="text-sm text-tm-muted">Checking Tastytrade connection...</span>
                </div>
            </section>
        );
    }

    // ── Connected State ──
    if (status?.linked) {
        const linkedDate = status.linkedAt
            ? new Date(status.linkedAt).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
            })
            : 'Unknown';

        return (
            <section className="glass-card p-5 border border-green-500/20">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="flex items-center gap-2 font-bold text-lg">
                        <CheckCircle className="w-5 h-5 text-tm-green" />
                        Tastytrade Connected
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-tm-green/20 text-tm-green text-xs font-semibold">
                        Active
                    </span>
                </div>

                <div className="space-y-2 text-sm mb-5">
                    {status.accountNumber && (
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                            <span className="text-tm-muted">Account</span>
                            <span className="font-mono font-semibold">{status.accountNumber}</span>
                        </div>
                    )}
                    {status.username && (
                        <div className="flex justify-between py-1.5 border-b border-white/5">
                            <span className="text-tm-muted">Username</span>
                            <span className="font-semibold">{status.username}</span>
                        </div>
                    )}
                    <div className="flex justify-between py-1.5">
                        <span className="text-tm-muted">Linked</span>
                        <span className="text-xs">{linkedDate}</span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleReconnect}
                        disabled={reconnecting}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-tm-surface hover:bg-white/5 text-tm-purple border border-tm-purple/20 hover:border-tm-purple/50 transition-all"
                    >
                        {reconnecting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        Reconnect
                    </button>
                    <button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all"
                    >
                        {disconnecting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Link2Off className="w-4 h-4" />
                        )}
                        Disconnect
                    </button>
                </div>
            </section>
        );
    }

    // ── Disconnected State ──
    return (
        <section className="glass-card p-5 border border-purple-500/20">
            <h3 className="flex items-center gap-2 font-bold text-lg mb-3">
                <Link2 className="w-5 h-5 text-tm-purple" />
                Tastytrade Account
            </h3>
            <p className="text-sm text-tm-muted mb-5">
                Connect your Tastytrade account to enable real-time trading and position tracking.
            </p>
            <button
                onClick={handleReconnect}
                disabled={reconnecting}
                className="btn-primary w-full flex items-center justify-center gap-3"
            >
                {reconnecting ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    <>
                        Connect Tastytrade
                        <ExternalLink className="w-5 h-5" />
                    </>
                )}
            </button>
            <p className="text-[10px] text-tm-muted text-center mt-3">
                🔒 Secure OAuth2 — your credentials are never stored
            </p>
        </section>
    );
}
