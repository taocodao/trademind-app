import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Experiment instrumentation for the narrated scrollytelling landing page.
// Events: story_start, chapter_view, chapter_complete, variant_assigned, cta_click, transcript_open
// POST { event, chapter?, variant?, ts? }
// Stored in Upstash Redis as a capped list (last 10k events) + counters per key.

const LIST_KEY = "landing:events";
const MAX_EVENTS = 10_000;

interface LandingEvent {
    event: string;
    chapter?: string;
    variant?: string;
    ts?: number;
}

const ALLOWED = new Set([
    "story_start",
    "chapter_view",
    "chapter_complete",
    "cta_click",
    "transcript_open",
    "variant_assigned",
]);

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

    // Accept either naming convention: Vercel KV integration (KV_REST_API_*)
    // or Upstash for Redis integration (UPSTASH_REDIS_REST_*).
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    if (!url || !token) {
        // Instrumentation must never break the page — accept and drop.
        return NextResponse.json({ ok: true, stored: false });
    }

    try {
        const redis = new Redis({ url, token });
        const record = JSON.stringify({
            event: body.event,
            chapter: body.chapter ?? null,
            variant: body.variant ?? null,
            ts: body.ts ?? Date.now(),
        });
        const counterKey = `landing:count:${body.event}${body.chapter ? ":" + body.chapter : ""}`;
        await redis
            .multi()
            .lpush(LIST_KEY, record)
            .ltrim(LIST_KEY, 0, MAX_EVENTS - 1)
            .incr(counterKey)
            .exec();
        return NextResponse.json({ ok: true, stored: true });
    } catch {
        return NextResponse.json({ ok: true, stored: false });
    }
}
