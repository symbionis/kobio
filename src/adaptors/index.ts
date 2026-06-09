/**
 * Adaptor registry. Empty for now — the Bexio adaptor is the next slice. The
 * core asks the registry which providers are available; it never names one.
 *
 * This is the structural honouring of "Bexio is one adaptor, there can be
 * others": the seam exists today, with zero implementations behind it.
 */

import type { Adaptor } from "./types";

export function availableAdaptors(): Adaptor[] {
  return [];
}

export function findAdaptor(id: string): Adaptor | undefined {
  return availableAdaptors().find((a) => a.id === id);
}

export type { Adaptor, AdaptorCapabilities, CatalogItem, ExportResult } from "./types";
