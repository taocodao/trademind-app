import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/promo/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const platform = searchParams.get('platform') || 'all';
    const range = searchParams.get('range') || 'all';

    let dateFilter = '';
    if (range === 'week') dateFilter = `AND pl.created_at >= NOW() - INTERVAL '7 days'`;
    else if (range === 'month') dateFilter = `AND pl.created_at >= NOW() - INTERVAL '30 days'`;

    const platformFilter = platform !== 'all' ? `AND pl.platform = '${platform}'` : '';

    const result = await query(`
      SELECT pl.id, pl.platform, pl.post_content, pl.label, pl.created_at,
             gp.theme, gp.tone
      FROM post_library pl
      LEFT JOIN generated_posts gp ON pl.generated_post_id = gp.id
      WHERE pl.user_id = $1 ${platformFilter} ${dateFilter}
      ORDER BY pl.created_at DESC
      LIMIT 100
    `, [session.userId]);

    return NextResponse.json({ posts: result.rows });
  } catch (err: unknown) {
    console.error('[promo/library] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await req.json();
    await query(`DELETE FROM post_library WHERE id = $1 AND user_id = $2`, [id, session.userId]);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[promo/library DELETE] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
