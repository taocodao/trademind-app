/**
 * Upload local videos to Vercel Blob Storage
 *
 * Prerequisites:
 *   1. Run `vercel link` to link this project to Vercel
 *   2. Set BLOB_READ_WRITE_TOKEN in your environment or .env.local
 *      (get it from Vercel Dashboard → Storage → Blob → your store → .env.local tab)
 *
 * Usage:
 *   node scripts/upload-videos.mjs
 *
 * After running, copy the printed URLs into:
 *   - src/lib/media.ts  (for local dev fallbacks)
 *   - Vercel Dashboard → Project → Settings → Environment Variables
 *     NEXT_PUBLIC_VIDEO_CLIP1_URL, NEXT_PUBLIC_VIDEO_CLIP2_URL, NEXT_PUBLIC_VIDEO_CLIP3_URL
 */

import { put } from "@vercel/blob";
import { createReadStream, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const VIDEOS = [
    { localPath: "public/videos/clip1.mp4", blobName: "videos/clip1.mp4", envKey: "NEXT_PUBLIC_VIDEO_CLIP1_URL" },
    { localPath: "public/videos/clip2.mp4", blobName: "videos/clip2.mp4", envKey: "NEXT_PUBLIC_VIDEO_CLIP2_URL" },
    { localPath: "public/videos/clip3.mp4", blobName: "videos/clip3.mp4", envKey: "NEXT_PUBLIC_VIDEO_CLIP3_URL" },
];

async function uploadAll() {
    console.log("🚀 Uploading videos to Vercel Blob...\n");

    for (const video of VIDEOS) {
        const fullPath = path.join(ROOT, video.localPath);
        const size = statSync(fullPath).size;
        console.log(`📤 Uploading ${video.localPath} (${(size / 1024 / 1024).toFixed(1)} MB)...`);

        try {
            const blob = await put(video.blobName, createReadStream(fullPath), {
                access: "public",
                contentType: "video/mp4",
            });

            console.log(`✅ Done: ${blob.url}`);
            console.log(`   Add to Vercel env vars: ${video.envKey}=${blob.url}\n`);
        } catch (err) {
            console.error(`❌ Failed to upload ${video.localPath}:`, err.message);
        }
    }

    console.log("\n✨ Upload complete!");
    console.log("Next steps:");
    console.log("  1. Add the env vars above to Vercel Dashboard → Settings → Environment Variables");
    console.log("  2. Delete public/videos/ locally");
    console.log("  3. Run the git filter-repo purge (see brain/40_EC2_OPERATIONS.md)");
}

uploadAll();
