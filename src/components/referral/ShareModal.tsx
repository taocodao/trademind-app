'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
    X, Sparkles, Copy, CheckCircle2, RefreshCw,
    AlertCircle, Link2, Share2, Rocket, Target, BookOpen, Smile, ExternalLink, Image as ImageIcon, Gift
} from 'lucide-react';
import type { SocialPlatform } from '@/lib/composio';
import { useTranslation } from 'react-i18next';

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
    linkedin:  { label: 'LinkedIn',  emoji: '💼', color: '#0A66C2', glowColor: 'rgba(10,102,194,0.35)',  canOAuth: true,  copyAction: 'text', hint: 'Post directly with one click (when connected), or copy and paste into LinkedIn.' },
    twitter:   { label: 'X/Twitter', emoji: '🐦', color: '#1D9BF0', glowColor: 'rgba(29,155,240,0.35)',  canOAuth: false, charLimit: 280, copyAction: 'text', hint: 'Opens X with your tweet pre-filled — just click Post.' },
    facebook:  { label: 'Facebook',  emoji: '📘', color: '#1877F2', glowColor: 'rgba(24,119,242,0.35)',  canOAuth: false, copyAction: 'text', hint: 'Opens Facebook share dialog with content pre-filled.' },
    instagram: { label: 'Instagram', emoji: '📸', color: '#E1306C', glowColor: 'rgba(225,48,108,0.35)',  canOAuth: false, copyAction: 'both', hint: 'Instagram doesn\'t support clickable links in feed captions. Copy the caption, then use "Copy Referral Link" for your bio or Story link sticker.' },
    tiktok:    { label: 'TikTok',    emoji: '🎵', color: '#FE2C55', glowColor: 'rgba(254,44,85,0.35)',   canOAuth: false, copyAction: 'both', hint: 'TikTok doesn\'t allow clickable external links. Copy the script (says "link in bio"), then add your referral URL to your profile bio.' },
    reddit:    { label: 'Reddit',    emoji: '👾', color: '#FF4500', glowColor: 'rgba(255,69,0,0.35)',    canOAuth: false, copyAction: 'text', hint: 'Opens Reddit submit page with your link and title pre-filled.' },
    youtube:   { label: 'YouTube',   emoji: '▶️', color: '#FF0000', glowColor: 'rgba(255,0,0,0.35)',     canOAuth: false, copyAction: 'text', hint: 'YouTube Community Posts support text + links (no video needed). Copy and paste in YouTube Studio → Community tab.' },
    snapchat:  { label: 'Snapchat',  emoji: '👻', color: '#F9C900', glowColor: 'rgba(249,201,0,0.25)',   canOAuth: false, copyAction: 'link', hint: 'Snapchat needs a photo or video. Copy the referral link to add as a "Link sticker" to your Snap.' },
};

// ── Intent URL builders (pre-populate platform composers) ────────────────────
// These open a popup with the content already filled in — no copy-paste needed.
function buildIntentUrl(platform: SocialPlatform, text: string, ogUrl: string): string | null {
    const encText = encodeURIComponent(text);
    const encUrl  = encodeURIComponent(ogUrl);
    switch (platform) {
        case 'twitter':  return `https://twitter.com/intent/tweet?text=${encText}`;
        case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${encText}`;
        case 'reddit':   return `https://www.reddit.com/submit?url=${encUrl}&title=${encodeURIComponent(text.split('\n')[0].slice(0, 300))}`;
        // LinkedIn shareArticle: pre-fills the link share + summary in the composer
        case 'linkedin': return `https://www.linkedin.com/shareArticle?mini=true&url=${encUrl}&summary=${encText}&source=TradeMind`;
        default:         return null;
    }
}

// ── Creator page URLs for platforms that can't pre-fill content via URL ──────
// These open the platform's upload/create page — user pastes the copied text.
const CREATOR_URLS: Partial<Record<SocialPlatform, string>> = {
    instagram: 'https://www.instagram.com/create/select/',
    tiktok:    'https://www.tiktok.com/creator-center/upload',
    youtube:   'https://studio.youtube.com/',
    // snapchat: web creator requires the app — clipboard-only
};

const CREATOR_COLORS: Partial<Record<SocialPlatform, string>> = {
    instagram: '#E1306C',
    tiktok:    '#010101',
    youtube:   '#FF0000',
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
    const { t } = useTranslation();

    // ── State ──────────────────────────────────────────────────────────────────
    const [platform, setPlatform]   = useState<SocialPlatform>('linkedin');
    const [template, setTemplate]   = useState<TemplateId>('campaign');
    const [tone, setTone]           = useState<ToneId>('professional');
    const [editedPost, setEditedPost] = useState('');
    const [postOptions, setPostOptions] = useState<{ label: string; text: string }[]>([]);
    const [selectedOption, setSelectedOption] = useState(0);

    const [isGenerating, setIsGenerating]   = useState(false);
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [showCustomize, setShowCustomize] = useState(false);
    const [customizeRequest, setCustomizeRequest] = useState('');
    const [copied, setCopied]             = useState(false);
    const [linkCopied, setLinkCopied]     = useState(false);
    const [intentOpened, setIntentOpened] = useState(false);
    const [shared, setShared]             = useState(false); // true after Share sheet triggered
    const [fromCache, setFromCache]       = useState(false);
    const [canShare, setCanShare]         = useState(false);
    const [error, setError]               = useState('');
    const [hasGenerated, setHasGenerated] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const cfg = PLATFORM_CFG[platform];

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

    // Detect Web Share API support (not available on Firefox desktop)
    useEffect(() => {
        setCanShare(typeof navigator !== 'undefined' && 'share' in navigator);
    }, []);

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
        setIntentOpened(false);
        setShared(false);
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

    // ── Generate ────────────────────────────────────────────────────────────────
    const handleGenerate = useCallback(async (forceRegenerate = false) => {
        setIsGenerating(true);
        setError('');
        setFromCache(false);
        try {
            const res = await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    templateStyle: template,
                    postMode: template === 'education' ? 'education' : 'referral',
                    tone,
                    forceRegenerate,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Generation failed');

            if (data.options) {
                // Campaign template returns hardcoded tone variants
                setPostOptions(data.options);
                const idx = tone === 'professional' ? 0 : tone === 'punchy' ? 1 : 2;
                const safeIdx = Math.min(idx, data.options.length - 1);
                setSelectedOption(safeIdx);
                setEditedPost(data.options[safeIdx].text);
            } else {
                setPostOptions([]);
                setEditedPost(data.post ?? '');
                setFromCache(!!data.fromCache);
            }
            setHasGenerated(true);
        } catch (err: any) {
            setError(err.message || 'Failed to generate. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    }, [platform, template, tone]);

    // Auto-generate on platform/template change — uses cache (forceRegenerate=false)
    useEffect(() => {
        if (!hasGenerated) {
            handleGenerate(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [platform, template]);

    // ── Bulk-generate all permutations on first modal open (background, non-blocking) ──────
    const bulkGenStarted = useRef(false);
    useEffect(() => {
        if (bulkGenStarted.current) return;
        bulkGenStarted.current = true;
        // Fire-and-forget — runs in background, doesn't block the UI
        fetch('/api/social/generate-all', { method: 'POST' })
            .then(r => r.json())
            .then(d => console.log('[ShareModal] Bulk-gen:', d.message))
            .catch(e => console.warn('[ShareModal] Bulk-gen failed:', e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Guided customization (Regenerate → user types request → OpenAI modifies) ──────
    const handleCustomize = useCallback(async () => {
        if (!customizeRequest.trim()) return;
        setIsCustomizing(true);
        setError('');
        setFromCache(false);
        try {
            const res = await fetch('/api/social/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform,
                    templateStyle: template,
                    postMode: template === 'education' ? 'education' : 'referral',
                    tone,
                    forceRegenerate: true,
                    customizationRequest: customizeRequest,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Customization failed');
            setEditedPost(data.post ?? '');
            setShowCustomize(false);
            setCustomizeRequest('');
        } catch (err: any) {
            setError(err.message || 'Failed to customize. Please try again.');
        } finally {
            setIsCustomizing(false);
        }
    }, [platform, template, tone, customizeRequest]);

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
        // Always pre-copy text to clipboard first (fallback if share is dismissed or unsupported)
        if (editedPost) await navigator.clipboard.writeText(editedPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);

        if (!navigator.share) return; // clipboard-only fallback (Firefox desktop, etc.)

        // Android quirk: include url in text field too — Android sometimes ignores the url field
        const textWithUrl = `${editedPost}\n\n${ogCardUrl}`;
        const shareData = {
            title: 'TradeMind AI Trading Signals',
            text: textWithUrl,
            url: ogCardUrl,
        };

        // canShare() guard — prevents silent failures on edge-case browsers
        if (!navigator.canShare(shareData)) return;

        try {
            await navigator.share(shareData);
            // Show persistent paste reminder after share sheet is triggered
            setShared(true);
        } catch (err) {
            // AbortError = user dismissed — that's fine, clipboard already copied
            if ((err as Error).name !== 'AbortError') console.error('[share]', err);
        }
    }, [editedPost, ogCardUrl]);

    // ── Open pre-populated platform composer ───────────────────────────────────
    // For Twitter, Facebook, Reddit — opens a named popup with content pre-filled.
    // Also pre-copies text to clipboard as a backup.
    const handleOpenIntent = useCallback(async () => {
        if (!editedPost) return;
        // Pre-copy text to clipboard (backup if popup is blocked or user wants to paste elsewhere)
        await navigator.clipboard.writeText(editedPost);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);

        const intentUrl = buildIntentUrl(platform, editedPost, ogCardUrl);
        if (!intentUrl) return;

        // Open in a named popup — reuses the same window if already open
        window.open(intentUrl, `ShareComposer_${platform}`, 'width=620,height=720,left=200,top=80');
        setIntentOpened(true);
    }, [editedPost, platform, ogCardUrl]);

    // ── LinkedIn direct post (Composio) REMOVED — now uses intent URL like other platforms ──

    // ── Open platform creator page (Instagram / TikTok / YouTube) ─────────────
    // Copies text to clipboard first, then opens the platform's upload/create page.
    const [creatorOpened, setCreatorOpened] = useState(false);
    const handleOpenCreator = useCallback(async () => {
        const url = CREATOR_URLS[platform];
        if (!url || !editedPost) return;
        try { await navigator.clipboard.writeText(editedPost); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch (_) { /* ignore */ }
        window.open(url, `Creator_${platform}`, 'noopener,noreferrer,width=1024,height=768');
        setCreatorOpened(true);
    }, [platform, editedPost]);

    // ── Char count (Twitter t.co aware) ───────────────────────────────────────
    const charCount   = platform === 'twitter' ? twitterCharCount(editedPost) : editedPost.length;
    const isOverLimit = cfg.charLimit ? charCount > cfg.charLimit : false;

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            {/* Modal — wider on desktop (max-w-2xl) */}
            <div className="relative z-10 w-full sm:max-w-2xl bg-[#141420] border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[calc(92dvh-4rem)] sm:max-h-[92dvh] mb-16 sm:mb-0 overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
                    <div>
                        <h2 className="text-white font-black text-lg tracking-tight">{t('share_earn.title', 'Share & Earn')}</h2>
                        <p className="text-zinc-500 text-[11px] mt-0.5">
                            Code <span className="text-tm-purple font-mono font-bold">{promoCode}</span>
                            {' '}· {t('share_earn.code_label', 'auto-applied in your link')}
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                        <X className="w-4 h-4 text-zinc-400" />
                    </button>
                </div>

                {/* ── Referral Description Banner ── */}
                <div className="mx-5 mb-1 flex items-start gap-2.5 bg-gradient-to-r from-tm-purple/15 to-green-500/10 border border-tm-purple/25 rounded-xl px-4 py-3">
                    <Gift className="w-4 h-4 text-tm-purple shrink-0 mt-0.5" />
                    <p className="text-[12px] text-zinc-300 leading-snug">
                        {t('share_earn.referral_desc', '💸 Refer a friend — you both earn $100 in free subscription days. Share your unique link and the rewards apply automatically.')}
                    </p>
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
                                onClick={() => { setShowCustomize(true); setCustomizeRequest(''); }}
                                disabled={isGenerating || isCustomizing}
                                className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all"
                            >
                                <RefreshCw className={`w-3 h-3 ${isCustomizing ? 'animate-spin' : ''}`} />
                                {isCustomizing ? 'Customizing…' : 'Regenerate'}
                            </button>
                        </div>
                    </div>

                    {/* ── Guided customization input ── */}
                    {showCustomize && (
                        <div className="flex flex-col gap-2 px-1">
                            <p className="text-xs text-zinc-400">What would you like to change?</p>
                            <textarea
                                autoFocus
                                value={customizeRequest}
                                onChange={e => setCustomizeRequest(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCustomize(); } }}
                                placeholder='e.g. "make it shorter", "add a question at the end", "focus on the 2022 crash story"'
                                rows={2}
                                className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-tm-purple/50 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCustomize}
                                    disabled={!customizeRequest.trim() || isCustomizing}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-tm-purple hover:bg-tm-purple/90 text-white disabled:opacity-40 transition-all"
                                >
                                    {isCustomizing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Customizing…</> : <><Sparkles className="w-3 h-3" /> Apply Changes</>}
                                </button>
                                <button
                                    onClick={() => { setShowCustomize(false); setCustomizeRequest(''); }}
                                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-300 border border-white/10 bg-white/5 transition-all"
                                >Cancel</button>
                            </div>
                        </div>
                    )}

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
                                <button onClick={() => handleGenerate(true)} className="text-xs text-tm-purple underline">Try again</button>
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {/* Campaign: no need for duplicate variant pills — the Tone row above handles it */}

                                {/* Editable textarea — taller on desktop */}
                                <textarea
                                    ref={textareaRef}
                                    value={editedPost}
                                    onChange={(e) => setEditedPost(e.target.value)}
                                    placeholder={t('share_earn.placeholder', 'Your AI-generated post will appear here…')}
                                    className="w-full bg-transparent text-zinc-200 text-sm leading-relaxed resize-none focus:outline-none placeholder:text-zinc-600 min-h-[200px] sm:min-h-[280px]"
                                    style={{ height: 'auto' }}
                                    rows={10}
                                />

                                {/* Char count + cache badge */}
                                {editedPost && (
                                    <div className="flex items-center justify-end gap-2">
                                        {fromCache && (
                                            <span className="text-[10px] text-zinc-600 bg-white/5 rounded-full px-2 py-0.5">cached</span>
                                        )}
                                        <p className={`text-[11px] ${isOverLimit ? 'text-red-400 font-medium' : 'text-zinc-600'}`}>
                                            {charCount}{cfg.charLimit ? ` / ${cfg.charLimit}` : ''}
                                            {isOverLimit && ' — over limit, please trim'}
                                            {platform === 'twitter' && !isOverLimit && charCount !== editedPost.length && (
                                                <span className="text-zinc-600"> (URLs auto-shortened by X)</span>
                                            )}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>


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

                        {/* PRIMARY: Open pre-populated composer (LinkedIn / Twitter / Facebook / Reddit) */}
                        {(() => {
                            const intentUrl = buildIntentUrl(platform, editedPost, ogCardUrl);
                            if (!intentUrl) return null;
                            const platformColors: Record<string, string> = {
                                linkedin: '#0A66C2',
                                twitter:  '#000000',
                                facebook: '#1877F2',
                                reddit:   '#FF4500',
                            };

                            // After intent opened: swap to a confirmation nudge
                            if (intentOpened) {
                                return (
                                    <div className="flex flex-col items-center gap-1.5 w-full py-3 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                            <CheckCircle2 className="w-4 h-4" />
                                            {cfg.label} composer opened!
                                        </div>
                                        <p className="text-[11px] text-zinc-400 text-center">
                                            Click <strong className="text-white">Post</strong> in that window to publish.
                                        </p>
                                        <button
                                            onClick={() => { setIntentOpened(false); handleOpenIntent(); }}
                                            className="text-[11px] text-zinc-500 hover:text-zinc-300 underline transition-colors"
                                        >
                                            Re-open
                                        </button>
                                    </div>
                                );
                            }

                            return (
                                <button
                                    onClick={handleOpenIntent}
                                    disabled={isOverLimit}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 text-white active:scale-[0.98] shadow-lg"
                                    style={{ backgroundColor: platformColors[platform] ?? '#6d28d9' }}
                                >
                                <Share2 className="w-4 h-4" />
                                    Open {cfg.label} · Text Copied to Clipboard
                                </button>
                            );
                        })()}

                        {/* PRIMARY (no intent URL): Instagram / TikTok / YouTube → open creator window */}
                        {!buildIntentUrl(platform, editedPost, ogCardUrl) && CREATOR_URLS[platform] && (
                            creatorOpened ? (
                                <div className="flex flex-col items-center gap-1.5 w-full py-3 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                        <CheckCircle2 className="w-4 h-4" />
                                        {cfg.label} creator opened · Text in clipboard
                                    </div>
                                    <p className="text-[11px] text-zinc-400 text-center">
                                        Paste your text <strong className="text-white">(Ctrl+V)</strong> into the composer and publish.
                                    </p>
                                    <button
                                        onClick={() => { setCreatorOpened(false); handleOpenCreator(); }}
                                        className="text-[11px] text-zinc-500 hover:text-zinc-300 underline transition-colors"
                                    >
                                        Re-open
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleOpenCreator}
                                    disabled={!editedPost}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40 text-white active:scale-[0.98] shadow-lg"
                                    style={{ backgroundColor: CREATOR_COLORS[platform] ?? '#6d28d9' }}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Open {cfg.label} Creator · Text Copied
                                </button>
                            )
                        )}

                        {/* PRIMARY (Snapchat): clipboard-only — no web creator available */}
                        {!buildIntentUrl(platform, editedPost, ogCardUrl) && !CREATOR_URLS[platform] && (
                            <button
                                onClick={copyText}
                                disabled={!editedPost}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all disabled:opacity-40
                                    bg-tm-purple hover:bg-tm-purple/90 text-white shadow-[0_4px_20px_rgba(168,85,247,0.35)] active:scale-[0.98]"
                            >
                                {copied
                                    ? <><CheckCircle2 className="w-4 h-4" /> Copied!</>
                                    : <><Copy className="w-4 h-4" /> Copy to Clipboard</>
                                }
                            </button>
                        )}

                        {/* Secondary row: More Apps + Copy Referral Link + Copy fallback */}
                        {canShare && (
                            <p className="text-[10px] text-zinc-600 text-center -mb-1">
                                <span className="text-zinc-500 font-medium">{t('share_earn.share_btn', 'Share…')}</span> opens your device&apos;s share panel — WhatsApp, Gmail, Discord, Outlook &amp; more
                            </p>
                        )}
                        <div className="flex gap-2">
                            {/* Web Share — only shown when browser supports navigator.share (not Firefox desktop) */}
                            {canShare && (
                                <button
                                    onClick={handleShare}
                                    disabled={!editedPost}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold
                                        bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.98] disabled:opacity-40"
                                >
                                    {shared
                                        ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> {t('share_earn.sent_copied', 'Sent · Text Copied')}</>
                                        : <><Share2 className="w-3.5 h-3.5" /> {t('share_earn.share_btn', 'Share…')}</>
                                    }
                                </button>
                            )}

                            {/* Copy Referral Link */}
                            <button
                                onClick={async () => { await copyText(); await copyLink(); }}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold
                                    bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.98]"
                            >
                                <Link2 className="w-3.5 h-3.5" />
                                {linkCopied ? 'Link Copied!' : 'Copy Referral Link'}
                            </button>

                            {/* Extra clipboard copy for intent-URL platforms */}
                            {buildIntentUrl(platform, editedPost, ogCardUrl) && (
                                <button
                                    onClick={copyText}
                                    className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold
                                        bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.98]"
                                    title="Copy text to clipboard"
                                >
                                    {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            )}
                        </div>


                        {/* Paste reminder — shown after Share sheet is triggered */}
                        {shared && (
                            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] leading-relaxed">
                                    <strong>Post copied to clipboard.</strong> Your content is ready — paste it with{' '}
                                    <kbd className="text-[10px] bg-emerald-900/40 border border-emerald-700/40 rounded px-1 py-0.5 font-mono">Ctrl+V</kbd>{' '}or{' '}
                                    <kbd className="text-[10px] bg-emerald-900/40 border border-emerald-700/40 rounded px-1 py-0.5 font-mono">⌘V</kbd>{' '}
                                    into any composer or message field.
                                </p>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <p className="text-[11px] text-red-400 text-center">{error}</p>
                        )}

                        {/* Media Kit link */}
                        <p className="text-center">
                            <a href="/media-kit" target="_blank" rel="noopener noreferrer" className="text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors inline-flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                Download images &amp; copy templates → Media Kit
                            </a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
