/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from bundling pure-ESM packages as CJS (causes 502 on Vercel).
  // @composio/core is "type":"module" — must be resolved natively by Node.js, not bundled.
  serverExternalPackages: ['@composio/core', '@composio/client'],
  images: {
    remotePatterns: [
      // Vercel Blob CDN — used for admin-uploaded media kit assets
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
    ],
  },
  // ── Whop post-checkout redirect URLs → /whop/welcome ──────────────────────
  // Whop dashboard is configured to redirect to these URLs after checkout.
  // We rewrite them internally to /whop/welcome?days=N so the welcome page
  // knows the trial duration without exposing internal routing to Whop.
  async rewrites() {
    return [
      {
        source: '/trademind-algo-signals-30day',
        destination: '/whop/welcome?days=30',
      },
      {
        source: '/trademind-algo-signals-60day',
        destination: '/whop/welcome?days=60',
      },
    ];
  },
};

export default nextConfig;
