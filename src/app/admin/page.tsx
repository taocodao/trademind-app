'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import NewsletterTools from '@/components/admin/NewsletterTools';
import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import {
    Upload,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Database,
    ShieldAlert,
    LogIn,
} from 'lucide-react';

const ADMIN_EMAIL = 'support@trademind.bot';

interface ImportResult {
    batch: string;
    totalRows: number;
    inserted: number;
    updated: number;
    skippedRows: { line: number; reason: string }[];
    columnsImported: number;
    columnsSkippedThisFile: string[];
    templateSkippedColumns: string[];
}

interface BatchRow {
    batch: string;
    n: number;
    last_import: string;
}

export default function AdminPage() {
    const { ready, authenticated, user } = usePrivy();
    const email = user?.email?.address?.trim().toLowerCase() ?? null;
    const isAdmin = !!email && email === ADMIN_EMAIL;

    if (!ready) {
        return (
            <main className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC] px-6 py-24 text-center text-sm text-[#8B95A9]">
                Loading...
            </main>
        );
    }

    if (!authenticated) {
        return (
            <main className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC] px-6 py-24">
                <div className="mx-auto max-w-md rounded-2xl border border-[#232333] bg-[#14141f] p-8 text-center">
                    <LogIn className="mx-auto h-8 w-8 text-[#8B5CF6]" />
                    <h1 className="mt-4 text-xl font-bold">Admin</h1>
                    <p className="mt-2 text-sm text-[#8B95A9]">
                        This area is restricted. Sign in with the admin account to continue.
                    </p>
                    <Link
                        href="/signin"
                        className="mt-6 inline-block rounded-lg bg-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
                    >
                        Sign in
                    </Link>
                </div>
            </main>
        );
    }

    if (!isAdmin) {
        return (
            <main className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC] px-6 py-24">
                <div className="mx-auto max-w-md rounded-2xl border border-[#232333] bg-[#14141f] p-8 text-center">
                    <ShieldAlert className="mx-auto h-8 w-8 text-red-400" />
                    <h1 className="mt-4 text-xl font-bold">Access denied</h1>
                    <p className="mt-2 text-sm text-[#8B95A9]">
                        This area is only available to {ADMIN_EMAIL}.
                        {email ? ` You are signed in as ${email}.` : ''}
                    </p>
                </div>
            </main>
        );
    }

    return <AdminConsole email={email!} />;
}

/* ── Admin console: lead list import + database overview ─────────────────── */

function AdminConsole({ email }: { email: string }) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [busy, setBusy] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const [total, setTotal] = useState<number | null>(null);
    const [batches, setBatches] = useState<BatchRow[]>([]);

    const fileRef = useRef<HTMLInputElement>(null);

    const [needsProvisioning, setNeedsProvisioning] = useState<string | null>(null);

    const loadStats = useCallback(async () => {
        try {
            const res = await fetch('/api/leads/import');
            const data = await res.json();
            if (res.ok) {
                setTotal(data.total);
                setBatches(data.batches ?? []);
            } else if (res.status === 503) {
                // Admin account id not pinned yet: show it for one-time setup.
                const who = await fetch('/api/admin/whoami');
                const whoData = await who.json();
                if (whoData.did) setNeedsProvisioning(whoData.did);
                else setError(data?.error ?? 'Could not load stats');
            } else {
                setError(data?.error ?? 'Could not load stats');
            }
        } catch { /* stats are nice-to-have */ }
    }, []);

    useEffect(() => { loadStats(); }, [loadStats]);

    function pickFile(f: File | null) {
        setFile(f);
        setResult(null);
        setError(null);
        if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    }

    async function doImport() {
        if (!file || busy) return;
        setBusy(true);
        setResult(null);
        setError(null);
        setProgress(0);
        try {
            const fd = new FormData();
            fd.append('file', file);
            if (title.trim()) fd.append('title', title.trim());

            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/leads/import');
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 90));
            };
            const resp = await new Promise<{ ok: boolean; data: any }>((resolve) => {
                xhr.onload = () => {
                    let data: any = null;
                    try { data = JSON.parse(xhr.responseText); } catch { /* fall through */ }
                    resolve({ ok: xhr.status >= 200 && xhr.status < 300, data });
                };
                xhr.onerror = () => resolve({ ok: false, data: { error: 'Network error' } });
                xhr.send(fd);
            });
            setProgress(100);
            if (!resp.ok) {
                setError(resp.data?.error ?? 'Import failed');
            } else {
                setResult(resp.data as ImportResult);
                setFile(null);
                setTitle('');
                if (fileRef.current) fileRef.current.value = '';
                loadStats();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Import failed');
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className="min-h-screen bg-[#0A0A0F] text-[#F8FAFC] px-6 py-10">
            <div className="mx-auto max-w-3xl">
                <div className="flex items-center gap-3 mb-1">
                    <Database className="h-7 w-7 text-[#8B5CF6]" />
                    <h1 className="text-2xl font-bold">Admin</h1>
                </div>
                <p className="text-sm text-[#8B95A9] mb-8">
                    Signed in as {email}. Import lead lists into the database below.
                </p>

                {needsProvisioning && (
                    <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm text-amber-200">
                        <p className="font-semibold">One-time setup: pin this admin account</p>
                        <p className="mt-2 text-amber-200/80">
                            You are signed in with the admin email. Share this account id to finish
                            setup, then the console unlocks:
                        </p>
                        <code className="mt-3 block rounded-lg bg-black/40 px-4 py-2.5 text-xs text-white break-all select-all">
                            {needsProvisioning}
                        </code>
                    </div>
                )}

                {/* Lead import card */}
                <section className="rounded-2xl border border-[#232333] bg-[#14141f] p-6 mb-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B95A9] mb-4">
                        Import lead data
                    </h2>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            pickFile(e.dataTransfer.files?.[0] ?? null);
                        }}
                        onClick={() => fileRef.current?.click()}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
                            dragOver ? 'border-[#8B5CF6] bg-[#8B5CF6]/10' : 'border-[#232333] hover:border-[#8B5CF6]/60'
                        }`}
                    >
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                        />
                        <FileSpreadsheet className="h-9 w-9 text-[#8B5CF6] mb-3" />
                        {file ? (
                            <p className="text-sm font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>
                        ) : (
                            <p className="text-sm text-[#8B95A9]">Drop a CSV here or click to browse</p>
                        )}
                    </div>

                    <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-[#8B95A9]">
                        Import title (defaults to the file name)
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="zip-10024-1010-records"
                        className="mt-2 w-full rounded-lg border border-[#232333] bg-[#0A0A0F] px-4 py-2.5 text-sm outline-none focus:border-[#8B5CF6]"
                    />

                    {busy && (
                        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-[#232333]">
                            <div className="h-full rounded-full bg-[#8B5CF6] transition-all" style={{ width: `${progress}%` }} />
                        </div>
                    )}

                    <button
                        onClick={doImport}
                        disabled={!file || busy}
                        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#8B5CF6] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <Upload className="h-4 w-4" />
                        {busy ? 'Importing...' : 'Import'}
                    </button>
                </section>

                {/* Result */}
                {error && (
                    <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {result && (
                    <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-sm">
                        <div className="flex items-center gap-2 font-semibold text-emerald-300">
                            <CheckCircle2 className="h-5 w-5" />
                            Import "{result.batch}" complete
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-[#BCC6D8] sm:grid-cols-3">
                            <span>Rows in file: <b className="text-white">{result.totalRows}</b></span>
                            <span>Inserted: <b className="text-white">{result.inserted}</b></span>
                            <span>Updated: <b className="text-white">{result.updated}</b></span>
                            <span>Skipped rows: <b className="text-white">{result.skippedRows.length}</b></span>
                            <span>Columns used: <b className="text-white">{result.columnsImported}</b></span>
                        </div>
                        {result.skippedRows.length > 0 && (
                            <details className="mt-3 text-xs text-[#8B95A9]">
                                <summary className="cursor-pointer">Skipped row details</summary>
                                <ul className="mt-2 max-h-40 overflow-auto space-y-1">
                                    {result.skippedRows.map((s) => (
                                        <li key={s.line}>Line {s.line}: {s.reason}</li>
                                    ))}
                                </ul>
                            </details>
                        )}
                    </div>
                )}

                {/* Stats */}
                <section className="rounded-2xl border border-[#232333] bg-[#14141f] p-6">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-[#8B95A9]">
                        Lead database {total !== null && <span className="text-white normal-case">({total.toLocaleString()} leads total)</span>}
                    </h2>
                    {batches.length === 0 ? (
                        <p className="mt-3 text-sm text-[#8B95A9]">No imports yet.</p>
                    ) : (
                        <table className="mt-4 w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-[#232333] text-xs uppercase tracking-wide text-[#8B95A9]">
                                    <th className="pb-2 pr-4 font-medium">Batch</th>
                                    <th className="pb-2 pr-4 font-medium">Leads</th>
                                    <th className="pb-2 font-medium">Last imported</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.map((b) => (
                                    <tr key={b.batch} className="border-b border-[#232333]/60 last:border-0">
                                        <td className="py-2.5 pr-4 font-medium">{b.batch}</td>
                                        <td className="py-2.5 pr-4 text-[#BCC6D8]">{b.n.toLocaleString()}</td>
                                        <td className="py-2.5 text-[#8B95A9]">{new Date(b.last_import).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
                <NewsletterTools />
            </div>
        </main>
    );
}
