import { COUNTRIES } from "./countries";

/**
 * Deterministic contact (client address) core. The LLM emits the address as
 * spoken (language only); this module owns everything deterministic: mapping the
 * spoken country to the known list, trimming, and deciding which fields to fill
 * and highlight. See docs/solutions/architecture-patterns/code-owns-determinism-llm-owns-language.md.
 */

/** The address block captured by voice. E-mail and phone are typed, not here. */
export interface ContactFields {
  name: string;
  address: string;
  postcode: string;
  city: string;
  country: string;
}

export const CONTACT_KEYS: (keyof ContactFields)[] = [
  "name",
  "address",
  "postcode",
  "city",
  "country",
];

/** Map a spoken country to a known list entry (case-insensitive), or "" when it
 *  wasn't spoken or isn't a country we support. */
function matchCountry(spoken: string): string {
  const q = spoken.trim().toLowerCase();
  if (!q) return "";
  return COUNTRIES.find((c) => c.toLowerCase() === q) ?? "";
}

/** Coerce a model field to a string before trimming. The json_schema marks
 *  every field required+string, but that's not a hard guarantee — a stray null
 *  or omitted field would otherwise throw an opaque TypeError. Absent → "". */
function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Clean the model's raw output: trim every field, resolve the country to the
 *  known list (unmatched/absent → blank). Never guesses. */
export function normalizeContact(raw: ContactFields): ContactFields {
  return {
    name: str(raw.name),
    address: str(raw.address),
    postcode: str(raw.postcode),
    city: str(raw.city),
    country: matchCountry(str(raw.country)),
  };
}

export interface DictationFill {
  /** The five address fields to set on the form (replace the whole block). */
  fields: ContactFields;
  /** The keys whose value is non-empty — the ones to highlight for review. */
  highlight: (keyof ContactFields)[];
}

/** Decide the form update for a dictation result: replace the whole address
 *  block, and highlight only the fields that actually came back filled. A field
 *  the model didn't hear is blank and unhighlighted. */
export function dictationFill(fields: ContactFields): DictationFill {
  return {
    fields,
    highlight: CONTACT_KEYS.filter((k) => fields[k].trim() !== ""),
  };
}
