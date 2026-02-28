import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('privy-user-id')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const result = await pool.query(
            `SELECT subscription_tier FROM user_settings WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ tier: 'observer' });
        }

        return NextResponse.json({ tier: result.rows[0].subscription_tier || 'observer' });
    } catch (error) {
        console.error('Error fetching subscription tier:', error);
        return NextResponse.json(
            { error: 'Failed to find subscription tier' },
            { status: 500 }
        );
    }
}
