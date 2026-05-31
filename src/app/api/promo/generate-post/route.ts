import { NextRequest, NextResponse } from 'next/server';
import { generatePostVariations } from '@/lib/promo/perplexity';
import { GeneratePostRequest, GeneratePostResponse } from '@/lib/promo/types';
import { getServerSession } from '@/lib/promo/auth';
import { sql } from '@vercel/postgres';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(req);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GeneratePostRequest = await req.json();
    const { platform, theme, tone, customThemeText, referralCode, daysAsMember, personalNote } = body;

    if (!platform || !theme || !tone) {
      return NextResponse.json({ error: 'Missing required fields: platform, theme, tone' }, { status: 400 });
    }

    if (!process.env.PERPLEXITY_API_KEY) {
      return NextResponse.json({ error: 'Perplexity API not configured' }, { status: 500 });
    }

    // Generate variations
    const { variations, complianceStatus } = await generatePostVariations(
      platform, tone, theme,
      { referralCode, daysAsMember, personalNote },
      customThemeText
    );

    // Log to DB (fire-and-forget, don't block the response)
    try {
      for (let i = 0; i < variations.length; i++) {
        await sql`
          INSERT INTO generated_posts 
            (user_id, platform, theme, tone, variation_index, post_content, referral_code, char_count, compliance_verified)
          VALUES 
            (${session.userId}, ${platform}, ${theme}, ${tone}, ${i}, ${variations[i]}, ${referralCode || null}, ${variations[i].length}, ${complianceStatus[i]})
        `;
      }
    } catch (dbErr) {
      // DB logging failure shouldn't block the user
      console.error('[promo/generate-post] DB log error:', dbErr);
    }

    const response: GeneratePostResponse = {
      variations,
      platform,
      theme,
      tone,
      timestamp: new Date().toISOString(),
      complianceStatus,
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error('[promo/generate-post] Error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
