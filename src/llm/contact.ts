import { type ContactFields, normalizeContact } from "../contact";
import { chatJSON } from "./client";

/**
 * Faithful extraction of a client's address block from a dictated note. The
 * model emits language only — exactly what was said, blank when a field wasn't
 * mentioned. Code (src/contact.ts) owns the country mapping and normalization.
 * Mirrors src/llm/extraction.ts (extractQuote), minus catalog/trade.
 */

const SYSTEM_PROMPT = `Tu extrais les coordonnées d'un client à partir d'une courte note vocale en français.
Renvoie UNIQUEMENT ce qui est dit, mot pour mot. N'invente jamais, ne complète jamais, ne corrige jamais.
Si un champ n'est pas mentionné, renvoie une chaîne vide ("").

Champs :
- name : le nom (et prénom) du client tel que prononcé.
- address : la rue et le numéro.
- postcode : le NPA / code postal (chiffres uniquement).
- city : la ville / localité.
- country : le pays tel que prononcé (ex. « Suisse », « France »). Vide si non mentionné.

Ne déduis pas le pays à partir de la ville. N'inclus ni e-mail ni téléphone.`;

const CONTACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    address: { type: "string" },
    postcode: { type: "string" },
    city: { type: "string" },
    country: { type: "string" },
  },
  required: ["name", "address", "postcode", "city", "country"],
} as const;

/** One OpenRouter chat call → normalized address fields. */
export async function extractContact(transcript: string): Promise<ContactFields> {
  const raw = await chatJSON<ContactFields>({
    system: SYSTEM_PROMPT,
    user: transcript,
    schemaName: "contact_extraction",
    schema: CONTACT_SCHEMA as unknown as Record<string, unknown>,
    temperature: 0,
  });
  return normalizeContact(raw);
}
