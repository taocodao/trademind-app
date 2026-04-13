import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ── Ensure table ──────────────────────────────────────────────────────────────
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
            file_type    VARCHAR(20)  NOT NULL DEFAULT 'file',
            language     VARCHAR(50)  DEFAULT 'English',
            created_at   TIMESTAMPTZ  DEFAULT NOW()
        )
    `);
    tableReady = true;
}

/**
 * POST /api/media-kit/upload
 * FormData: file, title, description, language, file_type
 */
export async function POST(req: NextRequest) {
    try {
        await ensureTable();
        const form  = await req.formData();
        const file  = form.get('file') as File | null;
        const title = (form.get('title') as string | null)?.trim();

        if (!file)  return NextResponse.json({ error: 'No file provided' },  { status: 400 });
        if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });

        const description = (form.get('description') as string | null)?.trim() ?? '';
        const language    = (form.get('language')    as string | null)?.trim() ?? 'English';
        const fileType    = (form.get('file_type')   as string | null)?.trim() ?? 'file';

        const slug     = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50);
        const ext      = file.name.split('.').pop() ?? 'bin';
        const blobPath = `media-kit/${Date.now()}-${slug}.${ext}`;

        const blob = await put(blobPath, file, {
            access:          'public',
            contentType:     file.type || 'application/octet-stream',
            addRandomSuffix: false,
        });

        const result = await query(
            `INSERT INTO media_kit_assets (title, description, file_url, blob_path, file_type, language)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, description, blob.url, blobPath, fileType, language]
        );

        return NextResponse.json({ asset: result.rows[0] });
    } catch (err: any) {
        console.error('[media-kit/upload POST]', err);
        return NextResponse.json({ error: err.message ?? 'Upload failed' }, { status: 500 });
    }
}

/**
 * GET /api/media-kit/upload
 * Returns all assets for the admin panel (including metadata)
 */
export async function GET() {
    try {
        await ensureTable();
        const result = await query(
            `SELECT * FROM media_kit_assets ORDER BY created_at DESC`
        );
        return NextResponse.json({ assets: result.rows });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/media-kit/upload?id=X
 */
export async function DELETE(req: NextRequest) {
    try {
        await ensureTable();
        const id = req.nextUrl.searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const row = await query(`SELECT blob_path FROM media_kit_assets WHERE id = $1`, [id]);
        if (!row.rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        // Delete blob (best-effort — don't fail if already gone)
        try {
            const { del } = await import('@vercel/blob');
            await del(row.rows[0].blob_path);
        } catch (_) {}

        await query(`DELETE FROM media_kit_assets WHERE id = $1`, [id]);
        return NextResponse.json({ deleted: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
