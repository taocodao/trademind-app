/**
 * Auto-Approve Settings API
 * GET/PUT /api/settings/auto-approve
 * 
 * Manages per-strategy auto-approve settings with risk profiles.
 * Each strategy (theta, diagonal) has its own risk level and configuration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import { initializeGamificationTables } from '@/lib/gamification';

interface StrategySettings {
    enabled: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    customOverrides: Record<string, number>;
}

interface AutoApproveSettings {
    enabled: boolean;
    theta: StrategySettings;
    diagonal: StrategySettings;
}

const DEFAULT_SETTINGS: AutoApproveSettings = {
    enabled: false,
    theta: {
        enabled: true,
        riskLevel: 'MEDIUM',
        customOverrides: {},
    },
    diagonal: {
        enabled: false,
        riskLevel: 'MEDIUM',
        customOverrides: {},
    },
};

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

        await initializeGamificationTables();

        const result = await query(
            `SELECT 
                auto_approve_enabled,
                auto_approve_settings
             FROM user_settings 
             WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return NextResponse.json(DEFAULT_SETTINGS);
        }

        const row = result.rows[0];

        // If we have the new JSON settings, use them
        if (row.auto_approve_settings) {
            const stored = typeof row.auto_approve_settings === 'string'
                ? JSON.parse(row.auto_approve_settings)
                : row.auto_approve_settings;
            return NextResponse.json({
                ...DEFAULT_SETTINGS,
                ...stored,
                enabled: row.auto_approve_enabled ?? stored.enabled ?? false,
            });
        }

        // Migration: old format → new format
        return NextResponse.json({
            ...DEFAULT_SETTINGS,
            enabled: row.auto_approve_enabled || false,
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

        // Validate risk levels
        const validRiskLevels = ['LOW', 'MEDIUM', 'HIGH'];
        if (body.theta?.riskLevel && !validRiskLevels.includes(body.theta.riskLevel)) {
            return NextResponse.json(
                { error: 'Invalid theta risk level' },
                { status: 400 }
            );
        }
        if (body.diagonal?.riskLevel && !validRiskLevels.includes(body.diagonal.riskLevel)) {
            return NextResponse.json(
                { error: 'Invalid diagonal risk level' },
                { status: 400 }
            );
        }

        const settingsJson = JSON.stringify({
            theta: body.theta || DEFAULT_SETTINGS.theta,
            diagonal: body.diagonal || DEFAULT_SETTINGS.diagonal,
        });

        // Upsert settings - try with new column first
        try {
            await query(
                `INSERT INTO user_settings (
                    user_id, 
                    auto_approve_enabled, 
                    auto_approve_settings,
                    updated_at
                 ) VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET
                    auto_approve_enabled = $2,
                    auto_approve_settings = $3,
                    updated_at = NOW()`,
                [userId, body.enabled, settingsJson]
            );
        } catch (dbError) {
            // Column might not exist yet - add it and retry
            console.warn('Adding auto_approve_settings column...', dbError);
            await query(
                `ALTER TABLE user_settings 
                 ADD COLUMN IF NOT EXISTS auto_approve_settings JSONB DEFAULT '{}'::jsonb`
            );
            await query(
                `INSERT INTO user_settings (
                    user_id, 
                    auto_approve_enabled, 
                    auto_approve_settings,
                    updated_at
                 ) VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (user_id) DO UPDATE SET
                    auto_approve_enabled = $2,
                    auto_approve_settings = $3,
                    updated_at = NOW()`,
                [userId, body.enabled, settingsJson]
            );
        }

        // Sync to Python backend (fire-and-forget, best-effort)
        const PYTHON_API = process.env.TASTYTRADE_API_URL || 'http://34.235.119.67:8002';
        try {
            await fetch(`${PYTHON_API}/api/settings/auto-approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            console.log('✅ Auto-approve settings synced to Python backend');
        } catch (syncError) {
            console.warn('⚠️ Could not sync auto-approve to Python backend (non-fatal):', syncError);
        }

        return NextResponse.json({
            success: true,
            ...body,
        });
    } catch (error) {
        console.error('❌ Error updating auto-approve settings:', error);
        return NextResponse.json(
            { error: 'Failed to update settings' },
            { status: 500 }
        );
    }
}
