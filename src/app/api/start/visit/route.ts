import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getContact, validToken } from '@/lib/outreach/db';
import { isSection } from '@/lib/start/sections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** POST { t, section }: a person viewed a Start here section for 3 visible seconds. Stored once per 10 minutes. */
export async function POST(req: NextRequest) {
    try {
        const b = await req.json();
        const t = String(b.t ?? ''), section = String(b.section ?? '');
        if (!validToken(t) || !isSection(section) || !(await getContact(t))) return NextResponse.json({ ok: false }, { status: 400 });
        const recent = await pool.query(
            `SELECT 1 FROM outreach_click_events WHERE token = $1 AND link_type = $2 AND human_confirmed AND ts > NOW() - INTERVAL '10 minutes' LIMIT 1`,
            [t, `sec_${section}`]
        );
        if (!recent.rowCount) {
            await pool.query(
                `INSERT INTO outreach_click_events (token, link_type, step, method, is_bot, human_confirmed, user_agent) VALUES ($1, $2, NULL, 'GET', FALSE, TRUE, 'start')`,
                [t, `sec_${section}`]
            );
        }
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
}
