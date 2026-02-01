/**
 * Risk Level Settings API Route
 * Get and update user's risk level preference
 */

import { NextResponse } from 'next/server';
import { getUserSettings, setUserRiskLevel } from '@/lib/db';
import { cookies } from 'next/headers';

async function getUserIdFromCookie(): Promise<string> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get("privy-token")?.value;

    if (privyToken) {
        try {
            const payload = privyToken.split(".")[1];
            const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
            return decoded.sub || decoded.userId || "default-user";
        } catch {
            // Fall through
        }
    }
    return "default-user";
}

// Valid risk levels
const VALID_RISK_LEVELS = ['conservative', 'moderate', 'aggressive'];

/**
 * GET /api/settings/risk-level
 * Get user's current risk level
 */
export async function GET() {
    try {
        const userId = await getUserIdFromCookie();

        const settings = await getUserSettings(userId);

        return NextResponse.json({
            riskLevel: settings?.risk_level || 'moderate',
            userId: userId,
        });

    } catch (error) {
        console.error('❌ Get risk level error:', error);
        return NextResponse.json(
            { error: 'Failed to get risk level' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/settings/risk-level
 * Update user's risk level
 */
export async function PUT(request: Request) {
    try {
        const userId = await getUserIdFromCookie();
        const { riskLevel } = await request.json();

        // Validate risk level
        if (!VALID_RISK_LEVELS.includes(riskLevel)) {
            return NextResponse.json(
                { error: `Invalid risk level. Must be one of: ${VALID_RISK_LEVELS.join(', ')}` },
                { status: 400 }
            );
        }

        console.log(`📊 Updating risk level for ${userId} to ${riskLevel}`);

        await setUserRiskLevel(userId, riskLevel);

        console.log(`✅ Risk level updated`);

        return NextResponse.json({
            success: true,
            riskLevel: riskLevel,
            message: `Risk level updated to ${riskLevel}`,
        });

    } catch (error) {
        console.error('❌ Update risk level error:', error);
        return NextResponse.json(
            { error: 'Failed to update risk level', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
