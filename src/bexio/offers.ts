import { bexio } from "./client.js";

/**
 * Offers (kb_offer) = the quotes Nicolas sends clients. READ-ONLY here.
 * Creating/mutating offers is a separate, gated step (CLAUDE.md rule 1 & 5);
 * nothing in this file writes.
 *
 * A quote is a header plus an ordered list of `positions`. Each position is one
 * of a few types, distinguished by `type`:
 *   - KbPositionArticle   line linked to a catalog article (has `article_id`)
 *   - KbPositionCustom    free-text line, priced but NOT linked to the catalog
 *   - KbPositionText      a heading / note, no pricing
 *   - KbPositionSubtotal  a running subtotal (no article)
 *   - KbPositionPagebreak / KbPositionDiscount  layout / discount
 *
 * Both Article and Custom positions carry their OWN amount/unit_price/text, so a
 * line's price can differ from the catalog's sale_price even when it's linked.
 */

/** Summary shape returned by the list endpoint (no positions). */
export interface KbOfferListItem {
  id: number;
  document_nr: string;
  title: string | null;
  contact_id: number | null;
  is_valid_from: string | null; // "YYYY-MM-DD"
  is_valid_until: string | null;
  total: string | null; // gross total, as a string
  kb_item_status_id: number; // draft / sent / accepted / declined …
  updated_at: string | null;
}

/** A priced line — both KbPositionArticle and KbPositionCustom share this. */
export interface KbPositionPriced {
  id: number;
  type: "KbPositionArticle" | "KbPositionCustom";
  article_id?: number; // present only on KbPositionArticle
  amount: string; // quantity, as a string e.g. "30.000000"
  unit_id: number | null;
  unit_name: string | null; // often null even when article has a unit
  unit_price: string; // per-unit price for THIS line
  discount_in_percent: string | null;
  position_total: string; // line total
  tax_id: number | null;
  tax_value: string | null;
  account_id: number | null;
  text: string; // HTML; on article lines this overrides the catalog name
  pos: string | null; // printed position number
  internal_pos: number; // sort order
  parent_id: number | null;
  is_optional: boolean;
}

/** A heading / free text block — no pricing. */
export interface KbPositionText {
  id: number;
  type: "KbPositionText";
  text: string;
  show_pos_nr: boolean;
  pos: string | null;
  internal_pos: number;
  parent_id: number | null;
  is_optional: boolean;
}

/** Layout / structural positions we don't price (pagebreak, subtotal, …). */
export interface KbPositionOther {
  id: number;
  type: string;
  internal_pos: number;
  parent_id: number | null;
  is_optional: boolean;
  [key: string]: unknown;
}

export type KbPosition = KbPositionPriced | KbPositionText | KbPositionOther;

export interface KbOffer extends KbOfferListItem {
  positions: KbPosition[];
}

/** True for the two position types that carry a price and a quantity. */
export function isPricedPosition(p: KbPosition): p is KbPositionPriced {
  return p.type === "KbPositionArticle" || p.type === "KbPositionCustom";
}

/** List offers (summaries only). */
export function listOffers(offset = 0, limit = 500): Promise<KbOfferListItem[]> {
  return bexio.get<KbOfferListItem[]>("/2.0/kb_offer", { offset, limit });
}

/** Fetch one offer with its full positions. */
export function getOffer(id: number): Promise<KbOffer> {
  return bexio.get<KbOffer>(`/2.0/kb_offer/${id}`);
}
