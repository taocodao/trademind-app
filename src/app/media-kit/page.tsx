'use client';

import { useEffect, useState } from 'react';
import { Download, Video, FileText, Globe, Sparkles, ArrowLeft, RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Asset {
    id: number | string;
    title: string;
    description: string | null;
    file_url: string;
    file_type: 'video' | 'file';
    language: string | null;
    source: 'admin' | 'website';
    created_at: string;
}

const LANG_COLORS: Record<string, string> = {
    English:  'bg-blue-500/15 text-blue-300',
    Chinese:  'bg-red-500/15 text-red-300',
    Spanish:  'bg-yellow-500/15 text-yellow-300',
    Other:    'bg-white/10 text-zinc-400',
};

function LanguageBadge({ lang }: { lang: string | null }) {
    if (!lang) return null;
    return (
        <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${LANG_COLORS[lang] ?? LANG_COLORS.Other}`}>
            <Globe className="w-2.5 h-2.5" />{lang}
        </span>
    );
}

function SourceBadge({ source }: { source: 'admin' | 'website' }) {
    if (source === 'website') {
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">Website Asset</span>;
    }
    return null;
}

export default function MediaKitPage() {
    const [assets, setAssets]   = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab]         = useState<'videos' | 'files'>('videos');

    async function load() {
        setLoading(true);
        try {
            const res  = await fetch('/api/media-kit/assets');
            const data = await res.json();
            setAssets(data.assets ?? []);
        } catch { setAssets([]); }
        finally { setLoading(false); }
    }

    useEffect(() => { load(); }, []);

    const videos = assets.filter(a => a.file_type === 'video');
    const files  = assets.filter(a => a.file_type === 'file');

    return (
        <div className="min-h-screen bg-[#0D0D1A] text-white">

            {/* Header */}
            <div className="border-b border-white/8 bg-[#0D0D1A]/90 backdrop-blur-sm sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/refer" className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-zinc-500 hover:text-white">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-indigo-400" />
                                <h1 className="font-bold text-white text-lg">TradeMind Media Library</h1>
                            </div>
                            <p className="text-[11px] text-zinc-500">Download our videos and documents to share with your network</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} title="Refresh" className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-400 hover:bg-white/8 transition-all">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <Link href="/refer" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/20 transition-all">
                            <ExternalLink className="w-3.5 h-3.5" /> Share &amp; Earn
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="max-w-5xl mx-auto px-5 flex gap-1">
                    {([
                        ['videos', `Videos${videos.length ? ` (${videos.length})` : ''}`, Video],
                        ['files',  `Files${files.length   ? ` (${files.length})`   : ''}`, FileText],
                    ] as const).map(([t, label, Icon]) => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                                tab === t ? 'border-indigo-400 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}>
                            <Icon className="w-3.5 h-3.5" />{label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-5 py-8">

                {loading ? (
                    <div className="text-center py-24 text-zinc-600 text-sm">Loading library…</div>
                ) : (

                    /* ── Videos ── */
                    tab === 'videos' ? (
                        videos.length === 0 ? (
                            <EmptyState type="videos" />
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-5">
                                {videos.map(v => (
                                    <div key={v.id} className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden hover:border-white/15 transition-all">
                                        {/* Player */}
                                        <div className="relative bg-black aspect-video">
                                            <video src={v.file_url} controls preload="metadata" className="w-full h-full object-cover" />
                                        </div>

                                        {/* Info */}
                                        <div className="p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <h3 className="font-semibold text-white text-sm leading-snug">{v.title}</h3>
                                                <div className="flex gap-1 flex-shrink-0">
                                                    <LanguageBadge lang={v.language} />
                                                    <SourceBadge source={v.source} />
                                                </div>
                                            </div>
                                            {v.description && (
                                                <p className="text-[11px] text-zinc-500 leading-relaxed">{v.description}</p>
                                            )}
                                            <a href={v.file_url} download target="_blank" rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-1.5 w-full py-2 mt-1 rounded-xl text-xs font-semibold bg-white/6 hover:bg-white/10 border border-white/10 text-zinc-300 transition-all active:scale-[0.98]">
                                                <Download className="w-3.5 h-3.5" /> Download
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )

                    /* ── Files ── */
                    ) : (
                        files.length === 0 ? (
                            <EmptyState type="files" />
                        ) : (
                            <div className="space-y-3">
                                {files.map(f => (
                                    <div key={f.id} className="rounded-2xl border border-white/8 bg-white/2 flex items-center gap-4 px-5 py-4 hover:border-white/15 transition-all">
                                        {/* Icon */}
                                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-zinc-500" />
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="font-semibold text-white text-sm">{f.title}</p>
                                                <LanguageBadge lang={f.language} />
                                                <SourceBadge source={f.source} />
                                            </div>
                                            {f.description && (
                                                <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{f.description}</p>
                                            )}
                                        </div>

                                        {/* Download */}
                                        <a href={f.file_url} download target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/6 hover:bg-white/12 border border-white/10 text-zinc-300 transition-all active:scale-[0.97] flex-shrink-0">
                                            <Download className="w-3.5 h-3.5" /> Download
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )
                    )
                )}
            </div>
        </div>
    );
}

function EmptyState({ type }: { type: 'videos' | 'files' }) {
    return (
        <div className="text-center py-24 space-y-3">
            <div className="w-14 h-14 rounded-full bg-white/4 flex items-center justify-center mx-auto">
                {type === 'videos' ? <Video className="w-6 h-6 text-zinc-700" /> : <FileText className="w-6 h-6 text-zinc-700" />}
            </div>
            <p className="text-zinc-500 font-semibold text-sm">No {type} yet</p>
            <p className="text-xs text-zinc-700 max-w-xs mx-auto">
                {type === 'videos'
                    ? 'Our video library is being updated. Check back soon.'
                    : 'Documents and guides will appear here once published.'}
            </p>
        </div>
    );
}
