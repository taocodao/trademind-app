import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkFeatureAccess, getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Only logged in users can read briefs
    const user = await getUserFromRequest(req);
    const access = await checkFeatureAccess(user.privyDid, 'briefing');
    if (!access.allowed) {
      return NextResponse.json({ error: 'FEATURE_LOCKED' }, { status: 403 });
    }

    // Get today
    const today = new Date().toISOString().split('T')[0];

    // Fetch latest brief
    const latestRes = await query(
      `SELECT date, regime, confidence, ml_score, content 
       FROM ai_briefings 
       WHERE date = $1`,
      [today]
    );

    // Fetch history (last 5)
    const historyRes = await query(
      `SELECT date, regime, content 
       FROM ai_briefings 
       WHERE date < $1 
       ORDER BY date DESC 
       LIMIT 5`,
      [today]
    );

    return NextResponse.json({
        today: latestRes.rows[0] || null,
        history: historyRes.rows
    });

  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
