import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ClientRow, CompanyRow } from "../../src/db/types";
import { formatCHF, totalsFromLines } from "../../src/quote/totals";
import type { Quote } from "../../src/quote/types";

/**
 * The printable devis. Built with @react-pdf/renderer (no headless browser) and
 * rendered to a Buffer server-side by the PDF route. Amounts come straight from
 * the stored lines/totals — no recompute in the PDF layer.
 */

const CHF = formatCHF;

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: "#1b1f24", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  company: { maxWidth: 300 },
  logo: { maxWidth: 160, maxHeight: 64, marginBottom: 8, objectFit: "contain" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  muted: { color: "#6b7280" },
  docTitle: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#2f6df6" },
  block: { marginBottom: 18 },
  label: { fontSize: 8, color: "#6b7280", marginBottom: 2 },
  offerTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", marginBottom: 12 },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e7eb",
    paddingBottom: 4,
    marginBottom: 2,
    color: "#6b7280",
    fontSize: 8,
  },
  row: {
    flexDirection: "row",
    paddingTop: 5,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  cDesc: { flex: 1, paddingRight: 8 },
  cNum: { width: 80, textAlign: "right" },
  totals: { marginTop: 18, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 3, paddingBottom: 3 },
  ttc: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    borderTopWidth: 1,
    borderTopColor: "#e4e7eb",
    marginTop: 4,
    paddingTop: 5,
  },
});

function DevisDocument({
  company,
  client,
  quote,
  vatRate,
  createdAt,
}: {
  company: CompanyRow;
  client: ClientRow;
  quote: Quote;
  vatRate: number | null;
  createdAt: string;
}) {
  const totals = totalsFromLines(quote.lines, vatRate);
  const dateLabel = createdAt
    ? new Date(createdAt).toLocaleDateString("fr-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "";
  return (
    <Document title={quote.title}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View style={s.company}>
            {company.logo_ref ? <Image style={s.logo} src={company.logo_ref} /> : null}
            <Text style={s.companyName}>{company.name}</Text>
            {company.address ? <Text style={s.muted}>{company.address}</Text> : null}
            {company.postcode || company.city ? (
              <Text style={s.muted}>{[company.postcode, company.city].filter(Boolean).join(" ")}</Text>
            ) : null}
            {company.country ? <Text style={s.muted}>{company.country}</Text> : null}
            {company.email ? <Text style={s.muted}>{company.email}</Text> : null}
            {company.phone ? <Text style={s.muted}>{company.phone}</Text> : null}
            {company.vat_number ? <Text style={s.muted}>TVA {company.vat_number}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.docTitle}>DEVIS</Text>
            {dateLabel ? <Text style={[s.muted, { marginTop: 6 }]}>Date : {dateLabel}</Text> : null}
          </View>
        </View>

        <View style={s.block}>
          <Text style={s.label}>CLIENT</Text>
          <Text>{client.name}</Text>
          {client.address ? <Text style={s.muted}>{client.address}</Text> : null}
          {client.postcode || client.city ? (
            <Text style={s.muted}>{[client.postcode, client.city].filter(Boolean).join(" ")}</Text>
          ) : null}
          {client.country ? <Text style={s.muted}>{client.country}</Text> : null}
        </View>

        <Text style={s.offerTitle}>{quote.title}</Text>

        <View style={s.tableHead}>
          <Text style={s.cDesc}>Désignation</Text>
          <Text style={s.cNum}>Quantité</Text>
          <Text style={s.cNum}>Tarif</Text>
          <Text style={s.cNum}>Montant</Text>
        </View>
        {quote.lines.map((l, i) => (
          <View key={i} style={s.row}>
            <Text style={s.cDesc}>{l.description}</Text>
            <Text style={s.cNum}>
              {l.quantity.value === null ? "—" : `${l.quantity.value} ${l.quantity.unit ?? ""}`.trim()}
            </Text>
            <Text style={s.cNum}>
              {l.quantity.kind === "forfait" && l.quantity.value === null ? "forfait" : CHF(l.rate)}
            </Text>
            <Text style={s.cNum}>{CHF(l.amount)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>HT</Text>
            <Text>CHF {CHF(totals.ht)}</Text>
          </View>
          {vatRate != null ? (
            <View style={s.totalRow}>
              <Text>TVA {vatRate}%</Text>
              <Text>CHF {CHF(totals.tva)}</Text>
            </View>
          ) : null}
          <View style={[s.totalRow, s.ttc]}>
            <Text>TTC</Text>
            <Text>CHF {CHF(totals.ttc)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

/** Render the devis to a PDF buffer (server-side). */
export async function renderQuotePdf(
  company: CompanyRow,
  client: ClientRow,
  quote: Quote,
  vatRate: number | null,
  createdAt: string,
): Promise<Buffer> {
  return renderToBuffer(
    <DevisDocument
      company={company}
      client={client}
      quote={quote}
      vatRate={vatRate}
      createdAt={createdAt}
    />,
  );
}
