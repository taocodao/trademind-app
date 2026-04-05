import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getUserFromRequest } from '@/lib/ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const {
            tiktokHandle,
            youtubeHandle,
            instagramHandle,
            followerCount,
            contentDescription,
            whyTrademind,
        } = await req.json();

        if (!contentDescription || (!tiktokHandle && !youtubeHandle && !instagramHandle)) {
            return NextResponse.json(
                { error: 'Please provide at least one social handle and a content description.' },
                { status: 400 }
            );
        }

        await pool.query(
            `INSERT INTO creator_applications 
                (user_id, tiktok_handle, youtube_handle, instagram_handle, follower_count, content_description, why_trademind)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (user_id) DO UPDATE 
             SET tiktok_handle = EXCLUDED.tiktok_handle,
                 youtube_handle = EXCLUDED.youtube_handle,
                 instagram_handle = EXCLUDED.instagram_handle,
                 follower_count = EXCLUDED.follower_count,
                 content_description = EXCLUDED.content_description,
                 why_trademind = EXCLUDED.why_trademind,
                 status = 'pending',
                 updated_at = NOW()`,
            [
                user.privyDid,
                tiktokHandle?.trim() || null,
                youtubeHandle?.trim() || null,
                instagramHandle?.trim() || null,
                followerCount ? parseInt(followerCount) : null,
                contentDescription.trim(),
                whyTrademind?.trim() || null,
            ]
        );

        return NextResponse.json({ success: true, message: 'Application submitted successfully. We\'ll review it within 48 hours.' });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('Creator application error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
