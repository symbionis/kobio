# Kobio — Competitive landscape (France)

Created: 2026-06-10
Scope: voice-to-quote / devis-facture tools for artisans du bâtiment, French market.
Status: research note (living doc). Figures are best-effort from public sources as of mid-2026; treat funding/user counts as approximate.

---

## TL;DR

- **The voice-to-devis field in France is not greenfield** — Boby (Cegid), Vertuoza, Renalto, VoFact and others are live. But **none of them capture the spoken price.** Every competitor prices from a catalog or market-rate estimate and makes the artisan correct it. Kobio's "spoken price always wins, catalog is memory" is genuinely unclaimed.
- **The solo artisan is the open lane.** Boby paywalls its AI at €49.99 (Pro); Vertuoza is a heavy ERP that tells micro-firms it isn't for them. A voice-first tool that is *the* product at €15–25/mo, not a luxury add-on, fits the gap.
- **Accounting write-back is a moat** none of them have — lean on the Bexio loop, add others later.
- **E-invoicing reform (PDP/PA) is NOT on the critical path.** It governs *invoices*, not *quotes*. As a devis tool, Kobio has zero compliance obligation. It only matters if Kobio chooses to emit invoices itself — and even then, writing back to the artisan's accounting tool offloads compliance to that tool's PA.
- **Strategic fork: France vs Switzerland.** The pilot runs on Bexio (CH), where voice-devis competition is thin. France is crowded but huge with a 2027 forcing function. Pick deliberately; the seeding network probably decides.

---

## The landscape at a glance

### Voice-first / AI-first devis (the closest threats)

| Who | What | Price (€/mo) | Price source | Backing |
|---|---|---|---|---|
| **Boby** (a Cegid company) | Voice + WhatsApp → devis | €14.99 / €29.99 / €49.99 (AI = Pro) | Market estimate | Cegid (full acquisition) — biggest threat |
| **Vertuoza / VertuoAI** | Dictate site notes → devis ~40s | Quote-only, ~€1.2–6k/yr | Batiprix catalog | €11.2M raised (XAnge, Fortino) |
| **Renalto / "Rita"** | Voice/text → structured devis | €25 / €30 / €49 | Stored user pricing | French accelerators (Bpifrance, Station F) |
| **VoFact** | WhatsApp voice → invoice in 10s | Free / €9.99 / €24.99 | Spoken (invoice-centric) | French Tech Paris-Saclay, early |
| **Facturier.pro** | Voice → Factur-X devis/facture | €29 / €59 / €149 | Unclear | Early |
| **DevisFacture.pro** | WhatsApp devis/facture | — | — | Early — monitor |

### Incumbent devis & facturation software (the comparison set)

| Tool | Price (€/mo, HT) | Voice/AI? | Edge |
|---|---|---|---|
| Tolteck | €19–25 | None (positioned on simplicity) | Simplest UX, cheap |
| Obat | €25–109 | Voice devis, metered €0.40/devis | Marketplace, 30k price library |
| Batappli | €39–119 | Voice AI as an "option" | BatiChiffrage 80k items |
| Vertuoza | quote-only | VertuoAI (core) | Full BTP ERP |
| Boby (Cegid) | €15–50 | Copilote (voice+WhatsApp) | Cegid distribution, 20k users |
| EBP Bâtiment | ~€30+ | None notable | Legacy brand, accountant ecosystem |
| Henrri | freemium | None | Near-zero cost |
| ChantierFlow | €22.50 all-in | AI assistant (text) | New 2025, e-sign + planning bundled |

### Adjacent

- **ChatGPT/Claude DIY** — tech-comfortable artisans prompt their own devis. No catalog, no compliance, no accounting loop. Kobio's write-back is the killer answer.
- **Pennylane / Qonto / Indy** — accounting/banking tools with basic devis/facture. Not trade-specific, no AI quoting.
- **Nerolia AI** — AI voice-agent for *inbound calls* (lead qualification), €150–400/mo. Same "admin kills evenings" pain, different entry point.

---

## Boby (boby.net) — deep profile

**Company.** Founded Bordeaux, Dec 2022 by Aurélien Rey ("le Doctolib du BTP"). **Fully acquired by Cegid** (France's #2 software publisher, ~4,400 staff) Aug 2023; operates autonomously from Bordeaux as "Boby, a Cegid company." ~22 staff + 50 artisan beta-testers. **20,000+ users** (from ~1k six months post-launch → ~10–12k late 2023 → 20k by 2025–26). Won the Batimat 2024 innovation award. Claims ~500 devis/day.

**The AI "Copilote" flow.** Channels: web (chat), mobile app (voice/text), and **WhatsApp** (synced to the account — zero install). Artisan dictates client + address + scope ("devis terrasse bois 40m² chez Dupont"); the AI extracts line items and generates a devis; artisan can verbally request changes ("+10% sur les prix, acompte 30%"); produces a PDF, can email the client.

**Where the price comes from — the key finding.** **Market-rate estimation.** The AI "knows roughly the €/m² for tiling and labour" and invents prices from that baseline. **No spoken-price capture, no price library, and no learning** — corrections don't persist into a rate card, so the same wrong estimate recurs on the next devis. The AI creates catalog articles on the fly with its own estimates; the artisan corrects them each time.

**Pricing.** Junior €14.99 (unlimited devis/factures, multi-user) · Copilot €29.99 · **Pro €49.99 — the AI Copilote lives here.** 14-day trial, no real free tier (removed early 2025). Annual −10%. (The tier *named* "Copilot" vs where the AI actually sits is confusingly decoupled across sources; dominant signal = AI at Pro.)

**Also has.** One-click devis→facture, payment reminders, on-site QR/payment-link, **FLOA client financing** (loan QR on the devis), 48h invoice advance (factoring, 3.95%), 15→50 languages. **No** confirmed e-signature, **no** offline mode (dead without 4G), **no** write-back to external accounting (Bexio/Pennylane/EBP).

**Sentiment.** Trustpilot ~4.6/5 (small corpus ~97). Praise: ease of use, support, WhatsApp. Gripes: €49.99 Pro "non négligeable" for a solo, internet dependency, AI pricing errors needing correction, free-tier removal friction.

**Hard to beat on:** Cegid's accountant distribution (comptables recommending it for 2026 compliance = warm leads), WhatsApp zero-friction UX, financing suite, brand/press momentum, 20k head start.

**Vulnerable on:** wrong-by-default pricing with no learning (exactly Kobio's thesis), AI as a €50 luxury rather than the core product, offline fragility, no accounting-loop closure, Cegid's enterprise priorities possibly diverging from artisan needs.

---

## Vertuoza (vertuoza.com) — deep profile

**Company.** Founded 2020, **Nivelles, Belgium** (Pellegrino/Di Filippo/Vermeulen; built inside their own construction firm since 2015). 103 staff (late 2025). Active BE/FR/CH/LU/NL. "Scale-up of the year 2023."

**Funding (reconciled).** Seed €1.2M (XAnge, ~2021) + Pre-Series A €4M (Fortino, Oct 2022) + Series A €6M (Fortino + XAnge, Nov 2023) = **€11.2M total.** (The "€10M" headline drops the seed.) ARR €4M+ at Series A, targeting ~€8M; ~3,000 client companies; **~€1.6B invoiced through the platform in 2024** (GMV, not revenue).

**VertuoAI flow.** Launched Oct 2024, in all tiers. Artisan dictates scope/quantities on mobile → AI structures line items → matches against the **price library** → devis in 30–45s ("time to quote ÷10"). 50+ input languages (Portuguese/Spanish in → French out, for multilingual sites).

**Where the price comes from.** The **catalog — user library + Batiprix** (monthly-updated national rate database). **Not the spoken input.** Opposite of Kobio's wedge. An artisan with negotiated/situational rates (the solo norm) corrects every line.

**Scope.** A **full construction ERP**, not a quoting tool: PRO (devis/invoice/library/VertuoAI) → PRO+ (planning, subcontractors, site tracking) → Expert (CRM, Gantt, accounting, profitability) → Expert+ (inventory, timeclock, HR). Plus **VertuoWork** (Dec 2024 subcontractor marketplace) and Factur-X compliance.

**Target & pricing.** Nominally "1–100 employees"; real fit **5–30**. No public pricing, **no free trial, annual prepay, no refund** — estimated ~€1.2–1.5k/yr solo, ~€2.5–6k/yr for 10–30 staff. Reviewers report losing €3,000+ feeling locked in. No strong downmarket signal toward solo artisans.

**Sentiment.** Capterra **3.3/5** (18), Trustpilot **3.1/5**. Gripes: no trial/refund, feature delays, "obsolete" mobile app, slow support. Zero reviews yet mention VertuoAI specifically. MonLogicielBTP: "not suitable for micro-enterprises."

**Hard to beat on:** the full-loop moat for 5+ person firms (don't compete there), €1.6B GMV trust signal, VertuoWork network effect, Batiprix as a cold-start catalog.

**Vulnerable on:** the **solo artisan segment** (priced out, over-featured, locked in, and the voice feature still doesn't capture their real prices); a poachable cohort of churned 2024–25 users; France/CH are expansion markets with high-touch opaque sales — beatable by a native, product-led, solo-first entrant.

---

## The "spoken price" gap

Confirmed across both best-funded voice players (and the rest): **no one treats the spoken price as authoritative.** They all price from a catalog or market estimate and present it for correction. Kobio inverts this — spoken price wins, catalog is memory, overrides get logged so stored rates converge on the artisan's real ones over time. This solves two problems at once: the *trust* problem ("I don't trust the tool's number") and the *catalog-drift* problem. It is the single clearest, most defensible differentiator, and it should be the headline, not a footnote.

Supporting differentiators:
- **~60% drafted, human finishes** — honest framing vs "AI writes your devis," which skeptical builders distrust.
- **Accounting write-back** — competitors stop at a PDF; closing the loop into the books is the answer to the "I'll just use ChatGPT + a Word template" crowd.

---

## Pricing norms (France)

- Entry/solo: **€10–25/mo** (VoFact €10, Tolteck €19, ChantierFlow €22.50, Renalto €25)
- Mid-tier with AI bundled: **€29–49/mo** (Boby Copilot €30, Obat €39, Renalto PME €49)
- Full BTP ERP: **€79–130/mo**
- AI is being bundled into mid-tier (~€25–30), **not** sold as a premium SKU. **Kobio's solo ceiling is ~€25–40/mo;** the bigger opening is making voice the entry product where rivals sell dumb templates at €15–25.

---

## E-invoicing reform (facturation électronique) — and why it's NOT the critical path

**It governs invoices, not quotes.** A devis is pre-contractual and entirely outside the mandate. As a devis-drafting tool, **Kobio has zero e-invoicing obligation today** — a PDF by email/WhatsApp is fine indefinitely.

It becomes relevant **only if Kobio chooses to emit invoices itself.** And even then, if Kobio writes the devis back into the artisan's accounting tool (Bexio today; Pennylane/etc. later) and *that* tool issues the invoice, the accounting tool's PA carries the compliance — Kobio stays a drafting front-end and never needs to be a PA or even a Solution Compatible. Only if Kobio owns the full loop (devis → facture → *send*) does the integration below apply. That's the model Boby/VoFact/Facturier.pro chose because they *are* invoicing tools.

**Reference (for if/when invoicing is in scope):**

- **Terminology (July 2025):** "PDP" → **"Plateforme Agréée (PA)"**; "OD" → **"Solution Compatible (SC)."** Most online content still says PDP/OD.
- **Timeline:** Sept 1 **2026** — all companies must *receive* e-invoices (large/mid also *emit*). Sept 1 **2027** — TPE/PME/micro (artisans) must *emit*. DGFiP (Feb 2026): "ready" — no further slippage expected.
- **PPF (free state portal) descoped** to a directory + tax-data concentrator. Everyone routes through a private PA. ~134 PAs registered.
- **Don't build a PA** — ISO 27001 + SecNumCloud hosting, six figures, 18–36 months.
- **Do** integrate as a **Solution Compatible** via a white-label PA API: emit **Factur-X** (PDF + embedded XML), the PA transmits. Best fit **Iopole** (built for software editors, free sandbox, **already powers Obat**); backup **B2Brouter**. COGS ~€0.05–0.20/invoice. Obat and Tolteck both took this route — de-facto standard.

**Where the reform still helps Kobio regardless:** a **market-timing tailwind.** 2026–27 forces every French artisan to re-evaluate their admin stack — a natural "switch your tools" moment to ride in messaging, even though Kobio isn't the compliant emitter.

---

## Strategic takeaways

1. **Lead with "spoken price wins."** It's the one thing no funded competitor does, and it directly answers their shared failure mode.
2. **Own the solo artisan.** Make voice the entry product at €15–25, not a €50 luxury tier. That's the lane Boby paywalls and Vertuoza abandons.
3. **Accounting write-back is the moat** — emphasise the closed loop; it beats both WhatsApp-PDF tools and DIY ChatGPT.
4. **Park the PDP/invoicing work** — it's conditional and downstream, gated on a product decision (become an invoicing tool, or stay a quoting tool that hands off). Don't let it eat the roadmap.
5. **Decide France vs Switzerland deliberately.** CH = your incumbent integration (Bexio) already built, thin competition; FR = crowded but huge with a 2027 forcing function. Let the seeding network decide, then tailor messaging to that market.

**Biggest watch-out:** Boby/Cegid. If Cegid moves Boby's pricing logic from market-estimate to spoken-price, the gap narrows fast — they have the distribution and 20k installed base. Renalto is the one most likely to land in the exact same position as Kobio; watch for a pricing move or acquisition.

---

## Sources

Boby: [AI Copilote](https://boby.net/lassistant-intelligent/) · [mobile/WhatsApp](https://boby.net/application-mobile/) · [Cegid acquisition](https://independant.io/boby-rejoint-cegid-pour-revolutionner-la-gestion-des-artisans-du-btp/) · [2026 review + pricing](https://outilios.fr/boby-avis/)
Vertuoza: [VertuoAI launch (La Libre)](https://www.lalibre.be/economie/digital/2024/10/11/grace-a-notre-assistant-virtuel-le-temps-alloue-a-faire-un-devis-est-divise-par-10-FNXLPDFVQRGJLEYPP4CTFXWW6M/) · [Series A (Fortino)](https://www.fortino.vc/news/vertuoza-reinforces-its-growth-ambitions-and-successfully-concludes-its-10-million-eu-series) · [About](https://www.vertuoza.com/fr-be/a-propos) · [Capterra reviews](https://www.capterra.com/p/232769/Vertuoza/reviews/) · [Batiprix partnership](https://www.blog.batiprix.com/artisans-et-entreprise-de-travaux/batiprix-et-vertuoza-revolutionnent-la-gestion-des-chantiers/)
E-invoicing: [DGFiP — plateformes agréées (officiel)](https://www.impots.gouv.fr/facturation-electronique-et-plateformes-agreees) · [liste officielle des PA](https://www.impots.gouv.fr/liste-des-plateformes-de-dematerialisation-partenaires-pdp-immatriculees-sous-reserve) · [PPF abandoned](https://www.quadient.com/fr/blog/le-portail-public-de-facturation-ppf-ne-verra-pas-le-jour) · [Iopole (API PA for editors)](https://www.iopole.com/facturation-electronique-api) · [Obat via Iopole](https://www.obat.fr/devis-factures/facturation-electronique/)
Other voice players: [Renalto](https://www.renalto.fr/) · [VoFact](https://vofact.fr/) · [Facturier.pro](https://www.facturier.pro/)
Incumbent pricing: [Tolteck](https://www.tolteck.com/fr/tarifs) · [Obat](https://www.obat.fr/tarifs/) · [Batappli](https://www.batappli.fr/tarifs) · [ChantierFlow](https://chantierflow.com/)
