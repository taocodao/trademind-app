import { NextRequest, NextResponse } from 'next/server';
import { changeEmail, getByChangeToken } from '@/lib/newsletter/db';
import { sendConfirmationEmail } from '@/lib/newsletter/email';

export const dynamic = 'force-dynamic';

/** GET ?token= -> tells the page which pending email this link belongs to. */
export async function GET(req: NextRequest) {
    const t = req.nextUrl.searchParams.get('token') ?? '';
    const row = t ? await getByChangeToken(t) : null;
    if (!row) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    return NextResponse.json({ email: row.email, status: row.status });
}

/** POST { token, email } -> invalidates the old pending email, sends a new confirmation. */
export async function POST(req: NextRequest) {
    try {
        const { token, email } = await req.json();
        if (!token || !email) {
            return NextResponse.json({ error: 'Missing token or email' }, { status: 400 });
        }
        const result = await changeEmail(String(token), String(email));
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

        const emailed = await sendConfirmationEmail({
            to: result.email!,
            confirmToken: result.confirmToken!,
            changeToken: result.changeToken!,
        });
        return NextResponse.json({ ok: true, emailed, email: result.email });
    } catch (err) {
        console.error('[newsletter/change-email]', err);
        return NextResponse.json({ error: 'Change failed' }, { status: 500 });
    }
}
