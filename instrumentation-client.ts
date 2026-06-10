import posthog from "posthog-js";

// Client-side PostHog init for Next.js 15.3+ (App Router). This file is the
// single client init point — do NOT also wrap the app in a PostHogProvider.
// Ingestion is reverse-proxied through /ingest (see next.config.mjs) so it
// isn't blocked by ad/tracker blockers. EU cloud.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
if (key) {
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    defaults: "2026-01-30",
    // Capture unhandled exceptions + rejections as Error Tracking issues.
    capture_exceptions: true,
    debug: process.env.NODE_ENV === "development",
  });
}
