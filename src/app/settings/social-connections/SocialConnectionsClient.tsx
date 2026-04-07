'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, ExternalLink, Trash2, Loader2 } from 'lucide-react';

const PLATFORMS = [
    {
        id: 'linkedin',
        label: 'LinkedIn',
        emoji: '💼',
        note: 'Post professional trading insights to your network.',
        requiresPage: false,
    },
    {
        id: 'twitter',
        label: 'X / Twitter',
        emoji: '🐦',
        note: 'Share quick trading tips and referral tweets.',
        requiresPage: false,
    },
    {
        id: 'facebook',
        label: 'Facebook',
        emoji: '📘',
        note: 'Post to your Facebook Page (personal profiles not supported by Meta API).',
        requiresPage: true,
    },
    {
        id: 'instagram',
        label: 'Instagram',
        emoji: '📸',
        note: 'Post captions via your Instagram Business account.',
        requiresPage: true,
    },
    {
        id: 'tiktok',
        label: 'TikTok',
        emoji: '🎵',
        note: 'Connect your account for identity verification to use the AI Caption generator.',
        requiresPage: false,
        clipboardOnly: true,
    },
    {
        id: 'snapchat',
        label: 'Snapchat',
        emoji: '👻',
        note: 'Connect your account for identity verification to use the Spotlight generator.',
        requiresPage: false,
        clipboardOnly: true,
    },
    {
        id: 'reddit',
        label: 'Reddit',
        emoji: '👾',
        note: 'Connect your account to auto-publish analytical posts to subreddits.',
        requiresPage: false,
        clipboardOnly: true, // We support auto post on Reddit now, but labeling as script for UI badge legacy
    },
    {
        id: 'youtube',
        label: 'YouTube',
        emoji: '▶️',
        note: 'Connect your account for identity verification to use the description generator.',
        requiresPage: false,
        clipboardOnly: true,
    },
] as const;

interface SocialConnectionsClientProps {
    initialConnections: Record<string, { status: string; connected_at: string | null }>;
    userTier: string;
    isCreator: boolean;
    successPlatform?: string | null;
    errorType?: string | null;
}

export function SocialConnectionsClient({
    initialConnections, userTier, isCreator, successPlatform, errorType
}: SocialConnectionsClientProps) {
    const [connections, setConnections] = useState(initialConnections);
    const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    // Auto-close popup logic for Share Modal integration
    useEffect(() => {
        if (typeof window !== 'undefined' && window.opener && (successPlatform || errorType)) {
            // Give the user 1.5s to see the "connected successfully" banner, then close the popup.
            // Closing the popup triggers a window 'focus' event on the original window.
            const timer = setTimeout(() => {
                window.close();
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [successPlatform, errorType]);

    const canConnect = true; // Tier gate removed, all users can connect

    const handleConnect = async (platform: string) => {
        setLoadingPlatform(platform);
        setLocalError(null);
        try {
            const res = await fetch('/api/composio/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to initiate connection');
            // Redirect to Composio OAuth page
            window.location.href = data.redirectUrl;
        } catch (err: any) {
            setLocalError(err.message);
            setLoadingPlatform(null);
        }
    };

    const handleDisconnect = async (platform: string) => {
        if (!confirm(`Are you sure you want to disconnect your ${platform} account?`)) return;
        setLoadingPlatform(platform);
        setLocalError(null);
        try {
            const res = await fetch('/api/composio/disconnect', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? 'Failed to disconnect');
            }
            setConnections((prev) => ({
                ...prev,
                [platform]: { status: 'disconnected', connected_at: null },
            }));
        } catch (err: any) {
            setLocalError(err.message);
        } finally {
            setLoadingPlatform(null);
        }
    };

    return (
        <main className="min-h-screen bg-tm-bg text-white pb-24 px-4 pt-6 max-w-2xl mx-auto">
            <header className="flex items-center gap-3 mb-8">
                <Link href="/refer" className="p-2 -ml-2 text-tm-muted hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Social Connections</h1>
                    <p className="text-xs text-tm-muted">Connect accounts for one-click referral posting</p>
                </div>
            </header>

            {/* Success / Error banners from callback redirect */}
            {successPlatform && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 text-sm text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span><span className="capitalize font-bold">{successPlatform}</span> connected successfully! You can now post directly from TradeMind.</span>
                </div>
            )}
            {errorType && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-sm text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>
                        {errorType === 'auth_failed' && 'OAuth authorisation was cancelled or failed. Please try again.'}
                        {errorType === 'not_active' && 'The connection was not activated by Composio. Please try again.'}
                        {errorType === 'server_error' && 'A server error occurred. Please try again in a moment.'}
                        {!['auth_failed', 'not_active', 'server_error'].includes(errorType) && `Connection error: ${errorType}`}
                    </span>
                </div>
            )}
            {localError && (
                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6 text-sm text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{localError}</span>
                </div>
            )}

            {/* Tier gate removed. All users can connect. */}

            {/* Platform cards */}
            <div className="space-y-3">
                {PLATFORMS.map((platformConfig) => {
                    const { id, label, emoji, note, requiresPage } = platformConfig;
                    const clipboardOnly = 'clipboardOnly' in platformConfig && platformConfig.clipboardOnly === true;

                    const conn = connections[id];
                    const isActive = conn?.status === 'active';
                    const isLoading = loadingPlatform === id;

                    return (
                        <div
                            key={id}
                            className={`bg-tm-surface border rounded-2xl p-5 flex items-center gap-4 transition-all ${
                                isActive ? 'border-emerald-500/30' : 'border-tm-border'
                            }`}
                        >
                            {/* Platform icon */}
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                                isActive ? 'bg-emerald-500/10' : 'bg-tm-bg'
                            }`}>
                                {emoji}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <h3 className="font-bold text-white text-sm">{label}</h3>
                                    {isActive && (
                                        <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">Connected</span>
                                    )}
                                    {clipboardOnly && (
                                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">Script Only</span>
                                    )}
                                </div>
                                <p className="text-xs text-tm-muted leading-relaxed">{note}</p>
                                {requiresPage && (
                                    <p className="text-[10px] text-amber-500/70 mt-1">⚠ Requires a Facebook Page / Instagram Business account</p>
                                )}
                                {isActive && conn?.connected_at && (
                                    <p className="text-[10px] text-tm-muted mt-1">
                                        Connected {new Date(conn.connected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </p>
                                )}
                            </div>

                            {/* Action */}
                            <div className="shrink-0">
                                {isActive ? (
                                    <button
                                        onClick={() => handleDisconnect(id)}
                                        disabled={isLoading}
                                        className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1.5 transition-colors px-3 py-1.5 border border-red-500/20 rounded-lg"
                                    >
                                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                        {isLoading ? 'Disconnecting…' : 'Disconnect'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleConnect(id)}
                                        disabled={isLoading}
                                        className={`text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all bg-tm-purple hover:bg-tm-purple/90 text-white`}
                                    >
                                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                        {isLoading ? 'Connecting…' : `Connect ${label}`}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Compliance note */}
            <div className="mt-8 bg-tm-surface border border-tm-border rounded-xl p-4">
                <p className="text-[11px] text-tm-muted leading-relaxed">
                    <strong className="text-white">Privacy & Permissions:</strong> TradeMind will only post to your connected accounts when you explicitly click "Post Directly" inside TradeMind. We never post automatically. Your OAuth tokens are stored securely by Composio and are never accessible to TradeMind staff. You can disconnect at any time.
                </p>
            </div>
        </main>
    );
}
