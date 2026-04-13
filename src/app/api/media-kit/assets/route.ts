import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/media-kit/assets
 * Public endpoint — returns all published media kit assets.
 * Served to the user-facing /media-kit page.
 */
export async function GET() {
    try {
        const result = await query(
            `SELECT id, title, description, file_url, file_type, tag, platforms, formats, sort_order
             FROM media_kit_assets
             WHERE is_published = true
             ORDER BY sort_order ASC, created_at DESC`
        );
        return NextResponse.json({ assets: result.rows });
    } catch (err: any) {
        // Table may not exist yet if no admin has uploaded anything — return empty
        if (err.message?.includes('does not exist')) {
            return NextResponse.json({ assets: [] });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
