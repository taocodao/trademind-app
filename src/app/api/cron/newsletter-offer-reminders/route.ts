import { NextRequest, NextResponse } from 'next/server';
import { offerRemindersOn, runOfferReminders } from '@/lib/newsletter/offer-reminders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/** Offer reminders inside the 90 day window. Off unless outreach_settings offer_reminders is 'on'. ?dry=1 counts who is due and sends nothing. */
export async function GET(req: NextRequest) {
    const expected = process.env.CRON_SECRET;
    if (!expected || req.headers.get('authorization') !== `Bearer ${expected}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const dry = req.nextUrl.searchParams.get('dry') === '1';
    if (!dry && !(await offerRemindersOn())) return NextResponse.json({ skipped: 'offer reminders are off' });
    return NextResponse.json(await runOfferReminders({ dry }));
}
