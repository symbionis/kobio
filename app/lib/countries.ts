import { COUNTRIES } from "../../src/countries";

/** Re-exported from src/countries.ts (the canonical list) so existing component
 *  imports keep working while the deterministic core can use it too. */
export { COUNTRIES };

/** Ready-made { value, label } options for the Select component. */
export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ value: c, label: c }));
