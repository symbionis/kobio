/**
 * The single implicit owner for the pre-accounts MVP. Every row carries this id
 * so multi-tenant can later swap it for real per-user ids with no schema change
 * (KTD3). Nothing about the data model depends on there being only one owner —
 * this constant is the only thing that does.
 */
export const OWNER_ID = "00000000-0000-0000-0000-000000000001";
