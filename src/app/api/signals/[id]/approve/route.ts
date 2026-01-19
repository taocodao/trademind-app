/**
 * Approve Signal API Route
 * Approves a signal and executes the trade
 */

import { NextResponse } from 'next/server';

const PYTHON_API = process.env.TASTYTRADE_API_URL || 'http://localhost:8002';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        const response = await fetch(`${PYTHON_API}/api/signals/${id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok) {
            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);

    } catch (error) {
        console.error('Approve signal error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
