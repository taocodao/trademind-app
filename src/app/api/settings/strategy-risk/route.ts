/**
 * Per-Strategy Risk & Principal Settings API Route
 * Get and update user's per-strategy risk level and initial principal
 */

import { NextResponse } from 'next/server';
import {
    getUserStrategySettings,
    setUserStrategyRiskLevel,
    getVirtualAccountPrincipal,
    setVirtualAccountPrincipal,
    getVirtualBalance,
} from '@/lib/db';
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

const VALID_RISK_LEVELS = ['conservative', 'moderate', 'aggressive'] as const;
const VALID_STRATEGIES = ['TQQQ_TURBOCORE_PRO', 'QQQ_LEAPS'] as const;

/**
 * GET /api/settings/strategy-risk?strategy=TQQQ_TURBOCORE_PRO
 * Get user's per-strategy risk level and principal
 */
export async function GET(request: Request) {
    try {
        const userId = await getUserIdFromCookie();
        const { searchParams } = new URL(request.url);
        const strategy = searchParams.get('strategy');

        if (!strategy || !VALID_STRATEGIES.includes(strategy as typeof VALID_STRATEGIES[number])) {
            return NextResponse.json(
                { error: `Invalid or missing strategy. Must be one of: ${VALID_STRATEGIES.join(', ')}` },
                { status: 400 }
            );
        }

        const [settings, principal, balanceInfo] = await Promise.all([
            getUserStrategySettings(userId, strategy),
            getVirtualAccountPrincipal(userId, strategy),
            getVirtualBalance(userId, strategy),
        ]);

        return NextResponse.json({
            strategy,
            riskLevel: settings?.risk_level || 'moderate',
            initialPrincipal: principal,
            currentBalance: balanceInfo.balance,
            isConfigured: principal != null,
        });

    } catch (error) {
        console.error('❌ Get strategy risk settings error:', error);
        return NextResponse.json(
            { error: 'Failed to get strategy settings' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/settings/strategy-risk
 * Update user's per-strategy risk level and/or initial principal
 * Body: { strategy, riskLevel?, initialPrincipal? }
 */
export async function PUT(request: Request) {
    try {
        const userId = await getUserIdFromCookie();
        const body = await request.json();
        const { strategy, riskLevel, initialPrincipal } = body;

        if (!strategy || !VALID_STRATEGIES.includes(strategy)) {
            return NextResponse.json(
                { error: `Invalid or missing strategy. Must be one of: ${VALID_STRATEGIES.join(', ')}` },
                { status: 400 }
            );
        }

        // Update risk level if provided
        if (riskLevel !== undefined) {
            if (!VALID_RISK_LEVELS.includes(riskLevel)) {
                return NextResponse.json(
                    { error: `Invalid risk level. Must be one of: ${VALID_RISK_LEVELS.join(', ')}` },
                    { status: 400 }
                );
            }
            await setUserStrategyRiskLevel(userId, strategy, riskLevel);
            console.log(`📊 Updated ${strategy} risk level for ${userId} to ${riskLevel}`);
        }

        // Update initial principal if provided
        if (initialPrincipal !== undefined) {
            const principal = parseFloat(initialPrincipal);
            if (isNaN(principal) || principal <= 0) {
                return NextResponse.json(
                    { error: 'Initial principal must be a positive number' },
                    { status: 400 }
                );
            }
            await setVirtualAccountPrincipal(userId, strategy, principal);
            console.log(`💰 Set ${strategy} initial principal for ${userId} to $${principal}`);
        }

        return NextResponse.json({
            success: true,
            strategy,
            riskLevel: riskLevel || undefined,
            initialPrincipal: initialPrincipal || undefined,
        });

    } catch (error) {
        console.error('❌ Update strategy risk settings error:', error);
        return NextResponse.json(
            { error: 'Failed to update strategy settings', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
