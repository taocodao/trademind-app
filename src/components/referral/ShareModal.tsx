'use client';

import { useState, useCallback } from 'react';
import { X, Sparkles, Copy, CheckCircle2, RefreshCw, ExternalLink, Send, AlertCircle } from 'lucide-react';
import type { SocialPlatform } from '@/lib/composio';

// ── Platform metadata ─────────────────────────────────────────────────────────

const PLATFORM_CONFIG = {
    linkedin:  { label: 'LinkedIn',  emoji: '💼', color: '#0A66C2', bgClass: 'bg-blue-600',  supportsDirectPost: true  },
    twitter:   { label: 'X/Twitter', emoji: '🐦', color: '#000000', bgClass: 'bg-black',      supportsDirectPost: true  },
    facebook:  { label: 'Facebook',  emoji: '📘', color: '#1877F2', bgClass: 'bg-blue-500',  supportsDirectPost: true  },
    instagram: { label: 'Instagram', emoji: '📸', color: '#E1306C', bgClass: 'bg-pink-600',  supportsDirectPost: true  },
    tiktok:    { label: 'TikTok',    emoji: '🎵', color: '#010101', bgClass: 'bg-gray-900',  supportsDirectPost: false },
    snapchat:  { label: 'Snapchat',  emoji: '👻', color: '#FFFC00', bgClass: 'bg-yellow-400', supportsDirectPost: false },
    reddit:    { label: 'Reddit',    emoji: '👾', color: '#FF4500', bgClass: 'bg-orange-600', supportsDirectPost: false },
    youtube:   { label: 'YouTube',   emoji: '▶️', color: '#FF0000', bgClass: 'bg-red-600',    supportsDirectPost: false },
} as const;

const CHAR_LIMITS: Partial<Record<SocialPlatform, number>> = { twitter: 280 };

// Build intent URLs with pre-filled text for Bronze→Gold users
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ShareModal({
    promoCode, referralLink, userTier, isCreator, connectedPlatforms, onClose
}: ShareModalProps) {
    const [selected, setSelected] = useState<SocialPlatform | null>(null);
    const [generatedPost, setGeneratedPost] = useState('');
    const [editedPost, setEditedPost] = useState('');
    const [customContext, setCustomContext] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPosting, setIsPosting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [postSuccess, setPostSuccess] = useState(false);
    const [error, setError] = useState('');

    const canDirectPost = true; // Opened to all users
    const isPlatformConnected = (p: string) => connectedPlatforms[p]?.status === 'active';

    const handleSelect = useCallback((p: SocialPlatform) => {
        setSelected(p);
        setGeneratedPost('');
        setEditedPost('');
        setError('');
        setPostSuccess(false);
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!selected) return;
        setIsGenerating(true);
        setError('');
        try {
            const res = await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: selected, customContext: customContext.trim() || undefined }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setGeneratedPost(data.post);
            setEditedPost(data.post);
        } catch (err: any) {
            setError(err.message || 'Failed to generate post. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [selected, customContext]);

    const handleDirectPost = useCallback(async () => {
        if (!selected || !editedPost) return;
        setIsPosting(true);
        setError('');
        try {
            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: selected, postContent: editedPost, promoCode, referralLink }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.needsConnection) {
                    setError(`Connect your ${selected} account first — go to Settings → Social Connections.`);
                    return;
                }
                if (data.reconnectRequired) {
                    setError(`Your ${selected} connection has expired. Go to Settings → Social Connections to reconnect.`);
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
    }, [selected, editedPost, promoCode, referralLink]);

    const handleIntentPost = useCallback(() => {
        if (!selected || !editedPost) return;
        const url = buildIntentUrl(selected, editedPost, referralLink);
        if (url) window.open(url, '_blank', 'width=620,height=520,noopener,noreferrer');
    }, [selected, editedPost, referralLink]);

    const handleCopy = useCallback(async () => {
        if (!editedPost) return;
        await navigator.clipboard.writeText(editedPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    }, [editedPost]);

    const handleWebShare = useCallback(async () => {
        if (!editedPost) return;
        try {
            await navigator.share({ text: editedPost, url: referralLink });
        } catch {
            handleCopy();
        }
    }, [editedPost, referralLink, handleCopy]);

    const charLimit = selected ? CHAR_LIMITS[selected] : undefined;
    const isOverLimit = charLimit ? editedPost.length > charLimit : false;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-tm-surface border border-tm-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-4 border-b border-tm-border sticky top-0 bg-tm-surface z-10">
                    <div>
                        <h2 className="text-lg font-bold text-white">Share Your Referral Code</h2>
                        <p className="text-xs text-tm-muted mt-0.5">
                            AI generates platform-optimized content with code <span className="font-mono font-bold text-white">{promoCode}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-tm-muted hover:text-white transition-colors rounded-lg hover:bg-white/5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Step 1: Platform Selection */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-tm-muted mb-3 font-semibold">Select Platform</p>
                        <div className="grid grid-cols-5 gap-2">
                            {(Object.entries(PLATFORM_CONFIG) as [SocialPlatform, typeof PLATFORM_CONFIG[SocialPlatform]][]).map(([p, cfg]) => {
                                const isConnected = isPlatformConnected(p);
                                const isSelected = selected === p;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => handleSelect(p)}
                                        className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all text-center ${
                                            isSelected
                                                ? 'border-tm-purple bg-tm-purple/10 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                                                : 'border-tm-border bg-tm-bg hover:border-tm-purple/40'
                                        }`}
                                    >
                                        <span className="text-xl">{cfg.emoji}</span>
                                        <span className="text-[10px] font-semibold text-tm-muted">{cfg.label}</span>
                                        {canDirectPost && isConnected && p !== 'tiktok' && (
                                            <span className="absolute top-1 right-1 text-[8px] bg-emerald-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">⚡</span>
                                        )}
                                        {canDirectPost && isConnected && p === 'snapchat' && (
                                            <span className="absolute top-1 right-1 text-[8px] bg-emerald-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">🔗</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {canDirectPost && (
                            <p className="text-[10px] text-tm-muted mt-2">⚡ = connected for one-click posting</p>
                        )}
                    </div>

                    {/* Step 2: Context + Generate */}
                    {selected && !generatedPost && (
                        <div className="space-y-3">
                            <div>
                                <label htmlFor="customContext" className="text-[10px] uppercase tracking-wider text-tm-muted font-semibold block mb-1.5">
                                    Add personal context <span className="normal-case font-normal">(optional — makes AI output more authentic)</span>
                                </label>
                                <input
                                    id="customContext"
                                    type="text"
                                    value={customContext}
                                    onChange={(e) => setCustomContext(e.target.value)}
                                    placeholder='e.g. "I made 3 profitable trades last week using TradeMind signals"'
                                    className="w-full bg-tm-bg border border-tm-border rounded-xl px-4 py-2.5 text-sm text-white placeholder-tm-muted focus:outline-none focus:border-tm-purple transition-colors"
                                />
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full bg-tm-purple hover:bg-tm-purple/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                            >
                                {isGenerating
                                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
                                    : <><Sparkles className="w-4 h-4" /> Generate {PLATFORM_CONFIG[selected].label} Post</>
                                }
                            </button>
                        </div>
                    )}

                    {/* Step 3: Review & Edit */}
                    {generatedPost && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label htmlFor="postEditor" className="text-[10px] uppercase tracking-wider text-tm-muted font-semibold">
                                    Review & Edit
                                </label>
                                <button
                                    onClick={handleGenerate}
                                    disabled={isGenerating}
                                    className="text-xs text-tm-muted hover:text-white flex items-center gap-1 transition-colors"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Regenerating…' : 'Regenerate'}
                                </button>
                            </div>
                            <textarea
                                id="postEditor"
                                value={editedPost}
                                onChange={(e) => setEditedPost(e.target.value)}
                                rows={9}
                                className={`w-full bg-tm-bg border rounded-xl px-4 py-3 text-sm text-white placeholder-tm-muted focus:outline-none transition-colors resize-none leading-relaxed ${
                                    isOverLimit ? 'border-red-500/60' : 'border-tm-border focus:border-tm-purple'
                                }`}
                            />
                            {charLimit && (
                                <p className={`text-[11px] text-right ${isOverLimit ? 'text-red-400' : 'text-tm-muted'}`}>
                                    {editedPost.length} / {charLimit} characters
                                    {isOverLimit && <span className="ml-1">— over limit, please trim</span>}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Error / Success */}
                    {error && (
                        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                    {postSuccess && (
                        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-400">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <div>
                                <p className="font-bold">Posted successfully!</p>
                                <p className="text-xs text-tm-muted mt-0.5">Your code <span className="font-mono text-white">{promoCode}</span> is now live. Watch your referrals grow 🚀</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: CTA buttons */}
                    {generatedPost && !postSuccess && selected && (
                        <div className="space-y-2">
                            {/* TikTok, Snapchat, Reddit, YouTube — clipboard only approach */}
                            {(selected === 'tiktok' || selected === 'snapchat' || selected === 'reddit' || selected === 'youtube') && (
                                <button
                                    onClick={handleCopy}
                                    className="w-full bg-tm-surface border border-tm-border hover:border-tm-purple/40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                    {copied ? `Copied! Paste into ${PLATFORM_CONFIG[selected].label}` : 'Copy Text / Script'}
                                </button>
                            )}

                            {/* LinkedIn/Twitter/Facebook — Direct post (Diamond+) or Intent URL */}
                            {selected !== 'tiktok' && selected !== 'snapchat' && selected !== 'instagram' && selected !== 'reddit' && selected !== 'youtube' && (
                                <>
                                    {canDirectPost && isPlatformConnected(selected) ? (
                                        <button
                                            onClick={handleDirectPost}
                                            disabled={isPosting || isOverLimit}
                                            className="w-full bg-tm-purple hover:bg-tm-purple/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isPosting
                                                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Posting…</>
                                                : <><Send className="w-4 h-4" /> Post Directly to {PLATFORM_CONFIG[selected].label}</>
                                            }
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={handleIntentPost}
                                        disabled={isOverLimit}
                                        className="w-full bg-tm-surface border border-tm-border hover:border-tm-purple/40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        {canDirectPost && isPlatformConnected(selected) ? `Open in ${PLATFORM_CONFIG[selected].label}` : `Share on ${PLATFORM_CONFIG[selected].label}`}
                                    </button>
                                    {canDirectPost && !isPlatformConnected(selected) && (
                                        <p className="text-[11px] text-tm-muted text-center">
                                            <a href="/settings/social-connections" className="text-tm-purple hover:underline">Connect your {PLATFORM_CONFIG[selected].label} account</a> for one-click posting
                                        </p>
                                    )}
                                    {!canDirectPost && (
                                        <p className="text-[11px] text-tm-muted text-center">
                                            Reach <span className="text-white font-bold">Diamond tier</span> (15 referrals) to unlock one-click posting 💎
                                        </p>
                                    )}
                                </>
                            )}

                            {/* Instagram — clipboard + note */}
                            {selected === 'instagram' && (
                                <>
                                    {canDirectPost && isPlatformConnected(selected) && (
                                        <button
                                            onClick={handleDirectPost}
                                            disabled={isPosting}
                                            className="w-full bg-tm-purple hover:bg-tm-purple/90 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                        >
                                            {isPosting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Posting…</> : <><Send className="w-4 h-4" /> Post to Instagram</>}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleCopy}
                                        className="w-full bg-tm-surface border border-tm-border hover:border-tm-purple/40 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copied!' : 'Copy Caption'}
                                    </button>
                                    <p className="text-[11px] text-tm-muted text-center">Paste into your Instagram app and add a photo</p>
                                </>
                            )}

                            {/* Always-visible copy + share fallbacks */}
                            <div className="flex gap-2 pt-1">
                                {selected !== 'tiktok' && selected !== 'snapchat' && selected !== 'instagram' && selected !== 'reddit' && selected !== 'youtube' && (
                                    <button onClick={handleCopy} className="flex-1 text-xs text-tm-muted hover:text-white border border-tm-border rounded-xl py-2 flex items-center justify-center gap-1.5 transition-colors">
                                        {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copied ? 'Copied!' : 'Copy Text'}
                                    </button>
                                )}
                                {typeof navigator !== 'undefined' && 'share' in navigator && (
                                    <button onClick={handleWebShare} className="flex-1 text-xs text-tm-muted hover:text-white border border-tm-border rounded-xl py-2 flex items-center justify-center gap-1.5 transition-colors">
                                        📤 Share…
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
