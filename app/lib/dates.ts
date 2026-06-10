/** Shared fr-CH date formatting. Empty string for null so callers can render
 *  conditionally without juggling undefined. */

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("fr-CH", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}
