import { NextRequest, NextResponse } from 'next/server';
import { getPrivyUserId } from '@/lib/auth-helpers';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

const ALLOWED: readonly string[] = ['en', 'es', 'zh'];

export async function PATCH(req: NextRequest) {
    try {
        const userId = await getPrivyUserId(req);
        if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const body = await req.json();
        const language: string = body.language;

        if (!ALLOWED.includes(language)) {
            return NextResponse.json({ error: 'Invalid language. Allowed: en, es, zh' }, { status: 400 });
        }

        await pool.query(
            `INSERT INTO user_settings (user_id, preferred_language)
             VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET preferred_language = $2, updated_at = NOW()`,
            [userId, language]
        );

        return NextResponse.json({ ok: true, language });
    } catch (e: any) {
        console.error('[settings/language] Error:', e.message);
        return NextResponse.json({ error: 'Failed to save language preference' }, { status: 500 });
    }
}
