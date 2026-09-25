import { NextRequest, NextResponse } from 'next/server';
import {
    previewChangeEmail, requestEmailChange, confirmEmailChange, cancelEmailChange,
    makeCancelToken,
} from '@/lib/newsletter/db';
import {
    sendConfirmationEmail, sendChangeConfirmEmail, sendOldAddressChangeNotice,
} from '@/lib/newsletter/email';
import { maskEmail } from '@/lib/newsletter/normalize';

export const dynamic = 'force-dynamic';

/** GET ?token= -> tells the page which change flow this link starts. */
export async function GET(req: NextRequest) {
    const t = req.nextUrl.searchParams.get('token') ?? '';
    if (!t) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    const preview = await previewChangeEmail(t);
    if (!preview.valid) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
    return NextResponse.json(preview);
}

/** POST { token, email } -> starts the change; behavior depends on the flow. */
export async function POST(req: NextRequest) {
    try {
        const { token, email } = await req.json();
        if (!token || !email) {
            return NextResponse.json({ error: 'Missing token or email' }, { status: 400 });
        }
        const result = await requestEmailChange(String(token), String(email));
        if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

        if (result.flow === 'from-pending') {
            const emailed = await sendConfirmationEmail({
                to: result.newEmail!,
                confirmToken: result.confirmToken!,
                changeToken: result.changeToken!,
            });
            return NextResponse.json({ ok: true, flow: 'from-pending', emailed, email: result.newEmail });
        }

        // from-confirmed: confirm link goes to the new address, notice to the old.
        const cancelToken = await makeCancelToken(result.subscriberId!);
        const emailedNew = await sendChangeConfirmEmail({
            to: result.newEmail!,
            confirmToken: result.confirmToken!,
        });
        const emailedOld = await sendOldAddressChangeNotice({
            to: result.oldEmail!,
            newEmailMasked: maskEmail(result.newEmail!),
            cancelToken,
        });
        return NextResponse.json({ ok: true, flow: 'from-confirmed', emailed: emailedNew && emailedOld });
    } catch (err) {
        console.error('[newsletter/change-email]', err);
        return NextResponse.json({ error: 'Change failed' }, { status: 500 });
    }
}
