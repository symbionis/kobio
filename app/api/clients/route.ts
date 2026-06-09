import { NextResponse } from "next/server";
import { UnauthorizedError, requireOwner } from "../../../src/db/auth";
import { saveClient } from "../../../src/db/clients";

export const runtime = "nodejs";

interface ClientBody {
  id?: string;
  name: string;
  address?: string | null;
  postcode?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
}

/** POST /api/clients — create or update a client (manual entry). */
export async function POST(request: Request): Promise<Response> {
  try {
    const scope = await requireOwner();
    const body = (await request.json()) as ClientBody;
    const saved = await saveClient(scope, {
      id: body.id,
      name: body.name,
      address: body.address ?? null,
      postcode: body.postcode ?? null,
      city: body.city ?? null,
      country: body.country ?? null,
      email: body.email ?? null,
      phone: body.phone ?? null,
    });
    return NextResponse.json({ client: saved });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
