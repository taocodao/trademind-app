import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const AUDIENCE_ID = process.env.RESEND_AUDIENCE_ID || '';

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const privyToken = cookieStore.get('privy-token')?.value;

        if (!privyToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { email, firstName, lastName } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        // Add to Resend Audience for the 30-Day Drip Sequence
        if (RESEND_API_KEY && AUDIENCE_ID) {
            const res = await fetch(`https://api.resend.com/audiences/${AUDIENCE_ID}/contacts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email,
                    first_name: firstName || undefined,
                    last_name: lastName || undefined,
                    unsubscribed: false
                })
            });

            if (!res.ok) {
                console.error('Failed to add contact to Resend:', await res.text());
            } else {
                console.log(`Successfully added ${email} to Resend Onboarding Sequence`);
            }
        } else {
            console.warn('Resend API Key or Audience ID implies not configured on Vercel.');
        }

        // Also update the database to ensure we don't bombard them repeatedly
        const payload = privyToken.split('.')[1];
        const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
        const userId = decoded.sub || decoded.userId || 'unknown';

        await pool.query(
            `UPDATE user_settings 
             SET first_name = COALESCE(first_name, $1), 
                 last_name = COALESCE(last_name, $2)
             WHERE user_id = $3`,
            [firstName || null, lastName || null, userId]
        );

        return NextResponse.json({ success: true });

    } catch (err: any) {
        console.error('Email Onboarding Error:', err);
        return NextResponse.json(
            { error: 'Failed to process onboarding request' },
            { status: 500 }
        );
    }
}
