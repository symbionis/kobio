import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the OpenRouter call so we test extractContact's wiring + normalization,
// not the live model.
vi.mock("./client", () => ({ chatJSON: vi.fn() }));

import { chatJSON } from "./client";
import { extractContact } from "./contact";

const mockedChatJSON = vi.mocked(chatJSON);

describe("extractContact", () => {
  beforeEach(() => mockedChatJSON.mockReset());

  it("returns normalized fields (country mapped, trimmed)", async () => {
    mockedChatJSON.mockResolvedValueOnce({
      name: " Amina Bensassi ",
      address: "Rue du Lac 4",
      postcode: "1006",
      city: "Lausanne",
      country: "suisse",
    });
    const out = await extractContact("Amina Bensassi, rue du Lac 4, 1006 Lausanne, Suisse");
    expect(out).toEqual({
      name: "Amina Bensassi",
      address: "Rue du Lac 4",
      postcode: "1006",
      city: "Lausanne",
      country: "Suisse",
    });
  });

  it("keeps an unheard field blank — no guessing", async () => {
    mockedChatJSON.mockResolvedValueOnce({
      name: "Jean",
      address: "",
      postcode: "",
      city: "Genève",
      country: "",
    });
    const out = await extractContact("Jean à Genève");
    expect(out.address).toBe("");
    expect(out.country).toBe("");
  });
});
