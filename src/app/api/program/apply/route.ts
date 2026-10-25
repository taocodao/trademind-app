import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { EMAIL_OK, ensureProgramTables, normEmail } from '@/lib/program/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Small in-memory limiter per instance: 5 applications per IP per hour.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
    const now = Date.now();
    const arr = (hits.get(ip) ?? []).filter((t) => now - t < 3600_000);
    arr.push(now);
    hits.set(ip, arr);
    return arr.length > 5;
}

const TRACKS = ['etf', 'options', 'research_only'];
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/**
 * Application to the founding program. It is not a purchase and takes no card. The answer is the same whether or
 * not the address already applied, so the form cannot be used to discover who has applied.
 * Never collected: account numbers, balances, broker logins or net worth.
 */
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (limited(ip)) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    const b = await req.json().catch(() => ({}));
    if (b.website) return NextResponse.json({ ok: true }); // honeypot
    const email = clip(b.email, 254);
    if (!EMAIL_OK(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    if (b.consent !== true) return NextResponse.json({ error: 'Please agree to the research terms to apply.' }, { status: 400 });
    const track = TRACKS.includes(b.track) ? b.track : null;
    if (!track) return NextResponse.json({ error: 'Choose a track.' }, { status: 400 });

    const answers = {
        years_investing: clip(b.years_investing, 40),
        paid_research_last_year: clip(b.paid_research_last_year, 40),
        used_and_stopped: clip(b.used_and_stopped, 600),
        problem_to_solve: clip(b.problem_to_solve, 800),
        delivery_preference: ['daily', 'weekly', 'alerts'].includes(b.delivery_preference) ? b.delivery_preference : 'daily',
        can_do_monthly_activity: b.can_do_monthly_activity === true,
        interview_ok: b.interview_ok === true,
        heard_about_us: clip(b.heard_about_us, 200),
    };
    await ensureProgramTables();
    const norm = normEmail(email);
    await pool.query(
        `INSERT INTO program_application (email, email_norm, name, role, track, answers, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email_norm) DO NOTHING`,
        [email, norm, clip(b.name, 120), clip(b.role, 80), track, JSON.stringify(answers), clip(b.source, 80)]
    );
    await pool.query(`INSERT INTO consent (email_norm, type, version) VALUES ($1, 'research', 'v1')`, [norm]);
    return NextResponse.json({ ok: true });
}
