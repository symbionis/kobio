/** @type {import('next').NextConfig} */
const nextConfig = {
  // Reverse-proxy PostHog ingestion through this app so it survives ad/tracker
  // blockers. EU cloud hosts. Mirrors instrumentation-client.ts `api_host: "/ingest"`.
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
  // Required so PostHog's trailing-slash API requests aren't redirected.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
