/**
 * Approve Signal API Route
 * Approves a signal and executes the trade using USER's credentials
 */

import { NextResponse } from 'next/server';
import { getTastytradeTokens } from '@/lib/redis';
import { cookies } from 'next/headers';

const PYTHON_API = process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json().catch(() => ({}));

        // Get user ID from Privy token
        const cookieStore = await cookies();
        const privyToken = cookieStore.get("privy-token")?.value;

        let userId = "default-user";
        if (privyToken) {
            try {
                const payload = privyToken.split(".")[1];
                const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
                userId = decoded.sub || decoded.userId || "default-user";
            } catch (err) {
                console.warn("Could not decode Privy token", err);
            }
        }

        // Get user's Tastytrade credentials
        const tokens = await getTastytradeTokens(userId);
        if (!tokens || !tokens.refreshToken) {
            return NextResponse.json(
                { error: 'Not connected to Tastytrade. Please link your account first.' },
                { status: 401 }
            );
        }

        // Pass user's credentials to Python backend for per-user execution
        const response = await fetch(`${PYTHON_API}/api/signals/${id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                ...body,
                // Per-user OAuth credentials
                refreshToken: tokens.refreshToken,
                accountNumber: tokens.accountNumber,
                username: tokens.username,  // User's Tastytrade username (not email!)
                // User ID for per-user execution tracking
                userId: userId,
            }),
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
