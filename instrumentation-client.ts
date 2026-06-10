import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";

// Opaque cross-origin errors arrive as a synthetic "Script error." with no
// stack and no source — the browser masks the detail for security. They come
// from scripts we don't control (extensions, content blockers, injected
// third-party code), so they're never actionable. Drop them before ingestion
// rather than letting them pile up as Error Tracking noise.
function dropOpaqueScriptErrors(event: CaptureResult | null): CaptureResult | null {
  if (event?.event !== "$exception") return event;
  const list = event.properties?.$exception_list as
    | Array<{ value?: string; stacktrace?: { frames?: unknown[] } }>
    | undefined;
  const allOpaque =
    Array.isArray(list) &&
    list.length > 0 &&
    list.every((e) => e.value === "Script error." && !e.stacktrace?.frames?.length);
  return allOpaque ? null : event;
}

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
    before_send: dropOpaqueScriptErrors,
    debug: process.env.NODE_ENV === "development",
  });
}
