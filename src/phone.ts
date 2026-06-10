import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

/**
 * Shared phone capture + normalization. Every phone entry point (client create
 * modal, client detail, company profile) goes through here so the same human
 * number is stored identically wherever it was entered.
 *
 * We use libphonenumber-js rather than a hand-rolled `replace(/^0/, "")` because
 * trunk-zero handling is per-country: CH/FR/DE/UK strip the leading 0, but IT
 * keeps it inside the national number. A blanket strip corrupts Italian numbers.
 *
 * (Ported from the GPC Social Members project's lib/phone.ts.)
 */

/** Countries pinned to the top of the selector, in display order. "UK" is ISO "GB". */
export const PINNED_COUNTRIES: CountryCode[] = ["CH", "FR", "GB", "DE", "IT", "ES", "AT"];

export const DEFAULT_COUNTRY: CountryCode = "CH";

export interface PhoneParts {
  country: CountryCode;
  national: string;
}

/** Normalize a national number entered under `country` to E.164, or null if it
 *  isn't a valid phone number for that country (the correct per-country
 *  trunk-zero rule is applied). */
export function toE164(national: string, country: CountryCode): string | null {
  const trimmed = (national ?? "").trim();
  if (!trimmed) return null;
  const parsed = parsePhoneNumberFromString(trimmed, country);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number; // E.164, e.g. "+41781234567"
}

export function isValidPhone(national: string, country: CountryCode): boolean {
  return toE164(national, country) !== null;
}

/** Split a stored E.164 value back into country + national number, for editing
 *  an existing value. Returns null when the stored value isn't valid E.164. */
export function parseE164(stored: string | null | undefined): PhoneParts | null {
  if (!stored) return null;
  const parsed = parsePhoneNumberFromString(stored.trim());
  if (!parsed || !parsed.country) return null;
  return { country: parsed.country, national: String(parsed.nationalNumber) };
}

export interface CountryOption {
  country: CountryCode;
  /** e.g. "+41" */
  callingCode: string;
}

/** Ordered country list for the selector: pinned countries first, then every
 *  other country alphabetically by ISO code. */
export function countryOptions(): CountryOption[] {
  const all = getCountries();
  const rest = all
    .filter((c) => !PINNED_COUNTRIES.includes(c))
    .sort((a, b) => a.localeCompare(b));
  const ordered = [...PINNED_COUNTRIES.filter((c) => all.includes(c)), ...rest];
  return ordered.map((country) => ({
    country,
    callingCode: `+${getCountryCallingCode(country)}`,
  }));
}
