import { NextResponse } from "next/server";
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
    const body = (await request.json()) as ClientBody;
    const saved = await saveClient({
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
    const message = err instanceof Error ? err.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
