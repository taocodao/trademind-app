/**
 * Media Asset URLs — served from Vercel Blob Storage
 *
 * After uploading videos via `scripts/upload-videos.mjs`,
 * paste the returned URLs here and delete the local public/videos/ files.
 *
 * Upload command:
 *   node scripts/upload-videos.mjs
 */

export const MEDIA = {
    // TurboBounce landing page demo clips
    // Replace these placeholder values after running the upload script
    videos: {
        clip1: process.env.NEXT_PUBLIC_VIDEO_CLIP1_URL ?? "/videos/clip1.mp4",
        clip2: process.env.NEXT_PUBLIC_VIDEO_CLIP2_URL ?? "/videos/clip2.mp4",
        clip3: process.env.NEXT_PUBLIC_VIDEO_CLIP3_URL ?? "/videos/clip3.mp4",
    },
} as const;
