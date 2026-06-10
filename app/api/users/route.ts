import { NextResponse } from "next/server";
import { UnauthorizedError, requireOwner } from "../../../src/db/auth";
import { saveUser } from "../../../src/db/users";

export const runtime = "nodejs";

interface UserBody {
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
}

/** POST /api/users — update the signed-in person's profile (name + phone).
 *  E-mail is managed by the auth email-change flow, not here. */
export async function POST(request: Request): Promise<Response> {
  try {
    const scope = await requireOwner();
    const b = (await request.json()) as UserBody;
    const saved = await saveUser(scope, {
      first_name: b.first_name?.trim() || null,
      last_name: b.last_name?.trim() || null,
      phone: b.phone?.trim() || null,
    });
    return NextResponse.json({ user: saved });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Erreur.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
