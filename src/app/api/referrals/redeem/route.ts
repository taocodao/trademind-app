/** Attribute a referral at signup. The first account created under this
 * attribution skips the free month and receives the referee day grant at its
 * first payment. */
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/ai';
import { query } from '@/lib/db';
import { getReferrerByCode } from '@/lib/referrals';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const user = await getUserFromRequest(req);
        const { code, hdyhau, utmSource, utmMedium, utmCampaign, utmContent } = await req.json();
        if (hdyhau || utmSource) {
            await query(
                `UPDATE user_settings
                 SET hdyhau = COALESCE(hdyhau, $2),
                     utm_source = COALESCE(utm_source, $3),
                     utm_medium = COALESCE(utm_medium, $4),
                     utm_campaign = COALESCE(utm_campaign, $5),
                     utm_content = COALESCE(utm_content, $6),
                     updated_at = NOW()
                 WHERE user_id = $1`,
                [user.privyDid, hdyhau || null, utmSource || null, utmMedium || null, utmCampaign || null, utmContent || null]
            );
        }
        if (!code || typeof code !== 'string') {
            return NextResponse.json({ success: true, message: 'No referral code provided' });
        }

        const referrer = await getReferrerByCode(code);
        if (!referrer) return NextResponse.json({ success: false, message: 'Invalid referral code' });
        if (referrer.userId === user.privyDid) {
            return NextResponse.json({ success: false, message: 'Cannot refer yourself' });
        }

        const inserted = await query(
            `INSERT INTO referral_events (referrer_id, referred_id, referral_code, status)
             VALUES ($1, $2, $3, 'attributed')
             ON CONFLICT (referred_id) DO NOTHING
             RETURNING id`,
            [referrer.userId, user.privyDid, code.trim().toUpperCase()]
        );
        return NextResponse.json({
            success: true,
            message: inserted.rowCount ? 'Referral linked successfully' : 'Already linked to a referral',
        });
    } catch (error: any) {
        if (error.message === 'Unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        console.error('[referrals/redeem] failed:', error);
        return NextResponse.json({ error: 'Unable to save referral attribution' }, { status: 500 });
    }
}
