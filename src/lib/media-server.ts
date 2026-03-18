/**
 * Server-side media URL resolver.
 * Reads video URL mappings from Upstash Redis (set via the /admin/media upload page).
 * Falls back to local public/videos/ paths for dev if Redis has no entry.
 *
 * Use this in Server Components or API routes only.
 * For Client Components, fetch from GET /api/admin/upload-video.
 */
import { Redis } from "@upstash/redis";

// Safely initialize Redis to prevent build errors when env vars are missing/invalid
const getRedisClient = () => {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    if (url && url.startsWith('https://') && url !== 'FILL_IN') {
        try {
            return Redis.fromEnv();
        } catch (e) {
            return null;
        }
    }
    return null;
};

const redis = getRedisClient();

export type VideoSlot = "clip1" | "clip2" | "clip3";

const FALLBACKS: Record<VideoSlot, string> = {
    clip1: "/videos/clip1.mp4",
    clip2: "/videos/clip2.mp4",
    clip3: "/videos/clip3.mp4",
};

export async function getVideoUrls(): Promise<Record<VideoSlot, string>> {
    try {
        if (!redis) return FALLBACKS;
        const stored = await redis.hgetall("media:videos");
        return {
            clip1: (stored?.clip1 as string) ?? FALLBACKS.clip1,
            clip2: (stored?.clip2 as string) ?? FALLBACKS.clip2,
            clip3: (stored?.clip3 as string) ?? FALLBACKS.clip3,
        };
    } catch {
        return FALLBACKS;
    }
}

export async function getVideoUrl(slot: VideoSlot): Promise<string> {
    try {
        if (!redis) return FALLBACKS[slot];
        const url = await redis.hget<string>("media:videos", slot);
        return url ?? FALLBACKS[slot];
    } catch {
        return FALLBACKS[slot];
    }
}
