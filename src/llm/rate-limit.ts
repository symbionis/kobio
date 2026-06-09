/**
 * Minimal in-memory sliding-window rate limiter for the public parse endpoint.
 * Per-instance only (Fluid Compute may run several) — a basic abuse/cost guard,
 * not a hard global limit. Swap for Upstash/Redis-backed limiting for production.
 */
const hits = new Map<string, number[]>();

/** Returns true if the call is allowed, false if the key is over `limit` in `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/** Best-effort client IP from proxy headers (Railway/Vercel set x-forwarded-for). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
