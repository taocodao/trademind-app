/**
 * Next.js Instrumentation Hook
 * Runs once on server startup (Vercel cold start or local dev).
 * Used for idempotent one-time DB migrations.
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
    // Only run on Node.js runtime (not Edge)
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const { query } = await import('@/lib/db');
            await query(
                `ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en'`
            );
            console.log('[instrumentation] preferred_language column ready');
        } catch (e: any) {
            // Non-fatal — column may already exist or DB may not be reachable in some envs
            console.warn('[instrumentation] Migration skipped:', e.message);
        }
    }
}
