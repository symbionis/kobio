"use client";

import { useRouter, useSearchParams } from "next/navigation";
import AuthOtp from "../components/AuthOtp";

/** Wraps AuthOtp with redirect-after-sign-in (honours a validated `next` path). */
export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  function onAuthed() {
    const next = params.get("next");
    // Only allow same-app relative paths — never an open redirect.
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/new";
    router.replace(dest);
    router.refresh();
  }

  return <AuthOtp onAuthed={onAuthed} />;
}
