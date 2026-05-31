import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/promo/auth';
import { sql } from '@vercel/postgres';

// Simple admin check — extend with a proper role system if needed
const ADMIN_USER_IDS = (process.env.PROMO_ADMIN_USER_IDS || '').split(',').filter(Boolean);

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (ADMIN_USER_IDS.length > 0 && !ADMIN_USER_IDS.includes(session.userId)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const [totalRes, platformRes, themeRes, recentRes] = await Promise.all([
      sql`SELECT COUNT(*) as count FROM generated_posts`,
      sql`SELECT platform, COUNT(*) as count FROM generated_posts GROUP BY platform ORDER BY count DESC`,
      sql`SELECT theme, COUNT(*) as count FROM generated_posts GROUP BY theme ORDER BY count DESC`,
      sql`SELECT user_id, platform, theme, created_at, char_count, compliance_verified FROM generated_posts ORDER BY created_at DESC LIMIT 50`,
    ]);

    const byPlatform: Record<string, number> = {};
    platformRes.rows.forEach((r) => { byPlatform[r.platform] = parseInt(r.count); });

    const byTheme: Record<string, number> = {};
    themeRes.rows.forEach((r) => { byTheme[r.theme] = parseInt(r.count); });

    return NextResponse.json({
      totalGenerated: parseInt(totalRes.rows[0]?.count || '0'),
      byPlatform,
      byTheme,
      recentActivity: recentRes.rows,
    });
  } catch (err: unknown) {
    console.error('[promo/admin] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
