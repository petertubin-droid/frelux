/**
 * Public-facing jurisdiction reference map for FRELUX structural tools.
 * This is a scope/disclosure registry, not a code implementation or approval.
 * Review date: 2026-10-21. Recheck primary sources and local adoption before use.
 */
export type StructuralJurisdiction = {
  code: "NG" | "US" | "GB" | "CN" | "IT" | "AU";
  country: string;
  framework: string;
  verifiedSource: string;
  sourceLabel: string;
  localScope: string;
  calculationStatus: "reference_only";
};

export const STRUCTURAL_JURISDICTION_SCOPE: Record<StructuralJurisdiction["code"], StructuralJurisdiction> = {
  NG: {
    code: "NG",
    country: "Nigeria",
    framework: "National Building Code (structural/civil/geotechnical provisions); applicable Nigerian Standards and project-adopted design standards",
    verifiedSource: "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf",
    sourceLabel: "Federal Republic of Nigeria National Building Code",
    localScope: "Confirm state/local authority requirements and the standards explicitly adopted for the project. Legacy NCP listings are not, by themselves, proof of the current governing design basis.",
    calculationStatus: "reference_only",
  },
  US: {
    code: "US",
    country: "United States",
    framework: "Locally adopted building code (often an edition of IBC) and referenced standards such as ASCE 7 and ACI 318, as adopted/amended by the authority having jurisdiction",
    verifiedSource: "https://www.iccsafe.org/wp-content/uploads/Master-I-Code-Adoption-Chart-1.pdf",
    sourceLabel: "ICC state adoption chart (January 2024)",
    localScope: "Adoption, editions and amendments vary by state and local jurisdiction. Select the project authority and adopted editions before any code-based design.",
    calculationStatus: "reference_only",
  },
  GB: {
    code: "GB",
    country: "United Kingdom",
    framework: "Applicable national building regulations and Approved Document A, with the relevant UK-adopted structural design standards and National Annexes",
    verifiedSource: "https://www.gov.uk/government/publications/structure-approved-document-a",
    sourceLabel: "GOV.UK Approved Document A: Structure (England)",
    localScope: "Building-regulation regimes differ across England, Wales, Scotland and Northern Ireland; confirm the applicable national documents, current standards and National Annex for the project.",
    calculationStatus: "reference_only",
  },
  CN: {
    code: "CN",
    country: "China",
    framework: "GB/T 50010-2010, Standard for Design of Concrete Structures (partial revision effective 1 August 2024), alongside applicable mandatory national and local standards",
    verifiedSource: "http://sczjjgfw.gov.cn/clas/wjhb/jsb/24/jsb202462.html",
    sourceLabel: "MOHURD Announcement No. 62 (2024)",
    localScope: "The announced revision changes the standard designation to GB/T 50010-2010. Verify its current status, mandatory provisions, related standards and local requirements with the project authority; this registry does not resolve those questions.",
    calculationStatus: "reference_only",
  },
  IT: {
    code: "IT",
    country: "Italy",
    framework: "Norme Tecniche per le Costruzioni (NTC 2018), approved by Ministerial Decree 17 January 2018, with its applicable circulars and national provisions",
    verifiedSource: "https://www.gazzettaufficiale.it/do/atto/serie_generale/caricaPdf?art.codiceRedazionale=18A00716&art.dataPubblicazioneGazzetta=2018-02-20&art.num=1&art.tiposerie=SG&cdimg=18A0071600100010110001&dgu=2018-02-20",
    sourceLabel: "Gazzetta Ufficiale: NTC 2018",
    localScope: "Confirm current amendments, application instructions, seismic classification, project category and authority requirements for the site.",
    calculationStatus: "reference_only",
  },
  AU: {
    code: "AU",
    country: "Australia",
    framework: "National Construction Code (NCC), relevant structural provisions and referenced Australian Standards, including applicable editions of AS/NZS 1170 and material standards",
    verifiedSource: "https://ncc.abcb.gov.au/ncc-2025/ncc-2025-state-and-territory-adoption-information",
    sourceLabel: "ABCB NCC 2025 state and territory adoption information",
    localScope: "NCC 2025 adoption and transition dates differ by state/territory, and local variations apply. Confirm the jurisdiction, building class, operative NCC edition and referenced standard editions.",
    calculationStatus: "reference_only",
  },
};

export function getStructuralJurisdictionScope(code?: string | null): StructuralJurisdiction | null {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !(normalized in STRUCTURAL_JURISDICTION_SCOPE)) return null;
  return STRUCTURAL_JURISDICTION_SCOPE[normalized as StructuralJurisdiction["code"]];
}
