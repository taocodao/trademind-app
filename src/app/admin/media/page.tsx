"use client";

import { useEffect, useRef, useState } from "react";

type Slot = "clip1" | "clip2" | "clip3";
type SlotState = {
    url: string | null;
    uploading: boolean;
    progress: number;
    error: string | null;
    dragOver: boolean;
};

const SLOT_LABELS: Record<Slot, string> = {
    clip1: "Hero Clip 1",
    clip2: "Hero Clip 2",
    clip3: "Hero Clip 3",
};

const SLOTS: Slot[] = ["clip1", "clip2", "clip3"];

export default function MediaAdminPage() {
    const [slots, setSlots] = useState<Record<Slot, SlotState>>({
        clip1: { url: null, uploading: false, progress: 0, error: null, dragOver: false },
        clip2: { url: null, uploading: false, progress: 0, error: null, dragOver: false },
        clip3: { url: null, uploading: false, progress: 0, error: null, dragOver: false },
    });
    const [loading, setLoading] = useState(true);
    const fileRefs = useRef<Record<Slot, HTMLInputElement | null>>({
        clip1: null,
        clip2: null,
        clip3: null,
    });

    // Load current URLs from Redis via API
    useEffect(() => {
        async function load() {
            try {
                const res = await fetch("/api/admin/upload-video");
                const data = await res.json();
                if (data.videos) {
                    setSlots((prev) => {
                        const next = { ...prev };
                        for (const slot of SLOTS) {
                            if (data.videos[slot]) {
                                next[slot] = { ...next[slot], url: data.videos[slot] };
                            }
                        }
                        return next;
                    });
                }
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    function updateSlot(slot: Slot, patch: Partial<SlotState>) {
        setSlots((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));
    }

    async function uploadFile(slot: Slot, file: File) {
        if (!file.type.startsWith("video/")) {
            updateSlot(slot, { error: "Only video files are allowed." });
            return;
        }

        updateSlot(slot, { uploading: true, error: null, progress: 0 });

        const formData = new FormData();
        formData.append("file", file);
        formData.append("slot", slot);

        // Use XHR for upload progress tracking
        await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", "/api/admin/upload-video");

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    updateSlot(slot, { progress: Math.round((e.loaded / e.total) * 100) });
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const data = JSON.parse(xhr.responseText);
                    updateSlot(slot, { url: data.url, uploading: false, progress: 100 });
                    resolve();
                } else {
                    const data = JSON.parse(xhr.responseText);
                    updateSlot(slot, { error: data.error ?? "Upload failed", uploading: false });
                    reject();
                }
            };

            xhr.onerror = () => {
                updateSlot(slot, { error: "Network error during upload", uploading: false });
                reject();
            };

            xhr.send(formData);
        });
    }

    function handleFileInput(slot: Slot, e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) uploadFile(slot, file);
    }

    function handleDrop(slot: Slot, e: React.DragEvent) {
        e.preventDefault();
        updateSlot(slot, { dragOver: false });
        const file = e.dataTransfer.files?.[0];
        if (file) uploadFile(slot, file);
    }

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0a0a1a 0%, #0f1629 50%, #0a0f1e 100%)",
            fontFamily: "'Inter', -apple-system, sans-serif",
            color: "#e2e8f0",
            padding: "48px 24px",
        }}>
            <div style={{ maxWidth: 900, margin: "0 auto" }}>

                {/* Header */}
                <div style={{ marginBottom: 48 }}>
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: 10,
                        background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)",
                        borderRadius: 8, padding: "6px 14px", marginBottom: 16,
                    }}>
                        <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 600, letterSpacing: "0.05em" }}>
                            ADMIN
                        </span>
                    </div>
                    <h1 style={{
                        fontSize: 32, fontWeight: 700, margin: "0 0 8px",
                        background: "linear-gradient(135deg, #a5b4fc, #818cf8)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                        Media Manager
                    </h1>
                    <p style={{ color: "#94a3b8", fontSize: 15, margin: 0 }}>
                        Upload videos to Vercel Blob CDN. URLs are stored in Redis and served globally.
                    </p>
                </div>

                {/* Slots */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: 64, color: "#64748b" }}>Loading current media...</div>
                ) : (
                    <div style={{ display: "grid", gap: 24 }}>
                        {SLOTS.map((slot) => {
                            const state = slots[slot];
                            return (
                                <div key={slot} style={{
                                    background: state.dragOver
                                        ? "rgba(99,102,241,0.15)"
                                        : "rgba(255,255,255,0.03)",
                                    border: `2px dashed ${state.dragOver ? "#818cf8" : state.url ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.1)"}`,
                                    borderRadius: 16,
                                    padding: 28,
                                    transition: "all 0.2s ease",
                                }}
                                    onDragOver={(e) => { e.preventDefault(); updateSlot(slot, { dragOver: true }); }}
                                    onDragLeave={() => updateSlot(slot, { dragOver: false })}
                                    onDrop={(e) => handleDrop(slot, e)}
                                >
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
                                        {/* Video Preview */}
                                        <div style={{
                                            width: 180, height: 101, borderRadius: 10, overflow: "hidden", flexShrink: 0,
                                            background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            position: "relative",
                                        }}>
                                            {state.url ? (
                                                <video
                                                    src={state.url}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                    muted
                                                    preload="metadata"
                                                    onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
                                                    onMouseOut={(e) => { const v = e.currentTarget as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                                                />
                                            ) : (
                                                <div style={{ textAlign: "center", color: "#4b5563" }}>
                                                    <svg width={32} height={32} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                                            d="M15 10l4.553-2.276A1 1 0 0121 8.723v6.554a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                                                    </svg>
                                                    <div style={{ fontSize: 11, marginTop: 6 }}>No video</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info & Actions */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{SLOT_LABELS[slot]}</h3>
                                                <span style={{
                                                    fontSize: 11, padding: "2px 8px", borderRadius: 4,
                                                    background: "rgba(255,255,255,0.06)", color: "#64748b", fontFamily: "monospace",
                                                }}>{slot}</span>
                                                {state.url && (
                                                    <span style={{
                                                        fontSize: 11, padding: "2px 8px", borderRadius: 4,
                                                        background: "rgba(34,197,94,0.15)", color: "#4ade80",
                                                    }}>● Live</span>
                                                )}
                                            </div>

                                            {state.url && (
                                                <div style={{
                                                    fontSize: 12, color: "#64748b", marginBottom: 12,
                                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                    maxWidth: 420,
                                                }}>
                                                    <span style={{ color: "#4b5563" }}>URL: </span>
                                                    <a href={state.url} target="_blank" rel="noopener noreferrer"
                                                        style={{ color: "#818cf8", textDecoration: "none" }}>{state.url}</a>
                                                </div>
                                            )}

                                            {/* Upload progress */}
                                            {state.uploading && (
                                                <div style={{ marginBottom: 12 }}>
                                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>
                                                        <span>Uploading to Vercel Blob...</span>
                                                        <span>{state.progress}%</span>
                                                    </div>
                                                    <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                                                        <div style={{
                                                            height: "100%", borderRadius: 2,
                                                            background: "linear-gradient(90deg, #6366f1, #818cf8)",
                                                            width: `${state.progress}%`, transition: "width 0.3s ease",
                                                        }} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error */}
                                            {state.error && (
                                                <div style={{
                                                    fontSize: 13, color: "#f87171", marginBottom: 12,
                                                    background: "rgba(239,68,68,0.1)", padding: "8px 12px", borderRadius: 8,
                                                }}>
                                                    {state.error}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                                <button
                                                    onClick={() => fileRefs.current[slot]?.click()}
                                                    disabled={state.uploading}
                                                    style={{
                                                        padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                                                        border: "1px solid rgba(99,102,241,0.5)",
                                                        background: state.uploading ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.2)",
                                                        color: state.uploading ? "#64748b" : "#a5b4fc",
                                                        cursor: state.uploading ? "not-allowed" : "pointer",
                                                        transition: "all 0.15s ease",
                                                    }}
                                                >
                                                    {state.uploading ? "Uploading..." : state.url ? "Replace Video" : "Upload Video"}
                                                </button>
                                                <span style={{ fontSize: 12, color: "#4b5563" }}>or drag & drop</span>
                                                <input
                                                    ref={(el) => { fileRefs.current[slot] = el; }}
                                                    type="file" accept="video/*" style={{ display: "none" }}
                                                    onChange={(e) => handleFileInput(slot, e)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Info box */}
                <div style={{
                    marginTop: 40, padding: 20, borderRadius: 12,
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                    fontSize: 13, color: "#64748b", lineHeight: 1.7,
                }}>
                    <strong style={{ color: "#94a3b8" }}>How it works:</strong>
                    {" "}Files are uploaded directly to <strong style={{ color: "#a5b4fc" }}>Vercel Blob</strong> (global CDN)
                    and their URLs are stored in <strong style={{ color: "#a5b4fc" }}>Upstash Redis</strong> under the key{" "}
                    <code style={{ background: "rgba(99,102,241,0.15)", padding: "1px 6px", borderRadius: 4 }}>media:videos</code>.
                    {" "}No env var changes or redeployments needed.
                </div>
            </div>
        </div>
    );
}
