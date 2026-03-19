import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const strategy = searchParams.get('strategy');
    
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = privyToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const userId = decoded.sub || decoded.privy_did;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        let queryStr = `
            SELECT * FROM virtual_transactions 
            WHERE user_id = $1 
        `;
        const params: any[] = [userId];

        if (strategy && strategy !== 'ALL') {
            queryStr += ` AND strategy = $2 `;
            params.push(strategy);
        }

        queryStr += ` ORDER BY created_at DESC LIMIT 100`;

        const result = await pool.query(queryStr, params);

        return NextResponse.json({ transactions: result.rows });
    } catch (error) {
        console.error('Failed to get virtual transactions:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
