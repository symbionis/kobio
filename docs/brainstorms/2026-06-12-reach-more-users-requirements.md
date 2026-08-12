# Reaching the first non-Nicolas builders — Requirements

**Date:** 2026-06-12
**Status:** Brainstorm complete, ready for planning
**Owner:** Frank

## Problem

Kobio is pre-traction. On 2026-06-12, analytics showed ~11 visitors and **zero**
product engagement — no recordings, no quotes, no sign-ins. The pilot (Nicolas,
painter, French-speaking Switzerland, on Bexio) works, but the loop has never
been proven for anyone else.

"Reach more users" is therefore not a megaphone problem. It is a **first-cohort
problem**: get a handful of real builders who aren't Nicolas to record a note
and finish a quote, and watch where they drop off. Reach is the means;
*completed quotes by strangers* is the goal.

## Goal

Validate the loop with real builders beyond Nicolas. A freeing fact unlocks the
target pool: the core loop today is record → quote → edit → PDF with **no Bexio
write**, so French-speaking builders in CH, FR, and BE are all reachable — the
product simply computes as dictated.

## Decision: two-track push

### Track A — Concierge validation (the engine, now)
Warm-seed through Nicolas's network.
- Concierge-onboard 5–10 builders from Nicolas's peers/crew.
- Watch each builder's **first** quote get made (in person or screen-share); fix
  what trips them up in real time.
- Ask every onboarded builder for two intros.
- The real payload is not just users — it's *seeing the activation failures
  directly* via the funnel established 2026-06-11.

### Track B — Trade-community content (parallel experiment)
One honest magic-moment clip, fronted by Nicolas, distributed where builders
already gather.
- **Messenger:** Nicolas as the face, but made effortless — Frank produces and
  edits; Nicolas voices/dubs and posts into his own groups. Builder-to-builder
  credibility beats founder-as-marketer inside artisan communities.
- **Asset:** one ~30s magic-moment clip — spoken on-site note → finished, priced
  quote. Lead with the artifact, not the pitch. (Script: see
  `docs/brainstorms/2026-06-12-magic-moment-video-script.md`.)
- **Distribution:** one asset, two paths — seed across French-speaking artisan
  FB / WhatsApp / Telegram groups, AND post as a Reel/TikTok.
- Treat as an experiment to learn whether the broad French-speaking pool bites.

### Challenger — the quote as its own channel (plant now)
Add "Devis réalisé avec Kobio" to the PDF / share link. Every quote sent to a
client is seen by people who are often builders themselves. Nearly free; turns
future usage into reach. Rides on activation, so it complements A rather than
replacing it.

## New product requirements (surfaced this session)

These are prerequisites for Track B reaching beyond Switzerland — FR/BE builders
will not trust a CHF-only quote.

1. **Currency display.** Today CHF-only. Display **EUR** when the user comes from
   an EU country, and **add currency to settings** so it can be set explicitly.
2. **VAT rate handling — to validate.** Multiple VAT rates are already handled in
   settings and should work for any rate. Currently applied at **invoice level,
   not line item** — confirm this is correct for the target trades/countries
   before relying on it for FR/BE quotes.

## Success criteria

Carried over from yesterday's funnel work (already established on PostHog):
- ≥5 non-Nicolas builders reach a saved / PDF'd quote.
- ≥1 working referral chain out of Track A.
- Track B produces a measurable try → complete signal.

## Scope boundaries

**Deferred (once the loop is proven)**
- Partner channel — fiduciaires, builder-merchants, trade associations
  (Approach C).
- A sustained content cadence and second-wave formats (before/after,
  educational, forums/Reddit).
- Founder-led video at volume.

**Explicitly out**
- Paid ads and broad awareness spray.
- Bexio write-back.
- Multi-country VAT *logic* changes beyond the currency/validation items above —
  quotes compute as dictated; faithful transcription holds.

## Dependencies / assumptions

- Nicolas is willing to refer, and can be nudged into being the on-camera face
  with near-zero effort on his side.
- The activation funnel is live on PostHog (events:
  `quote_recording_started → quote_parsed → quote_created → quote_saved →
  quote_pdf_generated`).
- Currency display (req. 1) ships before Track B drives EU traffic at any scale.

## Open questions

- Does Nicolas's network actually convert to 5–10 onboardable builders, or is the
  reachable warm pool smaller than hoped?
- Is invoice-level VAT (vs line-item) correct for the FR/BE trades we target?
