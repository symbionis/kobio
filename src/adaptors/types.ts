/**
 * The provider-agnostic adaptor boundary.
 *
 * The core depends only on this interface — never on a provider's shapes.
 * Bexio is the first implementation (next slice); others can follow. Operations
 * a given provider doesn't support are reflected in its `capabilities`, so the
 * core can hide unavailable actions without special-casing any provider.
 *
 * See BUILD.md and the foundation-slice plan: "Bexio is a mapping, not the mold."
 */

import type { Client, Company, Quote } from "../quote/types";

/** A catalog entry as the core understands it — provider-agnostic. */
export interface CatalogItem {
  name: string;
  code: string | null;
  price: number | null;
}

/** Which operations a provider's adaptor actually supports. */
export interface AdaptorCapabilities {
  importClients: boolean;
  importCompany: boolean;
  importCatalog: boolean;
  exportDraft: boolean;
  sync: boolean;
}

/** A reference returned by a provider after a draft is exported to it. */
export interface ExportResult {
  externalId: string;
}

/**
 * One provider integration. The core calls these by interface; it never reaches
 * into a provider SDK directly.
 */
export interface Adaptor {
  /** Stable slug, e.g. "bexio". */
  readonly id: string;
  /** Human label, e.g. "Bexio". */
  readonly label: string;
  readonly capabilities: AdaptorCapabilities;

  importClients(): Promise<Client[]>;
  importCompany(): Promise<Company | null>;
  importCatalog(): Promise<CatalogItem[]>;
  exportDraft(quote: Quote): Promise<ExportResult>;
  sync(): Promise<void>;
}
