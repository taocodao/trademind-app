import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import pool from '@/lib/db';

// Strategy settings interface
interface StrategySettings {
    globalRiskLevel: 'safe' | 'smart' | 'bold';
    confidence: number;
    trailingStop: number;
    maxHeat: number;
    thetaEnabled: boolean;
    thetaCapital: number;
    thetaDteMin: number;
    thetaDteMax: number;
    thetaDelta: number;
    thetaTradesWeek: number;
    calendarEnabled: boolean;
    calendarCapital: number;
    calendarDteMin: number;
    calendarDteMax: number;
    calendarTradesWeek: number;
}

// GET - Load user's strategy settings
export async function GET() {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('privy-user-id')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const result = await pool.query(
            `SELECT 
                global_risk_level as "globalRiskLevel",
                confidence,
                trailing_stop as "trailingStop",
                max_heat as "maxHeat",
                theta_enabled as "thetaEnabled",
                theta_capital as "thetaCapital",
                theta_dte_min as "thetaDteMin",
                theta_dte_max as "thetaDteMax",
                theta_delta as "thetaDelta",
                theta_trades_week as "thetaTradesWeek",
                calendar_enabled as "calendarEnabled",
                calendar_capital as "calendarCapital",
                calendar_dte_min as "calendarDteMin",
                calendar_dte_max as "calendarDteMax",
                calendar_trades_week as "calendarTradesWeek"
            FROM strategy_settings 
            WHERE user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            // Return default settings if none exist
            return NextResponse.json({
                settings: null,
                message: 'No settings found, using defaults'
            });
        }

        return NextResponse.json({ settings: result.rows[0] });
    } catch (error) {
        console.error('Error loading strategy settings:', error);
        return NextResponse.json(
            { error: 'Failed to load settings' },
            { status: 500 }
        );
    }
}

// PUT - Save user's strategy settings
export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const userId = cookieStore.get('privy-user-id')?.value;

        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const settings: StrategySettings = await request.json();

        // Validate settings
        if (settings.confidence < 50 || settings.confidence > 95) {
            return NextResponse.json({ error: 'Confidence must be between 50-95%' }, { status: 400 });
        }
        if (settings.trailingStop > -20 || settings.trailingStop < -70) {
            return NextResponse.json({ error: 'Trailing stop must be between -20% and -70%' }, { status: 400 });
        }

        // Upsert settings
        await pool.query(
            `INSERT INTO strategy_settings (
                user_id,
                global_risk_level,
                confidence,
                trailing_stop,
                max_heat,
                theta_enabled,
                theta_capital,
                theta_dte_min,
                theta_dte_max,
                theta_delta,
                theta_trades_week,
                calendar_enabled,
                calendar_capital,
                calendar_dte_min,
                calendar_dte_max,
                calendar_trades_week,
                updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                global_risk_level = $2,
                confidence = $3,
                trailing_stop = $4,
                max_heat = $5,
                theta_enabled = $6,
                theta_capital = $7,
                theta_dte_min = $8,
                theta_dte_max = $9,
                theta_delta = $10,
                theta_trades_week = $11,
                calendar_enabled = $12,
                calendar_capital = $13,
                calendar_dte_min = $14,
                calendar_dte_max = $15,
                calendar_trades_week = $16,
                updated_at = NOW()`,
            [
                userId,
                settings.globalRiskLevel,
                settings.confidence,
                settings.trailingStop,
                settings.maxHeat,
                settings.thetaEnabled,
                settings.thetaCapital,
                settings.thetaDteMin,
                settings.thetaDteMax,
                settings.thetaDelta,
                settings.thetaTradesWeek,
                settings.calendarEnabled,
                settings.calendarCapital,
                settings.calendarDteMin,
                settings.calendarDteMax,
                settings.calendarTradesWeek,
            ]
        );

        return NextResponse.json({ success: true, message: 'Settings saved' });
    } catch (error) {
        console.error('Error saving strategy settings:', error);
        return NextResponse.json(
            { error: 'Failed to save settings' },
            { status: 500 }
        );
    }
}
