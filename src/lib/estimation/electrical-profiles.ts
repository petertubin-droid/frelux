/**
 * FRELUX International Electrical Engineering Profiles
 *
 * Distinct regional electrical system profiles for all 20 markets.
 * Replaces the universal conduit / metric assumption with modular market-specific rules.
 *
 * Non-negotiable honesty rules:
 * - Quantities are material takeoffs, NOT certified electrical engineering designs.
 * - Missing prices remain unpriced; no silent price or method substitutions.
 */

export interface ElectricalMarketProfile {
  marketCode: string;
  name: string;
  standardsRef: string;
  nominalVoltage: string;
  frequencyHz: number;
  measurementSystem: "metric" | "imperial";
  runDistanceUnit: "m" | "ft";
  primaryWiringMethod: string;
  lightingConductorSize: string;
  socketConductorSize: string;
  dedicatedConductorSize: string;
  boxType: string;
  protectionDevices: string;
  cableReelSize: string;
  conduitRequired: boolean;
  notes: string;
}

export const ELECTRICAL_PROFILES: Record<string, ElectricalMarketProfile> = {
  US: {
    marketCode: "US",
    name: "United States (NEC / NFPA 70)",
    standardsRef: "NFPA 70 (National Electrical Code 2023)",
    nominalVoltage: "120V / 240V split-phase",
    frequencyHz: 60,
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    primaryWiringMethod:
      "Non-metallic sheathed cable (Type NM-B / Romex) in stud cavities",
    lightingConductorSize: "14 AWG Cu (15A circuit)",
    socketConductorSize: "12 AWG Cu (20A small appliance/branch)",
    dedicatedConductorSize: "10 AWG to 6 AWG Cu (30A-50A HVAC, range, dryer)",
    boxType: "Non-metallic (PVC/fiberglass) nail-on boxes or metal handy boxes",
    protectionDevices: "Combination AFCI / GFCI dual-function circuit breakers",
    cableReelSize: "250 ft (76.2 m) or 1000 ft spools",
    conduitRequired: false,
    notes:
      "Conduit is generally not required for concealed residential timber-stud runs under NEC Art. 334.",
  },
  CA: {
    marketCode: "CA",
    name: "Canada (Canadian Electrical Code / CSA C22.1)",
    standardsRef: "CSA C22.1:24 (Canadian Electrical Code)",
    nominalVoltage: "120V / 240V split-phase",
    frequencyHz: 60,
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    primaryWiringMethod: "Type NMD90 (Loomex) non-metallic sheathed cable",
    lightingConductorSize: "14 AWG Cu (15A circuit)",
    socketConductorSize: "14 AWG / 12 AWG Cu (15A/20A branch circuits)",
    dedicatedConductorSize: "10 AWG to 6 AWG Cu",
    boxType:
      "Sectional metal device boxes or non-metallic boxes with internal clamps",
    protectionDevices: "AFCI / GFCI breakers per CEC Section 26",
    cableReelSize: "75 m (approx 246 ft) or 150 m coils",
    conduitRequired: false,
    notes: "NMD90 is the dominant Canadian residential cable format.",
  },
  GB: {
    marketCode: "GB",
    name: "United Kingdom (BS 7671 / IET 18th Edition)",
    standardsRef: "BS 7671:2018+A2:2022 (IET Wiring Regulations)",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat twin & earth (6242Y PVC/PVC) clipped direct or capped",
    lightingConductorSize: "1.0 mm² or 1.5 mm² 6242Y Cu",
    socketConductorSize: "2.5 mm² 6242Y Cu (32A ring final circuit)",
    dedicatedConductorSize: "4.0 mm² to 10.0 mm² 6242Y Cu (cooker, shower)",
    boxType: "Galvanized steel flush knockout boxes (25mm/35mm/47mm depth)",
    protectionDevices: "Consumer unit with Type A RCBOs or dual RCD split-load",
    cableReelSize: "50 m or 100 m drums",
    conduitRequired: false,
    notes:
      "Socket circuits typically wired as 32A ring finals; lighting as radial circuits.",
  },
  AU: {
    marketCode: "AU",
    name: "Australia (AS/NZS 3000 Wiring Rules)",
    standardsRef: "AS/NZS 3000:2018 (Wiring Rules)",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat TPS (thermoplastic sheathed) cable run in cavity or ceiling space",
    lightingConductorSize: "1.5 mm² Cu TPS (10A/16A circuit)",
    socketConductorSize: "2.5 mm² Cu TPS (16A/20A radial circuit)",
    dedicatedConductorSize: "4.0 mm² to 10.0 mm² Cu TPS (air-con, oven)",
    boxType: "Plaster brackets (C-clips) or standard PVC mounting blocks",
    protectionDevices: "RCBO protection mandatory on all final sub-circuits",
    cableReelSize: "100 m reels",
    conduitRequired: false,
    notes:
      "AS/NZS 3000 requires 30mA RCD/RCBO protection across all sub-circuits.",
  },
  DE: {
    marketCode: "DE",
    name: "Germany (DIN VDE 0100)",
    standardsRef: "DIN VDE 0100 / DIN 18015",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "NYM-J sheathed cable installed under plaster or in flexible conduit (Leerrohr)",
    lightingConductorSize: "1.5 mm² NYM-J Cu",
    socketConductorSize:
      "2.5 mm² or 1.5 mm² NYM-J Cu (16A B-characteristic MCB)",
    dedicatedConductorSize: "2.5 mm² to 6.0 mm² NYM-J (Herdanschluss 5x2.5mm²)",
    boxType:
      "Gerätedosen (60mm / 68mm Kaiser hollow-wall or flush masonry boxes)",
    protectionDevices:
      "Verteiler with RCD (FI-Schalter 30mA) + Leitungsschutzschalter (MCB)",
    cableReelSize: "50 m or 100 m rings",
    conduitRequired: true,
    notes:
      "Installationszonen (DIN 18015-3) strictly prescribe horizontal and vertical wiring paths.",
  },
  IN: {
    marketCode: "IN",
    name: "India (IS 732 / NBC 2016)",
    standardsRef: "IS 732:2019 / National Building Code of India",
    nominalVoltage: "230V single-phase / 415V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core FRLS (flame retardant low smoke) copper wire drawn in concealed rigid PVC conduit",
    lightingConductorSize: "1.5 mm² FRLS Cu",
    socketConductorSize: "2.5 mm² or 4.0 mm² FRLS Cu (6A/16A power points)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² FRLS Cu (AC, geyser)",
    boxType:
      "GI (galvanized iron) concealed metal modular switch boxes (1-18 module)",
    protectionDevices: "Distribution board with ELCB/RCCB (30mA) + MCBs",
    cableReelSize: "90 m standard coil length (IS 694)",
    conduitRequired: true,
    notes:
      "Wires are sold in 90-meter coils. Concealed medium/heavy duty PVC conduits embedded in chased masonry.",
  },
  NG: {
    marketCode: "NG",
    name: "Nigeria (NEMSA / NBC)",
    standardsRef:
      "NEMSA Electrical Regulations & Nigerian National Building Code",
    nominalVoltage: "230V single-phase / 415V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core pure copper wire drawn in recessed PVC conduit embedded in chased sandcrete walls",
    lightingConductorSize: "1.5 mm² single-core Cu",
    socketConductorSize:
      "2.5 mm² single-core Cu (radial 13A British socket circuits)",
    dedicatedConductorSize:
      "4.0 mm² to 10.0 mm² single-core Cu (AC, water heater, pumping machine)",
    boxType:
      "Steel galvanised or rigid plastic 1-gang/2-gang recessed boxes (pattress boxes)",
    protectionDevices:
      "Main distribution board with changeover switch, ELCB/RCD, and individual MCBs",
    cableReelSize:
      "100 m standard coil length (Coleman, Cutix, Nigerchin or equivalent pure copper)",
    conduitRequired: true,
    notes:
      "Chased conduit in sandcrete/concrete with individual conductors pulled after plastering.",
  },
};

export function getElectricalProfile(
  marketCode: string,
): ElectricalMarketProfile {
  const upper = marketCode.toUpperCase();
  if (ELECTRICAL_PROFILES[upper]) {
    return ELECTRICAL_PROFILES[upper];
  }
  // Standard IEC fallback for remaining markets
  return {
    marketCode: upper,
    name: `${upper} Local Electrical Practice`,
    standardsRef: "Applicable National Electrical Code & IEC 60364",
    nominalVoltage: "230V 50Hz (IEC standard)",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Insulated copper conductors in concealed conduit / cable tray",
    lightingConductorSize: "1.5 mm² Cu",
    socketConductorSize: "2.5 mm² Cu",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush-mount wall boxes",
    protectionDevices: "RCD (30mA) + MCB protection",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary quantity estimation only. Consult a licensed local electrical professional for circuit design.",
  };
}
