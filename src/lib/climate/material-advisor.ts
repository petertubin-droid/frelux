/**
 * FRELUX Climate-Responsive Material Advisor — recommendation engine.
 *
 * DESIGN RULES (non-negotiable, matching the product's honesty policy):
 *
 *  1. Recommendations are RULES over measured factors — every "why"
 *     cites the factor value that produced it.
 *  2. Standards are named as the FRAMEWORKS that govern the property in
 *     question. We never claim a product is certified, approved, or
 *     code-compliant.
 *  3. Exposure classes (concrete, corrosivity) are presented as
 *     INDICATIONS to discuss with the project's engineer. No class is
 *     ever presented as a finished specification.
 *  4. With no environmental data, the advisor degrades to GENERAL
 *     guidance: honest, market-agnostic, and clearly labelled.
 */

import type {
  AdvisorResult,
  CategoryAdvice,
  EnvironmentalFactors,
  TechnicalStandard,
} from "./types";

const ENGINEER_CONFIRMATION =
  "Framework only — the project's licensed engineer confirms applicability for the actual design.";

const SPEC_CAVEAT =
  "Specification reference, not a product approval. Confirm the product's declared performance with its manufacturer.";

function std(code: string, name: string, applies: string): TechnicalStandard {
  return { code, name, applies };
}

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

function driversFor(f: EnvironmentalFactors): string[] {
  const drivers: string[] = [
    `Annual mean temperature ${NUMBER.format(f.tempMeanC)} °C (min ${NUMBER.format(f.tempMinC)} °C, max ${NUMBER.format(f.tempMaxC)} °C)`,
    `Annual rainfall ≈ ${NUMBER.format(f.annualRainfallMm)} mm`,
    `Relative humidity ${NUMBER.format(f.relativeHumidityPct)} %`,
    `Annual mean UV index ${NUMBER.format(f.uvIndex)}`,
    `Frost days per year ${NUMBER.format(f.frostDaysPerYear)}`,
  ];
  if (f.coastal.band !== "inland") {
    drivers.push(
      `Coastal exposure: ${f.coastal.band.replace(/_/g, "-")} (≈${f.coastal.distanceKm} km to reference coastline)`,
    );
  }
  if (f.elevationM !== null) {
    drivers.push(`Ground elevation ${NUMBER.format(f.elevationM)} m`);
  }
  return drivers;
}

function corrosionBandText(f: EnvironmentalFactors): string {
  return `indicated corrosivity band: ${f.corrosionIndicative.replace(/_/g, " ")}`;
}

// ─────────────────────────────────────────────────────────────
// 1. Exterior paints
// ─────────────────────────────────────────────────────────────
function exteriorPaint(f: EnvironmentalFactors): CategoryAdvice {
  const properties: string[] = [
    "100% acrylic binder (or acrylic-silicone for marine exposure)",
    "High UV stability with light-fast pigments",
  ];
  const why: string[] = [];
  const risks: string[] = [];
  const installation: string[] = [
    "Apply within the manufacturer's temperature window; avoid application when rain is expected before the film cures.",
    "Prepare the substrate to the system datasheet (clean, sound, pH-compatible).",
  ];

  if (f.strongUv || f.heatStress) {
    properties.push(
      "Light or reflective topcoat colour (higher solar reflectance reduces surface temperature and film stress)",
    );
    why.push(
      `Strong annual UV (${NUMBER.format(f.uvIndex)}) and/or heat (max ${NUMBER.format(f.tempMaxC)} °C) drives binder degradation and chalking — UV-stable pigmentation and reflectance preserve colour and film integrity.`,
    );
    risks.push(
      "Chalking and colour fade are the first visible UV failures; gloss retention drops before the film fails structurally.",
    );
  }

  if (f.highRainfall || f.highHumidity) {
    properties.push(
      "Vapour-permeable (breathable) exterior system with fungicidal/algae-resistant film protection",
    );
    why.push(
      `Humidity ${NUMBER.format(f.relativeHumidityPct)} % and ≈${NUMBER.format(f.annualRainfallMm)} mm rain per year keep walls damp for long periods — a breathable film lets substrate moisture escape instead of blistering.`,
    );
    risks.push(
      "Trapped moisture behind a low-permeability film causes blistering and peeling; shaded elevations grow algae and mould.",
    );
    installation.push(
      "Flashings and joints must shed water away from the façade; sight-check shaded elevations for biological growth at handover.",
    );
  }

  if (f.coastal.band === "coast_adjacent" || f.coastal.band === "coastal") {
    properties.push(
      "Salt-resistant exterior system; wash-down detailing; corrosion-resistant fixings and trims",
    );
    why.push(
      `The site is in the ${f.coastal.band.replace(/_/g, "-")} band (≈${f.coastal.distanceKm} km to the reference coastline): airborne chlorides attack films and metal components.`,
    );
    risks.push(
      "Chloride-laden air degrades weakly bound films and uncoated fixings; salt deposits hold moisture against the surface.",
    );
    installation.push(
      "Specify a rinse-down maintenance regime for salt accumulation, especially on windward elevations.",
    );
  }

  if (f.frostRisk === "seasonal" || f.frostRisk === "frequent") {
    properties.push(
      "Frost-tolerant adhesion (flexible at low temperature) and application restricted to above-dew-point conditions",
    );
    why.push(
      `${NUMBER.format(f.frostDaysPerYear)} frost days per year: water in the substrate freezes and expands, so the film must stay flexible at low temperature.`,
    );
    risks.push(
      "Applying near or below freezing traps moisture and causes adhesion failure in the first freeze-thaw cycle.",
    );
    installation.push(
      "Do not apply when surface temperature is at or below the datasheet minimum or within 2 °C of dew point (condensation risk).",
    );
  }

  return {
    id: "exterior-paint",
    category: "Exterior paints",
    title: "Exterior wall paint system",
    summary:
      "A breathable, UV-stable exterior system selected for this site's rain, humidity, UV and salt exposure.",
    properties,
    why,
    risks,
    standards: [
      std(
        "ISO 6270-1",
        "Paints and varnishes — determination of resistance to humidity (condensation)",
        SPEC_CAVEAT,
      ),
      std(
        "ASTM G154",
        "Operating fluorescent ultraviolet lamp apparatus for exposure of nonmetallic materials",
        "Reference test method for UV/condensation weathering — ask suppliers for results on their system.",
      ),
      std(
        "ISO 4628",
        "Evaluation of degradation of coatings (blistering, cracking, chalking)",
        "Reference vocabulary for describing coating defects during inspections.",
      ),
    ],
    installation,
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// 2. Waterproofing
// ─────────────────────────────────────────────────────────────
function waterproofing(f: EnvironmentalFactors): CategoryAdvice {
  const properties: string[] = [
    "Continuous positive-side waterproofing with reinforced details at corners and penetrations",
  ];
  const why: string[] = [];
  const risks: string[] = [];
  const installation: string[] = [
    "Terminate membranes above the design splash/standing-water level and protect them during following trades.",
    "Test wet areas before covering (flood test or per manufacturer's method).",
  ];

  if (f.highRainfall) {
    properties.push(
      "High-performance membrane for wet climates: reinforced bituminous sheet, liquid-applied PU/cementitious system, or crystalline waterproofing for below-grade concrete",
    );
    why.push(
      `≈${NUMBER.format(f.annualRainfallMm)} mm annual rainfall with ${NUMBER.format(f.relativeHumidityPct)} % humidity means long wetting cycles — the system must tolerate sustained water contact, not just splashes.`,
    );
    risks.push(
      "Standing water at low spots and blocked outlets is the most common failure path; inadequate falls pond water against the membrane.",
    );
    installation.push(
      "Confirm minimum drainage falls with the designer; keep outlets and overflows clear.",
    );
  }

  if (f.highRainfall && f.floodProxy === "low_lying") {
    properties.push(
      "Combined protection: below-slab damp-proof membrane plus perimeter drainage and backflow prevention at connections",
    );
    why.push(
      `Low-lying ground (${f.elevationM !== null ? `${NUMBER.format(f.elevationM)} m elevation` : "low elevation"}) in a wet climate raises groundwater and surface-water pressure on below-grade elements.`,
    );
    installation.push(
      "Provide a drained protection layer around below-grade walls and verify the local authority's flood requirements (this tool does not assess flood maps).",
    );
  }

  if (f.frostRisk === "seasonal" || f.frostRisk === "frequent") {
    properties.push(
      "Freeze-thaw-tolerant system (flexible at low temperature; crack-bridging capability)",
    );
    why.push(
      `${NUMBER.format(f.frostDaysPerYear)} frost days per year: rigid membranes crack when the substrate moves through freeze-thaw cycles.`,
    );
    risks.push(
      "Ponding water that freezes splits seams and dislodges protection screeds.",
    );
  }

  if (f.highHumidity || f.coastal.band === "coast_adjacent") {
    properties.push(
      "Vapour-managed build-up (drainage mat / ventilated cavity where applicable) so walls can dry inward or outward as designed",
    );
    why.push(
      "High humidity and salt air keep assemblies wet; a drainage path and vapour management prevent trapped moisture behind the waterproofing.",
    );
  }

  return {
    id: "waterproofing",
    category: "Waterproofing systems",
    title: "Waterproofing and damp protection",
    summary:
      "Positive-side waterproofing sized to this site's rainfall, groundwater attention level, humidity and frost exposure.",
    properties,
    why,
    risks,
    standards: [
      std(
        "EN 13707",
        "Flexible sheets for waterproofing — reinforced bitumen sheets for roof waterproofing",
        SPEC_CAVEAT,
      ),
      std(
        "EN 14891",
        "Liquid-applied water-impermeable products for use beneath ceramic tiling",
        SPEC_CAVEAT,
      ),
      std(
        "EN 13967",
        "Flexible sheets — plastic and rubber damp-proof sheets including basement tanking",
        SPEC_CAVEAT,
      ),
    ],
    installation,
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// 3. Roofing
// ─────────────────────────────────────────────────────────────
function roofing(f: EnvironmentalFactors): CategoryAdvice {
  const properties: string[] = [
    "Roof covering with lapped, interlocking or welded joints appropriate to the design pitch",
  ];
  const why: string[] = [];
  const risks: string[] = [];
  const installation: string[] = [
    "Keep fixings, flashings and cut edges on the same corrosion-protection basis as the sheets.",
    "Confirm the structural design (purlins, uplift, snow load where applicable) with the engineer.",
  ];

  if (f.highRainfall) {
    properties.push(
      "Steep-enough pitch within the covering manufacturer's wet-climate limits, generous side/detail laps, and sized gutters and downpipes",
    );
    why.push(
      `≈${NUMBER.format(f.annualRainfallMm)} mm of rain per year demands rapid shedding: under-pitched roofs and small gutters are the failure path, not the covering itself.`,
    );
    risks.push(
      "Wind-driven rain at laps and blocked gutters cause ceiling stains before the covering itself fails.",
    );
  }

  if (f.coastal.band === "coastal" || f.coastal.band === "coast_adjacent") {
    properties.push(
      "Marine-grade roof sheets with factory-applied organic coating (e.g. aluminium-zinc or aluminium coated steel) and stainless or coated fixings; aluminium or coated systems at splash-exposed lower zones",
    );
    why.push(
      `The site sits in the ${f.coastal.band.replace(/_/g, "-")} band (≈${f.coastal.distanceKm} km from the reference coastline): chloride deposition attacks cut edges and uncoated fastenings first. ${corrosionBandText(f)}.`,
    );
    risks.push(
      "Uncoated galvanised sheets and standard carbon-steel screws visibly red-rust within a few years next to the sea.",
    );
    installation.push(
      "Never leave cut edges unsealed; touch up field cuts with the manufacturer's repair system.",
    );
  }

  if (f.strongUv || f.heatStress) {
    properties.push(
      "Light-coloured or solar-reflective finish where the design allows (reduces roof cavity heat gain and coating ageing)",
    );
    why.push(
      `Annual mean UV ${NUMBER.format(f.uvIndex)} and peak maxima of ${NUMBER.format(f.tempMaxC)} °C accelerate coating ageing and raise attic temperatures.`,
    );
  }

  if (f.snowExposure === "possible" || f.snowExposure === "likely") {
    properties.push(
      "Snow-retention accessories where walkways or doorways sit below eaves; structural snow load from the local code map",
    );
    why.push(
      `${NUMBER.format(f.frostDaysPerYear)} frost days per year with mean minima of ${NUMBER.format(f.tempMinC)} °C indicate ${f.snowExposure} snow exposure.`,
    );
    risks.push(
      "Sliding snow and ice off smooth metal roofs is a life-safety hazard on occupied elevations.",
    );
    installation.push(
      "Snow loads are governed by the local building code's ground-snow map; this advisory does not supply load values.",
    );
  }

  if (f.highHumidity) {
    properties.push(
      "Ventilated roof space (ridge/soffit ventilation) with a condensation-control layer on the warm side where the design requires it",
    );
    why.push(
      `Humidity ${NUMBER.format(f.relativeHumidityPct)} % means condensation under the covering must be drained or ventilated, not trapped.`,
    );
  }

  return {
    id: "roofing",
    category: "Roofing materials",
    title: "Roof covering and its metal protection",
    summary:
      "Covering and metal-protection choices matched to this site's rain intensity, UV, chlorides and frost/snow exposure.",
    properties,
    why,
    risks,
    standards: [
      std(
        "EN 508-1",
        "Roofing and cladding products from metal sheet — steel",
        SPEC_CAVEAT,
      ),
      std(
        "ASTM A792",
        "Steel sheet, 55% aluminium-zinc alloy coated by the hot-dip process",
        SPEC_CAVEAT,
      ),
      std(
        "ISO 14713",
        "Zinc coatings — guidelines for protection against corrosion of iron and steel structures",
        ENGINEER_CONFIRMATION,
      ),
    ],
    installation,
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// 4. Flooring and exterior tiles
// ─────────────────────────────────────────────────────────────
function flooringTiles(f: EnvironmentalFactors): CategoryAdvice {
  const properties: string[] = [
    "Exterior-rated ceramic or porcelain with slip-resistant surface where wet",
  ];
  const why: string[] = [];
  const risks: string[] = [];
  const installation: string[] = [
    "Use exterior-rated adhesive and grout; follow the open-time and bed-coverage from the datasheet.",
    "Movement joints at perimeters and large fields — exterior slabs move thermally.",
  ];

  if (f.highRainfall || f.highHumidity) {
    properties.push(
      "Low water absorption porcelain (Group BIa per ISO 13006, ≤0.5 %) with slip resistance in wet zones (R11 or higher per DIN 51130)",
    );
    why.push(
      `Wet, humid conditions demand impervious tiles and real slip resistance — pedestrians on wet porcelain with the wrong surface finish is how exterior tiling fails operationally.`,
    );
    risks.push(
      "High-absorption tiles and cement grout stain, effloresce and grow biofilm in permanent damp; smooth finishes become dangerous when wet.",
    );
  }

  if (f.frostRisk === "seasonal" || f.frostRisk === "frequent") {
    properties.push(
      "Frost-resistant tile body (ISO 10545-12 frost-resistance test, no visible defects) plus frost-tolerant adhesive",
    );
    why.push(
      `${NUMBER.format(f.frostDaysPerYear)} frost days per year: water absorbed into the tile body expands on freezing and shells the face.`,
    );
    risks.push(
      "Exterior tiles fixed with interior-grade adhesive debond in the first freeze cycle; grout cracks become water entry paths.",
    );
  }

  if (f.strongUv || f.heatStress) {
    properties.push(
      "Light-coloured, UV-stable surface finish (reduces surface temperature and fading)",
    );
    why.push(
      `Strong UV and heat: darker surfaces at ${NUMBER.format(f.tempMaxC)} °C ambient become far hotter under sun and age faster.`,
    );
  }

  if (f.coastal.band === "coastal" || f.coastal.band === "coast_adjacent") {
    properties.push(
      "Salt-tolerant fixing accessories (plastic/stainless) and periodic sealing of porous joints",
    );
    why.push(
      "Marine air plus wetting cycles attack metal spacers and cementitious joints in exposed paving.",
    );
  }

  return {
    id: "flooring-tiles",
    category: "Flooring and exterior tiles",
    title: "Exterior tile and paving system",
    summary:
      "Tile body, slip performance, adhesive and joint materials selected for this site's wet, frost and UV exposure.",
    properties,
    why,
    risks,
    standards: [
      std(
        "ISO 13006 / EN 14411",
        "Ceramic tiles — definitions, classification, characteristics and marking",
        SPEC_CAVEAT,
      ),
      std(
        "ISO 10545-12",
        "Ceramic tiles — determination of frost resistance",
        "The test behind the frost-resistance claim for exterior tiles.",
      ),
      std(
        "DIN 51130",
        "Testing of floor coverings — determination of the anti-slip properties (R classification)",
        "Slip classification for wet/pedestrian areas.",
      ),
      std("EN 12004", "Adhesives for tiles", SPEC_CAVEAT),
      std("EN 13888", "Grouts for tiles", SPEC_CAVEAT),
    ],
    installation,
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// 5. Concrete exposure classes
// ─────────────────────────────────────────────────────────────
function concreteExposure(f: EnvironmentalFactors): CategoryAdvice {
  const indicative: string[] = [];
  const en206: string[] = [];
  const aci: string[] = [];

  if (f.coastal.band === "coast_adjacent" || f.coastal.band === "coastal") {
    indicative.push(
      "Airborne chlorides at the site indicate chloride-driven reinforcement corrosion protection",
    );
    en206.push(
      "XS1–XS3 (corrosion induced by chlorides from sea water) — confirm the sub-class with the engineer",
    );
    aci.push(
      "Class C1–C2 (corrosion of reinforcement) per ACI 318-19 §19.3 — engineer confirms",
    );
  }

  if (
    f.frostRisk === "seasonal" ||
    f.frostRisk === "frequent" ||
    f.frostRisk === "rare"
  ) {
    indicative.push(
      "Freezing with moisture present indicates freeze-thaw exposure for saturated concrete",
    );
    en206.push(
      "XF1–XF3 (freeze-thaw attack) where concrete is moisture-saturated in service — engineer confirms",
    );
    aci.push(
      "Class F1–F2 (freeze-thaw) where exposure is saturated — engineer confirms",
    );
  }

  if (f.highRainfall) {
    en206.push(
      "XC2–XC4 (carbonation) and W-class water contact indications for exposed elements — engineer confirms",
    );
    aci.push(
      "Class W1–W2 (water) for elements in contact with water — engineer confirms",
    );
  } else if (!f.coastal.band.startsWith("coast")) {
    en206.push(
      "XC1–XC2 (carbonation, dry or permanently wet) as a baseline indication — engineer confirms",
    );
  }

  return {
    id: "concrete-exposure",
    category: "Concrete exposure classes",
    title: "Indicative concrete exposure classes",
    summary:
      "The exposure classes these climate conditions indicate, so the mix design conversation with your engineer starts from the right place. These are indications — never a finished specification.",
    properties: [
      "Mix design (w/c ratio, cement type, cover, curing) follows from the classes the structural engineer assigns",
      ...indicative,
    ],
    why: [
      `Indicated corrosivity band ${f.corrosionIndicative.replace(/_/g, " ")} with humidity ${NUMBER.format(f.relativeHumidityPct)} % and rainfall ≈${NUMBER.format(f.annualRainfallMm)} mm.`,
      ...en206.map((e) => `EN 206: ${e}`),
      ...aci.map((a) => `ACI 318: ${a}`),
    ],
    risks: [
      "Class assignment is a code decision per the adopted local standard; an app cannot read the chloride/sulfate content of your soil and groundwater.",
      "Under-classed cover and higher w/c ratios are the usual cause of reinforcement corrosion and frost scaling.",
    ],
    standards: [
      std(
        "EN 206",
        "Concrete — specification, performance, production and conformity",
        ENGINEER_CONFIRMATION,
      ),
      std(
        "ACI 318-19 §19.3",
        "Building code requirements for structural concrete — exposure classes",
        ENGINEER_CONFIRMATION,
      ),
      std(
        "ISO 9223",
        "Corrosion of metals and alloys — corrosivity classification of atmospheres",
        "The measurement-based framework your engineer can use to confirm the corrosivity band used here.",
      ),
    ],
    installation: [
      "Specify curing method and duration before the pour; humid climates still need control of drying-out of the surface zone.",
      "Test soil/groundwater for sulfates and chlorides — this advisor cannot assess them.",
    ],
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// 6. Corrosion-resistant steel and coatings
// ─────────────────────────────────────────────────────────────
function steelCoatings(f: EnvironmentalFactors): CategoryAdvice {
  const bandMap: Record<EnvironmentalFactors["corrosionIndicative"], string> = {
    low: "C2",
    moderate: "C3",
    elevated: "C4",
    high: "C5",
    very_high: "C5/CX",
  };
  const category = bandMap[f.corrosionIndicative];

  const properties = [
    `Protective system matched to indicative ISO 12944 corrosivity category ${category} (indicative, not a classification)`,
    "Duplex protection for high-exposure elements: hot-dip galvanising plus a compatible topcoat system",
  ];
  const why = [
    `Derived from humidity ${NUMBER.format(f.relativeHumidityPct)} %, coastal band ${f.coastal.band.replace(/_/g, "-")} and warmth ${NUMBER.format(f.tempMeanC)} °C.`,
    "ISO 12944 categories express corrosion load over the structure's life; the coating system's durability band (medium/high/very high) should match the maintenance regime.",
  ];
  const risks = [
    "Cut edges, welds and bolt threads are coating-system failures first; they need specific treatment in the specification.",
    "De-icing salts in winter climates add a separate chloride load even far from the sea.",
  ];
  const installation = [
    "Surface preparation grade (e.g. ISO 8501-1 Sa 2½) is part of the specification — confirm it in the coating data sheet.",
    "Inspect and maintain at the durability band's intervals; touch up damage immediately.",
  ];

  if (f.coastal.band === "coast_adjacent" || f.coastal.band === "coastal") {
    properties.push(
      "Austenitic stainless steel 316/316L for fixings and exposed small elements (304 is marginal in marine air)",
    );
    installation.push(
      "Isolate dissimilar metals to avoid galvanic corrosion; use insulating washers at steel/aluminium interfaces.",
    );
  }

  return {
    id: "steel-coatings",
    category: "Corrosion-resistant steel and coatings",
    title: "Steel protection system",
    summary: `A protective coating concept for ${category}-level indicative corrosivity, with the galvanising and stainless details that actually decide service life.`,
    properties,
    why,
    risks,
    standards: [
      std(
        "ISO 12944",
        "Paints and varnishes — corrosion protection of steel structures by protective paint systems",
        ENGINEER_CONFIRMATION,
      ),
      std(
        "ISO 1461",
        "Hot-dip galvanised coatings on fabricated iron and steel articles",
        SPEC_CAVEAT,
      ),
      std(
        "ISO 9223",
        "Corrosivity of atmospheres — classification, determination and estimation",
        "The measured-deposition framework that would confirm the indicative band used here.",
      ),
      std(
        "EN 1090-2",
        "Execution of steel structures — technical requirements",
        ENGINEER_CONFIRMATION,
      ),
    ],
    installation,
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// 7. Insulation
// ─────────────────────────────────────────────────────────────
function insulation(f: EnvironmentalFactors): CategoryAdvice {
  const properties: string[] = [
    "Insulation type and thickness set by the local energy code's required R-value — not by this advisor",
  ];
  const why: string[] = [];
  const risks: string[] = [];
  const installation: string[] = [
    "Keep the vapour-control layer continuous; locate it on the correct side for the design's drying direction.",
  ];

  if (f.heatStress || f.strongUv) {
    properties.push(
      "Roof-focused strategy: solar-reflective roof surface, radiant barrier or ventilated roof cavity, plus ceiling insulation",
    );
    why.push(
      `High peak temperatures (${NUMBER.format(f.tempMaxC)} °C) and strong UV make the roof the dominant heat path; reflection plus insulation beats insulation alone.`,
    );
    risks.push(
      "Reflective surfaces lose performance when dust-covered — cleaning is part of the system.",
    );
  }

  if (f.highHumidity || f.highRainfall) {
    properties.push(
      "Closed-cell or moisture-tolerant insulation in humid assemblies with an exterior drainage path",
    );
    why.push(
      `Humidity ${NUMBER.format(f.relativeHumidityPct)} %: open-cell insulation that stays wet loses thermal performance and supports mould.`,
    );
    risks.push(
      "Vapour trapped in the wrong layer condenses inside the assembly and rots timber or corrodes steel.",
    );
  }

  if (f.frostRisk === "seasonal" || f.frostRisk === "frequent") {
    properties.push(
      "Cold-climate strategy: higher R-value, external or cavity insulation limiting thermal bridging, and snow-aware roof ventilation",
    );
    why.push(
      `${NUMBER.format(f.frostDaysPerYear)} frost days per year: heat loss through bridges and roof melting cause ice damming.`,
    );
    risks.push(
      "Ice dams at eaves force meltwater under the covering; undersized insulation raises heating energy and condensation risk.",
    );
    installation.push(
      "Seal air paths before adding insulation — air movement defeats it.",
    );
  }

  return {
    id: "insulation",
    category: "Insulation",
    title: "Thermal insulation strategy",
    summary:
      "Insulation concept matched to this site's heat, humidity and frost exposure. Required R-values come from your local energy code.",
    properties,
    why,
    risks,
    standards: [
      std(
        "ASTM C518",
        "Steady-state thermal transmission properties by means of the heat flow meter apparatus",
        "The measurement method behind declared insulation performance.",
      ),
      std("EN 13162", "Mineral wool products for buildings", SPEC_CAVEAT),
      std("EN 13164", "Extruded polystyrene (XPS) products", SPEC_CAVEAT),
      std(
        "EN 13501-1",
        "Fire classification of construction products and building elements",
        "Ask suppliers for the classification of the product proposed.",
      ),
    ],
    installation,
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// 8. Drainage materials
// ─────────────────────────────────────────────────────────────
function drainage(f: EnvironmentalFactors): CategoryAdvice {
  const properties: string[] = [
    "Gutter and downpipe sizing from the local rainfall intensity and roof area — per the local plumbing/drainage code",
  ];
  const why: string[] = [];
  const risks: string[] = [];
  const installation: string[] = [
    "Keep gutters and outlets accessible for clearing; blockages, not capacity, cause most failures.",
  ];

  if (f.highRainfall) {
    properties.push(
      "Oversized gutters with leaf guards, channel drains at thresholds, and permeable/surface-water attenuation where the site allows",
    );
    why.push(
      `≈${NUMBER.format(f.annualRainfallMm)} mm annual rainfall in intense storms: undersized gutters overflow at the fascia and wash out foundations.`,
    );
    risks.push(
      "Overflow at valleys and downpipe inlets erodes beds and stains façades; silt blocks channels within a season if ungated.",
    );
  }

  if (f.floodProxy === "low_lying") {
    properties.push(
      "Perimeter drainage, backflow prevention on connections, and raised finished-floor levels where the designer allows",
    );
    why.push(
      `Low elevation (${f.elevationM !== null ? `${NUMBER.format(f.elevationM)} m` : "low-lying ground"}) with heavy rainfall means surface water can pond against the building.`,
    );
    risks.push(
      "Flood exposure itself is NOT assessed by this tool — check the local flood map and authority requirements.",
    );
  }

  if (f.frostRisk === "seasonal" || f.frostRisk === "frequent") {
    properties.push(
      "Drainage laid below frost penetration depth; falls maintained so water never ponds and freezes",
    );
    why.push(
      `${NUMBER.format(f.frostDaysPerYear)} frost days per year: shallow pipes freeze, and ponding water splits paved surfaces on freezing.`,
    );
  }

  if (f.coastal.band === "coastal" || f.coastal.band === "coast_adjacent") {
    properties.push(
      "Salt-tolerant gutter systems (uPVC/PP or coated metal with marine-grade fasteners)",
    );
    why.push(
      "Marine air corrodes standard galvanised gutters and fixings from the inside out at joints.",
    );
  }

  return {
    id: "drainage",
    category: "Drainage materials",
    title: "Drainage and water management",
    summary:
      "Gutters, channels and sub-surface drainage sized for this site's rainfall intensity and ground-level attention points.",
    properties,
    why,
    risks,
    standards: [
      std(
        "EN 12056",
        "Gravity drainage systems inside buildings",
        ENGINEER_CONFIRMATION,
      ),
      std(
        "EN 1433",
        "Drainage channels for vehicular and pedestrian areas",
        SPEC_CAVEAT,
      ),
      std(
        "CIRIA C753",
        "The SuDS Manual — sustainable drainage guidance",
        "Design guidance for surface-water attenuation where the site allows.",
      ),
    ],
    installation,
    confidence: "climate-matched",
  };
}

// ─────────────────────────────────────────────────────────────
// General guidance (no environmental data)
// ─────────────────────────────────────────────────────────────
function generalCategories(): CategoryAdvice[] {
  const general = (
    id: string,
    category: string,
    title: string,
    summary: string,
    properties: string[],
    risks: string[],
    standards: TechnicalStandard[],
  ): CategoryAdvice => ({
    id,
    category,
    title,
    summary,
    properties,
    why: [
      "No environmental data is available for this location, so this is general guidance rather than climate-matched advice.",
    ],
    risks,
    standards,
    installation: [
      "Confirm local exposure conditions (rainfall, humidity, salts, frost) with the project's engineer before specifying.",
    ],
    confidence: "general",
  });

  return [
    general(
      "exterior-paint",
      "Exterior paints",
      "Exterior wall paint system",
      "General starting point: a breathable, alkali-resistant exterior system with a fungicidal film, adjusted to your local climate.",
      [
        "100% acrylic or acrylic-silicone exterior system",
        "Alkali-resistant primer on new render",
      ],
      [
        "Film failures usually start at damp substrates and inadequate surface preparation.",
      ],
      [std("ISO 6270-1", "Resistance to humidity (condensation)", SPEC_CAVEAT)],
    ),
    general(
      "waterproofing",
      "Waterproofing systems",
      "Waterproofing and damp protection",
      "General principle: continuous positive-side waterproofing with reinforced details, plus drainage that removes water before it can pond.",
      [
        "Continuous membrane with reinforced corners and penetrations",
        "Drained protection where below grade",
      ],
      [
        "Ponding water and blocked outlets are the most common causes of failure.",
      ],
      [
        std(
          "EN 13707",
          "Flexible sheets for waterproofing — reinforced bitumen sheets",
          SPEC_CAVEAT,
        ),
      ],
    ),
    general(
      "roofing",
      "Roofing materials",
      "Roof covering and metal protection",
      "General principle: pitch and laps per the covering manufacturer's limits, and metal protection matched to the local corrosivity conditions.",
      [
        "Covering and flashing system rated for the design pitch",
        "Corrosion protection consistent across sheets and fixings",
      ],
      ["Cut edges and fixings corrode before the sheet surface does."],
      [
        std(
          "EN 508-1",
          "Roofing products from metal sheet — steel",
          SPEC_CAVEAT,
        ),
      ],
    ),
    general(
      "flooring-tiles",
      "Flooring and exterior tiles",
      "Exterior tile and paving system",
      "General principle: low-absorption tiles, slip resistance for wet areas, and exterior-rated adhesive and grout.",
      [
        "Porcelain tile with exterior rating",
        "Slip-resistant finish in wet zones",
      ],
      ["Interior-grade adhesive and high-absorption tiles fail outdoors."],
      [
        std(
          "ISO 13006",
          "Ceramic tiles — classification and characteristics",
          SPEC_CAVEAT,
        ),
      ],
    ),
    general(
      "concrete-exposure",
      "Concrete exposure classes",
      "Indicative concrete exposure classes",
      "Exposure classes must be assigned by the structural engineer from the adopted code and tested ground conditions.",
      [
        "Class assignment by the engineer per the local code",
        "Cover and mix design following from that assignment",
      ],
      ["An app cannot measure soil/groundwater chlorides or sulfates."],
      [
        std(
          "EN 206",
          "Concrete — specification, performance, production and conformity",
          ENGINEER_CONFIRMATION,
        ),
        std("ACI 318-19 §19.3", "Exposure classes", ENGINEER_CONFIRMATION),
      ],
    ),
    general(
      "steel-coatings",
      "Corrosion-resistant steel and coatings",
      "Steel protection system",
      "General principle: define the corrosivity category with the engineer, then choose the coating system and its maintenance regime together.",
      [
        "Protective system matched to an agreed corrosivity category",
        "Duplex (galvanising plus topcoat) for severe exposure",
      ],
      ["Cut edges, welds and threads need explicit treatment."],
      [
        std(
          "ISO 12944",
          "Corrosion protection of steel structures by protective paint systems",
          ENGINEER_CONFIRMATION,
        ),
        std("ISO 1461", "Hot-dip galvanised coatings", SPEC_CAVEAT),
      ],
    ),
    general(
      "insulation",
      "Insulation",
      "Thermal insulation strategy",
      "General principle: meet the local energy code's R-value, keep the vapour-control layer continuous and on the correct side.",
      [
        "Insulation meeting the local code requirement",
        "Continuous air and vapour control",
      ],
      ["Air movement and trapped moisture defeat insulation."],
      [
        std(
          "ASTM C518",
          "Thermal transmission by heat flow meter",
          SPEC_CAVEAT,
        ),
      ],
    ),
    general(
      "drainage",
      "Drainage materials",
      "Drainage and water management",
      "General principle: size gutters and drains from local rainfall intensity and the actual roof/catchment areas, per the local code.",
      [
        "Gutters and downpipes sized per the local drainage code",
        "Accessible outlets",
      ],
      ["Blockages and undersized outlets cause most drainage failures."],
      [
        std(
          "EN 12056",
          "Gravity drainage systems inside buildings",
          ENGINEER_CONFIRMATION,
        ),
      ],
    ),
  ];
}

export const ADVISOR_DISCLOSURES = [
  "General guidance only. This is not a structural engineering assessment, a code compliance determination, or a substitute for a licensed engineer, architect, or the authority having jurisdiction.",
  "No product certification and no code compliance is claimed. Standards are named as the frameworks that govern the properties discussed; the specifier confirms applicability.",
  "Concrete exposure classes and corrosivity bands are indications from climate proxies. Assigning classes requires the project's licensed engineer and the adopted code, plus tests this tool cannot perform (soil/groundwater chemistry, chloride deposition rates).",
  "Flood exposure is not assessed from climate data — consult your local flood map and drainage authority.",
  "Coastal distance is approximate: it is measured to a generalized coastline reference (±25 km), and is used for banding only.",
  "Climate normals describe long-term averages, not this week's weather. Local topography and urban microclimate can differ from the gridded data.",
];

export function buildAdvisor(
  factors: EnvironmentalFactors | null,
): AdvisorResult {
  if (!factors) {
    return {
      confidence: "general",
      categories: generalCategories(),
      drivers: [],
      missing: ["climate_normals"],
      sources: [],
      disclosures: ADVISOR_DISCLOSURES,
    };
  }

  const categories = [
    exteriorPaint(factors),
    waterproofing(factors),
    roofing(factors),
    flooringTiles(factors),
    concreteExposure(factors),
    steelCoatings(factors),
    insulation(factors),
    drainage(factors),
  ];

  return {
    confidence: "climate-matched",
    categories,
    drivers: driversFor(factors),
    missing: factors.missing,
    sources: factors.sources,
    disclosures: ADVISOR_DISCLOSURES,
  };
}
