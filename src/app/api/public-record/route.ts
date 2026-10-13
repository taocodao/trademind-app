import { NextResponse } from 'next/server';
import { getPublicRecord } from '@/lib/public-record';

export const dynamic = 'force-dynamic';

// Public, no auth. Returns the delayed live record of the TradeMind virtual accounts.
export async function GET() {
    try {
        const record = await getPublicRecord();
        return NextResponse.json(record, { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } });
    } catch (err) {
        console.error('[public-record] failed:', err);
        return NextResponse.json({ error: 'Record unavailable' }, { status: 500 });
    }
}
