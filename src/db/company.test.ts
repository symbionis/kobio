import { describe, expect, it } from "vitest";
import type { OwnerScope } from "./auth";
import { saveCompany, type SaveCompanyInput } from "./company";

/** A fake owner scope whose upsert captures the row it was handed. */
function capturingScope() {
  const captured: { row?: Record<string, unknown> } = {};
  const scope = {
    ownerId: "o",
    supabase: {
      from: () => ({
        upsert: (row: Record<string, unknown>) => {
          captured.row = row;
          return {
            select: () => ({ single: async () => ({ data: { id: "c1", ...row }, error: null }) }),
          };
        },
      }),
    },
  } as unknown as OwnerScope;
  return { scope, captured };
}

const base: SaveCompanyInput = {
  name: "Acme",
  address: null,
  postcode: null,
  city: null,
  country: null,
  email: null,
  phone: null,
  vat_number: null,
  vat_rates: [],
  logo_ref: null,
  trade: null,
  cgv_text: null,
};

describe("saveCompany", () => {
  it("persists cgv_text onto the upserted row", async () => {
    const { scope, captured } = capturingScope();
    await saveCompany(scope, { ...base, cgv_text: "Offre valable 30 jours." });
    expect(captured.row?.cgv_text).toBe("Offre valable 30 jours.");
  });

  it("keeps a null cgv_text as null", async () => {
    const { scope, captured } = capturingScope();
    await saveCompany(scope, { ...base, cgv_text: null });
    expect(captured.row?.cgv_text).toBeNull();
  });

  it("rejects an empty company name", async () => {
    const { scope } = capturingScope();
    await expect(saveCompany(scope, { ...base, name: "  " })).rejects.toThrow();
  });
});
