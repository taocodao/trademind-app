/**
 * GET /api/signals/track-record
 * ==============================
 * Serves signal history data for the public /results track record page.
 * Returns the last 90 days of TurboCore signals with QQQ return outcomes
 * (populated by EC2 populate_signal_returns.py after market close).
 *
 * Public endpoint — no auth required. Cached at edge for 5 minutes.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5-minute edge cache

export interface TrackRecordRow {
    signal_date:           string;
    regime:                string;
    confidence:            number;
    qqq_return_5d:         number | null;
    qqq_price_signal_date: number | null;
    qqq_price_5d_later:    number | null;
}

export interface TrackRecordResponse {
    signals:       TrackRecordRow[];
    summary: {
        total:          number;
        bullCount:      number;
        sidewaysCount:  number;
        bearCount:      number;
        avgConfidence:  number;
        avgReturn:      number | null; // null if no returns populated yet
        winRate:        number | null; // % signals where qqq_return_5d > 0
    };
    lastUpdated: string | null;
}

export async function GET(): Promise<NextResponse> {
    const { rows } = await query(
        `SELECT
            signal_date::text,
            regime,
            confidence,
            qqq_return_5d,
            qqq_price_signal_date,
            qqq_price_5d_later,
            return_populated_at
         FROM whop_posts
         WHERE post_type = 'signal' AND regime IS NOT NULL
           AND signal_date >= CURRENT_DATE - INTERVAL '90 days'
         ORDER BY signal_date DESC
         LIMIT 90`
    );

    const signals: TrackRecordRow[] = rows.map((r: any) => ({
        signal_date:           r.signal_date,
        regime:                r.regime,
        confidence:            r.confidence,
        qqq_return_5d:         r.qqq_return_5d !== null ? parseFloat(r.qqq_return_5d) : null,
        qqq_price_signal_date: r.qqq_price_signal_date !== null ? parseFloat(r.qqq_price_signal_date) : null,
        qqq_price_5d_later:    r.qqq_price_5d_later !== null ? parseFloat(r.qqq_price_5d_later) : null,
    }));

    // Compute summary stats
    const total         = signals.length;
    const bullCount     = signals.filter(s => s.regime === 'BULL').length;
    const sidewaysCount = signals.filter(s => s.regime === 'SIDEWAYS').length;
    const bearCount     = signals.filter(s => s.regime === 'BEAR').length;
    const avgConfidence = total > 0
        ? Math.round(signals.reduce((a, s) => a + s.confidence, 0) / total)
        : 0;

    const withReturns = signals.filter(s => s.qqq_return_5d !== null);
    const avgReturn = withReturns.length > 0
        ? parseFloat((withReturns.reduce((a, s) => a + (s.qqq_return_5d ?? 0), 0) / withReturns.length).toFixed(2))
        : null;
    const winRate = withReturns.length > 0
        ? parseFloat(((withReturns.filter(s => (s.qqq_return_5d ?? 0) > 0).length / withReturns.length) * 100).toFixed(1))
        : null;

    const lastUpdated = rows.find((r: any) => r.return_populated_at)?.return_populated_at?.toISOString() ?? null;

    const response: TrackRecordResponse = {
        signals,
        summary: { total, bullCount, sidewaysCount, bearCount, avgConfidence, avgReturn, winRate },
        lastUpdated,
    };

    return NextResponse.json(response, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
}
