import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json(
        { error: 'Broker order previews are no longer available. Use account activity and signal instructions instead.' },
        { status: 410 }
    );
}
