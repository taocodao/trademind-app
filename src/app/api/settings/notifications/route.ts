import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function PATCH(req: NextRequest) {
    try {
        // Auth guard
        const cookieStore = await cookies();
        let userId = cookieStore.get('privy-user-id')?.value;

        if (!userId) {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                try {
                    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
                    userId = payload?.sub || payload?.privy_did || '';
                } catch { }
            }
        }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();

        if (body.email_signal_alerts !== undefined) {
             await query(
                 `INSERT INTO user_settings (user_id, email_signal_alerts) VALUES ($2, $1) 
                  ON CONFLICT (user_id) DO UPDATE SET email_signal_alerts = $1`,
                 [body.email_signal_alerts, userId]
             );
        }

        if (body.email !== undefined) {
             await query(
                 `INSERT INTO user_settings (user_id, email) VALUES ($2, $1) 
                  ON CONFLICT (user_id) DO UPDATE SET email = $1`,
                 [body.email || null, userId]
             );
        }

        if (body.global_auto_approve !== undefined) {
             await query(
                 `INSERT INTO user_settings (user_id, global_auto_approve) VALUES ($2, $1) 
                  ON CONFLICT (user_id) DO UPDATE SET global_auto_approve = $1`,
                 [body.global_auto_approve, userId]
             );
        }

        if (body.has_completed_onboarding !== undefined) {
             await query(
                 `INSERT INTO user_settings (user_id, has_completed_onboarding) VALUES ($2, $1) 
                  ON CONFLICT (user_id) DO UPDATE SET has_completed_onboarding = $1`,
                 [body.has_completed_onboarding, userId]
             );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating notification settings:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
