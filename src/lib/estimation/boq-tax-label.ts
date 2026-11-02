/**
 * Per-market tax naming for BOQ/quote documents (Wave 1.2).
 *
 * The label is PRESENTATION ONLY — it never sets or implies a
 * rate. Rates still come exclusively from estimation_calc_rules
 * or explicit user input (the engine never guesses).
 *
 * Verified naming per market (bilingual where the market's
 * documents commonly show it):
 */

export interface BoqTaxLabel {
  /** Full name for document terms ("Value Added Tax"). */
  long: string;
  /** Short code used in table rows ("VAT"). */
  short: string;
}

const LABELS: Record<string, BoqTaxLabel> = {
  NG: { long: "Value Added Tax", short: "VAT" },
  GB: { long: "Value Added Tax", short: "VAT" },
  GH: { long: "Value Added Tax", short: "VAT" },
  KE: { long: "Value Added Tax", short: "VAT" },
  ZA: { long: "Value Added Tax", short: "VAT" },
  SA: { long: "Value Added Tax", short: "VAT" },
  AE: { long: "Value Added Tax", short: "VAT" },
  // DACH: documents commonly show both forms
  DE: { long: "Umsatzsteuer (Mehrwertsteuer)", short: "MwSt" },
  AT: { long: "Umsatzsteuer (Mehrwertsteuer)", short: "USt" },
  CH: { long: "Mehrwertsteuer (Taxe sur la valeur ajoutée)", short: "MwSt" },
  FR: { long: "Taxe sur la Valeur Ajoutée", short: "TVA" },
  IT: { long: "Imposta sul Valore Aggiunto", short: "IVA" },
  BR: { long: "Imposto Sobre Serviços", short: "ISS" }, // construction services
  MX: { long: "Impuesto al Valor Agregado", short: "IVA" },
  ES: { long: "Impuesto sobre el Valor Añadido", short: "IVA" },
  IN: { long: "Goods and Services Tax", short: "GST" },
  AU: { long: "Goods and Services Tax", short: "GST" },
  CA: { long: "Goods and Services Tax", short: "GST" },
  US: { long: "Sales and Use Tax", short: "Sales Tax" },
  JP: { long: "消費税 (Consumption Tax)", short: "消費税" },
  KR: { long: "부가가치세 (Value Added Tax)", short: "부가세" },
  CN: { long: "增值税 (Value Added Tax)", short: "VAT" },
  ID: { long: "Pajak Pertambahan Nilai", short: "PPN" },
  TR: { long: "KDV (Katma Değer Vergisi)", short: "KDV" },
  EG: { long: "Value Added Tax", short: "VAT" },
  // No invention: unknown markets get the neutral ISO name.
};

const FALLBACK: BoqTaxLabel = { long: "Tax (per market rules)", short: "Tax" };

/** Tax naming for a market. Unknown codes return a NEUTRAL
 *  "Tax" label — never a specific market's scheme presented as
 *  fact (i18n mandate: no invented claims). */
export function boqTaxLabel(countryCode?: string | null): BoqTaxLabel {
  const cc = (countryCode || "").trim().toUpperCase();
  return LABELS[cc] ?? FALLBACK;
}
