/**
 * Next.js Instrumentation Hook
 * Runs once on server startup. Handles idempotent DB migrations.
 */
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { query } = await import('@/lib/db');
            // Migration 1: preferred_language column
            await query(
                `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en'`
            );
            // Migration 2: signup_bonus_paid column for new bilateral referral model
            await query(
                `ALTER TABLE referrals ADD COLUMN IF NOT EXISTS signup_bonus_paid BOOLEAN DEFAULT FALSE`
            );
            console.log('[instrumentation] DB migrations complete');
        } catch (e: any) {
            console.warn('[instrumentation] Migration skipped:', e.message);
        }
    }
}
