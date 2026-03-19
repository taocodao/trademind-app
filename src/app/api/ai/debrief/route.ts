import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkFeatureAccess, getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    
    // Pro-gate check removed (now feature-subscription based)
    const access = await checkFeatureAccess(user.privyDid, 'debrief');
    if (!access.allowed) {
      return NextResponse.json({ error: 'FEATURE_LOCKED' }, { status: 403 });
    }

    // Fetch user's latest debrief
    const latestRes = await query(
      `SELECT week_start, content 
       FROM ai_debriefs 
       WHERE privy_did = $1
       ORDER BY week_start DESC
       LIMIT 1`,
      [user.privyDid]
    );

    // Fetch history (last 5)
    if (latestRes.rowCount && latestRes.rowCount > 0) {
      const historyRes = await query(
        `SELECT week_start, content 
         FROM ai_debriefs 
         WHERE privy_did = $1 AND week_start < $2
         ORDER BY week_start DESC 
         LIMIT 5`,
        [user.privyDid, latestRes.rows[0].week_start]
      );

      return NextResponse.json({
          latest: latestRes.rows[0],
          history: historyRes.rows
      });
    }

    return NextResponse.json({ latest: null, history: [] });

  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
