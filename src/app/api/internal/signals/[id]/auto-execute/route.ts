import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Automatic brokerage execution has been retired.' },
        { status: 410 }
    );
}
