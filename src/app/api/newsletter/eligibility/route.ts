import { NextRequest, NextResponse } from 'next/server';
import { discountForEmail, recordNewsletterEvent } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/** GET ?email= -> discount eligibility for the offer page checker. */
export async function GET(req: NextRequest) {
    try {
        const email = req.nextUrl.searchParams.get('email') ?? '';
        if (!email.includes('@')) {
            return NextResponse.json({ state: 'not-found' });
        }
        const { subscriberId: _omit, ...result } = await discountForEmail(email);
        await recordNewsletterEvent('eligibility_checked', { state: result.state });
        return NextResponse.json(result);
    } catch (err) {
        console.error('[newsletter/eligibility]', err);
        return NextResponse.json({ error: 'Check failed' }, { status: 500 });
    }
}
