import { NextResponse } from "next/server";
import { UnauthorizedError, getOptionalOwner, requireOwner } from "../../../src/db/auth";
import { getCompany, saveCompany } from "../../../src/db/company";
import { captureServer, captureServerException } from "../../../src/lib/posthog-server";
import type { VatRate } from "../../../src/db/types";
import { asTrade } from "../../../src/quote/trades";

/** Keep only well-formed rate entries: a finite, non-negative percentage with a
 *  trimmed label. Drops blanks/garbage so the stored list is always clean. */
function sanitizeVatRates(input: unknown): VatRate[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  const out: VatRate[] = [];
  for (const item of input) {
    const rate = Number((item as VatRate)?.rate);
    if (!Number.isFinite(rate) || rate < 0 || seen.has(rate)) continue;
    seen.add(rate);
    out.push({ label: String((item as VatRate)?.label ?? "").trim(), rate });
  }
  return out;
}

export const runtime = "nodejs";

/** GET /api/company — the signed-in owner's company profile, or null. Anonymous
 *  callers (the public /new page probing for a VAT number) get { company: null }. */
export async function GET(): Promise<Response> {
  try {
    const scope = await getOptionalOwner();
    return NextResponse.json({ company: scope ? await getCompany(scope) : null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

interface CompanyBody {
  name: string;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  vat_number?: string | null;
  vat_rates?: VatRate[];
  logo_ref?: string | null;
  trade?: string | null;
  cgv_text?: string | null;
}

/** POST /api/company — upsert the owner's single company profile. */
export async function POST(request: Request): Promise<Response> {
  try {
    const scope = await requireOwner();
    const b = (await request.json()) as CompanyBody;
    const saved = await saveCompany(scope, {
      name: b.name,
      address: b.address ?? null,
      postcode: b.postcode ?? null,
      city: b.city ?? null,
      country: b.country ?? null,
      email: b.email ?? null,
      phone: b.phone ?? null,
      vat_number: b.vat_number ?? null,
      vat_rates: sanitizeVatRates(b.vat_rates),
      logo_ref: b.logo_ref ?? null,
      trade: asTrade(b.trade),
      // Trim and collapse empty terms to null so the PDF renders nothing.
      cgv_text: (b.cgv_text ?? "").trim() || null,
    });
    await captureServer(scope.ownerId, "company_saved", {
      has_logo: Boolean(b.logo_ref),
      vat_rate_count: sanitizeVatRates(b.vat_rates).length,
      trade: asTrade(b.trade),
    });
    return NextResponse.json({ company: saved });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    await captureServerException(err, undefined, { route: "POST /api/company" });
    const message = err instanceof Error ? err.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
