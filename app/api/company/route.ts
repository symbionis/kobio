import { NextResponse } from "next/server";
import { UnauthorizedError, getOptionalOwner, requireOwner } from "../../../src/db/auth";
import { getCompany, saveCompany } from "../../../src/db/company";

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
  logo_ref?: string | null;
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
      logo_ref: b.logo_ref ?? null,
    });
    return NextResponse.json({ company: saved });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
