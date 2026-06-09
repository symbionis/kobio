import "dotenv/config";

/**
 * Thin wrapper over the Bexio REST API.
 *
 * Auth: Bearer token (Personal Access Token from developer.bexio.com/pat).
 * Base: https://api.bexio.com — most resources live under /2.0.
 *
 * Rules baked in here:
 *  - The token is read from BEXIO_TOKEN and never logged.
 *  - Errors surface the status and Bexio's message, not the request headers.
 */

const BASE = "https://api.bexio.com";

function token(): string {
  const t = process.env.BEXIO_TOKEN;
  if (!t) {
    throw new Error(
      "BEXIO_TOKEN is not set. Copy .env.example to .env and paste the token.",
    );
  }
  return t;
}

type Query = Record<string, string | number | boolean | undefined>;

function buildUrl(path: string, query?: Query): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, BASE);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers: {
      // token() is interpolated here only — never console.log this object
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();

  if (!res.ok) {
    // Surface status + Bexio's message, but never the request headers/token.
    let detail = text;
    try {
      const parsed = JSON.parse(text);
      detail = parsed.message ?? parsed.error ?? text;
    } catch {
      /* leave detail as raw text */
    }
    throw new Error(`Bexio ${method} ${path} failed: ${res.status} ${detail}`);
  }

  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export const bexio = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, { body }),
};
