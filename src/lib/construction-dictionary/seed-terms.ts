// =========================================================
// FRELUX AI MULTILINGUAL CONSTRUCTION DICTIONARY
// INITIAL SEED DICTIONARY (spec §20 and §23)
//
// ACCURACY IS MORE IMPORTANT THAN QUANTITY. The seed below
// is deliberately curated rather than padded to a numeric
// target: every record carries a real definition, context
// and example. Translations are included ONLY where they
// are reliable standard terminology; everything else is
// flagged translation_status = needs_review or left
// untranslated with keep_in_english = true. Nothing here is
// invented. The dictionary grows through the admin
// verification pipeline (spec §13) and the DB, not through
// bulk fabrication.
// =========================================================

import type { ConstructionTerm, ConstructionTermDraft } from "./types";

function term(d: Partial<ConstructionTermDraft> & Pick<ConstructionTermDraft, "canonical_term" | "category" | "definition" | "technical_definition" | "simple_definition" | "construction_context" | "example_usage">): ConstructionTermDraft {
  return {
    language: "en",
    translation: null,
    alternative_terms: [],
    local_terms: [],
    synonyms: [],
    abbreviations: [],
    unit: null,
    measurement_type: null,
    related_terms: [],
    common_mistakes: [],
    translation_notes: null,
    country: "NG",
    region: "West Africa",
    source: "FRELUX Engineering",
    source_url: null,
    source_date: new Date().toISOString().slice(0, 10),
    confidence_score: 0.95,
    translation_status: "untranslated",
    keep_in_english: false,
    explanation_required: false,
    nigerian_terminology: null,
    source_details: { source_name: "FRELUX Engineering", country: "NG" },
    ...d,
  } as ConstructionTermDraft;
}

/** The curated seed records (all start UNVERIFIED for admin
 *  review; verification is a deliberate human action). */
export const SEED_CONSTRUCTION_TERMS: ConstructionTermDraft[] = [
  // ---------- BUILDING ----------
  term({
    canonical_term: "wall", category: "building",
    definition: "A vertical structure that encloses or divides spaces and carries loads.",
    technical_definition: "Vertical load-bearing or non-load-bearing masonry/RC element transferring loads to the foundation.",
    simple_definition: "The upright part of a building that divides rooms or holds the roof.",
    construction_context: "Walls are built in sandcrete block or concrete; thickness affects sound, load and cost.",
    example_usage: "The external walls will be 225 mm thick blockwork.",
    unit: "m2", measurement_type: "area", related_terms: ["blockwork", "masonry", "column"],
    common_mistakes: ["Measuring wall area without deducting openings"],
    synonyms: ["partition"],
  }),
  term({
    canonical_term: "blockwork", category: "building",
    definition: "Masonry construction using sandcrete or hollow blocks laid in mortar.",
    technical_definition: "Stacked masonry units bonded with cement-sand mortar in running bond.",
    simple_definition: "Walls made by joining blocks together with mortar.",
    construction_context: "The standard Nigerian walling method; 450x225x225 and 450x225x150 blocks are common.",
    example_usage: "Blockwork to lintel level is complete.",
    related_terms: ["sandcrete block", "mortar"], common_mistakes: ["Calling it brickwork when no bricks are used"],
    nigerian_terminology: {
      formal_term: "blockwork", nigerian_common_term: "block work", technical_equivalent: "masonry in sandcrete units",
      is_ambiguous: false,
    },
  }),
  term({
    canonical_term: "lintel", category: "building",
    definition: "A horizontal beam over a door or window opening that carries the wall above.",
    technical_definition: "Flexural member over an opening distributing superimposed load to the jambs.",
    simple_definition: "The concrete beam on top of doors and windows.",
    construction_context: "Typically 150x225 mm RC in Nigerian practice spanning openings.",
    example_usage: "Cast the lintels after blockwork reaches door height.",
    related_terms: ["beam", "column"], common_mistakes: ["Omitting lintels over small openings"],
  }),
  term({
    canonical_term: "column", category: "building",
    definition: "A vertical structural member that carries loads in compression.",
    technical_definition: "Vertical RC or steel compression member transferring loads to the foundation.",
    simple_definition: "The upright support that carries the building.",
    construction_context: "Columns carry the frame; sizes are specified by the engineer.",
    example_usage: "The 225x225 columns are cast with the concrete frame.",
    related_terms: ["beam", "slab", "foundation"],
    common_mistakes: ["Confusing columns with piers or buttresses"],
  }),
  term({
    canonical_term: "beam", category: "building",
    definition: "A horizontal structural member that resists loads in bending.",
    technical_definition: "Flexural member spanning supports and transferring loads to columns or walls.",
    simple_definition: "The horizontal concrete or steel member that carries floors.",
    construction_context: "Beams frame into columns; reinforcement follows the engineer's detail.",
    example_usage: "The ground floor beams will be 225x450 mm.",
    related_terms: ["column", "slab", "lintel"], common_mistakes: ["Mixing up beams and lintels"],
  }),
  term({
    canonical_term: "slab", category: "building",
    definition: "A flat horizontal structural element forming a floor or roof.",
    technical_definition: "RC plate element spanning beams or walls, designed for bending and deflection.",
    simple_definition: "The flat concrete floor of a building.",
    construction_context: "Solid slabs of 150 mm are common in Nigerian residential builds.",
    example_usage: "The first floor slab is a 150 mm solid slab.",
    unit: "m2", measurement_type: "area", related_terms: ["beam", "formwork"],
    common_mistakes: ["Estimating slab concrete without beam volume"],
  }),
  term({
    canonical_term: "staircase", category: "building",
    definition: "A series of steps connecting different floor levels.",
    technical_definition: "Structural stair assembly of treads and risers spanning between landings.",
    simple_definition: "The steps inside a building for going up and down.",
    construction_context: "Riser/tread proportions matter for comfort and code.",
    example_usage: "The staircase has a 250 mm tread and 175 mm riser.",
    related_terms: ["landing", "handrail"], common_mistakes: ["Uneven risers"],
  }),
  term({
    canonical_term: "DPC", category: "building",
    definition: "Damp-proof course: a moisture barrier laid in walls near ground level.",
    technical_definition: "Impervious membrane or rich concrete layer preventing rising damp.",
    simple_definition: "The layer that stops water from rising up the walls.",
    construction_context: "Laid at or above finished ground level, minimum 150 mm above ground.",
    example_usage: "Lay the DPC before continuing blockwork above it.",
    abbreviations: ["DPC"], synonyms: ["damp-proof course", "damp-proof membrane"],
    common_mistakes: ["Placing the DPC below ground level"],
  }),
  // ---------- ROOFING ----------
  term({
    canonical_term: "roof", category: "roofing",
    definition: "The top covering of a building protecting it from weather.",
    technical_definition: "Structural covering system of framing and sheeting shedding water and load.",
    simple_definition: "The top of the building that keeps rain out.",
    construction_context: "Hip and gable roofs are the common Nigerian forms.",
    example_usage: "The roof rises 1.8 m at the ridge.",
    related_terms: ["truss", "rafter", "roofing sheet"],
  }),
  term({
    canonical_term: "truss", category: "roofing",
    definition: "A triangulated frame of timber or steel supporting the roof.",
    technical_definition: "Pin-jointed triangulated frame carrying roof loads in axial members.",
    simple_definition: "The roof frame built from triangles of timber or steel.",
    construction_context: "2x4 or 2x6 timber trusses at 600-1200 mm centers.",
    example_usage: "The trusses are spaced at 600 mm centers.",
    related_terms: ["rafter", "purlin", "roofing timber"], common_mistakes:["Calling every rafter a truss"],
  }),
  term({
    canonical_term: "rafter", category: "roofing",
    definition: "An inclined member supporting the roof covering.",
    technical_definition: "Sloping beam from ridge to wall plate carrying purlins or sheeting.",
    simple_definition: "The sloping timber piece the roof rests on.",
    construction_context: "Rafter length depends on span and pitch.",
    example_usage: "Cut the rafters at 30 degrees pitch.",
    related_terms: ["truss", "ridge", "fascia"],
  }),
  term({
    canonical_term: "purlin", category: "roofing",
    definition: "A horizontal member spanning rafters that supports roofing sheets.",
    technical_definition: "Horizontal secondary member transferring sheet load to rafters.",
    simple_definition: "The horizontal timber the sheets are nailed to.",
    construction_context: "Purlin spacing follows the sheet profile span rating.",
    example_usage: "Space the purlins at 900 mm under long-span sheets.",
    related_terms: ["roofing sheet", "rafter"], common_mistakes: ["Wider purlin spacing than the sheet rating allows"],
  }),
  term({
    canonical_term: "fascia", category: "roofing",
    definition: "The horizontal board along the roof edge, fixed to rafter ends.",
    technical_definition: "Vertical edge board closing rafters and carrying the gutter.",
    simple_definition: "The board around the roof edge that the gutter attaches to.",
    construction_context: "Usually 225 mm or 300 mm fascia board in Nigerian practice.",
    example_usage: "Fix the fascia before installing the gutter.",
    related_terms: ["soffit", "gutter", "barge board"],
  }),
  term({
    canonical_term: "roofing sheet", category: "materials",
    definition: "Profiled metal sheeting that forms the weatherproof roof surface.",
    technical_definition: "Galvanized or aluminium profiled sheet, span-rated between purlins.",
    simple_definition: "The metal sheets used to cover the roof.",
    construction_context: "Long-span aluminium sheets in 0.4-0.7 mm gauges are common.",
    example_usage: "Use 0.55 mm long-span aluminium roofing sheets.",
    unit: "m", measurement_type: "length", related_terms: ["purlin", "ridge cap"],
    common_mistakes: ["Estimating sheet coverage without the overlap allowance"],
  }),
  // ---------- CONCRETE ----------
  term({
    canonical_term: "cement", category: "concrete",
    definition: "The binding powder that reacts with water to hold concrete together.",
    technical_definition: "Hydraulic binder (typically Portland) hydrating to bind aggregates.",
    simple_definition: "The grey powder mixed with sand and stone to make concrete.",
    construction_context: "A 50 kg bag of cement yields about 0.025 m3 of concrete at 1:2:4.",
    example_usage: "Use 6 bags of cement for this slab concrete.",
    unit: "bags", measurement_type: "count", related_terms: ["concrete", "mortar"],
    common_mistakes: ["Confusing cement with concrete"],
  }),
  term({
    canonical_term: "concrete", category: "concrete",
    definition: "The composite of cement, sand, aggregate and water that hardens to stone.",
    technical_definition: "Composite structural material formed by hydrating cement binder around graded aggregates.",
    simple_definition: "The hard grey material buildings are made from.",
    construction_context: "Mix ratios are specified like 1:2:4 for structural concrete.",
    example_usage: "The concrete will be mixed at 1:2:4.",
    unit: "m3", measurement_type: "volume", related_terms: ["cement", "aggregate", "rebar"],
    common_mistakes: ["Saying cement when you mean concrete"],
  }),
  term({
    canonical_term: "mortar", category: "concrete",
    definition: "The cement-sand paste used to join blocks and bricks.",
    technical_definition: "Binder paste of cement, sand and water for bedding masonry units.",
    simple_definition: "The sticky mix used to lay blocks.",
    construction_context: "Typical block-laying mortar is 1:6 cement to sand.",
    example_usage: "Mix the mortar at 1:6 for blockwork.",
    related_terms: ["blockwork", "cement"], common_mistakes: ["Using concrete mix to lay blocks"],
  }),
  term({
    canonical_term: "mix ratio", category: "concrete",
    definition: "The proportion of cement to sand to aggregate in a concrete or mortar mix.",
    technical_definition: "Volumetric proportioning of constituents determining strength grade.",
    simple_definition: "The recipe of cement, sand and stone, like 1:2:4.",
    construction_context: "Specified by the engineer; changing it changes the strength.",
    example_usage: "The blinding is 1:3:6.",
    common_mistakes: ["Weakening structural concrete by eyeballing the ratio"],
    related_terms: ["concrete", "cement"],
  }),
  term({
    canonical_term: "rebar", category: "concrete",
    definition: "Steel reinforcement bar embedded in concrete to carry tension.",
    technical_definition: "Deformed steel bar bonded to concrete resisting tensile stress.",
    simple_definition: "The steel rods inside concrete.",
    construction_context: "Sizes Y10 to Y25 are common in Nigerian residential work.",
    example_usage: "The slab uses Y12 at 200 mm centers.",
    unit: "mm", measurement_type: "length", synonyms: ["reinforcement bar"],
    abbreviations: ["rebar"], related_terms: ["stirrup", "cover", "beam"],
    common_mistakes: ["Confusing rebar diameter with bar length"],
  }),
  term({
    canonical_term: "stirrup", category: "concrete",
    definition: "The closed loop of thin bar that holds beam main bars and resists shear.",
    technical_definition: "Transverse shear reinforcement enclosing longitudinal bars.",
    simple_definition: "The small rings of steel around beam bars.",
    construction_context: "Usually Y8 or Y10 at 200-250 mm spacing.",
    example_usage: "Use Y8 stirrups at 200 mm centers.",
    related_terms: ["rebar", "beam"],
  }),
  // ---------- FOUNDATION ----------
  term({
    canonical_term: "strip foundation", category: "foundation",
    definition: "A continuous foundation band under a load-bearing wall.",
    technical_definition: "Continuous spread footing distributing wall line loads to soil.",
    simple_definition: "The long concrete strip walls sit on.",
    construction_context: "Typically 600-900 mm wide x 225 mm thick in Nigerian practice.",
    example_usage: "The strip foundation is 675 mm wide.",
    related_terms: ["foundation", "footing", "hardcore"],
  }),
  term({
    canonical_term: "raft foundation", category: "foundation",
    definition: "A foundation slab covering the whole building footprint.",
    technical_definition: "Continuous mat footing spreading loads over weak soils.",
    simple_definition: "A big concrete slab under the whole building.",
    construction_context: "Used on weak soils or when combined loads are high.",
    example_usage: "The engineer specified a raft for the waterlogged plot.",
    related_terms: ["foundation", "slab"],
  }),
  term({
    canonical_term: "pad foundation", category: "foundation",
    definition: "An isolated square or rectangular footing under a single column.",
    technical_definition: "Isolated spread footing under a point load.",
    simple_definition: "A single concrete pad under one column.",
    construction_context: "Pad size follows column load and soil capacity.",
    example_usage: "Each column sits on a 900x900 pad.",
    related_terms: ["column", "foundation"],
  }),
  term({
    canonical_term: "hardcore", category: "foundation",
    definition: "Broken stone or rock filled under floors to level and stabilize.",
    technical_definition: "Granular fill layer providing uniform support below ground floors.",
    simple_definition: "The stones filled under the floor before concrete.",
    construction_context: "Compacted in layers, then blinded before the oversite slab.",
    example_usage: "Fill and compact 150 mm of hardcore.",
    unit: "m3", measurement_type: "volume", synonyms: ["granular fill"],
    related_terms: ["blinding", "excavation"],
  }),
  term({
    canonical_term: "blinding", category: "foundation",
    definition: "A thin lean concrete layer placed over hardcore or soil.",
    technical_definition: "Weak concrete leveling and protection layer under foundations or slabs.",
    simple_definition: "The thin concrete layer spread before the main work.",
    construction_context: "Usually 50 mm of 1:3:6 or 1:4:8.",
    example_usage: "Blind the hardcore with 50 mm of lean concrete.",
    related_terms: ["hardcore", "foundation"],
  }),
  term({
    canonical_term: "soil bearing capacity", category: "foundation",
    definition: "The maximum load the soil can carry safely.",
    technical_definition: "Allowable pressure on soil without shear failure or excess settlement.",
    simple_definition: "How strong the ground is for building.",
    construction_context: "Determines footing size; values like 100-150 kN/m2 for firm laterite.",
    example_usage: "The soil test reports 120 kN/m2 bearing capacity.",
    unit: "kN/m2", measurement_type: "pressure",
    common_mistakes: ["Guessing capacity without a soil test"],
  }),
  // ---------- FINISHING ----------
  term({
    canonical_term: "screeding", category: "finishing",
    definition: "Applying a thin cement-sand layer to level a floor or wall.",
    technical_definition: "Thin leveling screed of cementitious mortar to achieve a flat plane.",
    simple_definition: "Smoothing and leveling a surface with a thin cement layer.",
    construction_context: "Floor screed is typically 25-50 mm thick.",
    example_usage: "Screed the floor to level before tiling.",
    unit: "m2", measurement_type: "area", related_terms: ["rendering", "plastering", "tiling"],
    common_mistakes: ["Confusing screeding with plastering"],
    nigerian_terminology: {
      formal_term: "screeding", nigerian_common_term: "screeding", local_expression: "make the floor flat",
      technical_equivalent: "cement-sand floor leveling screed", is_ambiguous: false,
    },
  }),
  term({
    canonical_term: "rendering", category: "finishing",
    definition: "Applying a coat of mortar to an external wall surface.",
    technical_definition: "External cement-sand coating protecting and finishing masonry.",
    simple_definition: "Covering the outside walls with cement mix.",
    construction_context: "Usually two coats, 12-20 mm total thickness.",
    example_usage: "Rendering will follow after blockwork inspection.",
    related_terms: ["plastering", "screeding"], common_mistakes: ["Rendering and plastering used interchangeably"],
  }),
  term({
    canonical_term: "plastering", category: "finishing",
    definition: "Applying mortar to internal walls and ceilings for a smooth finish.",
    technical_definition: "Internal cement-lime-sand finishing coat to receive decoration.",
    simple_definition: "Smoothing inside walls with cement mix.",
    construction_context: "12 mm average thickness is standard for estimating.",
    example_usage: "Plastering is complete on the ground floor.",
    unit: "m2", measurement_type: "area", related_terms: ["rendering", "skimming"],
    nigerian_terminology: {
      formal_term: "plastering", nigerian_common_term: "plastering", local_expression: "cement work inside",
      technical_equivalent: "internal mortar finishing", is_ambiguous: false,
    },
  }),
  term({
    canonical_term: "plaster of paris", category: "finishing",
    definition: "Gypsum plaster used for ceilings, cornices and decorative finishes.",
    technical_definition: "Hemihydrate gypsum plaster setting by rehydration.",
    simple_definition: "The white soft plaster used for ceilings and designs.",
    construction_context: "POP ceilings and cornices are standard Nigerian finishes.",
    example_usage: "The POP ceiling cornice is 100 mm.",
    synonyms: ["POP", "gypsum plaster"], related_terms: ["cornice", "ceiling"],
    nigerian_terminology: {
      formal_term: "plaster of paris", nigerian_common_term: "POP", local_expression: "POP",
      technical_equivalent: "gypsum ceiling and decorative plaster system", is_ambiguous: false,
    },
  }),
  term({
    canonical_term: "tiling", category: "finishing",
    definition: "Fixing ceramic or porcelain tiles onto floors or walls.",
    technical_definition: "Adhesive fixing of fired clay tiles with grouted joints.",
    simple_definition: "Laying tiles on floors and walls.",
    construction_context: "Coverage depends on tile size and joint allowance.",
    example_usage: "Tiling starts with the living room floor.",
    unit: "m2", measurement_type: "area", related_terms: ["grout", "adhesive"],
  }),
  term({
    canonical_term: "emulsion", category: "finishing",
    definition: "Water-based paint for interior walls and ceilings.",
    technical_definition: "Vinyl/acrylic emulsion coating applied by brush or roller.",
    simple_definition: "The normal water-based wall paint.",
    construction_context: "Coverage is about 10-14 m2 per litre per coat.",
    example_usage: "Two coats of emulsion on the walls.",
    unit: "litres", measurement_type: "volume", related_terms: ["primer", "undercoat"],
  }),
  term({
    canonical_term: "primer", category: "finishing",
    definition: "The first paint coat that prepares the surface and seals it.",
    technical_definition: "Bonding and sealing base coat improving adhesion of topcoats.",
    simple_definition: "The first coat put on before the paint.",
    construction_context: "Alkali-resistant primer on fresh plaster.",
    example_usage: "Apply primer before the emulsion.",
    related_terms: ["undercoat", "emulsion"],
  }),
  // ---------- ESTIMATING ----------
  term({
    canonical_term: "waste factor", category: "estimating",
    definition: "The extra percentage added to quantities to cover breakage and cutting.",
    technical_definition: "Allowance coefficient compensating for losses in handling and installation.",
    simple_definition: "The extra materials added for breakage and cutting.",
    construction_context: "Typical allowances: 5% blocks, 10% tiles, 5-10% paint.",
    example_usage: "Add a 10% waste factor to the tile quantity.",
    unit: "%", measurement_type: "ratio", common_mistakes: ["Adding waste twice"],
  }),
  term({
    canonical_term: "coverage rate", category: "estimating",
    definition: "The area a material covers at its specified application or unit.",
    technical_definition: "Area per unit of material at specified thickness or spread.",
    simple_definition: "How much area one unit of material covers.",
    construction_context: "Paint coverage about 10-14 m2 per litre per coat.",
    example_usage: "Emulsion coverage rate is 12 m2 per litre.",
    unit: "m2/litre", measurement_type: "ratio",
  }),
  term({
    canonical_term: "bill of quantities", category: "estimating",
    definition: "The itemized document listing quantities, rates and prices for a project.",
    technical_definition: "Priced schedule of measured work items per standard method of measurement.",
    simple_definition: "The list of all work items with prices.",
    construction_context: "Prepared by a quantity surveyor for tendering.",
    example_usage: "The BOQ totals 25 million naira.",
    abbreviations: ["BOQ"], related_terms: ["quantity surveyor", "quotation"],
  }),
  term({
    canonical_term: "labour rate", category: "estimating",
    definition: "The cost of workmanship per unit of work done.",
    technical_definition: "Priced unit rate for labor output per measured unit.",
    simple_definition: "What the workers charge per unit of work.",
    construction_context: "Often quoted per m2 (plastering) or per unit (blocks laid).",
    example_usage: "Block laying labour is 70 naira per block.",
    unit: "NGN", measurement_type: "currency",
  }),
  // ---------- MEASUREMENTS ----------
  term({
    canonical_term: "square metre", category: "measurements",
    definition: "The standard metric unit of area, one metre by one metre.",
    technical_definition: "SI derived area unit, m2.",
    simple_definition: "A measurement of area, 1 m x 1 m.",
    construction_context: "The base unit for wall, floor and paint quantities.",
    example_usage: "The room is 12 m2.",
    unit: "m2", measurement_type: "area", synonyms: ["square meter"],
    common_mistakes: ["Multiplying length and width in different units"],
  }),
  term({
    canonical_term: "cubic metre", category: "measurements",
    definition: "The standard metric unit of volume.",
    technical_definition: "SI derived volume unit, m3.",
    simple_definition: "A volume of 1 m x 1 m x 1 m.",
    construction_context: "Concrete, hardcore and sand are sold and measured in m3 or truckloads.",
    example_usage: "The slab needs 8.5 m3 of concrete.",
    unit: "m3", measurement_type: "volume", synonyms: ["cubic meter"],
  }),
  term({
    canonical_term: "head pan", category: "tools_equipment",
    definition: "The shallow metal pan used to carry concrete, mortar and sand on site.",
    technical_definition: "Manual material handling pan of about 0.017 m3 capacity.",
    simple_definition: "The pan workers use to carry sand and concrete.",
    construction_context: "Four head pans of sand plus one of cement approximates 1:4 mortar.",
    example_usage: "Mix one head pan of cement to four of sand.",
    synonyms: ["kango"], related_terms: ["shovel", "mortar"],
    nigerian_terminology: {
      formal_term: "head pan", nigerian_common_term: "kango", technical_equivalent: "site material handling pan",
      is_ambiguous: false,
    },
  }),
  // ---------- SAFETY ----------
  term({
    canonical_term: "personal protective equipment", category: "safety",
    definition: "Protective clothing and gear worn on site to reduce injury risk.",
    technical_definition: "Wearable protective controls per the hierarchy of safety measures.",
    simple_definition: "Helmet, boots, gloves and other protective wear.",
    construction_context: "Hard hats, safety boots and gloves are minimum site PPE.",
    example_usage: "No entry without PPE.",
    abbreviations: ["PPE"], synonyms: ["PPE"],
  }),
  term({
    canonical_term: "formwork", category: "tools_equipment",
    definition: "The temporary mould that holds fresh concrete in shape.",
    technical_definition: "Temporary falsework and moulds until concrete gains strength.",
    simple_definition: "The wooden or steel mould for casting concrete.",
    construction_context: "Formwork quality directly affects concrete surface finish.",
    example_usage: "The beam formwork will be struck after 14 days.",
    related_terms: ["slab", "beam"], synonyms: ["shuttering"],
  }),
  // ---------- PROJECT MANAGEMENT ----------
  term({
    canonical_term: "quantity surveyor", category: "project_management",
    definition: "The professional who measures work, prepares BOQs and manages cost.",
    technical_definition: "Construction cost and contract management professional.",
    simple_definition: "The person who calculates how much the project will cost.",
    construction_context: "Produces the BOQ and certifies valuations.",
    example_usage: "The quantity surveyor issued the interim valuation.",
    abbreviations: ["QS"], related_terms: ["bill of quantities", "estimate"],
  }),
  term({
    canonical_term: "subcontractor", category: "project_management",
    definition: "A specialist engaged by the main contractor to perform part of the work.",
    technical_definition: "Contracted party executing a work package under the main contract.",
    simple_definition: "A specialist worker hired by the main contractor.",
    construction_context: "Tiling, POP and roofing are often subcontracted.",
    example_usage: "The subcontractor starts the POP work on Monday.",
    related_terms: ["contractor", "milestone"],
  }),
];

/**
 * Seed translation records derived from the curated set.
 * Only reliable translations are included (standard formal
 * terminology). They are marked provisional until an admin
 * verifies them; nothing is invented.
 */
export const SEED_TRANSLATIONS: Array<{
  canonical_term: string;
  language: string;
  translation: string;
  confidence_score: number;
  translation_notes: string;
}> = [
  // Pidgin (Nigeria): common site usage, high confidence
  { canonical_term: "cement", language: "pcm", translation: "cement", confidence_score: 0.99, translation_notes: "Same word in Pidgin site usage." },
  { canonical_term: "concrete", language: "pcm", translation: "concrete", confidence_score: 0.98, translation_notes: "Workers say concrete or casting mix." },
  { canonical_term: "sand", language: "pcm", translation: "sand", confidence_score: 0.99, translation_notes: "Same word." },
  { canonical_term: "roof", language: "pcm", translation: "ruf", confidence_score: 0.9, translation_notes: "Common site pronunciation; formal English spelling retained in writing." },
  // French: standard formal terminology
  { canonical_term: "cement", language: "fr", translation: "ciment", confidence_score: 0.97, translation_notes: "Standard French construction term." },
  { canonical_term: "concrete", language: "fr", translation: "béton", confidence_score: 0.97, translation_notes: "Standard French construction term." },
  { canonical_term: "wall", language: "fr", translation: "mur", confidence_score: 0.96, translation_notes: "Standard French construction term." },
  { canonical_term: "roof", language: "fr", translation: "toit", confidence_score: 0.96, translation_notes: "Standard French construction term." },
  { canonical_term: "tile", language: "fr", translation: "carrelage", confidence_score: 0.95, translation_notes: "Standard French construction term." },
  { canonical_term: "paint", language: "fr", translation: "peinture", confidence_score: 0.96, translation_notes: "Standard French construction term." },
  { canonical_term: "foundation", language: "fr", translation: "fondation", confidence_score: 0.96, translation_notes: "Standard French construction term." },
  { canonical_term: "beam", language: "fr", translation: "poutre", confidence_score: 0.95, translation_notes: "Standard French construction term." },
  { canonical_term: "column", language: "fr", translation: "colonne / poteau", confidence_score: 0.9, translation_notes: "Poteau is the usual structural term for RC columns." },
  // Spanish: standard formal terminology
  { canonical_term: "cement", language: "es", translation: "cemento", confidence_score: 0.97, translation_notes: "Standard Spanish construction term." },
  { canonical_term: "concrete", language: "es", translation: "hormigón / concreto", confidence_score: 0.95, translation_notes: "Hormigón in Spain, concreto in Latin America." },
  { canonical_term: "roof", language: "es", translation: "tejado / techo", confidence_score: 0.93, translation_notes: "Tejado for the sloped roof, techo for the ceiling surface." },
  { canonical_term: "paint", language: "es", translation: "pintura", confidence_score: 0.96, translation_notes: "Standard Spanish term." },
  // Portuguese: standard formal terminology
  { canonical_term: "cement", language: "pt", translation: "cimento", confidence_score: 0.97, translation_notes: "Standard Portuguese construction term." },
  { canonical_term: "concrete", language: "pt", translation: "betão / concreto", confidence_score: 0.94, translation_notes: "Betão in Portugal, concreto in Brazil." },
  { canonical_term: "roof", language: "pt", translation: "telhado", confidence_score: 0.96, translation_notes: "Standard Portuguese construction term." },
  { canonical_term: "tile", language: "pt", translation: "azulejo", confidence_score: 0.96, translation_notes: "Standard Portuguese term." },
  // Arabic: standard formal terminology
  { canonical_term: "cement", language: "ar", translation: "أسمنت", confidence_score: 0.95, translation_notes: "Standard Arabic construction term." },
  { canonical_term: "concrete", language: "ar", translation: "خرسانة", confidence_score: 0.95, translation_notes: "Standard Arabic construction term." },
  { canonical_term: "wall", language: "ar", translation: "جدار", confidence_score: 0.95, translation_notes: "Standard Arabic construction term." },
  { canonical_term: "foundation", language: "ar", translation: "أساس", confidence_score: 0.95, translation_notes: "Standard Arabic construction term." },
  // Hindi: standard formal terminology
  { canonical_term: "cement", language: "hi", translation: "सीमेंट", confidence_score: 0.95, translation_notes: "Standard Hindi construction term." },
  { canonical_term: "wall", language: "hi", translation: "दीवार", confidence_score: 0.95, translation_notes: "Standard Hindi construction term." },
  { canonical_term: "roof", language: "hi", translation: "छत", confidence_score: 0.93, translation_notes: "Can also mean ceiling depending on context; keep note." },
  // Chinese: standard formal terminology
  { canonical_term: "cement", language: "zh", translation: "水泥", confidence_score: 0.95, translation_notes: "Standard Chinese construction term." },
  { canonical_term: "concrete", language: "zh", translation: "混凝土", confidence_score: 0.95, translation_notes: "Standard Chinese construction term." },
  { canonical_term: "wall", language: "zh", translation: "墙", confidence_score: 0.95, translation_notes: "Standard Chinese construction term." },
  { canonical_term: "roof", language: "zh", translation: "屋顶", confidence_score: 0.95, translation_notes: "Standard Chinese construction term." },
];

/** Convert drafts to full records (for tests and the seed
 *  loader; the DB assigns ids and timestamps). */
export function instantiateSeedRecords(): ConstructionTerm[] {
  const now = new Date().toISOString();
  return SEED_CONSTRUCTION_TERMS.map((d, i) => ({
    ...d,
    id: `seed-${i + 1}`,
    version: 1,
    verified: false,
    verified_by: null,
    created_at: now,
    updated_at: now,
  }));
}
