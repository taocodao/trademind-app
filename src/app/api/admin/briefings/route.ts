import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { resolveAdmin } from '@/lib/admin-gate';
import { ensureBriefingTables } from '@/lib/briefing/db';
import { runChecks, allPass } from '@/lib/briefing/filter';
import { textToHtml } from '@/lib/briefing/templates';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureBriefingTables();
    const { rows } = await pool.query(
        `SELECT id, run_date::text AS run_date, kind, status, subject, text_body, commentary, status_only, checks, reviewed_by, reviewed_at, created_at
         FROM briefing_issue ORDER BY run_date DESC, kind LIMIT 40`
    );
    return NextResponse.json({ issues: rows });
}

/** POST { id, action: 'approve' | 'hold' | 'edit', text? }. Approval never sends anything in phase 1. */
export async function POST(req: NextRequest) {
    const gate = await resolveAdmin(req);
    if (!gate.isAdmin) return NextResponse.json({ error: gate.error || 'Forbidden' }, { status: gate.status });
    await ensureBriefingTables();
    const b = await req.json().catch(() => ({}));
    const id = Number(b.id);
    const action = String(b.action || '');
    if (!id || !['approve', 'hold', 'edit'].includes(action)) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

    const cur = await pool.query(`SELECT i.*, f.payload FROM briefing_issue i JOIN facts_run f ON f.run_date = i.run_date WHERE i.id = $1`, [id]).catch(() => ({ rows: [] as any[] }));
    const issue = cur.rows[0] ?? (await pool.query(`SELECT * FROM briefing_issue WHERE id = $1`, [id])).rows[0];
    if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    let text: string = issue.text_body;
    if (action === 'edit') {
        if (typeof b.text !== 'string' || b.text.length < 20) return NextResponse.json({ error: 'text required' }, { status: 400 });
        text = b.text;
        await pool.query(`INSERT INTO briefing_edit (issue_id, who, action, before_text, after_text) VALUES ($1, $2, 'edit', $3, $4)`, [id, gate.did || 'admin', issue.text_body, text]);
    }

    // Every approval and edit re-runs the checks against the locked facts record.
    let checks = issue.checks;
    if (issue.payload) {
        const facts = { ...issue.payload, hash: issue.facts_hash };
        checks = runChecks({ kind: issue.kind, subject: issue.subject, text, rawCommentary: null, facts });
    }
    const pass = Array.isArray(checks) ? allPass(checks) : false;
    if (action === 'approve' && !pass) {
        return NextResponse.json({ error: 'Checks failed. Edit the text or hold the issue.', checks }, { status: 422 });
    }
    const status = action === 'approve' ? 'approved' : action === 'hold' ? 'held' : pass ? 'draft' : 'held';
    await pool.query(
        `UPDATE briefing_issue SET status = $2, text_body = $3, html_body = $4, checks = $5, reviewed_by = $6, reviewed_at = NOW() WHERE id = $1`,
        [id, status, text, textToHtml(text, issue.subject), JSON.stringify(checks), gate.did || 'admin']
    );
    await pool.query(`INSERT INTO briefing_edit (issue_id, who, action) VALUES ($1, $2, $3)`, [id, gate.did || 'admin', action === 'edit' ? 'edit saved' : action]);
    return NextResponse.json({ ok: true, status, checks });
}
