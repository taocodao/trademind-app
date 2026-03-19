import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getVirtualBalance, updateVirtualBalance } from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const strategy = searchParams.get('strategy');

    if (!strategy) {
        return NextResponse.json({ error: 'Missing strategy parameter' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = privyToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const userId = decoded.sub || decoded.privy_did;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const balance = await getVirtualBalance(userId, strategy);
        return NextResponse.json({ balance });
    } catch (error) {
        console.error('Failed to get virtual balance:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token')?.value;
    if (!privyToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = privyToken.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    const userId = decoded.sub || decoded.privy_did;

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { strategy, action, amount } = body;

        if (!strategy || !action || !amount || amount <= 0) {
            return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
        }

        if (action !== 'deposit' && action !== 'withdraw') {
            return NextResponse.json({ action: 'Invalid action type' }, { status: 400 });
        }

        const delta = action === 'deposit' ? amount : -amount;
        const newBalance = await updateVirtualBalance(userId, strategy, delta, action);

        return NextResponse.json({ success: true, balance: newBalance });
    } catch (error) {
        console.error('Failed to update virtual balance:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
