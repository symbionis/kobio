"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * The browser Supabase client for client components (the email-OTP auth flow).
 * Uses the publishable key — browser-safe by design.
 */
export function browserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
