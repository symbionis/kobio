import { describe, expect, it } from "vitest";
import type { OwnerScope } from "./auth";
import { getUser, saveUser } from "./users";

describe("saveUser", () => {
  it("updates first/last/phone and never sends an email field", async () => {
    let captured: Record<string, unknown> = {};
    const scope = {
      ownerId: "o",
      supabase: {
        from: () => ({
          update: (payload: Record<string, unknown>) => {
            captured = payload;
            return {
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: { id: "o", ...payload }, error: null }),
                }),
              }),
            };
          },
        }),
      },
    } as unknown as OwnerScope;

    await saveUser(scope, { first_name: "Amina", last_name: "Bensassi", phone: "+41781234567" });
    expect(captured.first_name).toBe("Amina");
    expect(captured.last_name).toBe("Bensassi");
    expect(captured.phone).toBe("+41781234567");
    expect("email" in captured).toBe(false);
  });
});

describe("getUser", () => {
  it("returns the scoped owner's row", async () => {
    const scope = {
      ownerId: "o",
      supabase: {
        from: () => ({
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: { id: "o", email: "a@b.co" }, error: null }) }),
          }),
        }),
      },
    } as unknown as OwnerScope;

    const row = await getUser(scope);
    expect(row?.id).toBe("o");
    expect(row?.email).toBe("a@b.co");
  });
});
