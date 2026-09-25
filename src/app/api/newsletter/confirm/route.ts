import { NextRequest, NextResponse } from 'next/server';
import { confirmByToken } from '@/lib/newsletter/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        const result = await confirmByToken(String(token));
        return NextResponse.json(result, {
            status: result.outcome === 'not-found' ? 404 : 200,
        });
    } catch (err) {
        console.error('[newsletter/confirm]', err);
        return NextResponse.json({ error: 'Confirmation failed' }, { status: 500 });
    }
}
