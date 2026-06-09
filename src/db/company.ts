import { db } from "./client";
import { OWNER_ID } from "./owner";
import type { CompanyRow } from "./types";

export interface SaveCompanyInput {
  name: string;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  logo_ref: string | null;
}

/** The owner's single company profile, or null if not set yet. */
export async function getCompany(): Promise<CompanyRow | null> {
  const { data, error } = await db()
    .from("company_profile")
    .select()
    .eq("owner_id", OWNER_ID)
    .maybeSingle();
  if (error) throw new Error(`getCompany failed: ${error.message}`);
  return (data as CompanyRow) ?? null;
}

/**
 * Upsert the owner's company profile (one per owner). Upserts on the owner_id
 * unique constraint — atomic, no read-then-write race.
 */
export async function saveCompany(input: SaveCompanyInput): Promise<CompanyRow> {
  if (!input.name.trim()) throw new Error("Company name is required.");
  const row = {
    owner_id: OWNER_ID,
    name: input.name.trim(),
    address: input.address,
    postcode: input.postcode,
    city: input.city,
    country: input.country,
    email: input.email,
    phone: input.phone,
    vat_number: input.vat_number,
    logo_ref: input.logo_ref,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await db()
    .from("company_profile")
    .upsert(row, { onConflict: "owner_id" })
    .select()
    .single();
  if (error) throw new Error(`saveCompany failed: ${error.message}`);
  return data as CompanyRow;
}
