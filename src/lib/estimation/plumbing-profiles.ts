/**
 * FRELUX International Plumbing Engineering Profiles
 *
 * Distinct regional plumbing system profiles for all 20 markets.
 * Replaces universal assumptions with modular market-specific rules.
 *
 * Non-negotiable honesty rules:
 * - Material quantity takeoff, NOT certified hydraulic/sanitary engineering designs.
 * - Missing prices remain unpriced; no silent price or method substitutions.
 */

export interface PlumbingMarketProfile {
  marketCode: string;
  name: string;
  standardsRef: string;
  measurementSystem: "metric" | "imperial";
  runDistanceUnit: "m" | "ft";
  nominalSizingFormat: "imperial_nominal_cts" | "metric_dn_od";
  waterSupplyMaterial: string;
  drainageDwvMaterial: string;
  typicalColdSupplyPipeSize: string;
  typicalHotSupplyPipeSize: string;
  typicalBranchWastePipeSize: string;
  typicalSoilDrainPipeSize: string;
  drainageSlopeRule: string;
  standardPipePurchasingLength: string;
  notes: string;
}

export const PLUMBING_PROFILES: Record<string, PlumbingMarketProfile> = {
  US: {
    marketCode: "US",
    name: "United States (IPC / UPC)",
    standardsRef:
      "International Plumbing Code (IPC 2024) / Uniform Plumbing Code (UPC)",
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    nominalSizingFormat: "imperial_nominal_cts",
    waterSupplyMaterial: "PEX-A / PEX-B tubing or Type L / M Copper (ASTM B88)",
    drainageDwvMaterial:
      "Schedule 40 PVC DWV (ASTM D2665) or ABS DWV (ASTM D2661)",
    typicalColdSupplyPipeSize: "3/4 inch main trunk, 1/2 inch fixture branches",
    typicalHotSupplyPipeSize: "3/4 inch main trunk, 1/2 inch fixture branches",
    typicalBranchWastePipeSize:
      "1-1/2 inch (lavatory/tub) to 2 inch (shower/kitchen sink)",
    typicalSoilDrainPipeSize: "3 inch or 4 inch Schedule 40 PVC",
    drainageSlopeRule:
      "1/4 inch per foot (2.08% slope) for 2-1/2 inch or smaller pipe; 1/8 inch per foot (1.04%) for 3 inch or larger",
    standardPipePurchasingLength:
      "10 ft or 20 ft rigid sticks (PEX: 100 ft or 300 ft coils)",
    notes:
      "Nominal pipe sizes do not equal direct internal diameters. DWV fittings require long-sweep sanitary bends.",
  },
  CA: {
    marketCode: "CA",
    name: "Canada (National Plumbing Code of Canada / NPC)",
    standardsRef: "National Plumbing Code of Canada (NPC 2020 / CSA B125)",
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    nominalSizingFormat: "imperial_nominal_cts",
    waterSupplyMaterial: "PEX (CSA B137.5) or Copper Type M/L",
    drainageDwvMaterial: "System 15 PVC or ABS DWV (CSA B181.1)",
    typicalColdSupplyPipeSize:
      "3/4 inch service / main trunk, 1/2 inch branch runs",
    typicalHotSupplyPipeSize: "3/4 inch main trunk, 1/2 inch branch runs",
    typicalBranchWastePipeSize: "1-1/2 inch or 2 inch ABS/PVC",
    typicalSoilDrainPipeSize: "3 inch or 4 inch ABS/PVC DWV",
    drainageSlopeRule:
      "Minimum 1 in 50 (2%) for fixtures; 1 in 100 (1%) for 4 inch building drains where approved",
    standardPipePurchasingLength: "10 ft or 12 ft lengths (PEX in coils)",
    notes: "ABS DWV is widely used in residential Canadian construction.",
  },
  GB: {
    marketCode: "GB",
    name: "United Kingdom (BS EN 806 / BS EN 12056)",
    standardsRef:
      "BS EN 806 (Water services) & BS EN 12056 (Gravity drainage systems)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Copper pipe (BS EN 1057) or Barrier PB/PEX push-fit (BS 7291)",
    drainageDwvMaterial:
      "uPVC solvent-weld or push-fit waste pipe & soil stack (BS EN 1329 / BS EN 1453)",
    typicalColdSupplyPipeSize:
      "22 mm main / unvented cylinder, 15 mm fixture runs",
    typicalHotSupplyPipeSize: "22 mm distribution, 15 mm fixture runs",
    typicalBranchWastePipeSize:
      "32 mm (basin) to 40 mm (sink/shower) or 50 mm (long runs)",
    typicalSoilDrainPipeSize: "110 mm push-fit or solvent-weld uPVC soil stack",
    drainageSlopeRule:
      "18 mm/m to 44 mm/m fall (typically 1:40 to 1:80 gradient per BS EN 12056-2)",
    standardPipePurchasingLength:
      "3 m standard lengths (push-fit/copper) or 25m/50m coils for barrier pipe",
    notes: "Unvented hot water systems require certified G3 installation.",
  },
  DE: {
    marketCode: "DE",
    name: "Germany (DIN 1988 / DIN EN 12056)",
    standardsRef: "DIN 1988 (TRWI) & DIN EN 12056 / DIN 1986-100",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Mehrschichtverbundrohr (multi-layer composite pipe / PEX-Al-PEX) or Edelstahl (stainless steel)",
    drainageDwvMaterial:
      "HT-Rohr (Polypropylen Schwerentflammbar / DIN EN 1451-1) or Schallschutzrohr (silence pipe)",
    typicalColdSupplyPipeSize:
      "DN 15 (16x2.0 mm) / DN 20 (20x2.0 mm) Verbundrohr",
    typicalHotSupplyPipeSize: "DN 15 / DN 20 mit Isolierung nach GEG",
    typicalBranchWastePipeSize: "DN 40 / DN 50 HT-Rohr",
    typicalSoilDrainPipeSize: "DN 90 or DN 100 / 110 HT-Rohr Fallleitung",
    drainageSlopeRule:
      "Mindestgefälle 1:100 (1%) bis 1:50 (2%) nach DIN 1986-100",
    standardPipePurchasingLength:
      "0.25 m bis 2.0 m HT-Rohr Stangen; Verbundrohr in 50 m Ringen",
    notes:
      "Dämmung nach Gebäudeenergiegesetz (GEG) ist für Warm- und Kaltwasserleitungen vorgeschrieben.",
  },
  IN: {
    marketCode: "IN",
    name: "India (IS 2065 / National Building Code)",
    standardsRef: "IS 2065:1983 & NBC 2016 Part 9 (Plumbing Services)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "CPVC (ASTM D2846) or PPR (IS 15801) pipe with solvent/heat fusion joints",
    drainageDwvMaterial: "SWR PVC (IS 13592 Type A for waste, Type B for soil)",
    typicalColdSupplyPipeSize:
      "25 mm (3/4 in) or 32 mm (1 in) trunk, 20 mm (1/2 in) fixture drop",
    typicalHotSupplyPipeSize: "20 mm (1/2 in) or 25 mm (3/4 in) CPVC SDR 11",
    typicalBranchWastePipeSize: "40 mm (1-1/4 in) to 50 mm (1-1/2 in) SWR PVC",
    typicalSoilDrainPipeSize: "75 mm waste stack, 110 mm soil stack (IS 13592)",
    drainageSlopeRule:
      "1:40 to 1:60 slope for self-cleansing velocity (minimum 0.75 m/s)",
    standardPipePurchasingLength:
      "3 m or 6 m (10 ft / 20 ft) commercial lengths (Astral, Supreme, Ashirvad)",
    notes:
      "Concealed plumbing in chased brickwork with rubber ring / solvent welded joints.",
  },
  NG: {
    marketCode: "NG",
    name: "Nigeria (National Building Code / Local Practice)",
    standardsRef: "Nigerian National Building Code & NIS Standards",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR (Polypropylene Random Copolymer heat fusion) or PVC pressure pipe",
    drainageDwvMaterial: "uPVC waste and soil pipe (Class B / Class C)",
    typicalColdSupplyPipeSize: "25 mm (3/4 in) PPR or 1/2 in pressure pipe",
    typicalHotSupplyPipeSize: "20 mm or 25 mm PPR pipe with heat-fusion joints",
    typicalBranchWastePipeSize: "1-1/2 inch (38-40 mm) or 2 inch (50 mm) uPVC",
    typicalSoilDrainPipeSize:
      "4 inch (110 mm) uPVC soil pipe discharging to inspection chamber & soakaway/septic",
    drainageSlopeRule:
      "1:40 (2.5%) to 1:60 gradient toward inspection chambers",
    standardPipePurchasingLength: "4 m or 5.8 m standard commercial lengths",
    notes:
      "PPR is dominant for pressurized supply; gravity drainage discharges to inspection chambers and septic soakaway.",
  },
  AU: {
    marketCode: "AU",
    name: "Australia (AS/NZS 3500)",
    standardsRef:
      "AS/NZS 3500 (Plumbing and Drainage Standard) & National Construction Code (NCC)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PEX tubing (AS/NZS 2492) or Type B Copper Tube (AS 1432)",
    drainageDwvMaterial: "DWV PVC-U Pipe and fittings (AS/NZS 1260)",
    typicalColdSupplyPipeSize: "DN 20 (20 mm OD) main feed; DN 16 branch feeds",
    typicalHotSupplyPipeSize: "DN 20 main feed; DN 16 branch feeds (insulated)",
    typicalBranchWastePipeSize: "DN 40 / DN 50 DWV PVC pipe",
    typicalSoilDrainPipeSize: "DN 100 DWV PVC sewer pipe",
    drainageSlopeRule:
      "1:60 (1.65%) for DN 100; 1:40 (2.5%) for DN 40/50 fixture discharges",
    standardPipePurchasingLength:
      "6 m straight lengths for DWV PVC; 50 m / 100 m coils for PEX",
    notes:
      "Preliminary takeoff only. Hydraulic sizing must comply with AS/NZS 3500 loading units. Licensed plumbing contractor sign-off and WaterMark-certified fittings are mandatory.",
  },
  GH: {
    marketCode: "GH",
    name: "Ghana (GS 522 / BS EN 12056)",
    standardsRef:
      "Ghana Standard GS 522, BS EN 806 (Water Supply) & BS EN 12056 (Drainage)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Polypropylene Random Copolymer (PPR-C Type 3) or HDPE pipes",
    drainageDwvMaterial: "uPVC solvent-weld soil, waste, and ventilating pipes",
    typicalColdSupplyPipeSize: "25 mm OD (PN 16 / PN 20) PPR pipe",
    typicalHotSupplyPipeSize: "25 mm OD (PN 20 / PN 25) insulated PPR pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm OD uPVC waste pipe",
    typicalSoilDrainPipeSize:
      "110 mm OD uPVC soil pipe (Class 4 / normal duty)",
    drainageSlopeRule:
      "1:50 (2.0%) minimum fall for underground drains and soil lines",
    standardPipePurchasingLength: "4 m straight lengths for PPR and uPVC",
    notes:
      "Preliminary takeoff only. Sizing accounts for gravity feed from elevated overhead poly tanks (e.g. PolyTank 1000L-3000L) common in Ghanaian water supply systems.",
  },
  KE: {
    marketCode: "KE",
    name: "Kenya (KS 06-149 / BS EN 12056)",
    standardsRef:
      "KS 06-149 (Plastics pipes for water supply), KS 06-150 & BS EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR-C (DIN 8077/8078) heat-fusion welded pipes or HDPE PN16",
    drainageDwvMaterial:
      "Golden brown / grey uPVC soil and waste pipes (KS 06-150)",
    typicalColdSupplyPipeSize: "25 mm OD (PN16) PPR pipe",
    typicalHotSupplyPipeSize: "25 mm OD (PN20) insulated PPR pipe",
    typicalBranchWastePipeSize:
      "40 mm (1.5 inch) and 50 mm (2 inch) uPVC waste pipe",
    typicalSoilDrainPipeSize: "110 mm (4 inch) OD uPVC soil pipe",
    drainageSlopeRule:
      "1:50 (2%) minimum fall for soil pipes; 1:40 (2.5%) for waste lines",
    standardPipePurchasingLength:
      "4 m lengths for PPR; 3 m or 6 m lengths for uPVC",
    notes:
      "Preliminary takeoff only. Standard installation incorporates high-level rooftop break tanks and automated pressure booster pump sets.",
  },
  ZA: {
    marketCode: "ZA",
    name: "South Africa (SANS 10252)",
    standardsRef:
      "SANS 10252-1 (Water Supply) & SANS 10252-2 (Drainage Installations)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Class 0 / Class 1 Copper tube (SANS 460) or Multi-layer PEX-Al-PEX / Polycop",
    drainageDwvMaterial:
      "uPVC solvent-weld or rubber-ring soil and vent pipe (SANS 967)",
    typicalColdSupplyPipeSize: "22 mm OD copper / 20 mm multi-layer pipe",
    typicalHotSupplyPipeSize:
      "22 mm OD copper / 20 mm multi-layer insulated pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm uPVC waste pipe",
    typicalSoilDrainPipeSize:
      "110 mm uPVC heavy-duty underground drain pipe (SANS 791)",
    drainageSlopeRule:
      "1:60 (1.67%) for 110 mm soil pipes; 1:40 (2.5%) for 40/50 mm waste pipes",
    standardPipePurchasingLength:
      "6 m straight lengths for copper and uPVC; 50 m rolls for multi-layer",
    notes:
      "Preliminary takeoff only. Plumbing installations must be registered and issued with a PIRB (Plumbing Industry Registration Board) Compliance Certificate.",
  },
  JP: {
    marketCode: "JP",
    name: "Japan (JIS S 3200 / SHASE-S 206)",
    standardsRef:
      "JIS S 3200 (Water Supply Equipment), SHASE-S 206 & Waterworks Law (Suido-ho)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Cross-linked polyethylene pipe (JIS K 6769 PEX) with central header distribution (Sayakan header system)",
    drainageDwvMaterial:
      "Rigid polyvinyl chloride pipe for drainage (JIS K 6741 VP / VU pipe) or fire-resistant soundproof VP pipes",
    typicalColdSupplyPipeSize: "13A (13 mm ID) PEX branch pipe from 20A header",
    typicalHotSupplyPipeSize:
      "13A (13 mm ID) insulated PEX branch pipe from 20A header",
    typicalBranchWastePipeSize: "40A / 50A rigid VP drainage pipe",
    typicalSoilDrainPipeSize: "75A or 100A rigid VU/VP drainage pipe",
    drainageSlopeRule:
      "1:50 (2%) for sizes <= 50A; 1:100 (1%) for sizes >= 75A",
    standardPipePurchasingLength:
      "4 m straight lengths for VP/VU pipes; 30 m / 60 m coils with pre-sheathed CD pipe for PEX",
    notes:
      "Preliminary takeoff only. Central manifold / header plumbing system (Sayakan header method) enables easy renewal and prevents pipe joints under slab. Designated Water Supply Works Contractor certification is mandatory.",
  },
  FR: {
    marketCode: "FR",
    name: "France (DTU 60.1 / DTU 60.11)",
    standardsRef:
      "NF DTU 60.1 (Plomberie sanitaire pour bâtiments) & NF DTU 60.11 (Règles de calcul)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Tubes multicouche PE-RT/AL/PE-RT avec raccords à sertir, ou cuivre écroui (NF EN 1057)",
    drainageDwvMaterial:
      "Tubes en PVC rigide assainissement / évacuation sans pression (NF Me)",
    typicalColdSupplyPipeSize:
      "DN 16/20 multicouche (16x2.0 mm / 20x2.0 mm) depuis collecteur nourrisse",
    typicalHotSupplyPipeSize:
      "DN 16/20 multicouche isolé thermiquement (gaine calorifuge)",
    typicalBranchWastePipeSize:
      "Ø32 mm (lavabo/bidet), Ø40 mm (évier/douche/baignoire), Ø50 mm (collecteur secondaire)",
    typicalSoilDrainPipeSize:
      "Ø100 mm PVC évacuation pour WC et descente eaux vannes",
    drainageSlopeRule:
      "Pente minimale de 1 cm/m à 2 cm/m (1% à 2%) sans contre-pente",
    standardPipePurchasingLength:
      "Barres de 4 m pour tubes PVC et multicouche; couronnes de 25m/50m",
    notes:
      "Preliminary takeoff only. Sizing by unit loads (Unités de Débit per DTU 60.11). Anti-water-hammer devices and sanitary backflow prevention (Disconnecteur NF) required.",
  },
  BR: {
    marketCode: "BR",
    name: "Brazil (ABNT NBR 5626 / NBR 8160)",
    standardsRef:
      "ABNT NBR 5626 (Instalação predial de água fria) & ABNT NBR 8160 (Esgoto sanitário)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Tubos e conexões de PVC soldável marrom (água fria) e CPVC / PPR termofusão (água quente)",
    drainageDwvMaterial:
      "Tubos de PVC rígido série normal branco para esgoto e ventilação (NBR 5688)",
    typicalColdSupplyPipeSize:
      "DN 25 mm (3/4 inch) e DN 32 mm (1 inch) tubulação marrom soldável",
    typicalHotSupplyPipeSize: "DN 22 mm / DN 28 mm CPVC ou PPR termofusão",
    typicalBranchWastePipeSize:
      "DN 40 mm (ramal de descarga pia/lavatório) e DN 50 mm (ramal ralo sinfonado)",
    typicalSoilDrainPipeSize:
      "DN 100 mm (tubo de queda e ramal de bacia sanitária)",
    drainageSlopeRule:
      "2% para tubulações de diâmetro <= 75 mm; 1% para diâmetro de 100 mm",
    standardPipePurchasingLength:
      "Varas de 6 m ou 3 m para PVC soldável e esgoto",
    notes:
      "Preliminary takeoff only. Standard gravity water storage tank (Caixa d'água de 500L a 1000L em polietileno) installed in ceiling roof space is standard in Brazilian residences.",
  },
  SA: {
    marketCode: "SA",
    name: "Saudi Arabia (SBC 701)",
    standardsRef:
      "Saudi Building Code (SBC 701 Plumbing) & SASO / ASTM standards",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR-C (DIN 8077/8078) or CPVC Schedule 80 (ASTM F441) pipe and fittings",
    drainageDwvMaterial:
      "uPVC Schedule 40 or Class 4 rubber-ring solvent-weld drainage pipes",
    typicalColdSupplyPipeSize: "25 mm OD (PN20) or 32 mm OD PPR pipe",
    typicalHotSupplyPipeSize: "25 mm OD (PN25) insulated PPR pipe",
    typicalBranchWastePipeSize: "50 mm (2-inch) uPVC waste pipe",
    typicalSoilDrainPipeSize:
      "110 mm (4-inch) or 160 mm uPVC underground drainage pipe",
    drainageSlopeRule:
      "1:50 (2%) minimum uniform gradient for 110 mm soil pipes",
    standardPipePurchasingLength: "4 m straight lengths for PPR and uPVC",
    notes:
      "Preliminary takeoff only. Installations include insulated underground storage tanks and rooftop transfer pumps to combat extreme ambient heating.",
  },
  AE: {
    marketCode: "AE",
    name: "United Arab Emirates (Dubai Building Code / BS EN 12056)",
    standardsRef:
      "Dubai Building Code 2021 (Part H Plumbing) & BS EN 806 / BS EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "PPR-C Type 3 or multi-layer PEX-Al-PEX / Copper tubes (BS EN 1057)",
    drainageDwvMaterial:
      "Acoustic uPVC / mineral-reinforced polypropylene (PP-MD) silent drainage pipes",
    typicalColdSupplyPipeSize: "25 mm OD (PN 20) PPR / DN 20 multi-layer pipe",
    typicalHotSupplyPipeSize:
      "25 mm OD insulated PPR / DN 20 insulated multi-layer pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm OD uPVC acoustic waste pipes",
    typicalSoilDrainPipeSize:
      "110 mm OD acoustic soil stack and underground drainage pipe",
    drainageSlopeRule:
      "1:50 (2%) minimum slope for branch pipes; 1:60 to 1:100 for main collection headers",
    standardPipePurchasingLength:
      "4 m lengths for PPR; 3 m / 5 m lengths for acoustic drainage pipes",
    notes:
      "Preliminary takeoff only. Cold water supply requires temperature regulation / chiller loop integration to prevent tap water exceeding 35°C in summer.",
  },
  CN: {
    marketCode: "CN",
    name: "China (GB 50015)",
    standardsRef:
      "GB 50015 (Standard for Building Water Supply and Drainage Design) & CJ/T standards",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Polypropylene random copolymer pipe (PP-R GB/T 18742) or thin-walled stainless steel pipe",
    drainageDwvMaterial:
      "Rigid polyvinyl chloride drainage pipe (PVC-U GB/T 5836) with socket adhesive or spiral sound-reducing pipes",
    typicalColdSupplyPipeSize: "dn 25 (S3.2 / PN2.0 MPa) PP-R pipe",
    typicalHotSupplyPipeSize: "dn 25 (S2.5 / PN2.5 MPa) insulated PP-R pipe",
    typicalBranchWastePipeSize: "de 50 mm / de 75 mm PVC-U drainage pipe",
    typicalSoilDrainPipeSize:
      "de 110 mm PVC-U soil vertical stack and outfall pipe",
    drainageSlopeRule:
      "0.026 standard slope for de 50; 0.020 (1:50) standard slope for de 110",
    standardPipePurchasingLength:
      "4 m straight lengths for PP-R and PVC-U pipes",
    notes:
      "Preliminary takeoff only. Strict acoustic and anti-odor water seal (water trap depth >= 50 mm per GB 50015) requirements apply.",
  },
  ID: {
    marketCode: "ID",
    name: "Indonesia (SNI 03-6481 / SNI 03-7065)",
    standardsRef:
      "SNI 03-6481-2000 (Sistem Plambing) & SNI 03-7065-2005 (Tata Cara Perencanaan Sistem Plambing)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Pipa PVC Kelas AW (tekanan tinggi 10 kg/cm²) atau pipa PPR-C PN-16/PN-20",
    drainageDwvMaterial:
      "Pipa PVC Kelas D (drainase air kotor/buangan) atau PVC Kelas AW untuk pipa tanah",
    typicalColdSupplyPipeSize:
      "Pipa PVC AW 3/4 inch (26 mm OD) atau PPR 25 mm OD",
    typicalHotSupplyPipeSize:
      "PPR PN-20 25 mm OD terisolasi untuk jalur pemanas air (water heater)",
    typicalBranchWastePipeSize:
      "Pipa PVC D 1.5 inch (48 mm OD) dan 2 inch (60 mm OD) untuk air bekas",
    typicalSoilDrainPipeSize:
      "Pipa PVC D / AW 4 inch (114 mm OD) untuk air kotor/tinja ke septic tank",
    drainageSlopeRule:
      "Kemiringan minimum 2% (1:50) untuk pipa buangan air kotor",
    standardPipePurchasingLength:
      "Batang 4 meter untuk seluruh pipa PVC dan PPR di pasaran lokal",
    notes:
      "Preliminary takeoff only. Standar instalasi umum melibatkan tangki tandon air (Toren / Profil Tank) di atas dak beton dengan sistem otomatis pelampung radar.",
  },
  MX: {
    marketCode: "MX",
    name: "Mexico (NOM-001-CONAGUA / NTC-Plomería)",
    standardsRef:
      "NOM-001-CONAGUA-2011 (Sistemas de agua potable y alcantarillado) & NMX-E-181-CNCP",
    measurementSystem: "imperial",
    runDistanceUnit: "ft",
    nominalSizingFormat: "imperial_nominal_cts",
    waterSupplyMaterial:
      "Tubería de CPVC (FlowGuard Gold) o polipropileno copolímero aleatorio (Tuboplus PPR termofusión)",
    drainageDwvMaterial:
      "Tubería de PVC sanitario blanco para desagüe y ventilación (NMX-E-199)",
    typicalColdSupplyPipeSize:
      "1/2 pulgada (13 mm) o 3/4 pulgada (19 mm) CPVC / Tuboplus 20/25 mm",
    typicalHotSupplyPipeSize:
      "1/2 pulgada o 3/4 pulgada CPVC alta temperatura / Tuboplus PN-20",
    typicalBranchWastePipeSize:
      "2 pulgadas (50 mm) PVC sanitario para lavabos, regaderas y fregaderos",
    typicalSoilDrainPipeSize:
      "4 pulgadas (100 mm) PVC sanitario para bajadas de inodoros (WC)",
    drainageSlopeRule:
      "2% uniforme (2 cm de desnivel por cada metro de longitud)",
    standardPipePurchasingLength:
      "Tramos rectos de 3.05 m o 6.0 m para CPVC y PVC sanitario",
    notes:
      "Preliminary takeoff only. Standard Mexican residential systems incorporate an underground cistern (cisterna de 2500L-5000L) with submerged or surface pump, lifting water to a rooftop gravity tinaco (Rotoplas 750L-1100L).",
  },
  KR: {
    marketCode: "KR",
    name: "South Korea (KCS 31 20 / KS B)",
    standardsRef:
      "Korean Construction Specification (KCS 31 20 Plumbing Work) & KS B 1538",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Polybutylene (PB) pipe or Cross-linked polyethylene (XL / PE-Xa) pipe with central distribution manifold",
    drainageDwvMaterial:
      "Rigid PVC pipe (VG1 / VG2) or cast iron drain pipe with acoustic clamp joints",
    typicalColdSupplyPipeSize: "16 mm OD (PB 15A / 16A) pipe from manifold",
    typicalHotSupplyPipeSize:
      "16 mm OD insulated (PB 15A / 16A) pipe from boiler manifold",
    typicalBranchWastePipeSize: "50 mm OD (VG2 50A) PVC waste pipe",
    typicalSoilDrainPipeSize: "100 mm OD (VG1 100A) thick-wall PVC soil pipe",
    drainageSlopeRule:
      "1:50 (2%) slope for pipe diameters <= 65 mm; 1:100 (1%) for 100 mm",
    standardPipePurchasingLength:
      "4 m straight lengths for PVC; 100 m coils for PB / XL pipes",
    notes:
      "Preliminary takeoff only. Hot water supply is centrally coupled with individual gas boiler hydronic floor heating (Ondol) manifolds.",
  },
  IT: {
    marketCode: "IT",
    name: "Italy (UNI 9182 / UNI EN 12056)",
    standardsRef:
      "Norma UNI 9182 (Impianti di alimentazione e distribuzione d'acqua fredda e calda) & UNI EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Tubo multistrato PE-RT/AL/PE-RT con anima in alluminio e raccordi a pressare, o rame coibentato",
    drainageDwvMaterial:
      "Tubi in PVC rigido serie scarico o tubi silenziati a innesto in polipropilene (PP insonorizzato)",
    typicalColdSupplyPipeSize:
      "Ø16 mm / Ø20 mm multistrato con guaina corrugata da collettore complanare",
    typicalHotSupplyPipeSize:
      "Ø16 mm / Ø20 mm multistrato isolato termicamente con spessore anticondensa",
    typicalBranchWastePipeSize:
      "Ø40 mm (lavabo/bidet), Ø50 mm (scarico doccia e cucina)",
    typicalSoilDrainPipeSize:
      "Ø90 mm o Ø110 mm per vaso WC e colonna di scarico principale",
    drainageSlopeRule:
      "Pendenza costante minima dell'1,5% - 2% (1,5 - 2 cm per metro lineare)",
    standardPipePurchasingLength:
      "Verghe da 4 m per tubi di scarico; rotoli da 50 m per tubo multistrato",
    notes:
      "Preliminary takeoff only. Central manifold system (collettore complanare di distribuzione) inside wall inspection box. Dichiarazione di Conformità (DM 37/08) required.",
  },
  SG: {
    marketCode: "SG",
    name: "Singapore (PUB Code of Practice on Water Services / SS 675)",
    standardsRef:
      "PUB Singapore Public Utilities (Water Supply) Regulations, SS 675 / SS 213 (Sanitary drainage)",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial:
      "Copper pipe (SS 245 / BS EN 1057) or Stainless steel Grade 316 (SS 508 / BS EN 10312)",
    drainageDwvMaterial:
      "uPVC soil and waste pipe (SS 213 / BS EN 1329) or cast iron for commercial discharge stacks",
    typicalColdSupplyPipeSize:
      "Ø22 mm main incoming to consumer gate valve, Ø15 mm branch runs to fittings",
    typicalHotSupplyPipeSize:
      "Ø15 mm or Ø22 mm copper / stainless steel pipe with thermal lagging",
    typicalBranchWastePipeSize:
      "Ø32 mm (wash basin), Ø40 mm (kitchen sink), Ø50 mm (floor trap waste discharge)",
    typicalSoilDrainPipeSize:
      "Ø100 mm / Ø110 mm uPVC discharge pipe connected to ventilated soil stack",
    drainageSlopeRule:
      "1:40 to 1:60 fall (minimum 1.6% to 2.5% gradient per SS 675 Code of Practice)",
    standardPipePurchasingLength:
      "6 m lengths for copper/stainless steel or 5.8 m for uPVC drainage pipes",
    notes:
      "Strict PUB water efficiency labelling scheme (WELS) mandatory for all sanitary fitting discharge rates. HDB flats require specific approved coring locations and floor trap connections.",
  },
};

export function getPlumbingProfile(marketCode: string): PlumbingMarketProfile {
  const upper = marketCode.toUpperCase();
  if (PLUMBING_PROFILES[upper]) {
    return PLUMBING_PROFILES[upper];
  }
  return {
    marketCode: upper,
    name: `${upper} Local Plumbing Practice`,
    standardsRef:
      "Applicable National Plumbing Standard & ISO 15874 / EN 12056",
    measurementSystem: "metric",
    runDistanceUnit: "m",
    nominalSizingFormat: "metric_dn_od",
    waterSupplyMaterial: "PPR or Multi-layer PEX-Al-PEX pipe",
    drainageDwvMaterial: "uPVC or Polypropylene drainage pipe",
    typicalColdSupplyPipeSize: "20 mm / 25 mm OD pipe",
    typicalHotSupplyPipeSize: "20 mm / 25 mm OD insulated pipe",
    typicalBranchWastePipeSize: "40 mm / 50 mm OD waste pipe",
    typicalSoilDrainPipeSize: "110 mm OD soil pipe",
    drainageSlopeRule: "1:50 (2%) standard drainage slope",
    standardPipePurchasingLength: "3 m or 4 m lengths",
    notes:
      "Preliminary material takeoff only. Always verify local sanitary drainage codes and fixture unit loadings.",
  };
}
