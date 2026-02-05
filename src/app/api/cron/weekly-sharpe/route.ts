/**
 * Weekly Sharpe Ratio Calculation (Cron Job)
 * POST /api/cron/weekly-sharpe
 * 
 * Should be called by Vercel Cron or external scheduler every Sunday night
 * Calculates Sharpe ratios and updates streaks for all users
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { updateStreak, checkAndAwardBadges, initializeGamificationTables } from '@/lib/gamification';

// Protect with cron secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Initialize tables if needed
        await initializeGamificationTables();

        // Get all users with gamification records
        const usersResult = await query(
            `SELECT user_id, weekly_profit, total_trades FROM user_gamification`
        );

        const results = {
            usersProcessed: 0,
            streaksUpdated: 0,
            badgesAwarded: 0,
            sharpeCalculated: 0
        };

        for (const user of usersResult.rows) {
            try {
                // Determine if winning week (profit > 0)
                const weeklyProfit = parseFloat(user.weekly_profit) || 0;
                const isWinningWeek = weeklyProfit > 0;

                // Update streak
                await updateStreak(user.user_id, isWinningWeek);
                if (isWinningWeek) {
                    results.streaksUpdated++;
                }

                // Calculate Sharpe ratio (simplified)
                // Sharpe = (Average Return - Risk Free Rate) / Std Dev of Returns
                // For simplicity, we'll use a proxy based on win rate and profit consistency
                const sharpe = await calculateUserSharpe(user.user_id);
                if (sharpe !== null) {
                    await query(
                        `UPDATE user_gamification SET sharpe_ratio = $1, updated_at = NOW() WHERE user_id = $2`,
                        [sharpe, user.user_id]
                    );
                    results.sharpeCalculated++;
                }

                // Check for new badges (especially streak badges after update)
                const newBadges = await checkAndAwardBadges(user.user_id);
                results.badgesAwarded += newBadges.length;

                results.usersProcessed++;
            } catch (userError) {
                console.error(`Error processing user ${user.user_id}:`, userError);
            }
        }

        console.log('✅ Weekly gamification update complete:', results);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...results
        });
    } catch (error) {
        console.error('❌ Error in weekly Sharpe calculation:', error);
        return NextResponse.json(
            { error: 'Failed to run weekly calculation' },
            { status: 500 }
        );
    }
}

/**
 * Calculate Sharpe ratio for a user based on their trade history
 * Returns null if not enough data
 */
async function calculateUserSharpe(userId: string): Promise<number | null> {
    // Get closed positions for this user from the last 30 days
    const tradesResult = await query(
        `SELECT exit_pnl FROM positions 
         WHERE user_id = $1 
         AND status = 'closed' 
         AND closed_at > NOW() - INTERVAL '30 days'
         ORDER BY closed_at DESC`,
        [userId]
    );

    const trades = tradesResult.rows;

    // Need at least 5 trades for meaningful Sharpe
    if (trades.length < 5) {
        return null;
    }

    const returns = trades.map(t => parseFloat(t.exit_pnl) || 0);

    // Calculate mean return
    const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;

    // Calculate standard deviation
    const squaredDiffs = returns.map(r => Math.pow(r - meanReturn, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // Avoid division by zero
    if (stdDev === 0) {
        return meanReturn > 0 ? 3.0 : 0; // Cap at 3.0 for perfect consistency
    }

    // Risk-free rate assumption (annualized ~2%, weekly ~0.04%)
    const riskFreeRate = 0.04;

    // Sharpe ratio (annualized approximation)
    const sharpe = (meanReturn - riskFreeRate) / stdDev;

    // Cap between -2 and 5
    return Math.max(-2, Math.min(5, Math.round(sharpe * 100) / 100));
}

// Also allow GET for manual testing
export async function GET(request: NextRequest) {
    return POST(request);
}
