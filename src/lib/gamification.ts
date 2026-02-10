/**
 * Gamification System
 * Handles streaks, badges, leaderboard, and user stats
 */

import { query } from './db';

// ============================================================
// TYPES
// ============================================================

export interface GamificationStats {
    userId: string;
    displayName: string | null;
    currentStreak: number;
    longestStreak: number;
    totalWins: number;
    totalTrades: number;
    totalProfit: number;
    weeklyProfit: number;
    winRate: number;
    sharpeRatio: number;
    badges: Badge[];
    leaderboardRank: number | null;
}

export interface Badge {
    type: string;
    name: string;
    icon: string;
    earnedAt: Date | null;
    progress?: number;  // 0-100 for in-progress badges
    requirement?: string;
}

export interface LeaderboardEntry {
    rank: number;
    displayName: string;
    sharpeRatio: number;
    weeklyReturn: number;
    winRate: number;
    isCurrentUser: boolean;
}

// ============================================================
// BADGE DEFINITIONS
// ============================================================

export const BADGE_DEFINITIONS: Record<string, Omit<Badge, 'earnedAt' | 'progress'>> = {
    first_trade: {
        type: 'first_trade',
        name: 'First Trade',
        icon: '🎯',
        requirement: 'Complete your first trade'
    },
    streak_5: {
        type: 'streak_5',
        name: '5 Week Streak',
        icon: '🔥',
        requirement: '5 consecutive winning weeks'
    },
    streak_10: {
        type: 'streak_10',
        name: 'Pro Trader',
        icon: '🏆',
        requirement: '10 consecutive winning weeks'
    },
    profit_500: {
        type: 'profit_500',
        name: '$500 Club',
        icon: '💵',
        requirement: 'Total profits exceed $500'
    },
    profit_1000: {
        type: 'profit_1000',
        name: '$1K Winner',
        icon: '💰',
        requirement: 'Total profits exceed $1,000'
    },
    profit_5000: {
        type: 'profit_5000',
        name: '$5K Legend',
        icon: '🤑',
        requirement: 'Total profits exceed $5,000'
    },
    trades_25: {
        type: 'trades_25',
        name: 'Experienced',
        icon: '📈',
        requirement: '25 trades completed'
    },
    trades_100: {
        type: 'trades_100',
        name: 'Veteran',
        icon: '🎖️',
        requirement: '100 trades completed'
    },
    ai_guardian: {
        type: 'ai_guardian',
        name: 'AI Guardian',
        icon: '🛡️',
        requirement: 'AI blocked 5 risky trades'
    },
    theta_master: {
        type: 'theta_master',
        name: 'Theta Master',
        icon: '⏰',
        requirement: 'Earn $1,000 from theta decay'
    }
};

// ============================================================
// GAMIFICATION QUERIES
// ============================================================

export async function getGamificationStats(userId: string): Promise<GamificationStats | null> {
    // Get base stats
    const statsResult = await query(
        `SELECT * FROM user_gamification WHERE user_id = $1`,
        [userId]
    );

    // Get display name from user_settings
    const settingsResult = await query(
        `SELECT display_name FROM user_settings WHERE user_id = $1`,
        [userId]
    );

    // Get user's badges
    const badgesResult = await query(
        `SELECT badge_type, badge_name, earned_at FROM user_badges WHERE user_id = $1`,
        [userId]
    );

    // Get leaderboard rank
    const rankResult = await query(
        `SELECT rank FROM (
            SELECT user_id, 
                   ROW_NUMBER() OVER (ORDER BY sharpe_ratio DESC) as rank
            FROM user_gamification
            WHERE total_trades >= 5
        ) ranks WHERE user_id = $1`,
        [userId]
    );

    const stats = statsResult.rows[0];
    const displayName = settingsResult.rows[0]?.display_name || null;
    const earnedBadges = badgesResult.rows;
    const rank = rankResult.rows[0]?.rank || null;

    if (!stats) {
        // Return default stats for new users
        return {
            userId,
            displayName,
            currentStreak: 0,
            longestStreak: 0,
            totalWins: 0,
            totalTrades: 0,
            totalProfit: 0,
            weeklyProfit: 0,
            winRate: 0,
            sharpeRatio: 0,
            badges: getAllBadgesWithProgress(earnedBadges, 0, 0, 0),
            leaderboardRank: null
        };
    }

    const winRate = stats.total_trades > 0
        ? (stats.total_wins / stats.total_trades) * 100
        : 0;

    return {
        userId,
        displayName,
        currentStreak: stats.current_streak || 0,
        longestStreak: stats.longest_streak || 0,
        totalWins: stats.total_wins || 0,
        totalTrades: stats.total_trades || 0,
        totalProfit: parseFloat(stats.total_profit) || 0,
        weeklyProfit: parseFloat(stats.weekly_profit) || 0,
        winRate: Math.round(winRate * 10) / 10,
        sharpeRatio: parseFloat(stats.sharpe_ratio) || 0,
        badges: getAllBadgesWithProgress(earnedBadges, stats.total_trades, stats.total_profit, stats.current_streak),
        leaderboardRank: rank ? parseInt(rank) : null
    };
}

function getAllBadgesWithProgress(
    earnedBadges: Array<{ badge_type: string; badge_name: string; earned_at: Date }>,
    totalTrades: number,
    totalProfit: number,
    currentStreak: number
): Badge[] {
    const earnedMap = new Map(earnedBadges.map(b => [b.badge_type, b.earned_at]));

    return Object.values(BADGE_DEFINITIONS).map(def => {
        const earnedAt = earnedMap.get(def.type) || null;
        let progress = 0;

        // Calculate progress for in-progress badges
        if (!earnedAt) {
            switch (def.type) {
                case 'first_trade':
                    progress = totalTrades > 0 ? 100 : 0;
                    break;
                case 'trades_25':
                    progress = Math.min(100, (totalTrades / 25) * 100);
                    break;
                case 'trades_100':
                    progress = Math.min(100, (totalTrades / 100) * 100);
                    break;
                case 'profit_500':
                    progress = Math.min(100, (totalProfit / 500) * 100);
                    break;
                case 'profit_1000':
                    progress = Math.min(100, (totalProfit / 1000) * 100);
                    break;
                case 'profit_5000':
                    progress = Math.min(100, (totalProfit / 5000) * 100);
                    break;
                case 'streak_5':
                    progress = Math.min(100, (currentStreak / 5) * 100);
                    break;
                case 'streak_10':
                    progress = Math.min(100, (currentStreak / 10) * 100);
                    break;
            }
        }

        return {
            ...def,
            earnedAt,
            progress: earnedAt ? 100 : Math.round(progress)
        };
    });
}

export async function getLeaderboard(userId: string, limit: number = 50): Promise<LeaderboardEntry[]> {
    const result = await query(
        `SELECT 
            user_id,
            COALESCE(
                (SELECT display_name FROM user_settings WHERE user_id = g.user_id),
                CONCAT('Trader', SUBSTR(user_id, 1, 4))
            ) as display_name,
            sharpe_ratio,
            weekly_profit,
            CASE WHEN total_trades > 0 
                THEN ROUND((total_wins::DECIMAL / total_trades) * 100, 1) 
                ELSE 0 
            END as win_rate,
            ROW_NUMBER() OVER (ORDER BY sharpe_ratio DESC) as rank
        FROM user_gamification g
        WHERE total_trades >= 5
        ORDER BY sharpe_ratio DESC
        LIMIT $1`,
        [limit]
    );

    return result.rows.map(row => ({
        rank: parseInt(row.rank),
        displayName: row.display_name,
        sharpeRatio: parseFloat(row.sharpe_ratio) || 0,
        weeklyReturn: parseFloat(row.weekly_profit) || 0,
        winRate: parseFloat(row.win_rate) || 0,
        isCurrentUser: row.user_id === userId
    }));
}

// ============================================================
// GAMIFICATION UPDATES
// ============================================================

export async function recordTradeResult(
    userId: string,
    pnl: number,
    isWin: boolean
): Promise<Badge[]> {
    // Upsert gamification record
    await query(
        `INSERT INTO user_gamification (user_id, total_trades, total_wins, total_profit, updated_at)
         VALUES ($1, 1, $2, $3, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            total_trades = user_gamification.total_trades + 1,
            total_wins = user_gamification.total_wins + $2,
            total_profit = user_gamification.total_profit + $3,
            weekly_profit = user_gamification.weekly_profit + $3,
            updated_at = NOW()`,
        [userId, isWin ? 1 : 0, pnl]
    );

    // Check for new badges
    return await checkAndAwardBadges(userId);
}

export async function updateStreak(userId: string, isWinningWeek: boolean): Promise<void> {
    if (isWinningWeek) {
        await query(
            `UPDATE user_gamification SET
                current_streak = current_streak + 1,
                longest_streak = GREATEST(longest_streak, current_streak + 1),
                last_winning_week = CURRENT_DATE,
                weekly_profit = 0,
                updated_at = NOW()
            WHERE user_id = $1`,
            [userId]
        );
    } else {
        await query(
            `UPDATE user_gamification SET
                current_streak = 0,
                weekly_profit = 0,
                updated_at = NOW()
            WHERE user_id = $1`,
            [userId]
        );
    }
}

export async function checkAndAwardBadges(userId: string): Promise<Badge[]> {
    const stats = await getGamificationStats(userId);
    if (!stats) return [];

    const newBadges: Badge[] = [];

    // Check each badge condition
    const badgeChecks: Array<{ type: string; condition: boolean }> = [
        { type: 'first_trade', condition: stats.totalTrades >= 1 },
        { type: 'trades_25', condition: stats.totalTrades >= 25 },
        { type: 'trades_100', condition: stats.totalTrades >= 100 },
        { type: 'profit_500', condition: stats.totalProfit >= 500 },
        { type: 'profit_1000', condition: stats.totalProfit >= 1000 },
        { type: 'profit_5000', condition: stats.totalProfit >= 5000 },
        { type: 'streak_5', condition: stats.currentStreak >= 5 },
        { type: 'streak_10', condition: stats.currentStreak >= 10 },
    ];

    for (const check of badgeChecks) {
        if (check.condition) {
            // Check if badge already earned
            const existing = stats.badges.find(b => b.type === check.type && b.earnedAt);
            if (!existing) {
                // Award badge
                const def = BADGE_DEFINITIONS[check.type];
                await query(
                    `INSERT INTO user_badges (user_id, badge_type, badge_name, earned_at)
                     VALUES ($1, $2, $3, NOW())
                     ON CONFLICT (user_id, badge_type) DO NOTHING`,
                    [userId, check.type, def.name]
                );
                newBadges.push({ ...def, earnedAt: new Date() });
            }
        }
    }

    return newBadges;
}

// ============================================================
// DISPLAY NAME
// ============================================================

export async function setDisplayName(userId: string, displayName: string): Promise<void> {
    // Allow empty string to clear display name
    if (displayName === '') {
        await query(
            `UPDATE user_settings SET display_name = NULL, updated_at = NOW() WHERE user_id = $1`,
            [userId]
        );
        return;
    }

    // Validate display name (3-20 chars, alphanumeric + underscore)
    const sanitized = displayName.trim().slice(0, 20);
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(sanitized)) {
        throw new Error('Display name must be 3-20 characters, alphanumeric and underscores only');
    }

    await query(
        `INSERT INTO user_settings (user_id, display_name, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
            display_name = $2,
            updated_at = NOW()`,
        [userId, sanitized]
    );
}

export async function getDisplayName(userId: string): Promise<string | null> {
    const result = await query(
        `SELECT display_name FROM user_settings WHERE user_id = $1`,
        [userId]
    );
    return result.rows[0]?.display_name || null;
}

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

export async function initializeGamificationTables(): Promise<void> {
    try {
        // CRITICAL: Migrate user_id columns from UUID to VARCHAR FIRST
        // Privy sends DID strings like "did:privy:xxx" which are NOT valid UUIDs
        // Each ALTER is in its own try/catch so one failure doesn't roll back others
        const tablesToMigrate = [
            'user_settings',
            'user_gamification',
            'user_badges',
            'positions',
            'user_signal_executions'
        ];

        for (const table of tablesToMigrate) {
            try {
                // Check if column is UUID type
                const check = await query(
                    `SELECT data_type FROM information_schema.columns 
                     WHERE table_schema = 'public' 
                     AND table_name = $1 
                     AND column_name = 'user_id'`,
                    [table]
                );

                if (check.rows.length > 0 && check.rows[0].data_type === 'uuid') {
                    // Drop ALL foreign key constraints on user_id before changing type
                    const fkConstraints = await query(
                        `SELECT tc.constraint_name
                         FROM information_schema.table_constraints tc
                         JOIN information_schema.key_column_usage kcu
                           ON tc.constraint_name = kcu.constraint_name
                           AND tc.table_schema = kcu.table_schema
                         WHERE tc.constraint_type = 'FOREIGN KEY'
                           AND tc.table_schema = 'public'
                           AND tc.table_name = $1
                           AND kcu.column_name = 'user_id'`,
                        [table]
                    );

                    for (const fk of fkConstraints.rows) {
                        await query(`ALTER TABLE ${table} DROP CONSTRAINT ${fk.constraint_name}`);
                        console.log(`🔗 Dropped FK constraint ${fk.constraint_name} on ${table}`);
                    }

                    // Now safe to change column type
                    await query(
                        `ALTER TABLE ${table} ALTER COLUMN user_id TYPE VARCHAR(128) USING user_id::VARCHAR`
                    );
                    console.log(`✅ Migrated ${table}.user_id from UUID to VARCHAR`);
                }
            } catch (e) {
                console.warn(`⚠️ UUID migration for ${table}: ${e instanceof Error ? e.message : e}`);
            }
        }

        // User gamification stats
        await query(`
            CREATE TABLE IF NOT EXISTS user_gamification (
                user_id VARCHAR(128) PRIMARY KEY,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_winning_week DATE,
                total_wins INTEGER DEFAULT 0,
                total_trades INTEGER DEFAULT 0,
                total_profit DECIMAL(12,2) DEFAULT 0,
                weekly_profit DECIMAL(12,2) DEFAULT 0,
                sharpe_ratio DECIMAL(6,3) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // User badges
        await query(`
            CREATE TABLE IF NOT EXISTS user_badges (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                badge_type VARCHAR(50) NOT NULL,
                badge_name VARCHAR(100) NOT NULL,
                earned_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, badge_type)
            )
        `);

        // Add display_name to user_settings if not exists
        await query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_settings' AND column_name = 'display_name'
                ) THEN
                    ALTER TABLE user_settings ADD COLUMN display_name VARCHAR(50);
                END IF;
            END $$
        `);

        // Add auto-approve settings column to user_settings (JSONB for per-strategy config)
        await query(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_settings' AND column_name = 'auto_approve_settings'
                ) THEN
                    ALTER TABLE user_settings 
                    ADD COLUMN auto_approve_settings JSONB DEFAULT '{}'::jsonb;
                END IF;
                
                -- Also add auto_approve_enabled if not exists (for backward compatibility)
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'user_settings' AND column_name = 'auto_approve_enabled'
                ) THEN
                    ALTER TABLE user_settings 
                    ADD COLUMN auto_approve_enabled BOOLEAN DEFAULT false;
                END IF;
            END $$
        `);


        console.log('✅ Gamification tables initialized');
    } catch (error) {
        console.error('❌ Failed to initialize gamification tables:', error);
        throw error;
    }
}
