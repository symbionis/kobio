import type { OwnerScope } from "./auth";
import type { CompanyRow, VatRate } from "./types";

export interface SaveCompanyInput {
  name: string;
  address: string | null;
  postcode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  vat_number: string | null;
  vat_rates: VatRate[];
  logo_ref: string | null;
  trade: string | null;
  cgv_text: string | null;
}

/** The owner's single company profile, or null if not set yet. */
export async function getCompany(scope: OwnerScope): Promise<CompanyRow | null> {
  const { data, error } = await scope.supabase
    .from("company_profile")
    .select()
    .eq("owner_id", scope.ownerId)
    .maybeSingle();
  if (error) throw new Error(`getCompany failed: ${error.message}`);
  return (data as CompanyRow) ?? null;
}

/**
 * Upsert the owner's company profile (one per owner). Upserts on the owner_id
 * unique constraint — atomic, no read-then-write race.
 */
export async function saveCompany(scope: OwnerScope, input: SaveCompanyInput): Promise<CompanyRow> {
  if (!input.name.trim()) throw new Error("Company name is required.");
  const row = {
    owner_id: scope.ownerId,
    name: input.name.trim(),
    address: input.address,
    postcode: input.postcode,
    city: input.city,
    country: input.country,
    email: input.email,
    phone: input.phone,
    vat_number: input.vat_number,
    vat_rates: input.vat_rates,
    logo_ref: input.logo_ref,
    trade: input.trade,
    cgv_text: input.cgv_text,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await scope.supabase
    .from("company_profile")
    .upsert(row, { onConflict: "owner_id" })
    .select()
    .single();
  if (error) throw new Error(`saveCompany failed: ${error.message}`);
  return data as CompanyRow;
}
