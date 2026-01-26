/**
 * Disconnect Tastytrade API Route
 * Removes the user's Tastytrade tokens from Redis
 */

import { NextResponse } from 'next/server';
import { unlinkTastytrade } from '@/lib/redis';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        // Get user ID from Privy token
        const cookieStore = await cookies();
        const privyToken = cookieStore.get("privy-token")?.value;

        if (!privyToken) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Decode Privy token to get user ID
        let userId = "default-user";
        try {
            const payload = privyToken.split(".")[1];
            const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
            userId = decoded.sub || decoded.userId || "default-user";
        } catch (err) {
            console.warn("Could not decode Privy token", err);
        }

        // Delete tokens from Redis
        await unlinkTastytrade(userId);

        console.log(`✅ Disconnected Tastytrade for user: ${userId}`);

        return NextResponse.json({
            success: true,
            message: 'Tastytrade account disconnected successfully'
        });

    } catch (error) {
        console.error('Disconnect error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to disconnect' },
            { status: 500 }
        );
    }
}
