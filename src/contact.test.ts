import { describe, expect, it } from "vitest";
import { CONTACT_KEYS, type ContactFields, dictationFill, normalizeContact } from "./contact";

function raw(over: Partial<ContactFields> = {}): ContactFields {
  return { name: "", address: "", postcode: "", city: "", country: "", ...over };
}

describe("normalizeContact", () => {
  it("maps a spoken country to the known list (case-insensitive)", () => {
    expect(normalizeContact(raw({ country: "France" })).country).toBe("France");
    expect(normalizeContact(raw({ country: "portugal" })).country).toBe("Portugal");
    expect(normalizeContact(raw({ country: "ROYAUME-UNI" })).country).toBe("Royaume-Uni");
  });

  it("blanks an unmatched or absent country — never guesses", () => {
    expect(normalizeContact(raw({ country: "Maroc" })).country).toBe("");
    expect(normalizeContact(raw({ country: "" })).country).toBe("");
    expect(normalizeContact(raw({ country: "   " })).country).toBe("");
  });

  it("trims every field", () => {
    const out = normalizeContact(raw({ name: "  Amina Bensassi ", city: " Lausanne  " }));
    expect(out.name).toBe("Amina Bensassi");
    expect(out.city).toBe("Lausanne");
  });

  it("coerces a non-string field to blank instead of throwing", () => {
    // The json_schema marks fields required+string, but that isn't a hard
    // guarantee — a null or omitted field must blank out, not crash.
    const malformed = { name: null, address: undefined, postcode: "1003", city: "Lausanne" } as unknown as ContactFields;
    const out = normalizeContact(malformed);
    expect(out).toEqual({ name: "", address: "", postcode: "1003", city: "Lausanne", country: "" });
  });
});

describe("dictationFill", () => {
  it("highlights only the non-empty fields (unheard fields stay blank, unhighlighted)", () => {
    const fields = normalizeContact(
      raw({ name: "Amina", address: "Rue du Lac 4", postcode: "", city: "Lausanne", country: "Suisse" }),
    );
    const { highlight } = dictationFill(fields);
    expect(highlight).toEqual(["name", "address", "city", "country"]);
    expect(highlight).not.toContain("postcode");
  });

  it("replaces the whole block and never emits e-mail/phone keys", () => {
    const { fields } = dictationFill(normalizeContact(raw({ name: "X" })));
    expect(Object.keys(fields).sort()).toEqual([...CONTACT_KEYS].sort());
  });

  it("highlights nothing when nothing was heard", () => {
    expect(dictationFill(normalizeContact(raw())).highlight).toEqual([]);
  });
});
