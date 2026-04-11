'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    X, Sparkles, Copy, CheckCircle2, RefreshCw, Send,
    AlertCircle, Link2, Share2, ChevronRight, Rocket, Target, BookOpen, Smile
} from 'lucide-react';
import type { SocialPlatform } from '@/lib/composio';
import { DIRECT_POST_PLATFORMS } from '@/lib/composio';

// ── Types ──────────────────────────────────────────────────────────────────────

type TemplateId = 'campaign' | 'results' | 'education' | 'casual';
type ToneId     = 'professional' | 'punchy' | 'casual';

interface Template { id: TemplateId; icon: React.ReactNode; label: string; desc: string }
interface Tone     { id: ToneId;     label: string }

const TEMPLATES: Template[] = [
    { id: 'campaign',   icon: <Rocket  className="w-3.5 h-3.5" />, label: 'Campaign',   desc: '39% Compound hook' },
    { id: 'results',    icon: <Target  className="w-3.5 h-3.5" />, label: 'Results',    desc: 'Share your wins' },
    { id: 'education',  icon: <BookOpen className="w-3.5 h-3.5" />, label: 'Education',  desc: 'Teach & soft CTA' },
    { id: 'casual',     icon: <Smile   className="w-3.5 h-3.5" />, label: 'Casual',     desc: 'Hype & conversational' },
];

const TONES: Tone[] = [
    { id: 'professional', label: 'Professional' },
    { id: 'punchy',       label: 'Punchy' },
    { id: 'casual',       label: 'Casual' },
];

// ── Platform configuration ─────────────────────────────────────────────────────

interface PlatformCfg {
    label:         string;
    emoji:         string;
    color:         string;
    glowColor:     string;
    canOAuth:      boolean;
    charLimit?:    number;
    // What the "Share..." / post action should do
    copyAction:    'text' | 'link' | 'both';    // what goes to clipboard
    hint:          string;                        // helper text shown under action bar
}

const PLATFORM_CFG: Record<SocialPlatform, PlatformCfg> = {
    linkedin:  { label: 'LinkedIn',  emoji: '💼', color: '#0A66C2', glowColor: 'rgba(10,102,194,0.35)',  canOAuth: true,  copyAction: 'text', hint: 'Text copied — paste into LinkedIn, or use Post Directly when connected.' },
    twitter:   { label: 'X/Twitter', emoji: '🐦', color: '#1D9BF0', glowColor: 'rgba(29,155,240,0.35)',  canOAuth: false, charLimit: 280, copyAction: 'text', hint: 'Tweet copied — open X and paste into the composer.' },
    facebook:  { label: 'Facebook',  emoji: '📘', color: '#1877F2', glowColor: 'rgba(24,119,242,0.35)',  canOAuth: false, copyAction: 'text', hint: 'Post copied — paste into Facebook. Or tap Share to open the OS share sheet.' },
    instagram: { label: 'Instagram', emoji: '📸', color: '#E1306C', glowColor: 'rgba(225,48,108,0.35)',  canOAuth: false, copyAction: 'both', hint: 'No clickable links in IG feed. Copy caption, then separately "Copy Referral Link" to put in your bio or Story link sticker.' },
    tiktok:    { label: 'TikTok',    emoji: '🎵', color: '#FE2C55', glowColor: 'rgba(254,44,85,0.35)',   canOAuth: false, copyAction: 'both', hint: 'Links not clickable in TikTok posts. Copy script (says "link in bio"), then Copy Referral Link to paste in your profile bio.' },
    reddit:    { label: 'Reddit',    emoji: '👾', color: '#FF4500', glowColor: 'rgba(255,69,0,0.35)',    canOAuth: false, copyAction: 'text', hint: 'Post copied — open Reddit, create a post, paste the title and body.' },
    youtube:   { label: 'YouTube',   emoji: '▶️', color: '#FF0000', glowColor: 'rgba(255,0,0,0.35)',     canOAuth: false, copyAction: 'text', hint: 'YouTube Community Posts support text + links (no video needed). Paste in YouTube Studio → Community tab.' },
    snapchat:  { label: 'Snapchat',  emoji: '👻', color: '#F9C900', glowColor: 'rgba(249,201,0,0.25)',   canOAuth: false, copyAction: 'link', hint: 'Snapchat needs a photo/video. Copy the referral link to add as a "Link sticker" in your Snap.' },
};

// Twitter t.co URL shortening — every URL counted as 23 chars
const TWITTER_URL_LEN = 23;
function twitterCharCount(text: string): number {
    return text.replace(/https?:\/\/\S+/g, () => 'x'.repeat(TWITTER_URL_LEN)).length;
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface ShareModalProps {
    promoCode: string;
    referralLink: string;
    userTier: string;
    isCreator: boolean;
    connectedPlatforms: Record<string, { status: string; connectedAt: string | null }>;
    onClose: () => void;
    onRefreshConnections?: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function ShareModal({
    promoCode, referralLink, connectedPlatforms, onClose, onRefreshConnections
}: ShareModalProps) {

    // ── State ──────────────────────────────────────────────────────────────────
    const [platform, setPlatform]   = useState<SocialPlatform>('linkedin');
    const [template, setTemplate]   = useState<TemplateId>('campaign');
    const [tone, setTone]           = useState<ToneId>('professional');
    const [editedPost, setEditedPost] = useState('');
    const [postOptions, setPostOptions] = useState<{ label: string; text: string }[]>([]);
    const [selectedOption, setSelectedOption] = useState(0);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isPosting, setIsPosting]     = useState(false);
    const [copied, setCopied]           = useState(false);
    const [linkCopied, setLinkCopied]   = useState(false);
    const [postSuccess, setPostSuccess] = useState(false);
    const [error, setError]             = useState('');
    const [hasGenerated, setHasGenerated] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cfg = PLATFORM_CFG[platform];
    const isLinkedInConnected = connectedPlatforms['linkedin']?.status === 'active';

    // OG card campaign URL (used as the share link)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://trademind.bot';
    const ogCardUrl = `${appUrl}/c/compounding?ref=${promoCode}`;

    // ── Auto-resize textarea ───────────────────────────────────────────────────
    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [editedPost]);

    // ── Re-listen for LinkedIn OAuth completion ────────────────────────────────
    useEffect(() => {
        const onFocus = () => onRefreshConnections?.();
        const onMsg   = (e: MessageEvent) => {
            if (e.data?.type === 'COMPOSIO_OAUTH_COMPLETE') {
                onRefreshConnections?.();
            }
        };
        window.addEventListener('focus', onFocus);
        window.addEventListener('message', onMsg);
        return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('message', onMsg); };
    }, [onRefreshConnections]);

    // ── Reset on platform/template change ─────────────────────────────────────
    const resetContent = () => {
        setEditedPost('');
        setPostOptions([]);
        setSelectedOption(0);
        setPostSuccess(false);
        setError('');
        setHasGenerated(false);
    };

    const handlePlatformChange = (p: SocialPlatform) => {
        setPlatform(p);
        resetContent();
    };

    const handleTemplateChange = (t: TemplateId) => {
        setTemplate(t);
        resetContent();
    };

    const handleToneChange = (t: ToneId) => {
        setTone(t);
        // If using campaign with pre-loaded options, just switch the option
        if (postOptions.length > 0) {
            const idx = t === 'professional' ? 0 : t === 'punchy' ? 1 : 2;
            const safeIdx = Math.min(idx, postOptions.length - 1);
            setSelectedOption(safeIdx);
            setEditedPost(postOptions[safeIdx].text);
        } else {
            resetContent();
        }
    };

    // ── Generate ───────────────────────────────────────────────────────────────
    const handleGenerate = useCallback(async () => {
        setIsGenerating(true);
        setError('');
        setPostSuccess(false);
        try {
            const res = await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    templateStyle: template,
                    // Map our tone to postMode for the API (education template → education mode)
                    postMode: template === 'education' ? 'education' : 'referral',
                    tone,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Generation failed');

            if (data.options) {
                // Campaign template returns tone variants
                setPostOptions(data.options);
                const idx = tone === 'professional' ? 0 : tone === 'punchy' ? 1 : 2;
                const safeIdx = Math.min(idx, data.options.length - 1);
                setSelectedOption(safeIdx);
                setEditedPost(data.options[safeIdx].text);
            } else {
                setPostOptions([]);
                setEditedPost(data.post ?? '');
            }
            setHasGenerated(true);
        } catch (err: any) {
            setError(err.message || 'Failed to generate. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [platform, template, tone]);

    // Auto-generate when platform/template is selected for the first time
    useEffect(() => {
        if (!hasGenerated) {
            handleGenerate();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platform, template]);

    // ── Clipboard helpers ──────────────────────────────────────────────────────
    const copyText = useCallback(async () => {
        if (!editedPost) return;
        await navigator.clipboard.writeText(editedPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    }, [editedPost]);

    const copyLink = useCallback(async () => {
        await navigator.clipboard.writeText(ogCardUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 3000);
    }, [ogCardUrl]);

    // ── Web Share API ──────────────────────────────────────────────────────────
    const handleShare = useCallback(async () => {
        // Always pre-copy text to clipboard first
        if (editedPost) await navigator.clipboard.writeText(editedPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);

        if (!navigator.share) return; // clipboard-only fallback
        try {
            await navigator.share({
                title: 'TradeMind AI Trading Signals',
                text: editedPost,
                url: ogCardUrl,
            });
        } catch {
            // User dismissed the share sheet — clipboard already copied, that's fine
        }
    }, [editedPost, ogCardUrl]);

    // ── LinkedIn direct post ───────────────────────────────────────────────────
    const handleDirectPost = useCallback(async () => {
        if (!editedPost) return;
        // Pre-copy to clipboard
        await navigator.clipboard.writeText(editedPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);

        setIsPosting(true);
        setError('');
        try {
            const res = await fetch('/api/social/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform: 'linkedin', postContent: editedPost, promoCode, referralLink }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Post failed');
            setPostSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Failed to post. Please try again.');
        } finally {
            setIsPosting(false);
        }
    }, [editedPost, promoCode, referralLink]);

    // ── Char count (Twitter t.co aware) ───────────────────────────────────────
    const charCount   = platform === 'twitter' ? twitterCharCount(editedPost) : editedPost.length;
    const isOverLimit = cfg.charLimit ? charCount > cfg.charLimit : false;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full sm:max-w-lg bg-[#141420] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh] overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                    <div>
                        <h2 className="text-white font-black text-lg tracking-tight">Share & Earn</h2>
                        <p className="text-zinc-500 text-[11px] mt-0.5">
                            Code <span className="text-tm-purple font-mono font-bold">{promoCode}</span>
                            {' '}· auto-applied in your link
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>

                {/* ── Scrollable Body ── */}
                <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4 min-h-0">

                    {/* ── Platform selector ── */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Platform</p>
                        <div className="flex flex-wrap gap-1.5">
                            {(Object.keys(PLATFORM_CFG) as SocialPlatform[]).map((p) => {
                                const pc = PLATFORM_CFG[p];
                                const active = platform === p;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => handlePlatformChange(p)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                            active
                                                ? 'text-white border-transparent shadow-lg'
                                                : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                                        }`}
                                        style={active ? { backgroundColor: pc.color, boxShadow: `0 0 12px ${pc.glowColor}` } : undefined}
                                    >
                                        <span>{pc.emoji}</span>
                                        <span>{pc.label}</span>
                                        {p === 'linkedin' && isLinkedInConnected && (
                                            <span className="w-3.5 h-3.5 bg-emerald-400 rounded-full flex items-center justify-center text-[8px] text-black font-black">✓</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Template selector ── */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Template</p>
                        <div className="flex gap-1.5 flex-wrap">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleTemplateChange(t.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                        template === t.id
                                            ? 'bg-tm-purple border-tm-purple text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                            : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/8'
                                    }`}
                                >
                                    {t.icon}
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Tone selector ── */}
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-2">Tone</p>
                        <div className="flex gap-1.5">
                            {TONES.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => handleToneChange(t.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                        tone === t.id
                                            ? 'bg-white/15 border-white/30 text-white'
                                            : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white hover:bg-white/8'
                                    }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all"
                            >
                                <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                                {isGenerating ? 'Generating…' : 'Regenerate'}
                            </button>
                        </div>
                    </div>

                    {/* ── Content area ── */}
                    <div className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-12">
                                <Sparkles className="w-6 h-6 text-tm-purple animate-pulse" />
                                <p className="text-zinc-500 text-sm">Generating your {template} post…</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center gap-3 py-10 px-4 text-center">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                                <p className="text-red-400 text-sm">{error}</p>
                                <button onClick={handleGenerate} className="text-xs text-tm-purple underline">Try again</button>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {/* Campaign variant pills */}
                                {postOptions.length > 0 && (
                                    <div className="flex gap-1.5">
                                        {postOptions.map((opt, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setSelectedOption(i); setEditedPost(opt.text); }}
                                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                                                    selectedOption === i
                                                        ? 'bg-tm-purple/20 border-tm-purple/50 text-tm-purple'
                                                        : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'
                                                }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Editable textarea */}
                                <textarea
                                    ref={textareaRef}
                                    value={editedPost}
                                    onChange={(e) => setEditedPost(e.target.value)}
                                    placeholder="Your AI-generated post will appear here…"
                                    className="w-full bg-transparent text-zinc-200 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-zinc-600 min-h-[120px]"
                                    style={{ height: 'auto' }}
                                    rows={6}
                                />

                                {/* Char count */}
                                {editedPost && (
                                    <p className={`text-[11px] text-right ${isOverLimit ? 'text-red-400 font-medium' : 'text-zinc-600'}`}>
                                        {charCount}{cfg.charLimit ? ` / ${cfg.charLimit}` : ''}
                                        {isOverLimit && ' — over limit, please trim'}
                                        {platform === 'twitter' && !isOverLimit && charCount !== editedPost.length && (
                                            <span className="text-zinc-600"> (URLs auto-shortened by X)</span>
                                        )}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── Success banner (LinkedIn direct post) ── */}
                    {postSuccess && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <p className="text-emerald-400 text-sm font-semibold">Posted to LinkedIn successfully!</p>
                        </div>
                    )}

                    {/* ── Channel-specific hint ── */}
                    {!isGenerating && editedPost && (
                        <p className="text-[11px] text-zinc-500 leading-relaxed text-center px-2">
                            {cfg.hint}
                        </p>
                    )}
                </div>

                {/* ── Action bar (fixed at bottom) ── */}
                {!isGenerating && editedPost && (
                    <div className="px-5 pt-3 pb-5 border-t border-white/8 shrink-0 space-y-2.5 bg-[#141420]">

                        {/* Primary: Copy to Clipboard */}
                        <button
                            onClick={copyText}
                            disabled={!editedPost || isOverLimit}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40
                                bg-tm-purple hover:bg-tm-purple/90 text-white shadow-[0_4px_20px_rgba(168,85,247,0.35)] active:scale-[0.98]"
                        >
                            {copied
                                ? <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                                : <><Copy className="w-4 h-4" /> Copy to Clipboard</>
                            }
                        </button>

                        {/* Secondary row */}
                        <div className="flex gap-2">
                            {/* Web Share */}
                            <button
                                onClick={handleShare}
                                disabled={!editedPost}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold
                                    bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.98] disabled:opacity-40"
                            >
                                <Share2 className="w-3.5 h-3.5" />
                                Share…
                            </button>

                            {/* Copy Referral Link */}
                            <button
                                onClick={async () => { await copyText(); await copyLink(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold
                                    bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.98]"
                            >
                                <Link2 className="w-3.5 h-3.5" />
                                {linkCopied ? 'Link Copied!' : 'Copy Referral Link'}
                            </button>
                        </div>

                        {/* LinkedIn: Post Directly (only when connected) */}
                        {platform === 'linkedin' && (
                            <div className="flex justify-center">
                                {isLinkedInConnected ? (
                                    <button
                                        onClick={handleDirectPost}
                                        disabled={isPosting || !editedPost || postSuccess}
                                        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold transition-colors disabled:opacity-40"
                                    >
                                        {isPosting
                                            ? <><RefreshCw className="w-3 h-3 animate-spin" /> Posting…</>
                                            : postSuccess
                                            ? <><CheckCircle2 className="w-3 h-3" /> Posted!</>
                                            : <><Send className="w-3 h-3" /> Post directly to LinkedIn (1-click)</>
                                        }
                                    </button>
                                ) : (
                                    <a
                                        href="/settings"
                                        className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                                        onClick={onClose}
                                    >
                                        Connect LinkedIn in Settings for 1-click posting
                                        <ChevronRight className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Error */}
                        {error && !isPosting && (
                            <p className="text-[11px] text-red-400 text-center">{error}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
