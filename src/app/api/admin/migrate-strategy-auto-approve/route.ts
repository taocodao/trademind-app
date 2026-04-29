import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

/**
 * One-shot internal migration endpoint.
 * Call once after deploy with the INTERNAL_API_SECRET header.
 * POST /api/admin/migrate-strategy-auto-approve
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-internal-secret');
    if (secret !== process.env.INTERNAL_API_SECRET?.trim()) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        await pool.query(`
            ALTER TABLE user_settings
              ADD COLUMN IF NOT EXISTS turbocore_auto_approve     BOOLEAN DEFAULT FALSE,
              ADD COLUMN IF NOT EXISTS turbocore_pro_auto_approve BOOLEAN DEFAULT FALSE,
              ADD COLUMN IF NOT EXISTS leaps_auto_approve         BOOLEAN DEFAULT FALSE
        `);
        return NextResponse.json({ success: true, message: 'Columns added (or already exist).' });
    } catch (error: any) {
        console.error('[migrate-strategy-auto-approve] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
