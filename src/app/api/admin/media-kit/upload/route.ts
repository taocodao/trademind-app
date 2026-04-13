import { put, del } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── Ensure table exists ───────────────────────────────────────────────────
let tableReady = false;
async function ensureTable() {
    if (tableReady) return;
    await query(`
        CREATE TABLE IF NOT EXISTS media_kit_assets (
            id           SERIAL PRIMARY KEY,
            title        VARCHAR(255) NOT NULL,
            description  TEXT,
            file_url     TEXT         NOT NULL,
            blob_path    TEXT         NOT NULL,
            file_type    VARCHAR(20)  NOT NULL DEFAULT 'image', -- 'image' | 'video' | 'copy'
            tag          VARCHAR(50),
            platforms    TEXT[]       NOT NULL DEFAULT '{}',
            formats      TEXT[]       NOT NULL DEFAULT '{}',
            sort_order   INTEGER      NOT NULL DEFAULT 0,
            is_published BOOLEAN      NOT NULL DEFAULT true,
            created_at   TIMESTAMPTZ  DEFAULT NOW(),
            updated_at   TIMESTAMPTZ  DEFAULT NOW()
        )
    `);
    tableReady = true;
}

/**
 * POST /api/admin/media-kit/upload
 * FormData fields:
 *   file        — the binary file
 *   title       — display title
 *   description — short description
 *   platforms   — JSON array e.g. ["LinkedIn","Instagram"]
 *   tag         — optional badge e.g. "Square" | "Widescreen"
 *   file_type   — "image" | "video" | "copy"
 *   sort_order  — optional integer
 */
export async function POST(req: NextRequest) {
    try {
        await ensureTable();

        const form  = await req.formData();
        const file  = form.get('file') as File | null;
        const title = (form.get('title') as string | null)?.trim();

        if (!file)  return NextResponse.json({ error: 'No file provided' },  { status: 400 });
        if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

        const description = (form.get('description') as string | null) ?? '';
        const platformsRaw = (form.get('platforms') as string | null) ?? '[]';
        const platforms   = JSON.parse(platformsRaw) as string[];
        const tag         = (form.get('tag')       as string | null) ?? '';
        const fileType    = (form.get('file_type') as string | null) ?? 'image';
        const sortOrder   = parseInt((form.get('sort_order') as string | null) ?? '0', 10);

        // Build a stable path from title slug
        const slug     = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60);
        const ext      = file.name.split('.').pop() ?? 'png';
        const blobPath = `media-kit/${Date.now()}-${slug}.${ext}`;

        // Upload to Vercel Blob (public CDN)
        const blob = await put(blobPath, file, {
            access:          'public',
            contentType:     file.type || 'image/png',
            addRandomSuffix: false,
        });

        // Determine format label from actual file
        const sizeKb   = Math.round(file.size / 1024);
        const formatLabel = ext.toUpperCase() + ' · ' + (sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`);

        // Save metadata to DB
        const result = await query(
            `INSERT INTO media_kit_assets
                (title, description, file_url, blob_path, file_type, tag, platforms, formats, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [title, description, blob.url, blobPath, fileType, tag, platforms, [formatLabel], sortOrder]
        );

        return NextResponse.json({ asset: result.rows[0] });
    } catch (err: any) {
        console.error('[media-kit/upload]', err);
        return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 });
    }
}

/**
 * GET /api/admin/media-kit/upload
 * Returns all assets (including unpublished) for admin view
 */
export async function GET() {
    try {
        await ensureTable();
        const result = await query(
            `SELECT * FROM media_kit_assets ORDER BY sort_order ASC, created_at DESC`
        );
        return NextResponse.json({ assets: result.rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/media-kit/upload?id=123
 * Removes the asset from DB and deletes the blob
 */
export async function DELETE(req: NextRequest) {
    try {
        const id = req.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        await ensureTable();
        const existing = await query(
            `SELECT blob_path FROM media_kit_assets WHERE id = $1`, [id]
        );
        if (!existing.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Delete from Vercel Blob
        try { await del(existing.rows[0].blob_path); } catch (_) { /* blob may not exist */ }

        await query(`DELETE FROM media_kit_assets WHERE id = $1`, [id]);
        return NextResponse.json({ deleted: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/media-kit/upload?id=123
 * Toggle is_published or update sort_order
 */
export async function PATCH(req: NextRequest) {
    try {
        const id   = req.nextUrl.searchParams.get('id');
        const body = await req.json();
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        await ensureTable();
        const result = await query(
            `UPDATE media_kit_assets
             SET is_published = COALESCE($2, is_published),
                 sort_order   = COALESCE($3, sort_order),
                 updated_at   = NOW()
             WHERE id = $1
             RETURNING *`,
            [id, body.is_published ?? null, body.sort_order ?? null]
        );
        return NextResponse.json({ asset: result.rows[0] });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
