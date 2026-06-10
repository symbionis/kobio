import type { QuoteRow } from "../../src/db/types";
import { deriveStatus } from "../../src/quote/status";
import { formatCHF, totalsFromLines } from "../../src/quote/totals";
import { fmtDate } from "../lib/dates";

/** A quote's effective status — the lifecycle order shown in the filter. */
export type StatusKey = "Draft" | "Ready" | "Sent" | "Accepted";

/** The serializable shape every quote list renders. Computed in ONE place so
 *  the main list, the per-client mini-list, and the client detail page never
 *  diverge. */
export interface QuoteListRow {
  id: string;
  title: string;
  ttcLabel: string;
  status: StatusKey;
  /** The status-relevant date: validé date if validé, else envoyé, else created. */
  dateLabel: string;
  /** Display contact: the assigned client's name if one is attached, else the
   *  dictated contact (`contact.spoken_name`). Null when neither is known. */
  contact: string | null;
}

/** @param clientName the attached client's name (when `r.client_id` is set), so
 *  the row can prefer it over the dictated contact. */
export function toQuoteListRow(r: QuoteRow, clientName?: string | null): QuoteListRow {
  const status: StatusKey = r.accepted ? "Accepted" : deriveStatus(r.lines, r.sent);
  const ttc = totalsFromLines(r.lines, r.vat_rate == null ? null : Number(r.vat_rate)).ttc;
  const dateIso = r.accepted
    ? (r.accepted_at ?? r.created_at)
    : r.sent
      ? (r.sent_at ?? r.created_at)
      : r.created_at;
  return {
    id: r.id,
    title: r.title || "Sans titre",
    ttcLabel: formatCHF(ttc),
    status,
    dateLabel: fmtDate(dateIso),
    contact: clientName ?? r.contact?.spoken_name ?? null,
  };
}
