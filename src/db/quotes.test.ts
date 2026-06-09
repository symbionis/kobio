import { describe, expect, it, vi } from "vitest";
import type { Quote } from "../quote/types";
import type { QuoteRow } from "./types";

// Mock the Supabase client so saveQuote resolves without a real DB, and the
// override log so we can drive its success/failure.
vi.mock("./client", () => ({
  db: () => ({
    from: () => ({
      upsert: () => ({
        select: () => ({ single: async () => ({ data: { id: "saved-1" }, error: null }) }),
      }),
    }),
  }),
  hasSupabaseConfig: () => true,
}));
vi.mock("./overrides", () => ({ logOverrides: vi.fn() }));

import { logOverrides } from "./overrides";
import { persistQuote, rowToQuote } from "./quotes";

const mockedLogOverrides = vi.mocked(logOverrides);

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
    tva_applicable: true,
    transcript: null,
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
    const saved = await persistQuote(quote, { client_id: null, sent: false, tva_applicable: true });
    expect(saved.id).toBe("saved-1");
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("succeeds normally when logOverrides resolves", async () => {
    mockedLogOverrides.mockResolvedValueOnce(undefined);
    const saved = await persistQuote(quote, { client_id: "c1", sent: true, tva_applicable: false });
    expect(saved.id).toBe("saved-1");
  });
});
