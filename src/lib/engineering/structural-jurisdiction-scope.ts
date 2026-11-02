/**
 * Public-facing jurisdiction reference registry for FRELUX structural tools.
 * Covers all 32 built-in FRELUX markets with authoritative national building code references,
 * and provides dynamic framework resolution for any future markets added to the platform.
 *
 * This is an engineering review reference and disclosure registry, NOT a certification of compliance.
 * Review date: 2026-10-21. Local code editions, amendments, and site conditions must be verified
 * by a locally licensed professional engineer.
 */

export type StructuralJurisdictionCode =
  | "NG"
  | "US"
  | "GB"
  | "CA"
  | "AU"
  | "DE"
  | "IN"
  | "GH"
  | "KE"
  | "ZA"
  | "JP"
  | "FR"
  | "BR"
  | "SA"
  | "AE"
  | "CN"
  | "ID"
  | "MX"
  | "KR"
  | "IT"
  | "ET"
  | "EG"
  | "TZ"
  | "CI"
  | "ES"
  | "NL"
  | "PL"
  | "SE"
  | "CH"
  | "SG"
  | "TR"
  | "NZ";

export type StructuralJurisdiction = {
  code: string;
  country: string;
  framework: string;
  verifiedSource: string;
  sourceLabel: string;
  localScope: string;
  calculationStatus: "reference_only";
  isDynamicFallback?: boolean;
};

export const STRUCTURAL_JURISDICTION_SCOPE: Record<
  StructuralJurisdictionCode,
  StructuralJurisdiction
> = {
  NG: {
    code: "NG",
    country: "Nigeria",
    framework:
      "National Building Code (structural/civil/geotechnical provisions); applicable Nigerian Standards (NIS) and COREN guidelines",
    verifiedSource: "https://bend.fmhud.gov.ng/upload/download/25080529456.pdf",
    sourceLabel: "Federal Republic of Nigeria National Building Code",
    localScope:
      "Confirm state and local authority requirements (e.g. LASBCA in Lagos) and the standards explicitly adopted for the project. Legacy NCP listings are not proof of the current governing design basis.",
    calculationStatus: "reference_only",
  },
  US: {
    code: "US",
    country: "United States",
    framework:
      "Locally adopted building code (often an edition of IBC) and referenced standards including ASCE 7 and ACI 318, as adopted by the authority having jurisdiction",
    verifiedSource:
      "https://www.iccsafe.org/wp-content/uploads/Master-I-Code-Adoption-Chart-1.pdf",
    sourceLabel: "ICC State Adoption Chart",
    localScope:
      "Adoption, editions, and local amendments vary by state and municipality. Select the project authority and adopted editions before any code-based design.",
    calculationStatus: "reference_only",
  },
  GB: {
    code: "GB",
    country: "United Kingdom",
    framework:
      "Applicable national building regulations and Approved Document A, with the relevant UK-adopted structural Eurocodes (BS EN 1990/1992) and UK National Annexes",
    verifiedSource:
      "https://www.gov.uk/government/publications/structure-approved-document-a",
    sourceLabel: "GOV.UK Approved Document A: Structure (England)",
    localScope:
      "Building-regulation regimes differ across England, Wales, Scotland, and Northern Ireland; confirm the applicable national documents, current standards, and National Annex for the project.",
    calculationStatus: "reference_only",
  },
  CA: {
    code: "CA",
    country: "Canada",
    framework:
      "National Building Code of Canada (NBC) published by NRC, and referenced structural standards including CSA A23.3 (Design of Concrete Structures)",
    verifiedSource:
      "https://nrc.canada.ca/en/certifications-evaluations-standards/codes-canada/codes-canada-publications/national-building-code-canada-2020",
    sourceLabel: "National Research Council Canada - NBC 2020",
    localScope:
      "Provinces and territories adopt and amend model codes independently (e.g., BC Building Code, Ontario Building Code). Confirm provincial amendments and municipal bylaws.",
    calculationStatus: "reference_only",
  },
  AU: {
    code: "AU",
    country: "Australia",
    framework:
      "National Construction Code (NCC), relevant structural provisions and referenced Australian Standards, including applicable editions of AS/NZS 1170 and AS 3600",
    verifiedSource:
      "https://ncc.abcb.gov.au/ncc-2025/ncc-2025-state-and-territory-adoption-information",
    sourceLabel: "ABCB NCC 2025 State and Territory Adoption Information",
    localScope:
      "NCC adoption and transition dates differ by state and territory, and local variations apply. Confirm the jurisdiction, building class, operative NCC edition, and referenced standard editions.",
    calculationStatus: "reference_only",
  },
  DE: {
    code: "DE",
    country: "Germany",
    framework:
      "Musterbauordnung (MBO) and Landesbauordnungen (LBO); Eurocode 2 (DIN EN 1992-1-1 with German National Annex) as published by DIBt",
    verifiedSource:
      "https://www.dibt.de/de/wir-bieten/technische-baubestimmungen",
    sourceLabel:
      "Deutsches Institut für Bautechnik (DIBt) - Technische Baubestimmungen",
    localScope:
      "Building regulations are state law (Landesbauordnung). Verify the Muster-Verwaltungsvorschrift Technische Baubestimmungen (MVV TB) implementation in the relevant federal state.",
    calculationStatus: "reference_only",
  },
  IN: {
    code: "IN",
    country: "India",
    framework:
      "National Building Code of India (NBC 2016) by Bureau of Indian Standards (BIS); IS 456 (Plain and Reinforced Concrete) and IS 1893 (Earthquake Resistance)",
    verifiedSource: "https://www.standardsbis.in/",
    sourceLabel:
      "Bureau of Indian Standards (BIS) - National Building Code of India",
    localScope:
      "States and municipal corporations adopt NBC provisions into local building bye-laws and development control rules. Confirm municipal bye-laws and current seismic zone mapping.",
    calculationStatus: "reference_only",
  },
  GH: {
    code: "GH",
    country: "Ghana",
    framework:
      "Ghana Building Code (GhBC GS 1207:2018) developed by the Ghana Standards Authority (GSA) and Ministry of Works and Housing",
    verifiedSource: "https://www.gsa.gov.gh/",
    sourceLabel:
      "Ghana Standards Authority (GSA) - Ghana Building Code GS 1207:2018",
    localScope:
      "Enforced by Metropolitan, Municipal, and District Assemblies (MMDAs). Verify local planning permit conditions and engineering certification requirements.",
    calculationStatus: "reference_only",
  },
  KE: {
    code: "KE",
    country: "Kenya",
    framework:
      "National Building Code of Kenya, National Construction Authority (NCA) regulations, and Kenya Bureau of Standards (KEBS) adopted structural standards (KS Eurocodes)",
    verifiedSource: "https://nca.go.ke/",
    sourceLabel:
      "National Construction Authority (NCA) Kenya - Building Regulatory Framework",
    localScope:
      "Projects require formal project registration with the NCA and county government approvals (e.g., Nairobi City County development control). Verify county planning regulations.",
    calculationStatus: "reference_only",
  },
  ZA: {
    code: "ZA",
    country: "South Africa",
    framework:
      "National Building Regulations and Building Standards Act (Act 103 of 1977); SANS 10400 and SANS 10100 (Structural Use of Concrete)",
    verifiedSource: "https://www.sabs.co.za/",
    sourceLabel: "South African Bureau of Standards (SABS) - SANS 10400",
    localScope:
      "All construction must comply with SANS 10400 deemed-to-satisfy rules or rational assessment by a registered Professional Engineer (Pr.Eng) with local municipal council approval.",
    calculationStatus: "reference_only",
  },
  JP: {
    code: "JP",
    country: "Japan",
    framework:
      "Building Standard Law of Japan (Kenchi-ku Kijun-hō) and Cabinet Orders, administered by the Ministry of Land, Infrastructure, Transport and Tourism (MLIT)",
    verifiedSource:
      "https://www.mlit.go.jp/en/jutakutotin/jutakutotin_fr_000007.html",
    sourceLabel: "MLIT Japan - Building Standard Law Overview",
    localScope:
      "Strict seismic design standards (Shin-Taishin standard) and local designated administrative agency approvals apply. Review by a certified structural architect (Kozo Sekkei Ikkyu Kenchikushi) is mandatory.",
    calculationStatus: "reference_only",
  },
  FR: {
    code: "FR",
    country: "France",
    framework:
      "Code de la construction et de l'habitation (CCH); Eurocodes (NF EN 1990/1992) with French National Annexes, DTU, and CSTB technical regulations",
    verifiedSource:
      "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006074096/",
    sourceLabel: "Légifrance - Code de la construction et de l'habitation",
    localScope:
      "Check French national annexes (NF EN 1992-1-1/NA), seismic zoning decrees, DTU specifications, and statutory ten-year decennial liability (garantie décennale) requirements.",
    calculationStatus: "reference_only",
  },
  BR: {
    code: "BR",
    country: "Brazil",
    framework:
      "Normas da Associação Brasileira de Normas Técnicas (ABNT), notably ABNT NBR 6118 (Projeto de estruturas de concreto - Procedimento)",
    verifiedSource: "https://www.abnt.org.br/",
    sourceLabel: "Associação Brasileira de Normas Técnicas (ABNT) - NBR 6118",
    localScope:
      "Structural designs require an Anotação de Responsabilidade Técnica (ART) registered with the regional CREA/CONFEA council, complying with municipal building codes (Código de Obras).",
    calculationStatus: "reference_only",
  },
  SA: {
    code: "SA",
    country: "Saudi Arabia",
    framework:
      "Saudi Building Code (SBC), administered by the Saudi Building Code National Committee (SBCNC), notably SBC 304 (Structural - Concrete)",
    verifiedSource: "https://sbc.gov.sa/en/Pages/default.aspx",
    sourceLabel:
      "Saudi Building Code National Committee (SBCNC) - SBC Framework",
    localScope:
      "Mandatory nationwide implementation across all building classes. Municipal (Balady) permits require verified compliance with applicable SBC regulations and licensed consultant sign-off.",
    calculationStatus: "reference_only",
  },
  AE: {
    code: "AE",
    country: "United Arab Emirates",
    framework:
      "UAE Building Code / Dubai Building Code / Abu Dhabi International Building Code (ADIBC), referencing IBC, ACI 318, and BS EN standards",
    verifiedSource:
      "https://www.dm.gov.ae/wp-content/uploads/2021/01/Dubai-Building-Code-English.pdf",
    sourceLabel: "Dubai Municipality - Dubai Building Code",
    localScope:
      "Regulations and structural design circulars vary by Emirate (Dubai Municipality, Abu Dhabi DMT, Sharjah Municipality, and free zones). Verify local municipal circulars.",
    calculationStatus: "reference_only",
  },
  CN: {
    code: "CN",
    country: "China",
    // Verified 2026-10-31 against the announcement's own wording: MOHURD
    // Announcement 2024 No. 62 (24 April 2024) approved the partial revision,
    // renamed GB 50010-2010 to GB/T 50010-2010 and moved the effective date to
    // 1 August 2024. Because the design standard is now a GB/T (recommended)
    // document, the binding concrete requirements sit in the mandatory
    // GB 55008-2021 通用规范, which is why both are named here.
    framework:
      "GB/T 50010-2010 混凝土结构设计标准 (Standard for Design of Concrete Structures), 2024 partial revision under MOHURD Announcement No. 62 of 24 April 2024, effective 1 August 2024, read together with the mandatory GB 55008-2021 混凝土结构通用规范 (General Code for Concrete Structures, effective 1 April 2022)",
    verifiedSource:
      "https://www.mohurd.gov.cn/gongkai/zhengce/zhengcefilelib/202110/20211013_762454.html",
    sourceLabel:
      "MOHURD: GB 55008-2021 general code, with Announcement 2024 No. 62",
    localScope:
      "The 2024 revision re-designated GB 50010-2010 as GB/T 50010-2010, so the design standard is now recommended rather than mandatory: the binding requirements are in GB 55008-2021 and in the project's 施工图审查 (construction drawing review) rules. Confirm the applicable edition and any provincial requirements with the project authority.",
    calculationStatus: "reference_only",
  },
  ID: {
    code: "ID",
    country: "Indonesia",
    framework:
      "Standar Nasional Indonesia (SNI), notably SNI 2847:2019 (Persyaratan Beton Struktural) and SNI 1726 (Tata Cara Perencanaan Ketahanan Gempa)",
    verifiedSource: "https://bsn.go.id/",
    sourceLabel: "Badan Standardisasi Nasional (BSN) & Kementerian PUPR",
    localScope:
      "Construction permits (PBG/SIMBG) require review by the local building expert team (TABG) and compliance with Kementerian PUPR regulations and local seismic zones.",
    calculationStatus: "reference_only",
  },
  MX: {
    code: "MX",
    country: "Mexico",
    framework:
      "Reglamento de Construcciones para el Distrito Federal (RCDF) with Normas Técnicas Complementarias (NTC), and applicable state building codes across Mexico",
    verifiedSource:
      "https://www.smie.org.mx/informacion-tecnica/normas-tecnicas-complementarias.php",
    sourceLabel:
      "Normas Técnicas Complementarias (NTC) para Diseño y Construcción",
    localScope:
      "High seismic hazard requires compliance with NTC-Sismo and NTC-Concreto. Certification by a registered Corresponsable en Seguridad Estructural (CSE) is legally required in major municipalities.",
    calculationStatus: "reference_only",
  },
  KR: {
    code: "KR",
    country: "South Korea",
    framework:
      "Korea Design Standard (KDS), including KDS 41 20 00 (Architectural Structural Design Standard) and KDS 14 20 00 (Concrete Structure Design)",
    verifiedSource: "https://www.kcsc.re.kr/",
    sourceLabel: "Korea Construction Standards Center (KCSC) - MOLIT",
    localScope:
      "Enforced under the Building Act by the Ministry of Land, Infrastructure and Transport (MOLIT). Structural calculations require certification by a registered Professional Engineer (KPEA).",
    calculationStatus: "reference_only",
  },
  IT: {
    code: "IT",
    country: "Italy",
    framework:
      "Norme Tecniche per le Costruzioni (NTC 2018), approved by Ministerial Decree 17 January 2018, with applicable circulars and national provisions",
    verifiedSource:
      "https://www.gazzettaufficiale.it/do/atto/serie_generale/caricaPdf?art.codiceRedazionale=18A00716&art.dataPubblicazioneGazzetta=2018-02-20&art.num=1&art.tiposerie=SG&cdimg=18A0071600100010110001&dgu=2018-02-20",
    sourceLabel: "Gazzetta Ufficiale: NTC 2018",
    localScope:
      "Confirm current amendments, application instructions, seismic classification, project category, and authority requirements for the site.",
    calculationStatus: "reference_only",
  },
  ET: {
    code: "ET",
    country: "Ethiopia",
    framework:
      "Ethiopian Building Proclamation (No. 624/2009) and Ethiopian Standards (ES EN Eurocode-based structural standards)",
    verifiedSource: "https://www.ethiostandards.org/",
    sourceLabel:
      "Ethiopian Standards Agency (ESA) & Ministry of Urban Development",
    localScope:
      "Enforced by municipal building authorities (e.g. Addis Ababa Construction Permit Bureau). Engineering designs must be submitted by registered consulting structural engineers.",
    calculationStatus: "reference_only",
  },
  EG: {
    code: "EG",
    country: "Egypt",
    framework:
      "Egyptian Code of Practice for the Design and Construction of Concrete Structures (ECP 203) issued by the Housing and Building National Research Center (HBRC)",
    verifiedSource: "http://www.hbrc.edu.eg/",
    sourceLabel:
      "Housing and Building National Research Center (HBRC) - ECP 203",
    localScope:
      "Building permits under Unified Building Law No. 119 of 2008 require compliance with Egyptian codes (ECP 203, ECP 201) and review by licensed syndicate consultant engineers.",
    calculationStatus: "reference_only",
  },
  TZ: {
    code: "TZ",
    country: "Tanzania",
    framework:
      "Tanzania Building Regulations, Engineers Registration Board (ERB) guidelines, and Tanzania Bureau of Standards (TBS) adopted structural specifications",
    verifiedSource: "https://www.erb.go.tz/",
    sourceLabel:
      "Engineers Registration Board (ERB) & National Construction Council",
    localScope:
      "Local government authorities (LGAs) and city councils require structural calculations stamped by an ERB-registered professional engineer.",
    calculationStatus: "reference_only",
  },
  CI: {
    code: "CI",
    country: "Côte d'Ivoire",
    framework:
      "Code de la Construction de Côte d'Ivoire (Loi n° 2019-576) and technical regulations defined by the Ministère de la Construction, du Logement et de l'Urbanisme (MCLU)",
    verifiedSource: "https://construction.gouv.ci/",
    sourceLabel:
      "Ministère de la Construction, du Logement et de l'Urbanisme (MCLU)",
    localScope:
      "Permis de construire requires technical review by an authorized control bureau (bureau de contrôle) and submission by an engineer registered with the Ordre des Ingénieurs.",
    calculationStatus: "reference_only",
  },
  ES: {
    code: "ES",
    country: "Spain",
    framework:
      "Código Técnico de la Edificación (CTE - Real Decreto 314/2006) and the Código Estructural (Real Decreto 470/2021) for concrete and steel structures",
    verifiedSource: "https://www.codigotecnico.org/",
    sourceLabel:
      "Ministerio de Vivienda y Agenda Urbana - Código Técnico de la Edificación",
    localScope:
      "Structural projects require formal visa (visado colegial) from the relevant official engineering college (Colegio de Ingenieros) and municipal town hall verification.",
    calculationStatus: "reference_only",
  },
  NL: {
    code: "NL",
    country: "Netherlands",
    framework:
      "Besluit bouwwerken leefomgeving (BBL) under the Omgevingswet; NEN-EN 1990 / NEN-EN 1992 (Eurocode 2) with Dutch National Annexes",
    verifiedSource:
      "https://iplo.nl/regelgeving/regels-voor-activiteiten/bouwactiviteit/",
    sourceLabel:
      "Informatiepunt Leefomgeving (IPLO) - Besluit bouwwerken leefomgeving",
    localScope:
      "Quality assurance under the Wet kwaliteitsborging voor het bouwen (Wkb) requires appointed quality controllers (kwaliteitsborger) to verify construction compliance.",
    calculationStatus: "reference_only",
  },
  PL: {
    code: "PL",
    country: "Poland",
    framework:
      "Ustawa Prawo Budowlane and the Rozporządzenie w sprawie warunków technicznych; Polskie Normy (PN-EN 1992 Eurocode series)",
    verifiedSource: "https://www.gunb.gov.pl/",
    sourceLabel: "Główny Urząd Nadzoru Budowlanego (GUNB) - Prawo Budowlane",
    localScope:
      "Structural projects require verification and approval by engineers licensed with the Polska Izba Inżynierów Budownictwa (PIIB) with full structural qualifications.",
    calculationStatus: "reference_only",
  },
  SE: {
    code: "SE",
    country: "Sweden",
    framework:
      "Plan- och bygglagen (PBL); Boverkets byggregler (BBR) and Boverkets konstruktionsregler (EKS / BFS) implementing Eurocodes with Swedish national choices",
    verifiedSource:
      "https://www.boverket.se/sv/byggande/regler-for-byggande/om-boverkets-konstruktionsregler-eks/",
    sourceLabel: "Boverket - Europeiska konstruktionsstandarder (EKS)",
    localScope:
      "Building permits (bygglov) and start notices (startbesked) require an appointed certified inspection manager (kontrollansvarig) and municipal building committee approval.",
    calculationStatus: "reference_only",
  },
  CH: {
    code: "CH",
    country: "Switzerland",
    framework:
      "Schweizerischer Ingenieur- und Architektenverein (SIA Normen), notably SIA 260 (Basis of structural design) and SIA 262 (Concrete structures)",
    verifiedSource: "https://www.sia.ch/de/dienstleistungen/sia-normen/",
    sourceLabel: "Schweizerischer Ingenieur- und Architektenverein (SIA)",
    localScope:
      "Cantonal building and planning laws (Kantonale Baugesetze) govern permits. Compliance with SIA structural standards is standard in Swiss construction law.",
    calculationStatus: "reference_only",
  },
  SG: {
    code: "SG",
    country: "Singapore",
    framework:
      "Building Control Act & Regulations; Approved Document by Building and Construction Authority (BCA), implementing Singapore Eurocodes (SS EN 1992)",
    verifiedSource:
      "https://www.bca.gov.sg/regulatory-info/building-control/approved-document",
    sourceLabel:
      "Building and Construction Authority (BCA) - Approved Document",
    localScope:
      "Mandatory submission of structural plans and calculations by a registered Qualified Person (PE/QP Structural) and approval by BCA before works commence.",
    calculationStatus: "reference_only",
  },
  TR: {
    code: "TR",
    country: "Türkiye",
    framework:
      "Türkiye Bina Deprem Yönetmeliği (TBDY 2018) and TS 500 (Betonarme Yapıların Tasarım ve Yapım Kuralları), Ministry of Environment, Urbanisation and Climate Change",
    verifiedSource:
      "https://webdosya.csb.gov.tr/db/ced/icerikler/tbdy-2018-20190204100508.pdf",
    sourceLabel: "Resmî Gazete - Türkiye Bina Deprem Yönetmeliği (TBDY 2018)",
    localScope:
      "Strict seismic engineering rules apply across earthquake risk zones. Plans must be signed by an authorized civil engineer registered with IMO and approved by building inspection companies.",
    calculationStatus: "reference_only",
  },
  NZ: {
    code: "NZ",
    country: "New Zealand",
    framework:
      "New Zealand Building Code (NZBC) Clause B1 Structure, Verification Method B1/VM1, and referenced standards including NZS 3101 and NZS 1170.5",
    verifiedSource:
      "https://www.building.govt.nz/building-code-compliance/b-stability/b1-structure/",
    sourceLabel: "Building Performance MBIE - NZBC Clause B1 Structure",
    localScope:
      "High seismic zone regulations apply nationwide. Building consent requires Producer Statements (PS1 design) signed by a Chartered Professional Engineer (CPEng).",
    calculationStatus: "reference_only",
  },
};

/**
 * Resolves the structural regulatory scope for any given market code.
 * If the market code is one of the 32 built-in markets, the curated national code reference is returned.
 * If a future or unrecognized market code is supplied, a dynamic statutory framework scope is
 * automatically generated so the user and reviewing engineer always receive actionable regulatory guidance.
 */
export function getStructuralJurisdictionScope(
  code?: string | null,
  countryName?: string | null,
): StructuralJurisdiction | null {
  const normalized = code?.trim().toUpperCase();
  const trimmedName = countryName?.trim();

  if (!normalized && !trimmedName) return null;

  if (normalized && normalized in STRUCTURAL_JURISDICTION_SCOPE) {
    return STRUCTURAL_JURISDICTION_SCOPE[
      normalized as StructuralJurisdictionCode
    ];
  }

  // Future market dynamic resolution:
  // Automatically generates a regulatory disclosure for any future market added to FRELUX.
  const resolvedCode = normalized || "FUTURE";
  const resolvedCountry =
    trimmedName || (normalized ? `Market (${normalized})` : "Local Market");

  return {
    code: resolvedCode,
    country: resolvedCountry,
    framework: `Statutory building regulations, municipal building bylaws, and adopted concrete/structural design standards governing ${resolvedCountry}`,
    verifiedSource: "https://www.iso.org/standards.html",
    sourceLabel: `National Standards Authority & Building Regulatory Body (${resolvedCountry})`,
    localScope: `Confirm current statutory building legislation, mandatory design standard editions (e.g. Eurocode, ACI, or national standard), seismic/environmental parameters, and municipal authority requirements for ${resolvedCountry}. Independent review and sign-off by a locally registered professional engineer is mandatory before design or construction use.`,
    calculationStatus: "reference_only",
    isDynamicFallback: true,
  };
}
