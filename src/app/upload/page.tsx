'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, CheckCircle2, AlertCircle, X, Video, FileText, Globe } from 'lucide-react';

interface Asset {
    id: number | string;
    title: string;
    description: string | null;
    file_url: string;
    file_type: 'video' | 'file';
    language: string | null;
    created_at: string;
}

const LANGUAGES = ['English', 'Chinese', 'Spanish', 'Other'];

export default function UploadPage() {
    const [assets, setAssets]         = useState<Asset[]>([]);
    const [loading, setLoading]       = useState(true);
    const [uploading, setUploading]   = useState(false);
    const [progress, setProgress]     = useState(0);
    const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
    const [dragOver, setDragOver]     = useState(false);

    // Form
    const [file, setFile]           = useState<File | null>(null);
    const [title, setTitle]         = useState('');
    const [description, setDesc]    = useState('');
    const [language, setLanguage]   = useState('English');
    const [fileType, setFileType]   = useState<'video' | 'file'>('file');

    const fileRef = useRef<HTMLInputElement>(null);

    function showToast(msg: string, ok = true) {
        setToast({ msg, ok });
        setTimeout(() => setToast(null), 3500);
    }

    async function loadAssets() {
        setLoading(true);
        try {
            const res  = await fetch('/api/media-kit/upload');
            const data = await res.json();
            setAssets(data.assets ?? []);
        } catch { setAssets([]); }
        finally { setLoading(false); }
    }

    useEffect(() => { loadAssets(); }, []);

    function handleFilePick(f: File) {
        setFile(f);
        const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
        setFileType(['mp4', 'mov', 'webm', 'avi'].includes(ext) ? 'video' : 'file');
    }

    async function handleUpload() {
        if (!file || !title.trim()) return;
        setUploading(true); setProgress(0);

        const form = new FormData();
        form.append('file', file);
        form.append('title', title.trim());
        form.append('description', description.trim());
        form.append('language', language);
        form.append('file_type', fileType);

        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/media-kit/upload');
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
            };
            xhr.onload = () => {
                if (xhr.status === 200) resolve();
                else reject(new Error(JSON.parse(xhr.responseText).error ?? 'Upload failed'));
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(form);
        }).then(() => {
            showToast('Uploaded successfully ✓');
            setFile(null); setTitle(''); setDesc(''); setLanguage('English'); setFileType('file'); setProgress(0);
            loadAssets();
        }).catch((e) => showToast(e.message, false))
          .finally(() => setUploading(false));
    }

    async function handleDelete(a: Asset) {
        if (!confirm(`Delete "${a.title}"? This removes the file from CDN.`)) return;
        const res = await fetch(`/api/media-kit/upload?id=${a.id}`, { method: 'DELETE' });
        if (res.ok) { showToast('Deleted'); loadAssets(); }
        else showToast('Delete failed', false);
    }

    return (
        <div className="min-h-screen bg-[#0D0D1A] text-white font-sans">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold border ${
                    toast.ok ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'
                }`}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            <div className="max-w-3xl mx-auto px-5 py-12 space-y-10">

                {/* Header */}
                <div>
                    <span className="text-[11px] font-bold tracking-widest text-indigo-400 bg-indigo-400/10 border border-indigo-400/20 px-3 py-1 rounded-full">ADMIN</span>
                    <h1 className="mt-3 text-2xl font-bold text-white">Media Library Upload</h1>
                    <p className="mt-1 text-sm text-zinc-500">Files uploaded here appear instantly on the user-facing <a href="/media-kit" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline underline-offset-2">Media Library</a>.</p>
                </div>

                {/* ── Upload form ── */}
                <div className="rounded-2xl border border-white/10 bg-white/3 p-6 space-y-5">
                    <h2 className="font-semibold text-white text-base">Upload New File</h2>

                    {/* Drop zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFilePick(f); }}
                        onClick={() => fileRef.current?.click()}
                        className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                            dragOver   ? 'border-indigo-400 bg-indigo-400/10' :
                            file       ? 'border-emerald-400/50 bg-emerald-400/5' :
                                         'border-white/10 hover:border-white/20 bg-white/2'
                        }`}
                    >
                        {file ? (
                            <div className="space-y-1">
                                <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                                <p className="text-sm font-semibold text-emerald-300">{file.name}</p>
                                <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB · click to change</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Upload className="w-7 h-7 text-zinc-600 mx-auto" />
                                <p className="text-sm text-zinc-400 font-medium">Drag & drop or click to select</p>
                                <p className="text-xs text-zinc-600">Videos (MP4, MOV), PDFs, images, or any file</p>
                            </div>
                        )}
                    </div>
                    <input ref={fileRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFilePick(f); }} />

                    {/* Progress */}
                    {uploading && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between text-xs text-zinc-400">
                                <span>Uploading to CDN…</span><span>{progress}%</span>
                            </div>
                            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Fields */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400">Title *</label>
                        <input value={title} onChange={e => setTitle(e.target.value)}
                            placeholder='e.g. "Introduction Video — English"'
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-400">Description</label>
                        <textarea value={description} onChange={e => setDesc(e.target.value)} rows={3}
                            placeholder="What this file is, who it's for, and how to use it"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Language */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400">Language</label>
                            <select value={language} onChange={e => setLanguage(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50">
                                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        {/* File type */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-400">Type</label>
                            <div className="flex gap-2">
                                {(['video', 'file'] as const).map(t => (
                                    <button key={t} onClick={() => setFileType(t)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all capitalize ${
                                            fileType === t ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-zinc-300'
                                        }`}>
                                        {t === 'video' ? <Video className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                                        {t === 'video' ? 'Video' : 'File / Doc'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button onClick={handleUpload} disabled={!file || !title.trim() || uploading}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg">
                        <Upload className="w-4 h-4" />
                        {uploading ? `Uploading ${progress}%…` : 'Upload & Publish'}
                    </button>
                </div>

                {/* ── Uploaded assets list ── */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-white text-base">Uploaded Files</h2>
                        <span className="text-xs text-zinc-600">{assets.length} file{assets.length !== 1 ? 's' : ''}</span>
                    </div>

                    {loading ? (
                        <p className="text-zinc-600 text-sm text-center py-8">Loading…</p>
                    ) : assets.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/8 p-10 text-center">
                            <p className="text-zinc-600 text-sm">No files uploaded yet.</p>
                        </div>
                    ) : (
                        assets.map(a => (
                            <div key={a.id} className="rounded-xl border border-white/8 bg-white/2 flex items-start gap-4 p-4">
                                {/* Icon */}
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                                    {a.file_type === 'video' ? <Video className="w-4 h-4 text-indigo-400" /> : <FileText className="w-4 h-4 text-zinc-500" />}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-white text-sm">{a.title}</p>
                                        {a.language && (
                                            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/8 text-zinc-400">
                                                <Globe className="w-2.5 h-2.5" />{a.language}
                                            </span>
                                        )}
                                    </div>
                                    {a.description && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{a.description}</p>}
                                    <a href={a.file_url} target="_blank" rel="noopener noreferrer"
                                        className="text-[11px] text-indigo-400 hover:underline truncate block mt-1">
                                        {a.file_url}
                                    </a>
                                </div>

                                {/* Delete */}
                                <button onClick={() => handleDelete(a)}
                                    className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0" title="Delete">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <p className="text-center text-xs text-zinc-700 pb-4">
                    This page is private. Keep the URL confidential.
                </p>
            </div>
        </div>
    );
}
