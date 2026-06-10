import { describe, expect, it } from "vitest";
import { buildSlackMessage } from "./feedback";

function flat(msg: ReturnType<typeof buildSlackMessage>): string {
  return JSON.stringify(msg);
}

describe("buildSlackMessage", () => {
  it("includes the transcript, name, e-mail and page for a signed-in builder", () => {
    const msg = buildSlackMessage("Le bouton ne marche pas", {
      name: "LDT Batiment SARL",
      email: "nico@ldt.ch",
      page: "/quotes/abc",
    });
    const s = flat(msg);
    expect(s).toContain("Le bouton ne marche pas");
    expect(s).toContain("LDT Batiment SARL");
    expect(s).toContain("nico@ldt.ch");
    expect(s).toContain("/quotes/abc");
  });

  it("marks the sender Anonyme when signed out, keeping the transcript", () => {
    const msg = buildSlackMessage("super outil", { name: null, email: null, page: "/new" });
    const s = flat(msg);
    expect(s).toContain("super outil");
    expect(s).toContain("Anonyme");
    expect(s).toContain("/new");
  });

  it("falls back to the e-mail when only the e-mail is known", () => {
    const s = flat(buildSlackMessage("x", { name: null, email: "a@b.co", page: null }));
    expect(s).toContain("a@b.co");
    expect(s).not.toContain("Anonyme");
  });

  it("preserves newlines in the transcript", () => {
    const msg = buildSlackMessage("ligne 1\nligne 2", { name: "X", email: null, page: null });
    const section = msg.blocks[0] as { text: { text: string } };
    expect(section.text.text).toContain("ligne 1\nligne 2");
  });
});
