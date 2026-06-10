import { PostHog } from "posthog-node";

/**
 * Server-side PostHog (posthog-node) for capturing events and exceptions from
 * API routes. Returns null when no key is configured so callers no-op cleanly
 * in local/dev without analytics. EU cloud.
 *
 * In serverless/Fluid Compute, flush immediately (flushAt: 1) since the process
 * may freeze between requests; helpers below await flush after each capture.
 */
let client: PostHog | null = null;

function server(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!client) {
    client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com",
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

/** Fire-and-forget server event. `distinctId` should be the owner id when known,
 *  otherwise a stable anonymous id (e.g. the client distinct-id header). */
export async function captureServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = server();
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
  await ph.flush().catch(() => {});
}

/** Send an exception to PostHog Error Tracking from server code. */
export async function captureServerException(
  error: unknown,
  distinctId?: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  const ph = server();
  if (!ph) return;
  const err = error instanceof Error ? error : new Error(String(error));
  ph.captureException(err, distinctId, properties);
  await ph.flush().catch(() => {});
}
