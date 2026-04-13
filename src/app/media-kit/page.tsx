'use client';

import { useState } from 'react';
import { Download, Image as ImageIcon, FileText, Copy, CheckCircle2, ExternalLink, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

// ── Media assets ────────────────────────────────────────────────────────────
const IMAGES = [
    {
        id: 'backtest-chart',
        title: '7-Year Backtest Chart',
        desc: 'TurboCore vs QQQ 2017–2024. Shows +21.4% in 2022 vs QQQ -33%. Ideal for LinkedIn, Twitter, Facebook.',
        file: '/media-kit/backtest-chart.png',
        formats: ['PNG 1200×630'],
        platforms: ['LinkedIn', 'X/Twitter', 'Facebook', 'YouTube'],
        tag: 'Widescreen',
    },
    {
        id: 'compounding-math',
        title: 'Compounding Math Graphic',
        desc: '$5k at 19 → $1M at 41. The math behind the 39% CAGR. Ideal for Instagram and TikTok carousel slides.',
        file: '/media-kit/compounding-math.png',
        formats: ['PNG 1080×1080'],
        platforms: ['Instagram', 'TikTok', 'Facebook', 'Snapchat'],
        tag: 'Square',
    },
    {
        id: 'signal-card',
        title: 'Daily Signal Card Mockup',
        desc: 'BULL signal notification card. Great for showing what users receive every day at 3PM ET.',
        file: '/media-kit/signal-card.png',
        formats: ['PNG 1080×1080'],
        platforms: ['Instagram', 'LinkedIn', 'X/Twitter', 'Snapchat'],
        tag: 'Square',
    },
];

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

// ── Tag badge ────────────────────────────────────────────────────────────────
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

// ── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/8 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.97]"
        >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : label}
        </button>
    );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function MediaKitPage() {
    const [activeTab, setActiveTab] = useState<'images' | 'copy'>('images');

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
                            <p className="text-[11px] text-zinc-500">Download assets and copy templates to create your referral posts</p>
                        </div>
                    </div>
                    <Link href="/refer" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-tm-purple/20 hover:bg-tm-purple/30 text-tm-purple border border-tm-purple/30 transition-all">
                        <ExternalLink className="w-3.5 h-3.5" />
                        Share & Earn
                    </Link>
                </div>

                {/* Tabs */}
                <div className="max-w-5xl mx-auto px-5 flex gap-1 pb-0">
                    {([['images', 'Images & Graphics', ImageIcon], ['copy', 'Copy Templates', FileText]] as const).map(([tab, label, Icon]) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                                activeTab === tab
                                    ? 'border-tm-purple text-white'
                                    : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-5 py-8">

                {activeTab === 'images' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-zinc-400">
                                {IMAGES.length} graphics ready to download. Click an image to preview full size.
                            </p>
                            <span className="text-[11px] text-zinc-600 bg-white/5 rounded-full px-3 py-1">
                                All assets are free to use for referral posts
                            </span>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {IMAGES.map(img => (
                                <div key={img.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden hover:border-white/15 transition-all group">
                                    {/* Image preview */}
                                    <a href={img.file} target="_blank" rel="noopener noreferrer" className="block relative overflow-hidden aspect-video bg-black/40">
                                        <Image
                                            src={img.file}
                                            alt={img.title}
                                            fill
                                            className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <span className="text-xs text-white font-semibold bg-black/60 rounded-lg px-3 py-1.5">View full size</span>
                                        </div>
                                        <span className="absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-tm-purple/80 text-white">
                                            {img.tag}
                                        </span>
                                    </a>

                                    {/* Info */}
                                    <div className="p-4 space-y-3">
                                        <div>
                                            <h3 className="font-semibold text-white text-sm">{img.title}</h3>
                                            <p className="text-[11px] text-zinc-500 mt-1 leading-relaxed">{img.desc}</p>
                                        </div>

                                        {/* Platform tags */}
                                        <div className="flex flex-wrap gap-1">
                                            {img.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                                        </div>

                                        {/* Format + Download */}
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="text-[10px] text-zinc-600">{img.formats[0]}</span>
                                            <a
                                                href={img.file}
                                                download
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/8 hover:bg-white/15 border border-white/10 text-zinc-300 transition-all active:scale-[0.97]"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Coming soon: Video section */}
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/2 p-8 text-center space-y-2 mt-4">
                            <div className="flex justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5 text-zinc-600" />
                                </div>
                            </div>
                            <h3 className="font-semibold text-zinc-400 text-sm">Video Templates — Coming Soon</h3>
                            <p className="text-xs text-zinc-600 max-w-sm mx-auto">
                                Animated signal reveal videos, backtest chart animations, and TikTok-ready clips will be added here.
                                Use the Copy Templates tab to get post copy you can pair with your own video content.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'copy' && (
                    <div className="space-y-4">
                        <p className="text-sm text-zinc-400">
                            Platform-optimized copy templates. Click Copy to grab the text — then paste into the creator or composer of your choice.
                            Replace <code className="text-tm-purple text-[11px] bg-tm-purple/10 px-1.5 py-0.5 rounded">[YOUR REFERRAL LINK]</code> with your personal link from the&nbsp;
                            <Link href="/refer" className="text-tm-purple underline underline-offset-2">Share & Earn</Link> page.
                        </p>

                        <div className="space-y-4">
                            {COPY_TEMPLATES.map(tpl => (
                                <div key={tpl.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                                    {/* Card header */}
                                    <div className="px-5 py-3 border-b border-white/6 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-white text-sm">{tpl.title}</h3>
                                            <div className="flex gap-1 flex-wrap">
                                                {tpl.platforms.map(p => <PlatformBadge key={p} name={p} />)}
                                            </div>
                                        </div>
                                        <CopyButton text={tpl.text} label="Copy Text" />
                                    </div>

                                    {/* Post preview */}
                                    <pre className="px-5 py-4 text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed font-sans">
                                        {tpl.text}
                                    </pre>
                                </div>
                            ))}
                        </div>

                        {/* Tips section */}
                        <div className="rounded-2xl border border-white/8 bg-gradient-to-br from-tm-purple/10 to-transparent p-5 space-y-3 mt-6">
                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-tm-purple" />
                                Tips for posting
                            </h3>
                            <ul className="space-y-2 text-xs text-zinc-400">
                                <li className="flex gap-2"><span className="text-tm-purple">•</span> <span><strong className="text-zinc-300">LinkedIn:</strong> Post between 10am–3pm Tue–Thu for maximum reach. No hashtags by default — test 0 vs 2–3.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span> <span><strong className="text-zinc-300">Instagram:</strong> Put hashtags in the first comment, not the caption. First 125 chars must hook before the "more" tap.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span> <span><strong className="text-zinc-300">TikTok:</strong> Record a 15–30 sec video — use the "POV: you check your QQQ in 2022" hook. Caption is secondary to the video.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span> <span><strong className="text-zinc-300">Facebook:</strong> Put your referral link in the first comment, not the post body — avoids the algorithm link penalty.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span> <span><strong className="text-zinc-300">Reddit:</strong> Build 500+ karma first. Post education-only content. Never include a referral link in the post body.</span></li>
                                <li className="flex gap-2"><span className="text-tm-purple">•</span> <span><strong className="text-zinc-300">Always add:</strong> "Not financial advice. Past performance does not guarantee future results." to every post.</span></li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
