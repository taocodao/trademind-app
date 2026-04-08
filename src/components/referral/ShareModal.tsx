'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    X, Sparkles, Copy, CheckCircle2, RefreshCw, ExternalLink,
    Send, AlertCircle, ChevronLeft, BookOpen, TrendingUp, Zap, Link2, Eye, Edit3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { SocialPlatform } from '@/lib/composio';
import {
    DIRECT_POST_PLATFORMS, SCRIPT_ONLY_PLATFORMS, REDDIT_SUBREDDITS
} from '@/lib/composio';

// ── Platform metadata ─────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<SocialPlatform, {
    label: string;
    emoji: string;
    color: string;
    glowColor: string;
    canOAuth: boolean;   // Has Composio OAuth support
    requiresMedia: boolean; // Must have image/video to post
    appDeepLink?: string;   // Mobile deep link to open the app
}> = {
    linkedin:  { label: 'LinkedIn',  emoji: '💼', color: '#0A66C2', glowColor: 'rgba(10,102,194,0.4)',  canOAuth: true,  requiresMedia: false },
    twitter:   { label: 'X/Twitter', emoji: '🐦', color: '#1D9BF0', glowColor: 'rgba(29,155,240,0.4)',  canOAuth: true,  requiresMedia: false },
    facebook:  { label: 'Facebook',  emoji: '📘', color: '#1877F2', glowColor: 'rgba(24,119,242,0.4)',  canOAuth: true,  requiresMedia: false },
    instagram: { label: 'Instagram', emoji: '📸', color: '#E1306C', glowColor: 'rgba(225,48,108,0.4)',  canOAuth: true,  requiresMedia: true,  appDeepLink: 'instagram://app' },
    tiktok:    { label: 'TikTok',    emoji: '🎵', color: '#FE2C55', glowColor: 'rgba(254,44,85,0.4)',   canOAuth: true,  requiresMedia: true,  appDeepLink: 'tiktok://app' },
    reddit:    { label: 'Reddit',    emoji: '👾', color: '#FF4500', glowColor: 'rgba(255,69,0,0.4)',    canOAuth: true,  requiresMedia: false },
    youtube:   { label: 'YouTube',   emoji: '▶️', color: '#FF0000', glowColor: 'rgba(255,0,0,0.4)',     canOAuth: true,  requiresMedia: true,  appDeepLink: 'youtube://app' },
    snapchat:  { label: 'Snapchat',  emoji: '👻', color: '#FFFC00', glowColor: 'rgba(255,252,0,0.3)',   canOAuth: true,  requiresMedia: false, appDeepLink: 'snapchat://app' },
};

const TEMPLATE_OPTIONS = [
    { id: 'campaign' as const,    emoji: '🚀', label: 'Campaign',   desc: '39% Compound hook' },
    { id: 'results' as const,     emoji: '🎯', label: 'Results',    desc: 'Share your trading wins' },
    { id: 'educational' as const, emoji: '🧑‍🏫', label: 'Education',  desc: 'Teach options concepts' },
    { id: 'casual' as const,      emoji: '😎', label: 'Casual',     desc: 'Hype & conversational' },
];

const char_limits: Partial<Record<SocialPlatform, number>> = { twitter: 250 };

function buildIntentUrl(platform: SocialPlatform, text: string, link: string): string {
    const enc = encodeURIComponent(text);
    const encLink = encodeURIComponent(link);
    switch (platform) {
        case 'twitter':   return `https://twitter.com/intent/tweet?text=${enc}`;
        case 'linkedin':  return `https://www.linkedin.com/shareArticle?mini=true&url=${encLink}&summary=${enc}`;
        case 'facebook':  return `https://www.facebook.com/sharer/sharer.php?u=${encLink}&quote=${enc}`;
        default:          return '';
    }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ShareModalProps {
    promoCode: string;
    referralLink: string;
    userTier: string;
    isCreator: boolean;
    connectedPlatforms: Record<string, { status: string; connectedAt: string | null }>;
    onClose: () => void;
    onRefreshConnections?: () => void;
}

import type { PostMode, TemplateStyle } from '@/lib/composio';
type Step = 'platforms' | 'connect' | 'generate' | 'review';

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareModal({
    promoCode, referralLink, userTier, isCreator, connectedPlatforms, onClose, onRefreshConnections
}: ShareModalProps) {
    const [step, setStep] = useState<Step>('platforms');
    const [selected, setSelected] = useState<SocialPlatform | null>(null);
    const [postMode, setPostMode] = useState<PostMode>('referral');
    const [templateStyle, setTemplateStyle] = useState<TemplateStyle>('results');
    const [subreddit, setSubreddit] = useState('stocks');
    const [generatedPost, setGeneratedPost] = useState('');
    const [editedPost, setEditedPost] = useState('');
    const [customContext, setCustomContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [postSuccess, setPostSuccess] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [error, setError] = useState('');

    const isConnected = (p: SocialPlatform) => connectedPlatforms[p]?.status === 'active';
    const isDirectPost = (p: SocialPlatform) => DIRECT_POST_PLATFORMS.includes(p) && isConnected(p);
    const isScriptOnly = (p: SocialPlatform) => SCRIPT_ONLY_PLATFORMS.includes(p);
    const cfg = selected ? PLATFORM_CONFIG[selected] : null;

    // Re-fetch connection status when user returns from OAuth popup.
    // Two strategies: (1) postMessage from /oauth-complete page when popup closes,
    // (2) window focus as fallback when user manually closes popup.
    useEffect(() => {
        const handleFocus = () => { onRefreshConnections?.(); };
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'COMPOSIO_OAUTH_COMPLETE') {
                console.log('[ShareModal] OAuth complete for', e.data.platform, '| status:', e.data.status);
                setIsConnecting(false);
                onRefreshConnections?.();
            }
        };
        window.addEventListener('focus', handleFocus);
        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('message', handleMessage);
        };
    }, [onRefreshConnections]);

    const handleSelectPlatform = useCallback((p: SocialPlatform) => {
        setSelected(p);
        setGeneratedPost('');
        setEditedPost('');
        setError('');
        setPostSuccess(false);

        const platformCfg = PLATFORM_CONFIG[p];
        // If it needs OAuth and isn't connected → show connect panel
        if (platformCfg.canOAuth && !isConnected(p)) {
            setStep('connect');
        } else {
            setStep('generate');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectedPlatforms]);

    const handleConnect = async () => {
        if (!selected) return;
        setIsConnecting(true);
        setError('');
        try {
            const res = await fetch('/api/composio/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: selected }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to initiate connection');
            
            // Open Composio OAuth page in a popup so we don't lose the modal state
            window.open(data.redirectUrl, 'ComposioOAuth', 'width=600,height=800,left=200,top=100');
            // The modal stays in 'connect' step, but we show a waiting state
        } catch (err: any) {
            setError(err.message || 'Failed to connect. Please try again.');
            setIsConnecting(false);
        }
    };

    // Auto-advance to "generate" step once the connection completes and the focus event fires.
    // Use connectedPlatforms[selected] directly (not isConnected()) to avoid stale closure.
    useEffect(() => {
        if (step === 'connect' && selected && connectedPlatforms[selected]?.status === 'active') {
            setIsConnecting(false);
            setStep('generate');
        }
    }, [connectedPlatforms, step, selected]);

    const handleGenerate = useCallback(async () => {
        if (!selected) return;
        setIsGenerating(true);
        setError('');
        try {
            const res = await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: selected,
                    postMode,
                    templateStyle,
                    customContext: customContext.trim() || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setGeneratedPost(data.post);
            setEditedPost(data.post);
            setStep('review');
        } catch (err: any) {
            setError(err.message || 'Failed to generate post. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [selected, postMode, templateStyle, customContext]);

    const handleDirectPost = useCallback(async () => {
        if (!selected || !editedPost) return;
        setIsPosting(true);
        setError('');
        try {
            const metadata: Record<string, string> = {};
            if (selected === 'reddit') metadata.subreddit = subreddit;

            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: selected, postContent: editedPost,
                    promoCode, referralLink, metadata,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.needsConnection) {
                    // Redirect to connect panel instead of dead error message
                    setStep('connect');
                    return;
                }
                if (data.reconnectRequired) {
                    setError(`Your ${selected} connection has expired. Reconnect below.`);
                    setStep('connect');
                    return;
                }
                throw new Error(data.error);
            }
            setPostSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    }, [selected, editedPost, promoCode, referralLink, subreddit]);

    const handleCopy = useCallback(async () => {
        if (!editedPost) return;
        await navigator.clipboard.writeText(editedPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    }, [editedPost]);

    const handleIntentPost = useCallback(() => {
        if (!selected || !editedPost) return;
        const url = buildIntentUrl(selected, editedPost, referralLink);
        if (url) window.open(url, '_blank', 'width=620,height=520,noopener,noreferrer');
    }, [selected, editedPost, referralLink]);

    const handleWebShare = useCallback(async () => {
        if (!editedPost) return;
        try { await navigator.share({ text: editedPost, url: referralLink }); }
        catch { handleCopy(); }
    }, [editedPost, referralLink, handleCopy]);

    const charLimit = selected ? char_limits[selected] : undefined;
    const isOverLimit = charLimit ? editedPost.length > charLimit : false;

    // ── Platform tile badge ───────────────────────────────────────────────────

    function PlatformBadge({ p }: { p: SocialPlatform }) {
        const connected = isConnected(p);
        const pcfg = PLATFORM_CONFIG[p];
        if (p === 'snapchat') return <span className="absolute top-1 right-1 text-[8px] bg-zinc-600 text-white rounded-full px-1 leading-4">clip</span>;
        if (isScriptOnly(p) && !connected) return <span className="absolute top-1 right-1 text-[8px] bg-blue-500/80 text-white rounded-full px-1 leading-4">📝</span>;
        if (!pcfg.canOAuth) return null;
        if (connected) return <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md">✓</span>;
        return <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-md">!</span>;
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            {/* Bottom-sheet on mobile, centered modal on desktop */}
            <div className="bg-[#141420] border border-white/10 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl shadow-purple-900/20 flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 sticky top-0 bg-[#141420] z-10">
                    <div className="flex items-center gap-2">
                        {step !== 'platforms' && (
                            <button
                                onClick={() => setStep(step === 'review' ? 'generate' : 'platforms')}
                                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                        )}
                        <div>
                            <h2 className="text-base font-bold text-white leading-tight">
                                {step === 'platforms' ? 'Share & Earn' :
                                 step === 'connect'   ? `Connect ${cfg?.label}` :
                                 step === 'generate'  ? `${cfg?.emoji} ${cfg?.label} Post` :
                                                        'Review & Post'}
                            </h2>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                {step === 'platforms' ? <>Code <span className="font-mono font-bold text-white">{promoCode}</span> · auto-applied in your link</> :
                                 step === 'connect'   ? 'Connect once — post anytime without re-login' :
                                 step === 'generate'  ? 'AI writes your post in seconds' :
                                                        'Edit if needed, then post'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors shrink-0">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-5 flex-1">

                    {/* ══ STEP: PLATFORM GRID ══════════════════════════════ */}
                    {step === 'platforms' && (
                        <>
                            {/* Mode toggle */}
                            <div className="flex rounded-xl overflow-hidden border border-white/10 p-0.5 gap-0.5 bg-black/30">
                                <button
                                    onClick={() => setPostMode('referral')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${postMode === 'referral' ? 'bg-tm-purple text-white' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    <Zap className="w-3.5 h-3.5" /> Referral Post
                                </button>
                                <button
                                    onClick={() => setPostMode('education')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${postMode === 'education' ? 'bg-tm-purple text-white' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    <BookOpen className="w-3.5 h-3.5" /> Education Post
                                </button>
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-3 font-semibold">Select Platform</p>
                                <div className="grid grid-cols-4 gap-2">
                                    {(Object.entries(PLATFORM_CONFIG) as [SocialPlatform, typeof PLATFORM_CONFIG[SocialPlatform]][]).map(([p, pcfg]) => {
                                        const connected = isConnected(p);
                                        const isSelected = selected === p;
                                        return (
                                            <button
                                                key={p}
                                                onClick={() => handleSelectPlatform(p)}
                                                style={connected ? { boxShadow: `0 0 0 1.5px ${pcfg.color}66` } : undefined}
                                                className={`relative flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-2xl border transition-all text-center ${
                                                    isSelected
                                                        ? 'border-tm-purple bg-tm-purple/10'
                                                        : connected
                                                        ? 'border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10'
                                                        : 'border-white/8 bg-white/3 hover:border-white/20 hover:bg-white/5'
                                                }`}
                                            >
                                                <PlatformBadge p={p} />
                                                <span className="text-2xl leading-none">{pcfg.emoji}</span>
                                                <span className="text-[10px] font-semibold text-zinc-400 leading-tight">{pcfg.label}</span>
                                                {connected && (
                                                    <span className="text-[9px] text-emerald-400 font-medium">Connected</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Legend */}
                                <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-zinc-500">
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-emerald-500 rounded-full inline-flex items-center justify-center text-[7px] font-bold text-white">✓</span> Connected — auto-post</span>
                                    <span className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full inline-flex items-center justify-center text-[7px] font-bold text-white">!</span> Tap to connect once</span>
                                    <span className="flex items-center gap-1"><span className="text-[9px] bg-blue-500/80 text-white rounded px-1">📝</span> Script + clipboard</span>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ══ STEP: CONNECT PANEL ══════════════════════════════ */}
                    {step === 'connect' && selected && cfg && (
                        <div className="flex flex-col items-center text-center py-4 space-y-5">
                            <div
                                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-2xl"
                                style={{ background: `${cfg.color}22`, border: `2px solid ${cfg.color}44` }}
                            >
                                {cfg.emoji}
                            </div>

                            <div>
                                <h3 className="text-lg font-bold text-white">Connect {cfg.label}</h3>
                                <p className="text-sm text-zinc-400 mt-1 max-w-xs mx-auto">
                                    Log in once — TradeMind posts directly for you every time. No re-login needed.
                                </p>
                            </div>

                            <div className="w-full bg-black/30 rounded-2xl p-4 text-left space-y-2 border border-white/5">
                                <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> One-click posting after connecting
                                </p>
                                <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Your referral link is auto-embedded
                                </p>
                                <p className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Post from TradeMind in 2 taps
                                </p>
                                {cfg.requiresMedia && (
                                    <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5" /> {cfg.label} requires a video/image — we'll generate the caption + script
                                    </p>
                                )}
                            </div>

                            {isConnecting ? (
                                <div className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 border border-white/10 bg-white/5">
                                    <div className="flex items-center gap-2 text-sm text-zinc-300 font-semibold">
                                        <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                        Waiting for authorization...
                                    </div>
                                    <p className="text-[11px] text-zinc-500">Complete the sign-in in the popup window, then return here</p>
                                    <button
                                        onClick={() => setIsConnecting(false)}
                                        className="text-[11px] text-zinc-500 hover:text-zinc-300 underline transition-colors mt-1"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleConnect}
                                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
                                    style={{ background: cfg.color }}
                                >
                                    <Link2 className="w-4 h-4" />
                                    Connect {cfg.label} Account →
                                </button>
                            )}

                            {!isConnecting && (
                                <button
                                    onClick={() => setStep('generate')}
                                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    Skip — generate script to copy instead
                                </button>
                            )}
                        </div>
                    )}

                    {/* ══ STEP: GENERATE ═══════════════════════════════════ */}
                    {step === 'generate' && selected && cfg && (
                        <div className="space-y-4">
                            {/* Template Style */}
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2.5 font-semibold">Template Style</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {TEMPLATE_OPTIONS.map(({ id, emoji, label, desc }) => (
                                        <button
                                            key={id}
                                            onClick={() => setTemplateStyle(id)}
                                            className={`flex flex-col items-center gap-1 py-3 px-2 rounded-2xl border text-center transition-all ${
                                                templateStyle === id
                                                    ? 'border-tm-purple bg-tm-purple/10 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                                                    : 'border-white/8 bg-white/3 hover:border-white/20'
                                            }`}
                                        >
                                            <span className="text-xl">{emoji}</span>
                                            <span className="text-[11px] font-bold text-white">{label}</span>
                                            <span className="text-[10px] text-zinc-500 leading-tight">{desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reddit subreddit picker */}
                            {selected === 'reddit' && (
                                <div>
                                    <label htmlFor="subredditPicker" className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold block">
                                        Target Subreddit
                                    </label>
                                    <select
                                        id="subredditPicker"
                                        value={subreddit}
                                        onChange={(e) => setSubreddit(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-tm-purple transition-colors"
                                    >
                                        {REDDIT_SUBREDDITS.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Custom context */}
                            <div>
                                <label htmlFor="customContext" className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 font-semibold block">
                                    Personal Context <span className="normal-case font-normal text-zinc-600">(optional — makes AI more authentic)</span>
                                </label>
                                <input
                                    id="customContext"
                                    type="text"
                                    value={customContext}
                                    onChange={(e) => setCustomContext(e.target.value)}
                                    placeholder={postMode === 'education'
                                        ? 'e.g. "I trade TQQQ options and focus on IV crush plays"'
                                        : 'e.g. "I made 3 profitable trades last week using TradeMind"'}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-tm-purple transition-colors"
                                />
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                                </div>
                            )}

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full bg-tm-purple hover:bg-tm-purple/90 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-purple-900/30"
                            >
                                {isGenerating
                                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                                    : <><Sparkles className="w-4 h-4" /> Generate {cfg.label} {postMode === 'education' ? 'Educational' : 'Referral'} Post</>
                                }
                            </button>
                        </div>
                    )}

                    {/* ══ STEP: REVIEW & POST ══════════════════════════════ */}
                    {step === 'review' && selected && cfg && (
                        <div className="space-y-4">
                            {postSuccess ? (
                                <div className="flex flex-col items-center text-center py-6 space-y-3">
                                    <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-lg">Posted! 🎉</p>
                                        <p className="text-sm text-zinc-400 mt-1">
                                            Your referral link is live on {cfg.label}. Share more platforms to maximize reach.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => { setStep('platforms'); setPostSuccess(false); setSelected(null); }}
                                        className="px-6 py-2.5 bg-tm-purple/20 border border-tm-purple/40 text-tm-purple font-bold rounded-xl text-sm hover:bg-tm-purple/30 transition-colors"
                                    >
                                        Share on another platform
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 bg-black/40 p-1 rounded-lg border border-white/5">
                                            <button
                                                onClick={() => setShowPreview(false)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-bold transition-all ${!showPreview ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                <Edit3 className="w-3 h-3" /> Edit
                                            </button>
                                            <button
                                                onClick={() => setShowPreview(true)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-bold transition-all ${showPreview ? 'bg-tm-purple/20 text-tm-purple' : 'text-zinc-500 hover:text-zinc-300'}`}
                                            >
                                                <Eye className="w-3 h-3" /> Preview
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => { setStep('generate'); setGeneratedPost(''); setShowPreview(true); }}
                                            disabled={isGenerating}
                                            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors px-2"
                                        >
                                            <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                            Regenerate
                                        </button>
                                    </div>

                                    {showPreview ? (
                                        <div className="w-full bg-black/20 border border-white/10 rounded-2xl px-4 py-4 text-sm text-zinc-200 min-h-[180px] max-h-[300px] overflow-y-auto prose prose-invert prose-p:leading-relaxed prose-sm">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {editedPost}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <textarea
                                            id="postEditor"
                                            value={editedPost}
                                            onChange={(e) => setEditedPost(e.target.value)}
                                            rows={8}
                                            className={`w-full bg-black/40 border rounded-2xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed ${
                                                isOverLimit ? 'border-red-500/60' : 'border-white/10 focus:border-tm-purple'
                                            }`}
                                        />
                                    )}

                                    {charLimit && !showPreview && (
                                        <p className={`text-[11px] text-right -mt-2 ${isOverLimit ? 'text-red-400' : 'text-zinc-600'}`}>
                                            {editedPost.length} / {charLimit}{isOverLimit && ' — over limit, please trim'}
                                        </p>
                                    )}

                                    {error && (
                                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
                                        </div>
                                    )}

                                    {/* CTA buttons */}
                                    <div className="space-y-2">
                                        {/* Group A platforms — Direct post */}
                                        {DIRECT_POST_PLATFORMS.includes(selected) && isConnected(selected) && (
                                            <button
                                                onClick={handleDirectPost}
                                                disabled={isPosting || isOverLimit || !editedPost}
                                                className="w-full bg-tm-purple hover:bg-tm-purple/90 disabled:opacity-50 text-white font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-purple-900/30"
                                            >
                                                {isPosting
                                                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Posting…</>
                                                    : <><Send className="w-4 h-4" /> Post to {cfg.label} Now</>
                                                }
                                            </button>
                                        )}

                                        {/* Intent URL share (fallback for text platforms) */}
                                        {!cfg.requiresMedia && buildIntentUrl(selected, editedPost, referralLink) && (
                                            <button
                                                onClick={handleIntentPost}
                                                disabled={isOverLimit}
                                                className="w-full bg-white/5 border border-white/10 hover:border-white/20 text-white font-semibold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 text-sm"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                {isConnected(selected) ? `Open in ${cfg.label}` : `Share on ${cfg.label}`}
                                            </button>
                                        )}

                                        {/* Connect nudge for disconnected platforms */}
                                        {DIRECT_POST_PLATFORMS.includes(selected) && !isConnected(selected) && (
                                            <button
                                                onClick={() => setStep('connect')}
                                                className="w-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all text-sm hover:bg-amber-500/20"
                                            >
                                                <Link2 className="w-4 h-4" />
                                                Connect {cfg.label} for one-click posting
                                            </button>
                                        )}

                                        {/* Script/clipboard row for all */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCopy}
                                                className="flex-1 bg-white/5 border border-white/10 hover:border-white/20 text-white font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all text-sm"
                                            >
                                                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                                {copied ? 'Copied!' : 'Copy Text'}
                                            </button>
                                            {typeof navigator !== 'undefined' && 'share' in navigator && (
                                                <button
                                                    onClick={handleWebShare}
                                                    className="flex-1 bg-white/5 border border-white/10 hover:border-white/20 text-zinc-300 font-semibold py-2.5 rounded-2xl flex items-center justify-center gap-1.5 transition-all text-sm"
                                                >
                                                    📤 Share…
                                                </button>
                                            )}
                                        </div>

                                        {/* Script-mode note for media platforms */}
                                        {cfg.requiresMedia && (
                                            <p className="text-[11px] text-zinc-500 text-center">
                                                {cfg.label === 'Instagram' && 'Paste this caption into Instagram with your photo or story'}
                                                {cfg.label === 'TikTok'    && 'Read this script on camera, then paste the caption when uploading'}
                                                {cfg.label === 'YouTube'   && 'Use this as your video description. Include the referral link.'}
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
