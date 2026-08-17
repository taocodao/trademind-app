import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Experiment instrumentation for the narrated scrollytelling landing page.
// Events: story_start, chapter_view, chapter_complete, variant_assigned, cta_click, transcript_open
// POST { event, chapter?, variant?, ts? }
// Stored in the shared AWS RDS PostgreSQL instance (same DB as the EC2 backend
// and the rest of this app) so all landing analytics live with everything else.

const ALLOWED = new Set([
    "story_start",
    "chapter_view",
    "chapter_complete",
    "cta_click",
    "transcript_open",
    "variant_assigned",
]);

const VARIANTS = new Set(["narrated", "silent"]);

let tableReady = false;
async function ensureTable() {
    if (tableReady) return;
    await query(`
        CREATE TABLE IF NOT EXISTS landing_events (
            id          BIGSERIAL PRIMARY KEY,
            event       TEXT        NOT NULL,
            chapter     TEXT,
            variant     TEXT,
            client_ts   BIGINT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `);
    await query(`
        CREATE INDEX IF NOT EXISTS landing_events_event_idx
        ON landing_events (event, created_at)
    `);
    tableReady = true;
}

interface LandingEvent {
    event: string;
    chapter?: string;
    variant?: string;
    ts?: number;
}

export async function POST(req: NextRequest) {
    let body: LandingEvent;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false }, { status: 400 });
    }
    if (!body || typeof body.event !== "string" || !ALLOWED.has(body.event)) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    // Fail-silent by design: instrumentation must never break the page.
    if (!process.env.DATABASE_URL) {
        return NextResponse.json({ ok: true, stored: false });
    }

    const chapter = typeof body.chapter === "string" && /^ch[1-7]$/.test(body.chapter) ? body.chapter : null;
    const variant = typeof body.variant === "string" && VARIANTS.has(body.variant) ? body.variant : null;
    const clientTs = typeof body.ts === "number" && body.ts > 0 && body.ts < 4e12 ? Math.round(body.ts) : null;

    try {
        await ensureTable();
        await query(
            "INSERT INTO landing_events (event, chapter, variant, client_ts) VALUES ($1, $2, $3, $4)",
            [body.event, chapter, variant, clientTs]
        );
        return NextResponse.json({ ok: true, stored: true });
    } catch {
        return NextResponse.json({ ok: true, stored: false });
    }
}

// GET /api/landing-event — quick funnel summary (chapter completion by variant).
export async function GET() {
    if (!process.env.DATABASE_URL) {
        return NextResponse.json({ ok: false, error: "no database configured" }, { status: 503 });
    }
    try {
        await ensureTable();
        const res = await query(`
            SELECT variant, event, chapter, COUNT(*)::int AS n
            FROM landing_events
            GROUP BY variant, event, chapter
            ORDER BY variant, event, chapter
        `);
        return NextResponse.json({ ok: true, rows: res.rows });
    } catch (e) {
        return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
    }
}
