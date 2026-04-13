'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Eye, EyeOff, GripVertical, CheckCircle2, AlertCircle, X, Plus, Image as ImageIcon, Video, FileText } from 'lucide-react';

type FileType = 'image' | 'video' | 'copy';

interface Asset {
    id: number;
    title: string;
    description: string;
    file_url: string;
    file_type: FileType;
    tag: string;
    platforms: string[];
    formats: string[];
    sort_order: number;
    is_published: boolean;
    created_at: string;
}

const PLATFORM_OPTIONS = ['LinkedIn', 'X/Twitter', 'Facebook', 'Instagram', 'TikTok', 'YouTube', 'Reddit', 'Snapchat', 'Discord'];

const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
    image: <ImageIcon className="w-4 h-4" />,
    video: <Video className="w-4 h-4" />,
    copy:  <FileText className="w-4 h-4" />,
};

export default function AdminMediaKitPage() {
    const [assets, setAssets]         = useState<Asset[]>([]);
    const [loading, setLoading]       = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading]   = useState(false);
    const [progress, setProgress]     = useState(0);
    const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

    // Form state
    const [file, setFile]             = useState<File | null>(null);
    const [title, setTitle]           = useState('');
    const [description, setDescription] = useState('');
    const [fileType, setFileType]     = useState<FileType>('image');
    const [tag, setTag]               = useState('');
    const [platforms, setPlatforms]   = useState<string[]>([]);
    const [dragOver, setDragOver]     = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);

    function showToast(msg: string, ok = true) {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }

    // ── Load assets ──────────────────────────────────────────────────────────
    async function loadAssets() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/media-kit/upload');
            const data = await res.json();
            setAssets(data.assets ?? []);
        } catch { setAssets([]); }
        finally { setLoading(false); }
    }

    useEffect(() => { loadAssets(); }, []);

    // ── Upload ───────────────────────────────────────────────────────────────
    function handleFilePick(f: File) {
        setFile(f);
        // Auto-detect type
        if (f.type.startsWith('video/')) setFileType('video');
        else if (f.type.startsWith('image/')) setFileType('image');
    }

    async function handleUpload() {
        if (!file || !title.trim()) return;
        setUploading(true); setProgress(0);

        const form = new FormData();
        form.append('file', file);
        form.append('title', title.trim());
        form.append('description', description.trim());
        form.append('file_type', fileType);
        form.append('tag', tag.trim());
        form.append('platforms', JSON.stringify(platforms));
        form.append('sort_order', String(assets.length));

        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/admin/media-kit/upload');
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                if (xhr.status === 200) { resolve(); }
                else { reject(new Error(JSON.parse(xhr.responseText).error ?? 'Upload failed')); }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(form);
        }).then(() => {
            showToast('Asset uploaded and published ✓');
            setShowUpload(false);
            // Reset form
            setFile(null); setTitle(''); setDescription(''); setTag(''); setPlatforms([]); setFileType('image'); setProgress(0);
            loadAssets();
        }).catch((e) => {
            showToast(e.message, false);
        }).finally(() => setUploading(false));
    }

    // ── Toggle publish ───────────────────────────────────────────────────────
    async function togglePublish(a: Asset) {
        const res = await fetch(`/api/admin/media-kit/upload?id=${a.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_published: !a.is_published }),
        });
        if (res.ok) {
            showToast(a.is_published ? 'Asset unpublished' : 'Asset published ✓');
            loadAssets();
        }
    }

    // ── Delete ───────────────────────────────────────────────────────────────
    async function deleteAsset(a: Asset) {
        if (!confirm(`Delete "${a.title}"? This removes the file from the CDN.`)) return;
        const res = await fetch(`/api/admin/media-kit/upload?id=${a.id}`, { method: 'DELETE' });
        if (res.ok) { showToast('Asset deleted'); loadAssets(); }
        else { showToast('Delete failed', false); }
    }

    return (
        <div className="min-h-screen bg-[#0D0D1A] text-white">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold border transition-all ${
                    toast.ok ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'
                }`}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="border-b border-white/8 sticky top-0 z-10 bg-[#0D0D1A]/90 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[11px] font-bold tracking-wider text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-2 py-0.5 rounded-full">ADMIN</span>
                            <h1 className="text-xl font-bold text-white">Media Kit Manager</h1>
                        </div>
                        <p className="text-xs text-zinc-500">Upload assets to Vercel Blob CDN — published assets appear instantly on the user-facing Media Kit page.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <a href="/media-kit" target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 border border-white/10 px-3 py-1.5 rounded-lg transition-all">
                            Preview →
                        </a>
                        <button
                            onClick={() => setShowUpload(v => !v)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-tm-purple hover:bg-tm-purple/90 text-white transition-all shadow-lg"
                        >
                            <Plus className="w-4 h-4" /> Upload Asset
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

                {/* ── Upload form ── */}
                {showUpload && (
                    <div className="rounded-2xl border border-tm-purple/30 bg-tm-purple/5 p-6 space-y-5">
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-white">Upload New Asset</h2>
                            <button onClick={() => setShowUpload(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Drop zone */}
                        <div
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFilePick(f); }}
                            onClick={() => fileRef.current?.click()}
                            className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                                dragOver ? 'border-tm-purple bg-tm-purple/20' :
                                file ? 'border-emerald-400/40 bg-emerald-400/5' :
                                'border-white/10 hover:border-white/20 bg-white/3'
                            }`}
                        >
                            {file ? (
                                <div className="space-y-1">
                                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                                    <p className="text-sm font-semibold text-emerald-300">{file.name}</p>
                                    <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB — click to change</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Upload className="w-8 h-8 text-zinc-600 mx-auto" />
                                    <p className="text-sm text-zinc-400 font-medium">Drag & drop or click to select</p>
                                    <p className="text-xs text-zinc-600">Images (PNG, JPG, WebP), Videos (MP4, MOV), or any file</p>
                                </div>
                            )}
                        </div>
                        <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f); }} />

                        {/* Upload progress */}
                        {uploading && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Uploading to Vercel Blob CDN…</span>
                                    <span>{progress}%</span>
                                </div>
                                <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                    <div className="h-full bg-tm-purple rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        {/* Form fields */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400">Title *</label>
                                <input value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. 7-Year Backtest Chart"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-tm-purple/50" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400">Tag (optional badge)</label>
                                <input value={tag} onChange={e => setTag(e.target.value)}
                                    placeholder="e.g. Square, Widescreen, New"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-tm-purple/50" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)}
                                rows={2}
                                placeholder="Brief description of what this asset is for and which platforms to use it on"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-tm-purple/50 resize-none" />
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                            {/* File type */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400">Asset Type</label>
                                <div className="flex gap-2">
                                    {(['image', 'video', 'copy'] as FileType[]).map(t => (
                                        <button key={t} onClick={() => setFileType(t)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                                                fileType === t ? 'bg-tm-purple/20 border-tm-purple/50 text-tm-purple' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
                                            }`}>
                                            {FILE_TYPE_ICONS[t]} {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Platforms */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-zinc-400">Platforms</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {PLATFORM_OPTIONS.map(p => (
                                        <button key={p} onClick={() => setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                                                platforms.includes(p) ? 'bg-tm-purple/20 border-tm-purple/40 text-tm-purple' : 'bg-white/5 border-white/10 text-zinc-600 hover:text-zinc-400'
                                            }`}>
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleUpload}
                                disabled={!file || !title.trim() || uploading}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-tm-purple hover:bg-tm-purple/90 text-white disabled:opacity-40 transition-all"
                            >
                                <Upload className="w-4 h-4" />
                                {uploading ? `Uploading ${progress}%…` : 'Upload & Publish'}
                            </button>
                            <button onClick={() => setShowUpload(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-300 border border-white/10 bg-white/5 transition-all">
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Asset list ── */}
                {loading ? (
                    <div className="text-center py-20 text-zinc-600 text-sm">Loading assets…</div>
                ) : assets.length === 0 ? (
                    <div className="text-center py-20 space-y-3">
                        <Upload className="w-10 h-10 text-zinc-700 mx-auto" />
                        <p className="text-zinc-500 font-semibold">No assets yet</p>
                        <p className="text-xs text-zinc-600">Click "Upload Asset" to add your first image, video, or copy template.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs text-zinc-600">{assets.length} asset{assets.length !== 1 ? 's' : ''} — {assets.filter(a => a.is_published).length} published</p>
                        {assets.map(a => (
                            <div key={a.id} className={`rounded-2xl border ${a.is_published ? 'border-white/8 bg-white/3' : 'border-white/5 bg-white/1 opacity-60'} overflow-hidden transition-all`}>
                                <div className="flex gap-4 p-4 items-start">
                                    {/* Preview */}
                                    <div className="w-20 h-12 rounded-lg overflow-hidden bg-black/40 border border-white/8 flex-shrink-0 flex items-center justify-center">
                                        {a.file_type === 'video' ? (
                                            <video src={a.file_url} className="w-full h-full object-cover" muted preload="metadata" />
                                        ) : a.file_type === 'image' ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={a.file_url} alt={a.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <FileText className="w-5 h-5 text-zinc-600" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-zinc-500">{FILE_TYPE_ICONS[a.file_type]}</span>
                                            <p className="font-semibold text-white text-sm truncate">{a.title}</p>
                                            {a.tag && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-tm-purple/20 text-tm-purple rounded-full">{a.tag}</span>
                                            )}
                                            {!a.is_published && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-zinc-800 text-zinc-500 rounded-full">Hidden</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-zinc-500 truncate mb-1.5">{a.description || '—'}</p>
                                        <div className="flex flex-wrap gap-1">
                                            {a.platforms.map(p => (
                                                <span key={p} className="text-[9px] font-semibold px-1.5 py-0.5 bg-white/5 text-zinc-500 rounded-full">{p}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                                            className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/8 transition-all" title="View file">
                                            <GripVertical className="w-4 h-4" />
                                        </a>
                                        <button onClick={() => togglePublish(a)}
                                            className={`p-1.5 rounded-lg transition-all ${a.is_published ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/8'}`}
                                            title={a.is_published ? 'Unpublish (hide from users)' : 'Publish (make visible)'}>
                                            {a.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </button>
                                        <button onClick={() => deleteAsset(a)}
                                            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Delete permanently">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
