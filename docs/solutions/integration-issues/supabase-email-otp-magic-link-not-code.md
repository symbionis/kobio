---
title: Supabase email OTP sends a magic link instead of a 6-digit code
date: 2026-06-09
category: docs/solutions/integration-issues
module: authentication (Supabase email OTP)
problem_type: integration_issue
component: authentication
symptoms:
  - "Sign-in email contains a clickable magic link, not the 6-digit code the in-app form expects"
  - "A brand-new email gets the 'Confirm sign up' template; a returning email gets 'Magic link or OTP' — editing only one leaves the other broken"
  - "verifyOtp({ type: 'email' }) errors for a first-time signup because that token verifies with type 'signup'"
root_cause: config_error
resolution_type: config_change
severity: high
tags: [supabase, authentication, otp, email, magic-link, nextjs, ssr]
---

# Supabase email OTP sends a magic link instead of a 6-digit code

## Problem
Wiring Supabase email-OTP sign-in (enter email → type a code in-app), the user received a clickable **magic link** in the email, not the 6-digit code the code-entry form expects — so sign-in couldn't complete. This blocks the whole auth path (and, in an anonymous-capture → auth-at-save model, every save/send).

## Symptoms
- The OTP email shows a "Sign in" / "Confirm" **link**, no code.
- It works differently per email: a **new** address receives the **"Confirm sign up"** template; a **returning** address receives the **"Magic link or OTP"** template. Editing one template doesn't fix the other.
- `verifyOtp({ email, token, type: "email" })` fails for a first-time signup.

## What Didn't Work
- **Editing only the "Magic link or OTP" template** to show the code. A first-time email is routed through the **"Confirm sign up"** template instead, which still renders the link — so new users kept getting a link.
- **Assuming one `verifyOtp` type covers all cases.** `type: "email"` verifies a returning-user OTP, but a brand-new signup's token verifies with `type: "signup"`. Hardcoding one type breaks the other path.
- **Clicking the magic link** as a fallback — there was no `/auth/callback` handler (the app deliberately went code-only), so the link didn't establish a session either.

## Solution
Two parts — a Supabase **config** change (the real unblock) and a small **code** safety net.

**1. Make the email send the code, and unify the template.** Supabase always generates a 6-digit `{{ .Token }}` for `signInWithOtp`, but the default templates only render `{{ .ConfirmationURL }}` (a link). Simplest robust fix for OTP-only auth: in **Auth → Sign In / Providers → Email**, turn **OFF "Confirm email"** — the OTP code itself proves inbox ownership, so the separate confirmation step is redundant. With it off, new *and* returning users route through the single **"Magic link or OTP"** template. Put the code in that template:

```html
<h2>Votre code</h2>
<p>Entrez ce code pour vous connecter :</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:4px">{{ .Token }}</p>
```

(If you must keep "Confirm email" on, put `{{ .Token }}` in **both** the "Confirm sign up" and "Magic link or OTP" templates.)

**2. Make `verifyOtp` resilient to both token types** so a new vs returning email both work from the same code input:

```ts
let { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
if (error) {
  // A new email arrives via the "Confirm signup" template (type "signup");
  // a returning one via "Magic link" (type "email").
  ({ error } = await supabase.auth.verifyOtp({ email, token, type: "signup" }));
}
```

## Why This Works
`signInWithOtp({ email })` always issues a `.Token`; the default templates just don't show it. Supabase routes **first-time** addresses through the signup-confirmation flow and **returning** ones through the magic-link/OTP flow — two different templates, each defaulting to a link. Disabling "Confirm email" collapses both onto one template; rendering `{{ .Token }}` exposes the code; and verifying with `type: "email"` then `"signup"` accepts whichever token type Supabase actually issued.

## Prevention
- For OTP-only auth, decide the template/config **once**: disable "Confirm email" and render `{{ .Token }}` in the "Magic link or OTP" template. Then **test both a brand-new email and a returning email** — they take different template paths and it's easy to fix only one.
- Don't hardcode the `verifyOtp` `type`. Better than the try-both fallback above: **pick the type from the step that sent the code** — the first failed `verifyOtp` attempt still counts against Supabase's per-token attempt budget, so a user who fat-fingers once can exhaust a valid code.
- The built-in email sender is **rate-limited and not for production** — wire custom SMTP (SPF/DKIM on your sending domain) before launch, or OTP emails get throttled/spam-filtered.
- After deploy, set **Auth → URL Configuration → Site URL** to the live domain so any link-based templates resolve correctly.

## Related Issues
- `app/components/AuthOtp.tsx` — the email→code component with the dual-type verify.
- `docs/plans/2026-06-09-001-feat-auth-multi-user-catalog-plan.md` — the auth/multi-user slice; Open Questions capture the email-template + SMTP config.
