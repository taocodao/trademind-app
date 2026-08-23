import { NextResponse } from 'next/server';

export async function POST() {
    return NextResponse.json(
        { error: 'Brokerage execution has been retired. Review the signal in your account instead.' },
        { status: 410 }
    );
}
