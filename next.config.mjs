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

  // ── Newsletter aliases (Phase 3 link map) and legacy Phase 1 issue URLs ──
  async redirects() {
    const issueMap = [
      ['2026-08-05-process-before-prediction', '2026-08-06-why-most-retail-investors-need-a-process'],
      ['2026-08-12-qqq-growth-engine-or-concentration-risk', '2026-08-13-is-qqq-a-growth-engine-or-a-concentration-risk'],
      ['2026-08-19-what-leaps-add-to-systematic-strategy', '2026-08-20-what-leaps-actually-add-to-a-systematic-strategy'],
      ['2026-08-26-pmcc-managed-trade-off', '2026-08-27-pmcc-is-not-free-income'],
      ['2026-09-02-smh-put-selling-not-hedging-qqq', '2026-09-03-why-selling-puts-on-smh-is-not-a-hedge'],
      ['2026-09-09-what-machine-learning-can-and-cannot-do', '2026-09-10-what-machine-learning-can-do-for-investors'],
      ['2026-09-16-backtest-assumptions-must-survive-scrutiny', '2026-09-17-backtest-results-only-matter-if-assumptions-survive'],
      ['2026-09-23-risk-framework-drawdown-exposure-discipline', '2026-09-24-building-a-retail-investor-risk-framework'],
    ];
    return [
      { source: '/pricing', destination: '/upgrade', permanent: true },
      { source: '/newsletter/systematic-investing', destination: '/newsletter/start-here', permanent: true },
      { source: '/newsletter/qqq-overview', destination: '/newsletter/guides/qqq', permanent: true },
      { source: '/newsletter/leaps-guide', destination: '/newsletter/guides/leaps', permanent: true },
      { source: '/newsletter/pmcc-guide', destination: '/newsletter/guides/pmcc', permanent: true },
      { source: '/newsletter/semiconductor-sleeve', destination: '/newsletter/guides/smh-puts', permanent: true },
      { source: '/newsletter/portfolio-overlap', destination: '/newsletter/guides/smh-puts', permanent: true },
      { source: '/newsletter/ml-framework', destination: '/newsletter/research/ml-framework', permanent: true },
      { source: '/newsletter/model-limitations', destination: '/newsletter/research/ml-framework', permanent: true },
      { source: '/newsletter/backtest-validation', destination: '/newsletter/research/backtest-validation', permanent: true },
      { source: '/newsletter/methodology', destination: '/newsletter/research/backtest-validation', permanent: true },
      { source: '/newsletter/risk-framework', destination: '/newsletter/research/risk-framework', permanent: true },
      { source: '/newsletter/exposure-control', destination: '/newsletter/research/risk-framework', permanent: true },
      { source: '/newsletter/options-risk', destination: '/risk-disclosure', permanent: true },
      { source: '/newsletter/offer-terms', destination: '/newsletter/offer', permanent: true },
      { source: '/newsletter/confirm-email', destination: '/newsletter', permanent: true },
      ...issueMap.map(([from, to]) => ({
        source: `/newsletter/issues/${from}`,
        destination: `/newsletter/issues/${to}`,
        permanent: true,
      })),
    ];
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
