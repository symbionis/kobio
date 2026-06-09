import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session on every request and keeps the cookies in
 * sync (the @supabase/ssr proxy pattern). This unit (U1) does session refresh
 * only — route gating/redirects are added in U3. If the browser-safe auth env
 * isn't configured, it passes through untouched so the app keeps running.
 *
 * Next 16 "proxy" convention (the renamed successor to `middleware`).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response; // auth not configured yet — no-op

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: do not run code between createServerClient and getUser() — and do
  // not remove getUser(); it is what refreshes the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Gate the persisted-data PAGES. Public: /, /new, /login, /auth/*. API routes
  // are NOT redirected here — they return 401 themselves so fetch() can react
  // (e.g. the save→OTP handoff). Capture the path in `next` for return-after-login.
  const { pathname } = request.nextUrl;
  const gated = ["/quotes", "/clients", "/settings", "/products"];
  const isGatedPage = gated.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!user && isGatedPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
