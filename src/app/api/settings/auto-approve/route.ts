/**
 * Auto-Approve Settings API
 * GET/PUT /api/settings/auto-approve
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { initializeGamificationTables } from '@/lib/gamification';

export interface AutoApproveSettings {
    enabled: boolean;
    minConfidence: number;
    maxCapital: number;
    strategies: string[];
}

async function getUserId(): Promise<string | null> {
    const cookieStore = await cookies();
    const privyToken = cookieStore.get('privy-token');

    if (!privyToken) return null;

    const tokenParts = privyToken.value.split('.');
    if (tokenParts.length >= 2) {
        try {
            const payload = JSON.parse(atob(tokenParts[1]));
            return payload.sub || payload.userId || null;
        } catch {
            return privyToken.value.slice(0, 32);
        }
    }
    return null;
}

export async function GET() {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Ensure columns exist
        await initializeGamificationTables();

        const result = await query(
            `SELECT 
                auto_approve_enabled,
                auto_approve_min_confidence,
                auto_approve_max_capital,
                auto_approve_strategies
             FROM user_settings 
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            // Return defaults
            return NextResponse.json({
                enabled: false,
                minConfidence: 80,
                maxCapital: 500,
                strategies: ['theta']
            });
        }

        const row = result.rows[0];
        return NextResponse.json({
            enabled: row.auto_approve_enabled || false,
            minConfidence: row.auto_approve_min_confidence || 80,
            maxCapital: parseFloat(row.auto_approve_max_capital) || 500,
            strategies: row.auto_approve_strategies || ['theta']
        });
    } catch (error) {
        console.error('❌ Error fetching auto-approve settings:', error);
        return NextResponse.json(
            { error: 'Failed to fetch settings' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body: AutoApproveSettings = await request.json();

        // Validate
        if (body.minConfidence < 70 || body.minConfidence > 95) {
            return NextResponse.json(
                { error: 'Minimum confidence must be between 70 and 95' },
                { status: 400 }
            );
        }

        if (body.maxCapital < 100 || body.maxCapital > 10000) {
            return NextResponse.json(
                { error: 'Max capital must be between $100 and $10,000' },
                { status: 400 }
            );
        }

        const validStrategies = ['theta', 'calendar'];
        const strategies = body.strategies.filter(s => validStrategies.includes(s));

        // Upsert settings
        await query(
            `INSERT INTO user_settings (
                user_id, 
                auto_approve_enabled, 
                auto_approve_min_confidence,
                auto_approve_max_capital,
                auto_approve_strategies,
                updated_at
             ) VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (user_id) DO UPDATE SET
                auto_approve_enabled = $2,
                auto_approve_min_confidence = $3,
                auto_approve_max_capital = $4,
                auto_approve_strategies = $5,
                updated_at = NOW()`,
            [userId, body.enabled, body.minConfidence, body.maxCapital, strategies]
        );

        return NextResponse.json({
            success: true,
            enabled: body.enabled,
            minConfidence: body.minConfidence,
            maxCapital: body.maxCapital,
            strategies
        });
    } catch (error) {
        console.error('❌ Error updating auto-approve settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
