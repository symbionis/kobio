import { describe, expect, it, vi } from "vitest";
import type { OwnerScope } from "./auth";
import type { Quote } from "../quote/types";
import type { QuoteRow } from "./types";

// Mock the override log so we can drive its success/failure.
vi.mock("./overrides", () => ({ logOverrides: vi.fn() }));

import { logOverrides } from "./overrides";
import { persistQuote, rowToQuote, saveQuote } from "./quotes";

const mockedLogOverrides = vi.mocked(logOverrides);

// A fake owner scope whose user client resolves a saved row without a real DB.
const scope = {
  ownerId: "o",
  supabase: {
    from: () => ({
      upsert: () => ({
        select: () => ({ single: async () => ({ data: { id: "saved-1" }, error: null }) }),
      }),
    }),
  },
} as unknown as OwnerScope;

function row(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: "q1",
    owner_id: "o",
    client_id: null,
    title: "Titre",
    contact: { spoken_name: "Amina", match: null, action: "match_or_create" },
    tax_rate_default: 8.1,
    lines: [],
    review_notes: [],
    sent: false,
    accepted: false,
    sent_at: null,
    accepted_at: null,
    tva_applicable: true,
    vat_rate: 8.1,
    discount: null,
    transcript: null,
    trade: null,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("rowToQuote", () => {
  it("reconstructs a Quote with intent create_offer and passes fields through", () => {
    const q = rowToQuote(row({ title: "T", review_notes: ["n"] }));
    expect(q.intent).toBe("create_offer");
    expect(q.title).toBe("T");
    expect(q.review_notes).toEqual(["n"]);
    expect(q.contact.spoken_name).toBe("Amina");
  });

  it("falls back to a valid Contact when the stored contact is the {} default", () => {
    const q = rowToQuote(row({ contact: {} as never }));
    expect(q.contact).toEqual({ spoken_name: "", match: null, action: "match_or_create" });
  });

  it("coerces a string numeric tax_rate_default to a number", () => {
    const q = rowToQuote(row({ tax_rate_default: "8.1" as never }));
    expect(q.tax_rate_default).toBe(8.1);
    expect(typeof q.tax_rate_default).toBe("number");
  });
});

describe("persistQuote", () => {
  const quote: Quote = {
    intent: "create_offer",
    contact: { spoken_name: "x", match: null, action: "match_or_create" },
    title: "T",
    tax_rate_default: 8.1,
    lines: [],
    review_notes: [],
  };

  it("returns the saved row even when logOverrides throws (best-effort, no duplicate-on-retry)", async () => {
    mockedLogOverrides.mockRejectedValueOnce(new Error("boom"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const saved = await persistQuote(scope, quote, { client_id: null, sent: false, accepted: false, sent_at: null, accepted_at: null, vat_rate: 8.1 });
    expect(saved.id).toBe("saved-1");
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("succeeds normally when logOverrides resolves", async () => {
    mockedLogOverrides.mockResolvedValueOnce(undefined);
    const saved = await persistQuote(scope, quote, { client_id: "c1", sent: true, accepted: true, sent_at: null, accepted_at: null, vat_rate: null });
    expect(saved.id).toBe("saved-1");
  });

  it("serialises the discount onto the upserted row", async () => {
    mockedLogOverrides.mockResolvedValueOnce(undefined);
    let captured: Record<string, unknown> | undefined;
    const capturingScope = {
      ownerId: "o",
      supabase: {
        from: () => ({
          upsert: (r: Record<string, unknown>) => {
            captured = r;
            return {
              select: () => ({ single: async () => ({ data: { id: "saved-1" }, error: null }) }),
            };
          },
        }),
      },
    } as unknown as OwnerScope;
    await persistQuote(capturingScope, quote, {
      client_id: null,
      sent: false,
      accepted: false,
      sent_at: null,
      accepted_at: null,
      vat_rate: 8.1,
      discount: { kind: "percent", value: 10 },
    });
    expect(captured?.discount).toEqual({ kind: "percent", value: 10 });
  });
});

describe("saveQuote self-heal", () => {
  const input = {
    title: "T",
    contact: { spoken_name: "x", match: null, action: "match_or_create" as const },
    client_id: null,
    tax_rate_default: 8.1,
    lines: [],
    review_notes: [],
    sent: false,
    accepted: false,
    sent_at: null,
    accepted_at: null,
    vat_rate: 8.1,
    discount: { kind: "percent" as const, value: 10 },
    transcript: "hi",
  };

  it("retries without the optional columns on a missing-column error (PGRST204), dropping discount", async () => {
    const rows: Record<string, unknown>[] = [];
    let calls = 0;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const scope = {
      ownerId: "o",
      supabase: {
        from: () => ({
          upsert: (r: Record<string, unknown>) => {
            rows.push(r);
            calls += 1;
            const firstAttempt = calls === 1;
            return {
              select: () => ({
                single: async () =>
                  firstAttempt
                    ? { data: null, error: { code: "PGRST204", message: "Could not find the 'discount' column" } }
                    : { data: { id: "saved-1" }, error: null },
              }),
            };
          },
        }),
      },
    } as unknown as OwnerScope;

    const saved = await saveQuote(scope, input);
    expect(saved.id).toBe("saved-1");
    expect(calls).toBe(2);
    expect(rows[0]).toHaveProperty("discount");
    expect(rows[1]).not.toHaveProperty("discount");
    expect(rows[1]).not.toHaveProperty("transcript");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does NOT retry on an unrelated error that merely mentions 'discount' — it throws", async () => {
    let calls = 0;
    const scope = {
      ownerId: "o",
      supabase: {
        from: () => ({
          upsert: () => {
            calls += 1;
            return {
              select: () => ({
                single: async () => ({
                  data: null,
                  // A value-level error that happens to contain the word — must not trip the retry.
                  error: { code: "23514", message: "new row violates check constraint on discount" },
                }),
              }),
            };
          },
        }),
      },
    } as unknown as OwnerScope;

    await expect(saveQuote(scope, input)).rejects.toThrow(/saveQuote failed/);
    expect(calls).toBe(1);
  });
});
