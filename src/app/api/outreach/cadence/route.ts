import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getContact } from '@/lib/outreach/db';
import { setCadence } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

/** Thank-you page choice: weekly only, or weekly plus daily. The personal token identifies the subscriber. */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const cadence = body.cadence === 'both' ? 'both' : body.cadence === 'weekly' ? 'weekly' : null;
        if (!cadence) return NextResponse.json({ error: 'Choose weekly or daily' }, { status: 400 });
        const c = await getContact(String(body.t ?? ''));
        if (!c) return NextResponse.json({ error: 'Link not recognised' }, { status: 404 });
        const r = await query(
            `SELECT id FROM newsletter_subscribers WHERE lower(email) = lower($1) AND status = 'confirmed' ORDER BY id DESC LIMIT 1`,
            [c.email]
        );
        const id = r.rows[0]?.id as number | undefined;
        if (!id) return NextResponse.json({ error: 'Not subscribed yet' }, { status: 409 });
        await setCadence(id, cadence);
        return NextResponse.json({ ok: true, cadence });
    } catch (err) {
        console.error('[outreach/cadence]', err);
        return NextResponse.json({ error: 'Could not save' }, { status: 500 });
    }
}
