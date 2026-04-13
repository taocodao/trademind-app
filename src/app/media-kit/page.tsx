'use client';

import { useEffect, useState } from 'react';
import { Download, Image as ImageIcon, FileText, Video, Copy, CheckCircle2, ExternalLink, ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Asset {
    id: number;
    title: string;
    description: string;
    file_url: string;
    file_type: 'image' | 'video' | 'copy';
    tag: string;
    platforms: string[];
    formats: string[];
}

// ── Static copy templates (always shown, not DB-driven) ──────────────────────
const COPY_TEMPLATES = [
    {
        id: 'hook-tweet',
        title: 'Hook Tweet (X/Twitter)',
        platforms: ['X/Twitter'],
        text: `In 2022, QQQ was down 33%.\nOne backtested algo was up +21.4%.\n\nHere's how. 🧵`,
    },
    {
        id: 'linkedin-results',
        title: 'LinkedIn — Results Post',
        platforms: ['LinkedIn'],
        text: `In 2022, the QQQ lost 33%.\nMost retail investors lost money that year.\nOne backtested strategy returned +21.4% the same year.\n\nThe key was regime detection — knowing when the market was trending vs. range-bound.\n\nTradeMind tracks four real-time signals. Every day at 3PM ET, it outputs one of three states: BULL, SIDEWAYS, or BEAR.\n\n7-year backtest (2017–2024): 39% annualized return.\nQQQ returned 15% over the same period.\n\nPast performance does not guarantee future results. Not financial advice.\n\nFree trial → [YOUR REFERRAL LINK]`,
    },
    {
        id: 'instagram-caption',
        title: 'Instagram Caption (Carousel)',
        platforms: ['Instagram'],
        text: `3 things your brokerage won't tell you about market regimes 👇\n\nMost traders lose money in bear markets because they're playing the wrong game. The market has 3 modes: BULL, SIDEWAYS, and BEAR. Trade them differently and everything changes.\n\nOur AI detects which regime we're in — every day at 3PM ET.\n\n7-year backtest: 39% CAGR vs QQQ's 15%. In 2022 when QQQ crashed 33%, this strategy was up +21.4%.\n\nFree trial → link in bio 👆\n\nNot financial advice. Backtested results do not guarantee future performance.\n\n#AlgoTrading #OptionsTrading #TradingSignals #TechnicalAnalysis #StockTrading #InvestingTips #StockMarket`,
    },
    {
        id: 'tiktok-caption',
        title: 'TikTok Caption',
        platforms: ['TikTok'],
        text: `How I knew to stay hedged in 2022 👇 link in bio for free trial\n\n#FinTok #TradingStrategy #StockMarket #AlgoTrading\n\nNot financial advice.`,
    },
    {
        id: 'reddit-title',
        title: 'Reddit Post Title',
        platforms: ['Reddit'],
        text: `How hidden Markov models detect market regimes — explained with real examples from 2022`,
    },
    {
        id: 'discord-message',
        title: 'Discord / Community Message',
        platforms: ['Discord', 'Telegram', 'Slack'],
        text: `Wild stat: A 19-year-old investing $5k at a 39% annual return becomes a millionaire at 41.\n\nThat's the math TradeMind is built on. Their AI sends a BULL/BEAR signal every day at 3PM — 7-year backtest shows 39% CAGR (3x S&P 500).\n\nMade +21% in 2022 while QQQ crashed 33%.\n\nFree trial here: [YOUR REFERRAL LINK]\n\n(Not financial advice)`,
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function PlatformBadge({ name }: { name: string }) {
    const colors: Record<string, string> = {
        'LinkedIn':  'bg-[#0A66C2]/20 text-[#5AA5F0]',
        'X/Twitter': 'bg-white/10 text-zinc-300',
        'Facebook':  'bg-[#1877F2]/20 text-[#6BABFF]',
        'Instagram': 'bg-[#E1306C]/20 text-[#F06090]',
        'TikTok':    'bg-white/10 text-zinc-300',
        'YouTube':   'bg-[#FF0000]/20 text-[#FF6060]',
        'Reddit':    'bg-[#FF4500]/20 text-[#FF7A40]',
        'Snapchat':  'bg-[#FFFC00]/10 text-[#FFFC00]',
        'Discord':   'bg-[#5865F2]/20 text-[#8EA4FF]',
        'Telegram':  'bg-[#0088CC]/20 text-[#40B8F0]',
        'Slack':     'bg-[#4A154B]/20 text-[#E01E5A]',
    };
    return (
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[name] ?? 'bg-white/10 text-zinc-400'}`}>
            {name}
        </span>
    );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.97]">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : label}
        </button>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MediaKitPage() {
    const [activeTab, setActiveTab] = useState<'images' | 'videos' | 'copy'>('images');
    const [assets, setAssets]       = useState<Asset[]>([]);
    const [loading, setLoading]     = useState(true);

    async function loadAssets() {
        setLoading(true);
        try {
            const res  = await fetch('/api/media-kit/assets');
            const data = await res.json();
            setAssets(data.assets ?? []);
        } catch { setAssets([]); }
        finally { setLoading(false); }
    }

    useEffect(() => { loadAssets(); }, []);

    const images = assets.filter(a => a.file_type === 'image');
    const videos = assets.filter(a => a.file_type === 'video');

    return (
        <div className="min-h-screen bg-[#0D0D1A] text-white">
            {/* Header */}
            <div className="border-b border-white/8 bg-[#0D0D1A]/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/refer" className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-zinc-500 hover:text-white">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-tm-purple" />
                                <h1 className="font-bold text-white text-lg">TradeMind Media Kit</h1>
                            </div>
                            <p className="text-[11px] text-zinc-500">Download assets and copy templates to create your own referral posts</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={loadAssets} className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-white/8 transition-all" title="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <Link href="/refer" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-tm-purple/20 hover:bg-tm-purple/30 text-tm-purple border border-tm-purple/30 transition-all">
                            <ExternalLink className="w-3.5 h-3.5" />
                            Share & Earn
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-5xl mx-auto px-5 flex gap-1 pb-0">
                    {([
                        ['images', `Images${images.length ? ` (${images.length})` : ''}`, ImageIcon],
                        ['videos', `Videos${videos.length ? ` (${videos.length})` : ''}`, Video],
                        ['copy',   'Copy Templates', FileText],
                    ] as const).map(([tab, label, Icon]) => (
                        <button key={tab} onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                                activeTab === tab ? 'border-tm-purple text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}>
                            <Icon className="w-3.5 h-3.5" /> {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-5 py-8">

                {/* ── Images tab ── */}
                {activeTab === 'images' && (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="text-center py-20 text-zinc-600 text-sm">Loading assets…</div>
                        ) : images.length === 0 ? (
                            <div className="text-center py-20 space-y-2">
                                <ImageIcon className="w-10 h-10 text-zinc-700 mx-auto" />
                                <p className="text-zinc-500 font-semibold text-sm">No images yet</p>
                                <p className="text-xs text-zinc-600">Check back soon — images and graphics will be added here by the TradeMind team.</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-zinc-400">{images.length} graphic{images.length !== 1 ? 's' : ''} ready to download.</p>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {images.map(img => (
                                        <div key={img.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden hover:border-white/15 transition-all group">
                                            <a href={img.file_url} target="_blank" rel="noopener noreferrer"
                                                className="block relative overflow-hidden aspect-video bg-black/40">
                                                <Image src={img.file_url} alt={img.title} fill className="object-cover group-hover:scale-[1.02] transition-transform duration-300" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="text-xs text-white font-semibold bg-black/60 rounded-lg px-3 py-1.5">View full size</span>
                                                </div>
                                                {img.tag && (
                                                    <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-tm-purple/80 text-white">{img.tag}</span>
                                                )}
                                            </a>
                                            <div className="p-4 space-y-3">
                                                <div>
                                                    <h3 className="font-semibold text-white text-sm">{img.title}</h3>
                                                    <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{img.description}</p>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {img.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                                                </div>
                                                <div className="flex items-center justify-between pt-1">
                                                    <span className="text-[10px] text-zinc-600">{img.formats?.[0] ?? ''}</span>
                                                    <a href={img.file_url} download
                                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/8 hover:bg-white/15 border border-white/10 text-zinc-300 transition-all active:scale-[0.97]">
                                                        <Download className="w-3.5 h-3.5" /> Download
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Videos tab ── */}
                {activeTab === 'videos' && (
                    <div className="space-y-6">
                        {loading ? (
                            <div className="text-center py-20 text-zinc-600 text-sm">Loading…</div>
                        ) : videos.length === 0 ? (
                            <div className="text-center py-20 space-y-3">
                                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                                    <Sparkles className="w-6 h-6 text-zinc-600" />
                                </div>
                                <h3 className="font-semibold text-zinc-400 text-sm">Video Templates — Coming Soon</h3>
                                <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                                    Animated signal reveal videos, backtest chart animations, and TikTok-ready clips will be added here.
                                    Use the Copy Templates tab to get post copy you can pair with your own video content.
                                </p>
                            </div>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-5">
                                {videos.map(v => (
                                    <div key={v.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                                        <video src={v.file_url} controls className="w-full aspect-video bg-black" preload="metadata" />
                                        <div className="p-4 space-y-2">
                                            <h3 className="font-semibold text-white text-sm">{v.title}</h3>
                                            <p className="text-[11px] text-zinc-500">{v.description}</p>
                                            <div className="flex flex-wrap gap-1">
                                                {v.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                                            </div>
                                            <a href={v.file_url} download
                                                className="mt-2 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all">
                                                <Download className="w-3.5 h-3.5" /> Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Copy templates tab ── */}
                {activeTab === 'copy' && (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400">
                            Platform-optimized copy templates. Replace{' '}
                            <code className="text-tm-purple text-[11px] bg-tm-purple/10 px-1.5 py-0.5 rounded">[YOUR REFERRAL LINK]</code>{' '}
                            with your personal link from the{' '}
                            <Link href="/refer" className="text-tm-purple underline underline-offset-2">Share & Earn</Link> page.
                        </p>

                        <div className="space-y-4">
                            {COPY_TEMPLATES.map(tpl => (
                                <div key={tpl.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                                    <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-white text-sm">{tpl.title}</h3>
                                            <div className="flex gap-1 flex-wrap">
                                                {tpl.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                                            </div>
                                        </div>
                                        <CopyButton text={tpl.text} label="Copy Text" />
                                    </div>
                                    <pre className="px-5 py-4 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed font-sans">{tpl.text}</pre>
                                </div>
                            ))}
                        </div>

                        {/* Tips */}
                        <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-tm-purple/10 to-transparent p-5 space-y-3 mt-6">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-tm-purple" /> Posting tips
                            </h3>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li className="flex gap-2"><span className="text-tm-purple">•</span><span><strong className="text-zinc-300">LinkedIn:</strong> Post Tue–Thu 10am–3pm ET. Zero hashtags for now (test later).</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span><span><strong className="text-zinc-300">Instagram:</strong> Put hashtags in first comment. First 125 chars must hook before "more".</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span><span><strong className="text-zinc-300">TikTok:</strong> 15–30s video. Hook within 3 seconds. Caption is secondary.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span><span><strong className="text-zinc-300">Facebook:</strong> Put your referral URL in the first comment — not the post body.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span><span><strong className="text-zinc-300">Reddit:</strong> Build 500+ karma first. Education-only posts. No referral links in body.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span><span><strong className="text-zinc-300">All posts:</strong> "Not financial advice. Past performance does not guarantee future results."</span></li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
