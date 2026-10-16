/**
 * Evidence inventory for roof-design market readiness.
 * A published standard/code is not, by itself, an implemented or validated
 * design basis. No market is enabled for code-based structural calculations.
 */
export type RoofMarketEvidence = {
  code: string;
  reference: string | null;
  sourceUrl: string | null;
  finding: string;
  designEnabled: false;
};

export const ROOF_MARKET_EVIDENCE: readonly RoofMarketEvidence[] = [
  {
    code: "NG",
    designEnabled: false,
    reference: "National Building Code (Federal Ministry-hosted PDF)",
    sourceUrl: "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf",
    finding:
      "Reference-only roof live-load table found; its values omit units and the full timber/load basis is not verified.",
  },
  {
    code: "US",
    designEnabled: false,
    reference: "ASCE/SEI 7-22; ASCE Hazard Tool",
    sourceUrl:
      "https://www.asce.org/publications-and-news/codes-and-standards/asce-sei-7-22",
    finding:
      "Official loading standard and hazard lookup identified; local code adoption, licensed provisions, material design standards, and validated roof cases are not integrated.",
  },
  {
    code: "GB",
    designEnabled: false,
    reference: null,
    sourceUrl: null,
    finding:
      "A current, applicable UK design basis and National Annex set were not verified in this research pass.",
  },
  {
    code: "CA",
    designEnabled: false,
    reference: "National Building Code of Canada 2020",
    sourceUrl:
      "https://nrc-publications.canada.ca/eng/view/ft/?id=515340b5-f4e0-4798-be69-692e4ec423e8",
    finding:
      "National model code identified; provincial/territorial adoption and amendments vary, and no jurisdiction-specific roof design is implemented.",
  },
  {
    code: "AU",
    designEnabled: false,
    reference: "National Construction Code 2025",
    sourceUrl: "https://ncc.abcb.gov.au/editions/ncc-2025",
    finding:
      "Official code and state/territory adoption information identified; referenced standards, local adoption, and validated design cases are not integrated.",
  },
  {
    code: "DE",
    designEnabled: false,
    reference: "Eurocodes with German National Annexes (DIN)",
    sourceUrl:
      "https://www.din.de/de/mitwirken/normenausschuesse/nabau/ueberarbeitung-der-eurocodes-70796",
    finding:
      "DIN confirms the national annexes are required; the relevant editions/parameters and structural checks are not integrated.",
  },
  {
    code: "IN",
    designEnabled: false,
    reference: "BIS CED 37 published standards catalogue",
    sourceUrl:
      "https://www.services.bis.gov.in/php/BIS_2.0/dgdashboard/published/standards?commttid=MjA4&commttname=Q0VEIDM3",
    finding:
      "Current/reaffirmed IS 875 load-standard records identified; material provisions, applicability, and validated roof design are not integrated.",
  },
  {
    code: "GH",
    designEnabled: false,
    reference: null,
    sourceUrl: null,
    finding:
      "No complete current primary-source structural design basis was verified in this research pass.",
  },
  {
    code: "KE",
    designEnabled: false,
    reference: "National Building Code 2024 (NCA)",
    sourceUrl: "https://www.nca.go.ke/building-code",
    finding:
      "Official 2024 code and structural-design volume identified; local design parameters and benchmarked roof calculations are not integrated.",
  },
  {
    code: "ZA",
    designEnabled: false,
    reference: "SANS 10400-B: Structural design (2012 copy located)",
    sourceUrl:
      "https://ndlambe.gov.za/wp-content/uploads/2023/07/SANS10400-PART-B-STRUCTURAL-DESIGN.pdf",
    finding:
      "A 2012 copy was located, but current edition/status and the complete SANS material/load basis were not verified.",
  },
  {
    code: "JP",
    designEnabled: false,
    reference: "MLIT overseas building-code survey",
    sourceUrl:
      "https://www.mlit.go.jp/jutakukentiku/house/jutakukentiku_house_fr1_000024.html",
    finding:
      "Official country-system survey identified; it is not a current roof-design dataset, and no validated design basis is integrated.",
  },
  {
    code: "FR",
    designEnabled: false,
    reference: null,
    sourceUrl: null,
    finding:
      "A current, applicable French code edition and National Annex set were not verified in this research pass.",
  },
  {
    code: "BR",
    designEnabled: false,
    reference: null,
    sourceUrl: null,
    finding:
      "A current primary-source Brazilian roof-load and timber/steel design basis was not verified in this research pass.",
  },
  {
    code: "SA",
    designEnabled: false,
    reference: "Saudi Building Code 2024 (including SBC 301 loads)",
    sourceUrl: "https://sbc.gov.sa/En/BC/Pages/BuildingCode/BC.aspx?year=2024",
    finding:
      "Official code suite identified; its provisions are not integrated into a complete and independently validated roof design workflow.",
  },
  {
    code: "AE",
    designEnabled: false,
    reference: "Dubai structural design bylaw (emirate-specific)",
    sourceUrl:
      "https://dlp.dubai.gov.ae/Legislation%20Reference/2021/Administrative%20Resolution%20No.%20(37)%20of%202021%20Amending%20the%20Bylaw%20Concerning.html",
    finding:
      "Dubai-specific requirements identified; this does not establish a UAE-wide basis, and no emirate-specific design workflow is implemented.",
  },
  {
    code: "CN",
    designEnabled: false,
    reference: null,
    sourceUrl: null,
    finding:
      "GB code references surfaced, but a current official full-text load/material basis and validated implementation were not verified.",
  },
  {
    code: "ID",
    designEnabled: false,
    reference: "BSN SNI structural standards catalogue",
    sourceUrl: "https://pesta.bsn.go.id/produk/detail/14619-89002023",
    finding:
      "Official SNI catalogue record located, but it does not establish the complete current roof load and member-design provisions needed here.",
  },
  {
    code: "MX",
    designEnabled: false,
    reference: "NMX-C-567-1-ONNCCE-2020 (wind; government standards portal)",
    sourceUrl:
      "https://platiica.economia.gob.mx/normalizacion/nmx-c-567-1-onncce-2020/",
    finding:
      "Wind-standard record identified; local adoption, other load/material provisions, and validated roof calculations are not integrated.",
  },
  {
    code: "KR",
    designEnabled: false,
    reference: "Korean Construction Standards Center KDS 41 series",
    sourceUrl:
      "https://www.kcsc.re.kr/standardCode/viewer/KDS%2041%2010%2005:2024-12-24",
    finding:
      "Official standards portal identifies design loads and material-specific structural standards; provisions are not integrated or independently validated.",
  },
  {
    code: "IT",
    designEnabled: false,
    reference: "Norme Tecniche per le Costruzioni (2018 decree text)",
    sourceUrl:
      "https://www.gazzettaufficiale.it/do/atto/serie_generale/caricaPdf?art.codiceRedazionale=18A00716&art.dataPubblicazioneGazzetta=2018-02-20&art.num=1&art.tiposerie=SG&cdimg=18A0071600100010110001&dgu=2018-02-20",
    finding:
      "Official 2018 technical-code text identified; current amendments, local application, and validated roof calculations are not integrated.",
  },
] as const;

export const ROOF_DESIGN_MARKET_CODES = ROOF_MARKET_EVIDENCE.map(
  ({ code }) => code,
);

export function getRoofMarketEvidence(
  code: string,
): RoofMarketEvidence | undefined {
  return ROOF_MARKET_EVIDENCE.find((entry) => entry.code === code);
}
