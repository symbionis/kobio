import { NextResponse } from "next/server";
import { hasBrowserAuthConfig, userClient } from "../../../src/db/supabase/server";

export const runtime = "nodejs";

/** Sign out and return to the public landing. GET so a plain nav link works. */
export async function GET(request: Request): Promise<Response> {
  if (hasBrowserAuthConfig()) {
    try {
      const supabase = await userClient();
      await supabase.auth.signOut();
    } catch {
      /* already signed out / no session — fall through to redirect */
    }
  }
  return NextResponse.redirect(new URL("/", request.url));
}
