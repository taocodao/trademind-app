/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from bundling pure-ESM packages as CJS (causes 502 on Vercel).
  // @composio/core is "type":"module" — must be resolved natively by Node.js, not bundled.
  serverExternalPackages: ['@composio/core', '@composio/client'],
};

export default nextConfig;
