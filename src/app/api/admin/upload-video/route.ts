import { put } from "@vercel/blob";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = Redis.fromEnv();

// Valid slot names that can be uploaded
const VALID_SLOTS = ["clip1", "clip2", "clip3"] as const;
type Slot = (typeof VALID_SLOTS)[number];

/**
 * POST /api/admin/upload-video
 * Body: FormData with fields:
 *   - file: File (mp4/mov/webm)
 *   - slot: "clip1" | "clip2" | "clip3"
 *
 * Returns: { slot, url }
 * Stores mapping in Redis: media:videos hash
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const slot = formData.get("slot") as Slot | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        if (!slot || !VALID_SLOTS.includes(slot)) {
            return NextResponse.json(
                { error: `Invalid slot. Must be one of: ${VALID_SLOTS.join(", ")}` },
                { status: 400 }
            );
        }

        const extension = file.name.split(".").pop() ?? "mp4";
        const blobPath = `videos/${slot}.${extension}`;

        // Upload to Vercel Blob (public CDN)
        const blob = await put(blobPath, file, {
            access: "public",
            contentType: file.type || "video/mp4",
            addRandomSuffix: false, // Keep stable URLs for the same slot
        });

        // Save URL mapping in Redis hash: media:videos { clip1: url, clip2: url, ... }
        await redis.hset("media:videos", { [slot]: blob.url });

        return NextResponse.json({ slot, url: blob.url });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Upload failed";
        console.error("[upload-video]", err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * GET /api/admin/upload-video
 * Returns all current video URL mappings from Redis
 */
export async function GET() {
    try {
        const videos = await redis.hgetall("media:videos");
        return NextResponse.json({ videos: videos ?? {} });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
