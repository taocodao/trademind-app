import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/promo/auth';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { generatedPostId, platform, postContent, label } = await req.json();

    if (!platform || !postContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await query(
      `INSERT INTO post_library (user_id, generated_post_id, platform, post_content, label)
      VALUES ($1, $2, $3, $4, $5)`,
      [session.userId, generatedPostId || null, platform, postContent, label || null]
    );

    // Mark as saved in generated_posts if we have the id
    if (generatedPostId) {
      await query(
        `UPDATE generated_posts SET saved_to_library = TRUE WHERE id = $1`,
        [generatedPostId]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('[promo/save-post] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
