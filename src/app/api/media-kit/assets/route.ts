import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { list } from '@vercel/blob';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media-kit/assets
 * Returns a unified media library:
 *   1. Admin-uploaded assets from media_kit_assets DB table (with full metadata)
 *   2. Existing Vercel Blob files not in DB (hero videos, etc.) — shown with path-derived names
 *
 * DB assets take priority: if a blob_path already has a DB entry, it is NOT duplicated.
 */
export async function GET() {
    const combined: object[] = [];
    const knownPaths = new Set<string>();

    // ── 1. DB-uploaded assets (full metadata, title, description, language) ────
    try {
        const result = await query(
            `SELECT id, title, description, file_url, blob_path, file_type, language, created_at
             FROM media_kit_assets
             ORDER BY created_at DESC`
        );
        for (const row of result.rows) {
            combined.push({ ...row, source: 'admin' });
            knownPaths.add(row.blob_path);
        }
    } catch (err: any) {
        if (!err.message?.includes('does not exist')) {
            console.warn('[media-kit/assets] DB error:', err.message);
        }
    }

    // ── 2. Existing Vercel Blob files not already in DB ──────────────────────
    try {
        let cursor: string | undefined;
        do {
            const page = await list({ cursor, limit: 100 });

            for (const blob of page.blobs) {
                if (knownPaths.has(blob.pathname)) continue; // already in DB

                // Derive a friendly name from the path
                const fileName  = blob.pathname.split('/').pop() ?? blob.pathname;
                const cleanName = fileName.replace(/^\d+-/, '').replace(/\.[^.]+$/, '').replace(/-/g, ' ');
                const title     = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

                // Detect type from extension
                const ext      = fileName.split('.').pop()?.toLowerCase() ?? '';
                const fileType = ['mp4', 'mov', 'webm', 'avi'].includes(ext) ? 'video' : 'file';

                combined.push({
                    id:          `blob-${blob.pathname}`,
                    title,
                    description: null,
                    file_url:    blob.url,
                    blob_path:   blob.pathname,
                    file_type:   fileType,
                    language:    null,
                    created_at:  blob.uploadedAt,
                    source:      'website',
                });
            }

            cursor = page.cursor;
        } while (cursor);

    } catch (err: any) {
        console.warn('[media-kit/assets] Blob list error:', err.message);
    }

    // Sort: DB assets first, then blob-only (by date desc)
    (combined as any[]).sort((a, b) => {
        if (a.source === 'admin' && b.source !== 'admin') return -1;
        if (b.source === 'admin' && a.source !== 'admin') return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ assets: combined });
}
