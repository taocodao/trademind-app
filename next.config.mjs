/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from bundling pure-ESM packages as CJS (causes 502 on Vercel).
  // @composio/core is "type":"module" — must be resolved natively by Node.js, not bundled.
  serverExternalPackages: ['@composio/core', '@composio/client', '@resvg/resvg-js'],
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
    return {
      // Serve the static narrated landing page (public/landing/index.html) at the
      // site root. beforeFiles runs before the pages check, so this takes
      // precedence over any page route bound to '/'.
      beforeFiles: [
        {
          source: '/',
          destination: '/landing/index.html',
        },
      ],
      afterFiles: [
        {
          source: '/trademind-algo-signals-30day',
          destination: '/whop/welcome?days=30',
        },
        {
          source: '/trademind-algo-signals-60day',
          destination: '/whop/welcome?days=60',
        },
      ],
    };
  },
};

export default nextConfig;
