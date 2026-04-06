'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Copy, CheckCircle2 } from 'lucide-react';
import { ShareModal } from './ShareModal';

interface ShareSectionProps {
    promoCode: string;
    referralLink: string;
    userTier: string;
    isCreator: boolean;
}

export function ShareSection({ promoCode, referralLink, userTier, isCreator }: ShareSectionProps) {
    const [showModal, setShowModal] = useState(false);
    const [connectedPlatforms, setConnectedPlatforms] = useState<Record<string, { status: string; connectedAt: string | null }>>({});
    const [copiedCode, setCopiedCode] = useState(false);
    const [statusLoading, setStatusLoading] = useState(true);

    const fetchConnections = useCallback(() => {
        fetch('/api/composio/status')
            .then((r) => r.json())
            .then((data) => setConnectedPlatforms(data.connections ?? {}))
            .catch(console.error)
            .finally(() => setStatusLoading(false));
    }, []);

    // Fetch on mount and when modal closes
    useEffect(() => { fetchConnections(); }, [showModal, fetchConnections]);

    const copyCode = async () => {
        await navigator.clipboard.writeText(promoCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 3000);
    };

    const connectedCount = Object.values(connectedPlatforms).filter((c) => c.status === 'active').length;

    return (
        <>
            <div className="bg-gradient-to-br from-tm-purple/10 to-transparent border border-tm-purple/20 rounded-2xl p-5 space-y-4">
                {/* Promo code display */}
                <div>
                    <p className="text-[10px] uppercase tracking-wider text-tm-muted font-semibold mb-2">Your Referral Link — click auto-applies your code!</p>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 bg-tm-bg border-2 border-tm-purple/40 rounded-xl px-5 py-3">
                            <span className="text-2xl font-black text-white tracking-widest font-mono">{promoCode}</span>
                        </div>
                        <button
                            onClick={copyCode}
                            className="bg-tm-purple/20 hover:bg-tm-purple/30 border border-tm-purple/30 text-tm-purple px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                        >
                            {copiedCode ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedCode ? 'Copied!' : 'Copy Code'}
                        </button>
                    </div>
                    <p className="text-[11px] text-tm-muted mt-2 leading-relaxed">
                        Your link: <span className="text-tm-purple font-mono text-[10px]">{referralLink}</span>
                        <br />Referee clicks → free trial auto-applied. No manual code entry needed.
                    </p>
                </div>

                {/* AI share CTA */}
                <button
                    onClick={() => setShowModal(true)}
                    className="w-full bg-tm-purple hover:bg-tm-purple/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(168,85,247,0.3)]"
                >
                    <Sparkles className="w-4 h-4" />
                    Create AI Post &amp; Share
                </button>

                {/* Connection status mini-bar */}
                {!statusLoading && (
                    <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2">
                            {['linkedin', 'twitter', 'facebook', 'instagram', 'tiktok', 'reddit', 'youtube', 'snapchat'].map((p) => {
                                const isActive = connectedPlatforms[p]?.status === 'active';
                                return (
                                    <div
                                        key={p}
                                        title={isActive ? `${p} connected` : `${p} not connected`}
                                        className={`w-2 h-2 rounded-full transition-colors ${isActive ? 'bg-emerald-400' : 'bg-white/10'}`}
                                    />
                                );
                            })}
                            <span className="text-[10px] text-tm-muted ml-1">
                                {connectedCount > 0 ? `${connectedCount} platform${connectedCount !== 1 ? 's' : ''} connected` : 'Tap a platform to connect'}
                            </span>
                        </div>
                        <a href="/settings/social-connections" className="text-[10px] text-tm-purple hover:underline">
                            Manage →
                        </a>
                    </div>
                )}
            </div>

            {showModal && (
                <ShareModal
                    promoCode={promoCode}
                    referralLink={referralLink}
                    userTier={userTier}
                    isCreator={isCreator}
                    connectedPlatforms={connectedPlatforms}
                    onClose={() => setShowModal(false)}
                    onRefreshConnections={fetchConnections}
                />
            )}
        </>
    );
}
