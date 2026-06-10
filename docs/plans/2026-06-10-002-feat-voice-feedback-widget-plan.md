---
title: "feat: Voice feedback widget → Slack"
type: feat
status: active
date: 2026-06-10
---

# feat: Voice feedback widget → Slack

## Summary

A persistent feedback button floating bottom-right on every page. Tap to record a short voice note; on stop it transcribes (the existing OpenRouter STT) and posts the transcript to a Slack channel via an Incoming Webhook, then thanks the user by name. No edit step, no audio file, no storage. The Slack message carries the builder's name and e-mail (when signed in) and the page they were on.

## Problem Frame

Kobio is in private beta and needs a low-friction way for testers to send feedback that lands where the team already works — Slack. Typing feedback on a phone on site is the same friction the product exists to remove, so feedback should be spoken. The transcribe-and-post pipeline is the one already used for quotes and client capture; this reuses it for a one-tap "say what's wrong" affordance.

---

## Requirements

- R1. A feedback button is fixed at the bottom-right of every page.
- R2. Tapping it records a voice note; tapping again stops.
- R3. On stop, the note is transcribed and the transcript is posted to a Slack channel — no review/edit step.
- R4. The Slack message includes the transcript, the page path, and — when signed in — the builder's name and e-mail.
- R5. After a successful send, the widget thanks the user by name ("Merci {name} !") and resets.
- R6. A signed-out user can still send feedback; it posts without name/e-mail and the thanks is generic.
- R7. The Slack webhook URL is server-side only and never reaches the client.
- R8. When the webhook or transcription backend is unconfigured, or the send fails, the widget shows a brief error and nothing is silently lost.
- R9. The endpoint is rate-limited per IP (it fronts paid STT).

---

## Key Technical Decisions

- **Transcript-only via a Slack Incoming Webhook.** No bot token, no `files.upload`, no audio stored — a webhook posts message text. (Chosen in the build-vs-buy + voice-handling evaluation; webhooks can't upload files, and a transcript is what the team triages from.)
- **No edit/review step.** Record → transcribe → auto-send → thank-you. The user does not see or correct the transcript before it posts (per the product decision); a misheard word is acceptable for internal feedback.
- **Server resolves identity; widget stays dumb.** The `/api/feedback` route reads the session (e-mail) and the company profile (name) itself — the client sends only the audio and the current page, so the webhook URL and user lookup never touch the browser.
- **Reuse the existing capture + transcribe pipeline.** `audioToTranscript` (OpenRouter STT) and the per-IP rate limiter back this exactly as they back `/api/quote` and `/api/contact`.
- **Name source.** "Name" is the builder's company-profile name (fallback to the e-mail local part, then "Anonyme"); e-mail comes from the auth session.

---

## High-Level Technical Design

```mermaid
flowchart TB
  A[Tap mic -> record -> stop] --> B[POST audio + page to /api/feedback]
  B --> C[rate limit + transcribe]
  C --> D[resolve user: email from session, name from company profile]
  D --> E[build Slack message + POST to Incoming Webhook]
  E --> F[return name -> widget shows 'Merci {name} !']
  C -.no key / no webhook / error.-> G[widget shows brief error]
```

---

## Implementation Units

### U1. Slack message builder + feedback config

- **Goal:** A pure, tested function that turns a transcript + metadata into a Slack webhook payload, plus the env wiring.
- **Requirements:** R4, R6.
- **Dependencies:** none.
- **Files:** `src/feedback.ts` (new), `src/feedback.test.ts` (new), `.env.example` (modify — document `SLACK_FEEDBACK_WEBHOOK_URL`).
- **Approach:** `buildSlackMessage(transcript, meta)` where `meta` is `{ name, email, page }` (name/email nullable). Returns the JSON body for the webhook — the transcript as the main text and a context line with the sender ("De : {name} <{email}>" or "Anonyme") and the page. Keep it plain text or simple Block Kit; no Slack SDK dependency.
- **Patterns to follow:** `src/phone.ts` / `src/contact.ts` (pure, src-level, unit-tested helpers).
- **Test scenarios:**
  - Signed-in meta (name + email + page) → payload contains the transcript, the name, the e-mail, and the page. Covers R4.
  - Null name/email → payload marks the sender "Anonyme" and still contains the transcript and page. Covers R6.
  - Transcript with newlines/special characters is preserved (not dropped or broken).
- **Verification:** `npm test` passes `src/feedback.test.ts`; `.env.example` documents the new variable.

### U2. `/api/feedback` route

- **Goal:** Accept audio, transcribe it, resolve the sender, and post to Slack.
- **Requirements:** R3, R4, R6, R7, R8, R9.
- **Dependencies:** U1.
- **Files:** `app/api/feedback/route.ts` (new).
- **Approach:** POST handler, `runtime = "nodejs"`. Rate-limit per IP (reuse `clientIp`/`rateLimit`). Parse the multipart form for `audio` and a `page` string. Resolve the sender via `getOptionalOwner()` → session e-mail and `getCompany(scope)` → name (null when signed out). `audioToTranscript(audio)` → transcript. `buildSlackMessage(...)` → `fetch` the webhook from `process.env.SLACK_FEEDBACK_WEBHOOK_URL`. Return `{ ok: true, name }`. Fail loudly with a clear status when the STT key or the webhook URL is missing (mirrors the 503 convention), and on any error. Never include the webhook URL in a response.
- **Patterns to follow:** `app/api/contact/route.ts` (rate-limit guard, multipart audio, keyless 503, error shape), `app/api/quote/route.ts` (`getOptionalOwner`, `getCompany` usage).
- **Test scenarios:**
  - With STT + webhook mocked, a posted audio + page returns `{ ok: true, name }` and calls the webhook once with the built payload. Covers R3, R4.
  - Signed-out request posts with name/email null and still succeeds. Covers R6.
  - Missing `SLACK_FEEDBACK_WEBHOOK_URL` (or no STT key) → error status, webhook not called. Covers R8.
  - (Route-level scenarios are integration-shaped — the repo has no route-test harness; the payload logic is covered in U1, the rest verified manually.)
- **Verification:** A `curl`/manual POST with a sample audio posts a message to the Slack channel; an unconfigured env returns the error; the response body never contains the webhook URL.

### U3. FeedbackWidget + mount

- **Goal:** The floating recorder users actually tap.
- **Requirements:** R1, R2, R5, R8.
- **Dependencies:** U2.
- **Files:** `app/components/FeedbackWidget.tsx` (new), `app/layout.tsx` (modify — render the widget after `children`).
- **Approach:** A fixed bottom-right client component. Idle state shows a small round button; tap starts `MediaRecorder`, the button becomes a stop affordance with a recording indicator; tap again stops, builds the blob, POSTs it (plus `window.location.pathname`) to `/api/feedback`, then shows "Merci {name} !" briefly and resets. On mic denial or a failed send, show a short inline error. No transcript shown, no edit. Mount once in the root layout so it persists across pages.
- **Patterns to follow:** `app/components/AddressDictation.tsx` (tap/stop `MediaRecorder`, blob assembly, POST + status states, no waveform/wake lock).
- **Test scenarios:** `Test expectation: none — browser media capture + fixed-position UI; verified manually.` The send payload logic is covered in U1/U2.
- **Verification:** On a device, the button is present on every route; record → stop → "Merci {name} !" and the message appears in Slack; denying the mic shows the error and sends nothing; a signed-out visitor can still send.

---

## Acceptance Examples

- AE1. Signed-in builder records and stops → Slack receives the transcript with their name, e-mail, and the page; widget shows "Merci {name} !". (U2, U3)
- AE2. Signed-out visitor records and stops → Slack receives the transcript marked "Anonyme"; widget shows a generic thanks. (U1, U2)
- AE3. `SLACK_FEEDBACK_WEBHOOK_URL` unset → the send returns an error and the widget says feedback is unavailable; nothing is posted. (U2, U3)
- AE4. Mic permission denied → the widget shows a mic error and records/sends nothing. (U3)

---

## Scope Boundaries

Not in scope:

- Uploading the audio file to Slack, or storing the recording anywhere.
- A transcript edit/review step before sending.
- A category/type tag on the message (freeform only).
- A feedback portal, roadmap, or upvoting.
- Typed-only feedback entry (the widget is voice; typing is not offered).

---

## Risks & Dependencies

- **Paid STT on a public endpoint.** Mirrors `/api/quote`/`/api/contact`; mitigated by the per-IP rate limit (R9).
- **Webhook URL is a secret.** Stored in `.env` (gitignored), read server-side only, never returned to the client or logged (consistent with the project's token-handling rule).
- **Dependency:** a Slack Incoming Webhook URL for the target channel must be created and set as `SLACK_FEEDBACK_WEBHOOK_URL` before the feature works end-to-end.

---

## Sources & Research

- Build-vs-buy + voice-handling evaluation (this session): transcript-only via Incoming Webhook chosen over third-party widgets and over audio-to-Slack (webhooks can't upload files; Slack won't preview webm inline).
- [Slack Incoming Webhooks](https://api.slack.com/incoming-webhooks), [Upstash Next.js feedback→Slack component](https://github.com/upstash/feedback).
- Pipeline to mirror: `app/api/contact/route.ts`, `src/llm/audio.ts` (`audioToTranscript`), `app/components/AddressDictation.tsx`, `src/db/auth.ts` (`getOptionalOwner`), `src/db/company.ts` (`getCompany`).
