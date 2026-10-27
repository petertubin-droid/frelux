/**
 * FRELUX International Electrical Engineering Profiles
 *
 * Distinct regional electrical system profiles for all 32 markets.
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
  GH: {
    marketCode: "GH",
    name: "Ghana (Energy Commission / L.I. 2008)",
    standardsRef:
      "Ghana Electrical Wiring Regulations (L.I. 2008) & GS IEC 60364",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core PVC insulated copper conductors drawn into surface or concealed rigid high-impact PVC conduit",
    lightingConductorSize: "1.5 mm² Cu (10A circuit)",
    socketConductorSize:
      "2.5 mm² Cu (radial or ring branch to BS 1363 13A outlets)",
    dedicatedConductorSize:
      "4.0 mm² to 6.0 mm² Cu (A/C units, cooker units, water heaters)",
    boxType:
      "BS 4662 standard 3x3 inch galvanised steel knock-out boxes or PVC surface boxes",
    protectionDevices:
      "Type B/C MCBs with 30mA RCD / RCBO main incomer protection",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Certified Electrical Wiring Practitioner (CEWP) licensed by Energy Commission Ghana is legally required for installation and meter commissioning.",
  },
  KE: {
    marketCode: "KE",
    name: "Kenya (EPRA / KS IEC 60364)",
    standardsRef: "Energy Act 2019, KS IEC 60364 & BS 7671 (IET 18th Edition)",
    nominalVoltage: "240V single-phase / 415V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core PVC insulated copper cables drawn into heavy-gauge PVC conduit embedded in masonry walls and concrete slabs",
    lightingConductorSize: "1.5 mm² Cu (10A breaker)",
    socketConductorSize: "2.5 mm² Cu (32A ring circuit or 20A radial circuit)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Instant showers), 6.0 mm² Cu (cooker / master DB)",
    boxType: "Galvanised metal back boxes (BS 4662) with brass earth terminal",
    protectionDevices:
      "Consumer unit with 100A double-pole isolator, 30mA RCD, and MCBs",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Installation must be carried out by an EPRA (Energy and Petroleum Regulatory Authority) licensed electrician.",
  },
  ZA: {
    marketCode: "ZA",
    name: "South Africa (SANS 10142-1)",
    standardsRef:
      "SANS 10142-1 (The Wiring of Premises Part 1: Low-voltage installations)",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat twin and earth (Surfix) clipped directly, or GP single-core wire in PVC / Bosch conduit",
    lightingConductorSize: "1.5 mm² Cu (10A / 16A breaker)",
    socketConductorSize:
      "2.5 mm² Cu (20A circuit feeding SANS 164-1 16A and SANS 164-2 sockets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Geyser / water heater), 6.0 mm² Cu (Stove / Hob)",
    boxType:
      "100 x 50 mm and 100 x 100 mm galvanized steel / PVC switch and socket boxes",
    protectionDevices:
      "Distribution board with 63A main switch, 30mA Earth Leakage Relay (ELR/RCD), and curve-1 / curve-2 MCBs",
    cableReelSize: "100 m roll",
    conduitRequired: false,
    notes:
      "Preliminary takeoff only. Mandatory Certificate of Compliance (CoC) issued by an accredited Department of Labour registered electrical contractor is legally required.",
  },
  JP: {
    marketCode: "JP",
    name: "Japan (DENAN Law / JIS C 8305)",
    standardsRef:
      "Electrical Appliance and Material Safety Law (DENAN), JIS C 8305 & JIS C 3342",
    nominalVoltage:
      "100V single-phase (100V/200V split-phase for air conditioners)",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flat vinyl insulated vinyl sheathed cable (Type VVF 600V) stapled directly inside timber post-and-beam frame cavities",
    lightingConductorSize: "1.6 mm solid copper conductor (15A circuit)",
    socketConductorSize:
      "2.0 mm solid copper conductor (20A branch circuit for 100V Type A/B JIS outlets)",
    dedicatedConductorSize:
      "2.6 mm solid or 5.5 mm² stranded Cu (200V high-capacity heat pump / induction cooker)",
    boxType:
      "Synthetic resin modular switch boxes (JIS C 8435) with slide-in brackets",
    protectionDevices:
      "Residential distribution board with high-speed earth leakage breaker (ELB 30mA) and 20A compact branch breakers",
    cableReelSize: "100 m coil",
    conduitRequired: false,
    notes:
      "Preliminary takeoff only. Low voltage 100V systems require higher amperage conductors (solid 1.6mm/2.0mm) to minimize voltage drop. Licensed Electrician (Dai-ni-shu Denki Kojishi) is mandatory.",
  },
  FR: {
    marketCode: "FR",
    name: "France (NF C 15-100)",
    standardsRef:
      "Norme NF C 15-100 (Installations électriques à basse tension)",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Rigid single-core H07V-U conductors pre-drawn in corrugated ICTA conduit (gaine ICTA) embedded in screed, partitions, or suspended ceilings",
    lightingConductorSize:
      "1.5 mm² Cu (Disjoncteur 16A, max 8 socles/points lumineux par circuit)",
    socketConductorSize:
      "2.5 mm² Cu (Disjoncteur 20A, max 12 prises de courant Type E)",
    dedicatedConductorSize:
      "2.5 mm² Cu (four, lave-vaisselle, lave-linge), 6.0 mm² Cu (plaque de cuisson 32A)",
    boxType:
      "Boîtes d'encastrement étanches à l'air (RT2012 / RE2020) type Batibox Ø67 mm",
    protectionDevices:
      "Tableau électrique avec interrupteurs différentiels 30mA (Type AC et Type A obligatoire) et disjoncteurs divisionnaires phase+neutre",
    cableReelSize: "100 m couronne",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Attestation de conformité Consuel (Comité National pour la Sécurité des Usagers de l'Électricité) is mandatory before ENEDIS grid connection.",
  },
  BR: {
    marketCode: "BR",
    name: "Brazil (ABNT NBR 5410)",
    standardsRef: "ABNT NBR 5410 (Instalações elétricas de baixa tensão)",
    nominalVoltage: "127V / 220V (regional dual voltage) 60Hz",
    frequencyHz: 60,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Flexible thermoplastic copper conductors (Cabo flexível 750V / 1000V) drawn in yellow/orange corrugated PVC conduit (Eletroduto corrugado flexível)",
    lightingConductorSize: "1.5 mm² Cu (Disjuntor 10A / 15A)",
    socketConductorSize:
      "2.5 mm² Cu (Tomadas de Uso Geral - TUG 10A / 20A per NBR 14136)",
    dedicatedConductorSize:
      "4.0 mm² ou 6.0 mm² Cu (Tomadas de Uso Específico - TUE, especialmente Chuveiro Elétrico 5500W-7500W)",
    boxType:
      "Caixas de embutir 4x2 polegadas e 4x4 polegadas termoplásticas amarelas",
    protectionDevices:
      "Quadro de distribuição com disjuntor geral DIN, dispositivo DR (Diferencial Residual 30mA) e DPS (Dispositivo de Proteção contra Surtos)",
    cableReelSize: "100 m rolo",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Dual 127V/220V regional systems require explicit circuit separation. High current draws for electric showers (chuveiro elétrico) require dedicated 4-6 mm² circuits.",
  },
  SA: {
    marketCode: "SA",
    name: "Saudi Arabia (SBC 401 / SASO)",
    standardsRef:
      "Saudi Building Code (SBC 401 Electrical) & SASO 2203 / IEC 60364",
    nominalVoltage: "220V / 380V (or updated 230V / 400V) 60Hz",
    frequencyHz: 60,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core PVC or XLPE insulated flame retardant copper wire pulled through rigid heavy-duty PVC or EMT conduits",
    lightingConductorSize: "2.5 mm² Cu (16A MCB)",
    socketConductorSize:
      "4.0 mm² Cu (20A / 32A circuit feeding SASO 2203 / BS 1363 13A shuttered receptacles)",
    dedicatedConductorSize:
      "6.0 mm² Cu (High ambient temperature split A/C units and water heaters)",
    boxType:
      "BS standard 75 x 75 mm galvanized steel back boxes with brass terminal lug",
    protectionDevices:
      "Main distribution board with 100A main circuit breaker, 30mA ELCB / RCD, and thermal-magnetic MCBs",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Due to extreme ambient temperatures (>50°C), thermal derating factors are applied, mandating 2.5 mm² for lighting and 4.0 mm² for socket circuits.",
  },
  AE: {
    marketCode: "AE",
    name: "United Arab Emirates (DEWA / ADDC)",
    standardsRef:
      "DEWA Regulations for Electrical Installations & BS 7671 / IEC 60364",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Single-core copper conductors (Low Smoke Zero Halogen - LSZH / LSF 450/750V) drawn in rigid high-impact PVC conduits embedded in concrete",
    lightingConductorSize: "2.5 mm² Cu (10A / 16A MCB)",
    socketConductorSize:
      "4.0 mm² Cu (32A ring circuit or 20A radial circuit feeding BS 1363 Type G sockets)",
    dedicatedConductorSize:
      "6.0 mm² to 10.0 mm² Cu (Direct expansion A/C split units and kitchen appliances)",
    boxType:
      "Class 4 corrosion-resistant galvanized steel boxes (BS 4662) with grounding screw",
    protectionDevices:
      "Split-bus distribution board with separate 30mA RCDs for power sockets and 100mA/300mA for lighting and HVAC",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. High ambient temperature derating is mandatory. Installations require inspection and energization clearance by DEWA (Dubai) or ADDC (Abu Dhabi).",
  },
  CN: {
    marketCode: "CN",
    name: "China (GB 50054 / GB 50303)",
    standardsRef:
      "GB 50054 (Code for Design of Low Voltage Electrical) & GB 50303 (Acceptance Code)",
    nominalVoltage: "220V single-phase / 380V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "BV single-core copper wire (flame retardant ZR-BV or WDZ-BYJ low smoke halogen-free) inside rigid cold-bend PVC-U conduit",
    lightingConductorSize: "1.5 mm² Cu (ZR-BV 1.5, 16A breaker)",
    socketConductorSize:
      "2.5 mm² Cu (ZR-BV 2.5, 20A breaker for standard 10A 5-hole combined sockets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Air conditioners 16A dedicated sockets), 6.0 mm² Cu (Main kitchen / instant water heater)",
    boxType:
      "Standard 86-type (86 mm x 86 mm) flame-retardant PVC switch and socket junction boxes (86-xing an-zhuang-he)",
    protectionDevices:
      "Household consumer distribution box with 2P main miniature circuit breaker, 30mA residual current circuit breakers (RCCB), and 1P+N branch breakers",
    cableReelSize: "100 m coil (Zheng-pan 100m)",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. National standards strictly mandate 86-type boxes and flame-retardant conduit. Certified electrician holding MoHRSS qualification is required.",
  },
  ID: {
    marketCode: "ID",
    name: "Indonesia (PUIL 2011 / SNI 0225)",
    standardsRef:
      "Persyaratan Umum Instalasi Listrik (PUIL 2011) & SNI 0225:2011",
    nominalVoltage: "220V single-phase / 380V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "NYM cable (sheathed copper PVC) surface/clipped or NYA single-core copper wire inside rigid PVC conduit embedded in masonry",
    lightingConductorSize: "1.5 mm² Cu (NYA / NYM 1.5 mm², 10A MCB)",
    socketConductorSize:
      "2.5 mm² Cu (NYA / NYM 2.5 mm², 16A MCB for Schuko Type C/F grounded wall outlets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (AC split units and water heaters), 6.0 mm² Cu (Main intake from PLN kWh meter)",
    boxType: "Plastic inbow doos (junction box) for embedded flush mounting",
    protectionDevices:
      "Consumer unit box equipped with PLN-standard miniature circuit breakers (MCB) and 30mA Earth Leakage Circuit Breaker (ELCB)",
    cableReelSize: "50 m / 100 m roll",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Installations must comply with Perusahaan Listrik Negara (PLN) grid connection standards and Sertifikat Laik Operasi (SLO) certification.",
  },
  MX: {
    marketCode: "MX",
    name: "Mexico (NOM-001-SEDE-2018)",
    standardsRef:
      "NOM-001-SEDE-2018 (Instalaciones Eléctricas - Utilización) & NMX-J",
    nominalVoltage: "127V single-phase / 220V two-phase / 220V three-phase",
    frequencyHz: 60,
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    primaryWiringMethod:
      "THW-2-LS copper conductors drawn through flexible corrugated conduit (poliducto naranja / verde) or thin-wall metallic conduit (tubo conduit pared delgada)",
    lightingConductorSize: "14 AWG Cu (Interruptor termomagnético 15A)",
    socketConductorSize:
      "12 AWG Cu (Interruptor termomagnético 20A para contactos polarizados con tierra NEMA 5-15R)",
    dedicatedConductorSize:
      "10 AWG Cu (Aires acondicionados minisplit, microondas), 8 AWG Cu (Alimentador principal)",
    boxType:
      "Cajas metálicas galvanizadas cuadradas de 4x4 pulgadas con reducción a chalupa de 2x4 pulgadas",
    protectionDevices:
      "Centro de carga (Load center tipo QO) con interruptor principal y disyuntores termomagnéticos enchufables de 1 polo y 2 polos",
    cableReelSize: "100 m roll",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Uses North American AWG sizing and 127V 60Hz. Large voltage drop on long 127V circuits requires upsizing to 12 AWG minimum for all branch receptacles.",
  },
  KR: {
    marketCode: "KR",
    name: "South Korea (KEC / KS C)",
    standardsRef: "Korea Electro-technical Code (KEC 2021) & KS C IEC 60364",
    nominalVoltage: "220V single-phase / 380V three-phase",
    frequencyHz: 60,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "HFIX (Halogen-free flame retardant polyolefin cross-linked insulated wire 450/750V) pulled into CD (combustible synthetic resin) conduit embedded in slabs",
    lightingConductorSize:
      "1.5 mm² or 2.5 mm² Cu (HFIX 1.5/2.5 mm², 15A/20A breaker)",
    socketConductorSize:
      "2.5 mm² Cu (HFIX 2.5 mm², 20A circuit for Type F 16A flush safety outlets)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Induction cooktops, system air conditioners), 6.0 mm² Cu (Main distribution feeder)",
    boxType:
      "Steel / synthetic resin modular switch and outlet back boxes (Mae-ip-heung Sp-box)",
    protectionDevices:
      "Residential distribution panel equipped with main molded case circuit breaker (MCCB) and sensitive residual current breakers (ELB 30mA 0.03s)",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. KEC regulations require halogen-free HFIX wire in residential buildings to prevent toxic smoke in fire emergencies.",
  },
  IT: {
    marketCode: "IT",
    name: "Italy (CEI 64-8)",
    standardsRef:
      "Norma CEI 64-8 (Impianti elettrici utilizzatori a tensione nominale non superiore a 1000V)",
    nominalVoltage: "230V single-phase / 400V three-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Unipolar flexible copper wire FS18 / FG16 (CPR compliant) drawn inside corrugated PVC conduit (Tubo corrugato pieghevole) embedded in floors and walls",
    lightingConductorSize: "1.5 mm² Cu (Interruttore magnetotermico 10A)",
    socketConductorSize:
      "2.5 mm² Cu (Interruttore magnetotermico 16A per prese 10/16A Bipasso e Schuko tipo L/F)",
    dedicatedConductorSize:
      "4.0 mm² Cu (Climatizzatori, lavatrice), 6.0 mm² Cu (Piano cottura a induzione 32A)",
    boxType:
      "Scatole di derivazione e scatole portafrutti a 3 o 4 moduli tipo 503 / 504 per serie civili",
    protectionDevices:
      "Quadro elettrico con interruttore generale differenziale puro 30mA (Tipo A/F) e interruttori magnetotermici (MT 10A e 16A) separati luce/forza",
    cableReelSize: "100 m matassa",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Standard Italian Livello 1/2/3 classification per CEI 64-8. Mandatory Dichiarazione di Conformità (Di.Co.) per DM 37/08 is legally required.",
  },
  SG: {
    marketCode: "SG",
    name: "Singapore (SS 638 / Energy Market Authority)",
    standardsRef:
      "SS 638:2018 (formerly CP 5 - Code of practice for electrical installations) & SS 246",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "PVC insulated Cu cables (SS 358-3 / BS 6004) enclosed in surface or concealed high-impact uPVC/steel conduit",
    lightingConductorSize: "1.5 mm² single-core Cu in conduit (SS 358-3)",
    socketConductorSize:
      "2.5 mm² single-core Cu in conduit (typically 32A ring final or 20A radial)",
    dedicatedConductorSize:
      "4.0 mm² to 10.0 mm² Cu (air-con compressor, induction hob, storage water heater)",
    boxType:
      "Galvanized steel flush boxes or surface uPVC patress boxes (SS 246)",
    protectionDevices:
      "Consumer unit with 30mA Type A/AC RCCB and miniature circuit breakers (MCBs)",
    cableReelSize: "100 m coil",
    conduitRequired: true,
    notes:
      "Singapore EMA regulations mandate all concealed and surface residential wiring be drawn through conduit or trunking. HDB renovations strictly prohibit hacking of structural precast walls.",
  },

  // ── 2026-10-27 globalization wave: the final 11 markets get real,
  // standard-referenced electrical profiles (previously IEC fallback).
  // Same honesty contract as above: quantity takeoff, not design.
  ET: {
    marketCode: "ET",
    name: "Ethiopia (EEU practice / IEC 60364-aligned)",
    standardsRef:
      "EEU (Ethiopian Electric Utility) supply rules; IEC 60364-aligned national code of practice",
    nominalVoltage: "220V single-phase / 380V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "PVC-insulated Cu singles in embedded or surface PVC conduit (masonry construction)",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush galvanized steel or PVC boxes in blockwork",
    protectionDevices:
      "30mA RCD on socket circuits plus MCB distribution board",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Type C/F (European) plugs are common. Mains voltage dips and load shedding are frequent: confirm actual supply with a licensed local electrician before final circuit design.",
  },
  EG: {
    marketCode: "EG",
    name: "Egypt (Ministry of Electricity code / IEC 60364-aligned)",
    standardsRef:
      "Egyptian Electrical Installation Code; IEC 60364-aligned practice",
    nominalVoltage: "220V single-phase / 380V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles in embedded PVC conduit within reinforced concrete and blockwork",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu (water heater, AC)",
    boxType: "Flush PVC or steel boxes cast into walls",
    protectionDevices: "30mA RCD (mandatory for bathrooms) plus MCB panel",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Embedded conduit in RC construction is standard Egyptian practice; Type C/E/F plugs are common. Consult a licensed local electrician for design.",
  },
  TZ: {
    marketCode: "TZ",
    name: "Tanzania (TANESCO supply / BS-influenced practice)",
    standardsRef:
      "TANESCO supply rules; IEC 60364 / BS 7671-influenced wiring practice",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles or flat twin-and-earth in embedded conduit / capped chase (masonry)",
    lightingConductorSize: "1.0 mm² or 1.5 mm² Cu radial",
    socketConductorSize:
      "2.5 mm² Cu radial circuits (BS 1363 13A socket outlets common)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush steel/PVC boxes in blockwork; surface boxes on painted walls",
    protectionDevices: "30mA RCD on socket circuits plus MCB consumer unit",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. British-legacy BS 1363 sockets and radial (not ring) circuits are typical. Verify with a licensed local electrician.",
  },
  CI: {
    marketCode: "CI",
    name: "Côte d'Ivoire (NF C 15-100 heritage / IEC 60364)",
    standardsRef:
      "National electrical practice per Ministère de la Construction; NF C 15-100 heritage, IEC 60364-aligned",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles (U-1000 R2V or H07V-K) in embedded corrugated PVC conduit (gaine ICTA)",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush junction boxes (boîtes d'encastrement) with type E socket frames",
    protectionDevices:
      "30mA interrupteur différentiel + disjoncteurs (MCB) per NF C 15-100 heritage",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. French-practice radial circuits with 30mA differential protection are standard. Consult a licensed local electrician.",
  },
  ES: {
    marketCode: "ES",
    name: "Spain (REBT / IEC 60364-aligned)",
    standardsRef:
      "REBT - Real Decreto 842/2002 (Reglamento Electrotécnico para Baja Tensión) + ITC-BT notes",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles (H07V-K / RZ1-K) in embedded corrugated PVC conduit (tubo empotrado) or surface conduit",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu (hob, oven, AC)",
    boxType: "Flush PVC junction and socket boxes (cajas de derivación)",
    protectionDevices:
      "Interruptor diferencial 30mA + PIA magnetotérmicos (per REBT ITC-BT 24/28)",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. REBT mandates 30mA differential protection and radial (not ring) circuits; Boletín B1 certification by an instalador autorizado is required to energise.",
  },
  NL: {
    marketCode: "NL",
    name: "Netherlands (NEN 1010)",
    standardsRef:
      "NEN 1010 (Dutch national electrical safety standard, IEC 60364-based)",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu wiring pulled through floor conduit systems (broedplaatsen) and embedded wall conduit to central ceiling boxes",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush mounting boxes (inbouwdozen) with shuttered socket frames",
    protectionDevices:
      "30mA aardlekschakelaar (RCD) plus MCB consumer unit per NEN 1010",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Dutch practice routes wiring through accessible floor conduit to central connection points; RCD protection is mandatory. Consult a licensed installer (installateur).",
  },
  PL: {
    marketCode: "PL",
    name: "Poland (PN-HD 60364 national adoption)",
    standardsRef:
      "PN-HD 60364 series (Polish national adoption of IEC 60364); Warunki Techniczne",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles in embedded PVC conduit in concrete/blockwork, or flat sheathed cable (YDY) in stud walls",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush plastic boxes (puszki) with type E socket frames",
    protectionDevices:
      "30mA RCD (wyłącznik różnicowoprądowy) plus MCB panel per PN-HD 60364-4-41",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Embedded conduit in monolithic RC construction is standard Polish practice; type E (French) sockets dominate. Consult a licensed SEP-certified electrician.",
  },
  SE: {
    marketCode: "SE",
    name: "Sweden (SS 436 04 00 / ESS)",
    standardsRef:
      "SS 436 04 00 (Elinstallationsreglerna / ESS), IEC 60364-based",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu conductors in embedded PVC conduit (elläror) or screened YY cable in stud walls",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush boxes (inbyggnadsdosor) with shuttered type C/F socket frames",
    protectionDevices:
      "30mA jordfelsbrytare (RCD) - mandatory per ESS - plus MCBs",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. 30mA RCD protection is mandatory on final circuits under ESS. Consult a licensed electrician (elinstallatör).",
  },
  CH: {
    marketCode: "CH",
    name: "Switzerland (NIN 4638 / SN 4638)",
    standardsRef:
      "NIN 4638 (SN 4638) Niederspannungsinstallationen; IEC 60364-based",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu conductors in embedded conduit/tubes or planning cable within stud and blockwork",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits (10A Swiss circuits)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType:
      "Flush junction boxes (Abzweigdosen) with SEV 1011 type J 3-pin socket frames",
    protectionDevices: "FI-Schutzschalter (RCD) 30mA plus MCB panel per NIN",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Swiss installations use the SEV 1011 3-pin socket format and 10A circuits; consult a licensed installer (Elektroinstallateur).",
  },
  TR: {
    marketCode: "TR",
    name: "Türkiye (IEC 60364-based national regulation)",
    standardsRef:
      "Elektrik İç Tesisleri Yönetmeliği (Electrical Internal Installations Regulation), IEC 60364-aligned",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "Cu singles in embedded PVC conduit within RC construction and blockwork",
    lightingConductorSize: "1.5 mm² Cu in conduit",
    socketConductorSize: "2.5 mm² Cu radial circuits (type F Schuko outlets)",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu",
    boxType: "Flush plastic boxes (gömme kutu) cast into walls",
    protectionDevices:
      "30mA artık akım rölesi (RCD) - mandatory for bathrooms - plus MCB panel",
    cableReelSize: "100 m coils",
    conduitRequired: true,
    notes:
      "Preliminary takeoff only. Embedded conduit in reinforced concrete is standard Turkish practice. Consult a licensed local electrician (elektrik teknisyeni).",
  },
  NZ: {
    marketCode: "NZ",
    name: "New Zealand (AS/NZS 3000 Wiring Rules)",
    standardsRef:
      "AS/NZS 3000:2018 (Australian/New Zealand Wiring Rules) + Electrical (Safety) Regulations",
    nominalVoltage: "230V single-phase / 400V 3-phase",
    frequencyHz: 50,
    measurementSystem: "metric",
    runDistanceUnit: "m",
    primaryWiringMethod:
      "TPS (PVC-sheathed flat cable) through timber framing; conduit where exposed or underground",
    lightingConductorSize: "1.5 mm² Cu TPS",
    socketConductorSize: "2.5 mm² Cu TPS radial circuits",
    dedicatedConductorSize: "4.0 mm² to 6.0 mm² Cu TPS (oven, hob, heat pump)",
    boxType: "Flush or surface PVC boxes in framing; ceiling rose junctions",
    protectionDevices:
      "RCDs (30mA) on final subcircuits plus MCBs per AS/NZS 3000",
    cableReelSize: "100 m coils",
    conduitRequired: false,
    notes:
      "Preliminary takeoff only. TPS in framing cavities is standard; RCDs are required on final subcircuits. Type I (flat-pin) plugs. Work must be certified by a licensed electrician under NZ regulations.",
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
