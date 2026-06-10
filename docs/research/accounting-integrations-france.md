# Kobio — Accounting/invoicing integration targets (France)

Created: 2026-06-10
Scope: which French accounting/invoicing platforms Kobio should build "plug in your API key → sync devis/clients/products" connectors for, so the invoice is created compliantly downstream.
Status: research note (living doc). API/auth details current ~2025–2026; verify against live docs before building.

---

## The model

Kobio drafts a **devis (quote)**. The artisan connects (API key / token) their existing **accounting/invoicing platform**; Kobio **syncs the devis + clients + products** into it. The artisan or their expert-comptable **converts the devis to an invoice inside that platform** — and because the platform **is a registered Plateforme Agréée (PA)** (or connects to one), the resulting invoice is *facturation électronique* compliant. **Kobio never emits the invoice.** Same pattern as the existing Swiss Bexio integration (personal access token), repeated per-platform for France.

This answers the compliance question directly: **push into a platform that is itself a registered PA → the invoice it creates is compliant → Kobio stays a pure drafting layer.**

The pattern is already practised: Pennylane's BTP integrations page lists ~7 tools (Obat, Graneet, Hexagone, …) that push into Pennylane. Kobio does the same, one step earlier in the chain (devis, not yet invoice).

---

## Ranked targets

| Platform | Artisan-BTP adoption | Public API | Auth (key vs OAuth) | Push devis + clients + products? | PA status | Partner gate? |
|---|---|---|---|---|---|---|
| **Pennylane** | Very high — 500k businesses, 2,500+ accounting firms, BTP landing page + integrations ecosystem | V2 REST (V1 deprecated Jul 2025) | **API key** self-service (admin, Essential+ plan) OR OAuth2 (multi-tenant) | ✅ clients, products, devis, invoices | ✅ registered (Dec 2025) | API-key route self-service; OAuth route = form + review |
| **Evoliz** | 47k users, **2,000+ BTP companies**, artisan-positioned, field mobile app (Jun 2026) | Public REST (evoliz.io) | **API key + JWT, fully self-service** | ✅ devis (CRUD), clients; **verify `/articles`** | ✅ registered (NF203 + NF525 + PA) | **None** — self-service |
| **Axonaut** | Moderate-high — ~180k users, **25% BTP artisans (~35–45k)**; markets to painters/masons | V2 REST (public doc, OAS 3.0) | `userApiKey` header (verify truly self-serve; some sources mention OAuth2 in V2) | ✅ clients, products, devis; webhooks on quote state | ✅ registered | None found — **verify** |
| **EBP** | High — dominant legacy in BTP (40 yrs, Bâtiment line) | REST (developpeurs.ebp.com) | **OAuth2** (clientId/secret after approval) | ✅ devis (DocumentType=1) | ✅ registered | **Hard gate** — assistance contract + activation wait (days) |
| **Sellsy** | Moderate-high — 22k customers, CRM-heavy | V2 REST (V1 still needed for some) | **Personal token** self-service OR OAuth2 (partner = approval) | ✅ quotes, clients, products (V2) | ✅ registered (fall 2025) | Personal token self-service; public OAuth gated |

### Avoid / deprioritise

| Platform | Why not |
|---|---|
| **Qonto** | API is **banking/payments only — no devis endpoint.** Sync model breaks. Invoicing is in-UI only. |
| **Tiime** | Registered PA, but API is **partner-gated, no public docs** (ISV agreement via email). Skip until leverage. |
| **Sage 100** | **No native REST API** — needs third-party middleware (Webservices100/Assortir). Too much friction. |
| **Cegid Loop** | Targets accounting firms, not artisans; no devis endpoint. (Also Boby's parent.) |
| **Obat / Tolteck / Batappli** | These **are** artisan devis/facture tools = **competitors**, not integration targets. |
| **Indy** | BNC/auto-entrepreneur focus; no public developer API found. |

---

## Adoption ranking (artisan du bâtiment signal, strongest first)

1. **EBP** — historical dominant in BTP; what many artisans and their accountants already run.
2. **Pennylane** — fastest-growing modern platform, strongest expert-comptable channel (the person who recommends tools), explicit BTP ecosystem. Where the market is moving.
3. **Axonaut** — 25% of its base is BTP artisans — the best *direct artisan* adoption signal of any modern platform.
4. **Evoliz** — 2,000+ BTP companies, cheap (from ~€16/mo), NF525, field mobile app. Strong artisan fit.
5. **Sellsy** — large but CRM-skewed, less BTP-specific.

---

## Recommendation

**Tier 1 — build first:**

- **Pennylane** — the leverage point: biggest modern base, expert-comptable distribution, BTP ecosystem, confirmed devis+clients+products API, self-service API-key path, registered PA. Kobio fits the integration pattern Pennylane already documents.
- **Evoliz** — the fastest ship: fully self-service API key + JWT (no partner gate at all), confirmed devis CRUD, explicit artisan-BTP positioning, registered PA. Key-in-settings → push clients + devis → done. *Verify the `/articles` (product) endpoint first.*

**Tier 2 — build next:**

- **Axonaut** — best direct artisan-BTP adoption signal, public API with devis + webhooks. Verify the `userApiKey` header is genuinely self-service before committing.
- **EBP** — large legacy installed base, devis push confirmed — but OAuth2 behind a hard approval gate (contract + activation). Plan a longer cycle and contact EBP's partner team early.

**Auth fit for the "plug in a key" UX:** Evoliz and Axonaut are cleanest (self-service key); Pennylane offers a key path too (OAuth only needed at multi-tenant scale); EBP and Tiime require partner approval. For a multi-tenant SaaS acting on behalf of many artisans, OAuth is the scalable end-state, but a pasted self-service key is the right MVP for Evoliz/Axonaut/Pennylane-individual.

**Market timing:** the Sept 2026/2027 e-invoicing mandate has every platform pushing its PA status and pushing artisans to verify/switch tools — position Kobio's integrations as part of that compliance-readiness moment.

---

## Sources

- [Pennylane — API publiques](https://help.pennylane.com/fr/articles/18770-utiliser-les-api-publiques-pennylane) · [BTP integrations](https://www.pennylane.com/fr/integrations/categorie/btp) · [growth + PA](https://www.batiweb.com/actualites/publi-redactionnels/brz-france-pennylane-pros-btp-46280)
- [Evoliz — API guidelines](https://evoliz.io/guidelines) · [API capabilities](https://lebonlogiciel.com/blog/finance-et-comptabilite-comptabilite-tresorerie/ce-que-l-on-peut-faire-avec-l-api-d-evoliz) · [PA status](https://choisir-facturation.fr/plateforme-facturation-electronique/evoliz/)
- [Axonaut — API V2 doc](https://www.solution-crm.org/article/axonaut-api-v2-nouveautes-et-documentation-88.html) · [BTP adoption](https://www.relations-publiques.pro/110706/)
- [EBP — developer portal](https://support.ebp.com/hc/fr/articles/4419126485649)
- [Sellsy — types d'accès API](https://help.sellsy.com/fr/articles/5876615-types-d-acces-api)
- [Tiime — API?](https://support.tiime.fr/fr/articles/26240-proposez-vous-une-api) · [Cegid Loop dev](https://developers.cegid.com/docreference/BusinessUnits/Loop-Api-Management-Docs/GetStart.html) · [Qonto API](https://docs.qonto.com/api-reference/introduction)
- [Comparatif PA DGFiP 2026](https://www.comparatif-facture-electronique.fr/plateformes-agreees/) — PA status across platforms
