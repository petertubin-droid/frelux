/**
 * FRELUX International Construction Typologies Architecture
 *
 * Modular structural and foundation typologies for all 20 markets.
 * Replaces hardcoded Nigerian sandcrete/concrete defaults with modular typologies.
 *
 * Non-negotiable honesty rules:
 * - Preliminary quantity takeoff, NOT certified structural or civil engineering design.
 * - Requires site-specific engineering inputs (frost depth, soil bearing, seismic zone).
 * - Never claims automatic code compliance or structural safety.
 */

export interface ConstructionTypology {
  id: string;
  marketCodes: string[];
  name: string;
  regionalCategory:
    | "west_african_masonry"
    | "north_american_timber_frame"
    | "british_cavity_wall"
    | "european_masonry_concrete"
    | "asian_rcc_frame"
    | "middle_eastern_concrete"
    | "latin_american_masonry"
    | "general_rcc";
  primaryStructuralSystem: string;
  wallTypology: string;
  foundationTypology: string;
  roofTypology: string;
  applicableStandards: string;
  typicalFramingOrUnitSize: string;
  disclaimer: string;
}

export const CONSTRUCTION_TYPOLOGIES: Record<string, ConstructionTypology> = {
  NG: {
    id: "ng_sandcrete_concrete",
    marketCodes: ["NG"],
    name: "West African Sandcrete Blockwork & Reinforced Concrete Frame",
    regionalCategory: "west_african_masonry",
    primaryStructuralSystem:
      "Cast-in-situ reinforced concrete columns, beams, and slab floor plates",
    wallTypology:
      "225 mm (9-inch) external and 150 mm (6-inch) internal hollow sandcrete blocks with 1:4 cement-sand render",
    foundationTypology:
      "Strip foundation in mass concrete or raft foundation on expansive/waterlogged soils",
    roofTypology:
      "Hardwood timber roof trusses (0.45mm / 0.55mm aluminium corrugated or stone-coated step tiles)",
    applicableStandards:
      "Nigerian National Building Code & BS 8110 / Eurocode 2",
    typicalFramingOrUnitSize:
      "450 x 225 x 225 mm sandcrete blocks; 225 x 225 mm RC columns",
    disclaimer:
      "Preliminary material takeoff. Soil bearing capacity and structural member reinforcement must be designed by a registered COREN structural engineer.",
  },
  US: {
    id: "us_light_timber_frame",
    marketCodes: ["US"],
    name: "North American Light-Frame Wood Construction",
    regionalCategory: "north_american_timber_frame",
    primaryStructuralSystem:
      "Platform frame dimension lumber (2x4 / 2x6 studs at 16 in or 24 in o.c.) with engineered wood floor joists / I-joists",
    wallTypology:
      "2x6 exterior walls with OSB/plywood shear sheathing, housewrap (WRB), cavity insulation (R-20+), and 1/2 inch gypsum interior board",
    foundationTypology:
      "Poured concrete basement, ventilated crawlspace, or monolithic slab-on-grade per IRC R403",
    roofTypology:
      "Engineered timber roof trusses with 7/16 inch OSB sheathing, synthetic underlayment, and fiberglass asphalt architectural shingles",
    applicableStandards:
      "International Residential Code (IRC 2024) & IBC / NDS for Wood Construction",
    typicalFramingOrUnitSize:
      "2x6 studs (1.5 x 5.5 in) at 16 in o.c.; 4x8 ft OSB panels",
    disclaimer:
      "Preliminary material takeoff only. Local frost depth, wind exposure, seismic design category, and energy compliance (IECC) dictate actual required sections.",
  },
  CA: {
    id: "ca_light_timber_frame",
    marketCodes: ["CA"],
    name: "Canadian Cold-Climate Light-Frame Wood Construction",
    regionalCategory: "north_american_timber_frame",
    primaryStructuralSystem:
      "Platform-frame lumber with high-performance continuous thermal breaks",
    wallTypology:
      "2x6 wood framing with exterior continuous rigid insulation, 6 mil polyethylene air/vapour barrier, and interior 1/2 inch drywall",
    foundationTypology:
      "Deep frost-protected full basement with perimeter drainage weeping tile per NBC Part 9",
    roofTypology:
      "Engineered high-heel energy trusses allowing uncompressed attic insulation (R-60) with ice-and-water shield eaves protection",
    applicableStandards:
      "National Building Code of Canada (NBC 2020 Part 9 Housing and Small Buildings)",
    typicalFramingOrUnitSize:
      "2x6 studs at 16 in o.c.; continuous R-5/R-10 exterior insulation",
    disclaimer:
      "Preliminary material takeoff only. Cold-climate building envelope and deep frost depth (1.2m - 2.4m+) must comply with provincial building codes (OBC, BCBC, etc.).",
  },
  GB: {
    id: "gb_cavity_brick_block",
    marketCodes: ["GB"],
    name: "British Cavity Wall & Timber Floor Construction",
    regionalCategory: "british_cavity_wall",
    primaryStructuralSystem:
      "Masonry cavity wall (outer facing brick + insulated cavity + inner aerated/aggregate concrete block) or timber frame inner leaf",
    wallTypology:
      "102.5 mm facing brick + 100-150 mm fully filled cavity insulation + 100 mm concrete blockwork with plasterboard on dabs or timber battens",
    foundationTypology:
      "Trench fill or strip footing to Approved Document A/C, minimum 750 mm - 1000 mm depth depending on soil clay shrinkability",
    roofTypology:
      "Treated timber fink trusses or cut roof with breathable sarking membrane, counter-battens, and concrete interlocking or clay roof tiles",
    applicableStandards:
      "Building Regulations 2010 England & Wales (Approved Documents A, C, L) & BS EN 1996 Eurocode 6",
    typicalFramingOrUnitSize:
      "215 x 102.5 x 65 mm facing bricks; 440 x 215 x 100 mm concrete blocks",
    disclaimer:
      "Preliminary material takeoff only. Foundation depth in shrinkable clay soils influenced by nearby trees requires engineer verification.",
  },
  AU: {
    marketCode: "AU",
    id: "au_brick_veneer_timber",
    marketCodes: ["AU"],
    name: "Australian Brick Veneer & Lightweight Timber Framing",
    regionalCategory: "british_cavity_wall",
    primaryStructuralSystem:
      "Timber or light gauge steel structural framing with external masonry non-structural veneer leaf",
    wallTypology:
      "110 mm clay brick veneer leaf + 40-50 mm cavity + 90 mm stud framing with reflective foil laminate (sarking) and plasterboard interior lining",
    foundationTypology:
      "Waffle raft slab (AS 2870) or traditional strip footings with suspended timber floor",
    roofTypology:
      "Prefabricated timber trusses with metal roof battens and corrugated Colorbond steel sheeting or concrete roof tiles",
    applicableStandards:
      "National Construction Code (NCC 2022) Building Code of Australia & AS 1684 / AS 2870",
    typicalFramingOrUnitSize:
      "90 x 45 mm or 70 x 45 mm MGP10 pine studs at 450/600 mm centers; standard 230 x 110 x 76 mm bricks",
    disclaimer:
      "Preliminary material takeoff only. Soil classification per AS 2870 (Class A, S, M, H1, H2, E, P) and wind classification (N1-N4, C1-C4) govern foundation and tie-down design.",
  },
  DE: {
    id: "de_masonry_eurocode",
    marketCodes: ["DE", "FR", "IT"],
    name: "Central European High-Efficiency Masonry & Concrete",
    regionalCategory: "european_masonry_concrete",
    primaryStructuralSystem:
      "Monolithic highly insulating clay block (Porenbeton / Poroton) or sand-lime brick (Kalksandstein) with reinforced concrete floor slabs",
    wallTypology:
      "365 mm monolithic insulating clay block or 175 mm Kalksandstein with 160 mm external thermal insulation composite system (WDVS)",
    foundationTypology:
      "Insulated concrete basement (Weiße Wanne waterproof tub) or frost-skirted insulated slab-on-grade (Bodenplatte)",
    roofTypology:
      "Rafter roof (Pfettendach/Sparrendach) with timber I-joists, on-roof insulation (Aufsparrendämmung), and ceramic clay pantiles",
    applicableStandards:
      "Eurocode 2 (DIN EN 1992), Eurocode 6 (DIN EN 1996) & Gebäudeenergiegesetz (GEG)",
    typicalFramingOrUnitSize:
      "248 x 365 x 249 mm Poroton blocks with thin-bed mortar (Dünnbettmörtel)",
    disclaimer:
      "Preliminary material takeoff only. Thermal envelope and structural statics calculation (Statik) must be prepared by a licensed structural engineer (Tragwerksplaner).",
  },
  IN: {
    id: "in_brick_rcc_frame",
    marketCodes: ["IN"],
    name: "Indian Reinforced Concrete Frame with Infill Masonry",
    regionalCategory: "asian_rcc_frame",
    primaryStructuralSystem:
      "Ductile moment-resisting RC frame (columns, plinth beams, tie beams, and 125-150 mm cast-in-place slabs)",
    wallTypology:
      "230 mm (9-inch) burnt clay brickwork or 200 mm AAC (Autoclaved Aerated Concrete) blockwork with 1:6 cement-sand plaster",
    foundationTypology:
      "Isolated RC spread footings with connected plinth beams, or pile foundation in black cotton expansive soils",
    roofTypology:
      "Cast-in-situ RC flat slab with waterproofing membrane, brick bat coba screed, and China mosaic reflective tiles",
    applicableStandards:
      "IS 456:2000 (Plain and Reinforced Concrete), IS 13920 (Ductile Detailing) & IS 1893 (Seismic Criteria)",
    typicalFramingOrUnitSize:
      "230 x 450 mm RC beams, 230 x 300 mm columns; 600 x 200 x 150/200 mm AAC blocks",
    disclaimer:
      "Preliminary material takeoff only. Black cotton soil SBC and seismic zone (Zone II to V per IS 1893) require certified structural design.",
  },
  GH: {
    id: "gh_sandcrete_concrete",
    marketCodes: ["GH"],
    name: "Ghanaian Sandcrete Blockwork & Reinforced Concrete Frame",
    regionalCategory: "west_african_masonry",
    primaryStructuralSystem:
      "Cast-in-situ reinforced concrete columns, ground tie beams, and suspended beam-and-slab floor plates",
    wallTypology:
      "225 mm (9-inch) external and 150 mm (6-inch) internal solid or hollow sandcrete blocks with 1:4 cement-sand render",
    foundationTypology:
      "Continuous mass concrete or reinforced concrete strip foundation, stepped on sloping terrain; raft in coastal Accra lagoon plains",
    roofTypology:
      "Timber roof trusses using local hardwoods (e.g. Dahoma/Wawa) clad with 0.45mm/0.50mm IBR/corrugated aluminium or stone-coated steel tiles",
    applicableStandards:
      "Ghana Building Code (GS 1209:2018), BRRI standards & Eurocode 2 (EN 1992)",
    typicalFramingOrUnitSize:
      "450 x 225 x 225 mm sandcrete blocks; 225 x 225 mm RC columns",
    disclaimer:
      "Preliminary material takeoff only. Geotechnical investigation in coastal clay/gravel and structural reinforcement design by a licensed GhIE engineer are mandatory.",
  },
  KE: {
    id: "ke_quarry_stone_rcc",
    marketCodes: ["KE"],
    name: "Kenyan Machine-Cut Quarry Stone & Reinforced Concrete Frame",
    regionalCategory: "general_rcc",
    primaryStructuralSystem:
      "Reinforced concrete skeletal frame with cast-in-situ columns, ring beams, and solid suspended RC slabs",
    wallTypology:
      "200 mm (8-inch) external and 150 mm (6-inch) internal machine-cut volcanic quarry stone bedded in 1:4 cement-sand mortar with key-jointed or plastered finish",
    foundationTypology:
      "Reinforced concrete strip foundation in red volcanic soil; pad footings with ground tie beams on expansive black cotton soil",
    roofTypology:
      "Cypress/pine treated timber roof trusses with 28-30 gauge pre-painted Box-profile / corrugated iron sheets or concrete interlocking roofing tiles",
    applicableStandards:
      "Kenya National Building Regulations, KS 02-1070 (Building Lime/Stones), KS 04-22 (Cement), and BS 8110 / Eurocode 2",
    typicalFramingOrUnitSize:
      "200 x 200 x 400 mm machine-cut stones; 200 x 200 mm or 200 x 300 mm RC columns",
    disclaimer:
      "Preliminary material takeoff only. Expansive black cotton soil depths and seismic considerations in the Rift Valley require formal geotechnical investigation and EBK structural engineering sign-off.",
  },
  ZA: {
    id: "za_cavity_brick_timber",
    marketCodes: ["ZA"],
    name: "South African Double-Skin Brick / Block Cavity Wall & Raft",
    regionalCategory: "british_cavity_wall",
    primaryStructuralSystem:
      "Load-bearing double-skin masonry with reinforced brick lintels and concrete bond beams, or light industrial portal frame",
    wallTypology:
      "222 mm cavity wall comprising 110 mm exterior face brick (or rendered stock brick), 50 mm cavity with wire ties, and 110 mm interior cement/clay stock brick",
    foundationTypology:
      "Stiffened reinforced concrete raft slab on expansive heaving clays (NHBRC Class H/C) or continuous strip footings on stable ground",
    roofTypology:
      "SABS-approved preservative-treated SA Pine prefabricated nail-plate trusses with concrete roof tiles or corrugated galvanized steel / Zincalume sheeting",
    applicableStandards:
      "SANS 10400 (The Application of the National Building Regulations), SANS 2001 (Construction Works), NHBRC Home Building Manual",
    typicalFramingOrUnitSize:
      "222 x 106 x 73 mm modular clay/cement stock bricks; standard 222 mm double-leaf wall",
    disclaimer:
      "Preliminary material takeoff only. NHBRC registration, geotechnical soil classification (SANS 10400-H), and structural engineer appointment (Form 2) are required for statutory approval.",
  },
  JP: {
    id: "jp_zairai_seismic_frame",
    marketCodes: ["JP"],
    name: "Japanese Post-and-Beam Timber Frame (Zairai) & Seismic RC",
    regionalCategory: "general_rcc",
    primaryStructuralSystem:
      "Zairai-kouhou traditional post-and-beam timber framing with metal connector plates, seismic shear walls (taishin-kabe), or reinforced concrete shear-wall structure",
    wallTypology:
      "105 mm or 120 mm square cedar/cypress posts with external fibre-cement ceramic siding boards (yogyo-siding) on breathable waterproof rainscreen membrane, insulated with glass wool and gypsum board interior",
    foundationTypology:
      "Betagiso (monolithic reinforced concrete mat/raft foundation) with continuous perimeter and internal foundation beams over gravel and moisture barrier",
    roofTypology:
      "Lightweight galvalume steel sheeting or traditional Japanese clay tiles (Kawara) over waterproofing underlayment (asphalt roofing) on structural plywood roof decking",
    applicableStandards:
      "Building Standard Law of Japan (BSL / Kenchiku Kijun-ho), Order for Enforcement of the BSL, JIS A 5406, JIS A 5530",
    typicalFramingOrUnitSize:
      "105 x 105 mm or 120 x 120 mm timber column modules; 910 mm traditional grid (shakkan-hou modular coordination)",
    disclaimer:
      "Preliminary material takeoff only. Japan Building Standard Law taishin (earthquake resistance) calculation, ground bearing assessment (suweden-shiki cone penetration test), and Kenchikushi licensed architect design are legally mandatory.",
  },
  FR: {
    id: "fr_parpaing_dallage",
    marketCodes: ["FR"],
    name: "French Concrete Masonry Unit (Parpaing) with RC Slabs",
    regionalCategory: "european_masonry_concrete",
    primaryStructuralSystem:
      "Load-bearing hollow concrete block masonry with cast-in-place reinforced concrete seismic chains (chaînages horizontaux et verticaux) and beam-and-pot slab floors (plancher poutrelles-hourdis)",
    wallTypology:
      "200 mm hollow aggregate concrete blocks (parpaing creux 20x20x50 cm) bedded in cement mortar, insulated internally (doublage isolant plâtre + PSE/laine minérale) with exterior monocouche hydraulic render (enduit)",
    foundationTypology:
      "Continuous reinforced concrete strip footings (semelles filantes) supporting a ventilated crawl space (vide sanitaire) or ground-supported concrete slab (dallage sur terre-plein)",
    roofTypology:
      "Treated timber truss framework (charpente industrielle fermettes ou charpente traditionnelle en chêne/sapin) clad with terracotta interlocking tiles (tuiles terre cuite) or natural slate (ardoise)",
    applicableStandards:
      "DTU 20.1 (Maçonnerie), DTU 13.1 (Fondations), Eurocode 2 (Béton) & Eurocode 6 (Maçonnerie), RE2020 environmental regulation",
    typicalFramingOrUnitSize:
      "500 x 200 x 200 mm hollow parpaing blocks; 600 mm joist/truss spacing",
    disclaimer:
      "Preliminary material takeoff only. Soil survey (étude de sol G2 AVP per Loi ELAN), RE2020 thermal calculations, and structural calculation notes must be validated by an insured design office.",
  },
  BR: {
    id: "br_alvenaria_estrutural",
    marketCodes: ["BR"],
    name: "Brazilian Structural Concrete Block Masonry & RC Frame",
    regionalCategory: "latin_american_masonry",
    primaryStructuralSystem:
      "Structural concrete block masonry with vertical reinforcement grouted in hollow cells (grauteamento), or cast-in-place reinforced concrete skeletal frame with ceramic block infill",
    wallTypology:
      "140 mm or 190 mm structural concrete blocks (blocos de concreto vazados para alvenaria estrutural) or 8-hole hollow clay bricks (tijolo cerâmico furado) with chapisco, emboço and reboco plaster finishing",
    foundationTypology:
      "Reinforced concrete isolated spread footings (sapatas isoladas) or small-diameter drilled shafts (estacas broca/tubulão) connected by reinforced foundation grade beams (vigas baldrame)",
    roofTypology:
      "Hardwood or galvanized light steel roof framing covered with colonial clay roof tiles (telhas cerâmicas tipo colonial/francesa) or thermo-acoustic zinc-aluminium sandwich panels",
    applicableStandards:
      "ABNT NBR 6118 (Concrete Structures), ABNT NBR 15961 (Structural Masonry), ABNT NBR 6122 (Foundations)",
    typicalFramingOrUnitSize:
      "390 x 140 x 190 mm concrete blocks; standard 140/190 mm wall thicknesses; 140 x 300 mm baldrame beams",
    disclaimer:
      "Preliminary material takeoff only. Structural engineering design, ART (Anotação de Responsabilidade Técnica) registered with CREA, and soil mechanical testing are required by Brazilian legislation.",
  },
  SA: {
    id: "sa_thermal_block_rcc",
    marketCodes: ["SA"],
    name: "Saudi Insulated Concrete Block & Skeletal RCC Frame",
    regionalCategory: "middle_eastern_concrete",
    primaryStructuralSystem:
      "Ductile reinforced concrete skeletal frame with cast-in-situ columns, drop beams, and cast-in-situ hollow-core / waffle slab floor systems",
    wallTypology:
      "250 mm or 300 mm double-skin concrete block wall with internal extruded polystyrene (XPS) insulation or integrated insulated thermal blocks, finished with cement-sand plaster and acrylic stucco",
    foundationTypology:
      "Monolithic reinforced concrete raft foundation (mat slab) or isolated pad footings with heavy ground tie beams, constructed using ASTM C150 Type V sulfate-resistant cement with bituminous tanking",
    roofTypology:
      "Reinforced concrete flat roof with rigid polyisocyanurate / XPS thermal insulation boards, foam concrete slope screed, and multi-layer elastomeric SBS torch-applied bitumen waterproofing",
    applicableStandards:
      "Saudi Building Code (SBC 301 structural, SBC 304 concrete, SBC 601 energy conservation), SASO standards",
    typicalFramingOrUnitSize:
      "400 x 200 x 200 mm concrete blocks; 200 x 600 mm RC columns; 300 mm insulated wall profile",
    disclaimer:
      "Preliminary material takeoff only. Geotechnical soil boreholes for sabkha soil presence and structural engineering verification stamped by a Saudi Council of Engineers registered bureau are mandatory.",
  },
  AE: {
    id: "ae_aac_skeletal_frame",
    marketCodes: ["AE"],
    name: "UAE Thermal Insulated AAC Block & Skeletal RCC Frame",
    regionalCategory: "middle_eastern_concrete",
    primaryStructuralSystem:
      "Cast-in-situ reinforced concrete frame with post-tensioned flat slabs or drop beams, designed for extreme thermal dilation and wind load",
    wallTypology:
      "200-250 mm autoclaved aerated concrete (AAC / Thermalite) blocks providing U-values <= 0.32 W/m²K per green building regulations (Al Sa'fat / Estidama), finished with polymer render",
    foundationTypology:
      "Reinforced concrete raft slab with heavy perimeter sheet waterproofing (SBS membrane), dewatering systems, and sulfate-resistant cement (SRC) designed for coastal saline groundwater",
    roofTypology:
      "Cast-in-place flat RC roof slab featuring an inverted roof system: combo waterproofing coating, 75 mm extruded polystyrene (XPS), geotextile, and precast concrete pavers on pedestals",
    applicableStandards:
      "Dubai Building Code (DBC 2021), Abu Dhabi International Building Code (ADIBC), Al Sa'fat Green Building System, BS EN 1992",
    typicalFramingOrUnitSize:
      "600 x 200 x 200/250 mm AAC blocks; 300 x 600 mm RC columns; post-tensioned 220-250 mm slabs",
    disclaimer:
      "Preliminary material takeoff only. Municipal statutory approval, Al Sa'fat thermal envelope compliance calculations, and design vetting by a licensed engineering consultant are mandatory.",
  },
  CN: {
    id: "cn_rc_shearwall_aac",
    marketCodes: ["CN"],
    name: "Chinese Reinforced Concrete Shear Wall & AAC Block Infill",
    regionalCategory: "asian_rcc_frame",
    primaryStructuralSystem:
      "Cast-in-situ reinforced concrete shear wall (Jian-li-qiang) structure or ductile RC frame with integrated concrete bond beams and structural columns (Gou-zao-zhu)",
    wallTypology:
      "200 mm autoclaved aerated concrete (AAC / Zheng-ya Jia-qi) lightweight precision blocks with thin-bed polymer mortar and external thermal insulation composite system (ETICS / Yan-mian)",
    foundationTypology:
      "Cast-in-situ reinforced concrete raft foundation (Fa-ban ji-chu) or bored cast-in-place pile foundation with tied pile-caps (Zhuang-ji-chu) over crushed stone bed",
    roofTypology:
      "Cast-in-situ reinforced concrete flat roof deck with SBS modified bitumen waterproof membrane layer, extruded polystyrene insulation board, and concrete protective paving",
    applicableStandards:
      "GB 50010 (Code for Design of Concrete Structures), GB 50003 (Code for Design of Masonry Structures), GB 50011 (Code for Seismic Design of Buildings)",
    typicalFramingOrUnitSize:
      "600 x 200 x 200 mm AAC blocks; 200 mm concrete shear walls; 120-150 mm floor slabs",
    disclaimer:
      "Preliminary material takeoff only. Seismic defense intensity rating (6 to 8 degrees per GB 50011) and certified construction drawing review (Tu-zhi Shen-cha) by a Grade-A design institute are mandatory.",
  },
  ID: {
    id: "id_beton_bertulang_bata",
    marketCodes: ["ID"],
    name: "Indonesian Reinforced Concrete Frame with Infill Masonry",
    regionalCategory: "asian_rcc_frame",
    primaryStructuralSystem:
      "Ductile reinforced concrete frame (Struktur Rangka Beton Bertulang Praktis) with cast-in-place columns (kolom praktis), ring beams (balok latai/ringbalk), and concrete floor slabs",
    wallTypology:
      "150 mm plastered red burnt clay brickwork (Bata Merah) or 100/125 mm lightweight aerated concrete blocks (Bata Ringan / Hebel) bedded in 1:4 cement-sand mortar with acian skim coat finish",
    foundationTypology:
      "Continuous mountain rock / river stone masonry foundation (Pondasi Batu Kali) with reinforced concrete tie beams (Sloof), combined with mini bored piles (Strauss Pile) or cakar ayam footings",
    roofTypology:
      "Lightweight galvanized steel roof truss (Rangka Atap Baja Ringan C75) clad with concrete interlocking roof tiles (Genteng Beton) or lightweight metal roof tiles (Genteng Metal Pasir)",
    applicableStandards:
      "SNI 03-2847-2019 (Persyaratan Beton Struktural), SNI 1726:2019 (Ketahanan Gempa / Seismic), SNI 8460:2017 (Geoteknik)",
    typicalFramingOrUnitSize:
      "Bata Merah 220 x 110 x 50 mm; Bata Ringan 600 x 200 x 100 mm; Kolom Praktis 150 x 150 mm; Sloof 150 x 200 mm",
    disclaimer:
      "Preliminary material takeoff only. High seismicity across Indonesian tectonic zones requires full seismic calculation per SNI 1726 and structural engineer certification (SKA/SIPPT).",
  },
  MX: {
    id: "mx_mamposteria_confinada",
    marketCodes: ["MX"],
    name: "Mexican Confined Masonry with RC Castillos & Dalas",
    regionalCategory: "latin_american_masonry",
    primaryStructuralSystem:
      "Confined masonry (Mampostería Confinada) enclosed by cast-in-situ reinforced concrete vertical tie columns (Castillos) and horizontal tie beams (Dalas de desplante y cerramiento)",
    wallTypology:
      "150 mm concrete hollow blocks (bloque de concreto hueco) or red baked clay bricks (tabique rojo recocido 7x14x28 cm) bedded in cement-lime mortar, finished with aplanado de mezcla and textured paint",
    foundationTypology:
      "Cyclopean stone masonry footing (Cimiento de piedra brasa en forma trapezoidal) with RC dala de desplante, or reinforced concrete slab-on-ground (Losa de cimentación)",
    roofTypology:
      "Lightweight joist and hollow block slab (Losa de vigueta y bovedilla de poliestireno o cemento-arena) with 50 mm concrete topping and welded wire mesh, waterproofed with elastomeric acrylic coating",
    applicableStandards:
      "Normas Técnicas Complementarias del RCDF (NTC-Mampostería 2023, NTC-Diseño por Sismo), ONNCE standards",
    typicalFramingOrUnitSize:
      "Bloque 150 x 200 x 400 mm; Tabique 70 x 140 x 280 mm; Castillos 150 x 150 mm; Dalas 150 x 200 mm",
    disclaimer:
      "Preliminary material takeoff only. High seismic risk in central and Pacific Mexico (Zones II and III of CDMX) requires certified structural review and sign-off by a registered Director Responsable de Obra (DRO).",
  },
  KR: {
    id: "kr_rc_byeoksik_ondol",
    marketCodes: ["KR"],
    name: "Korean RC Wall-Slab Structure & Infill with Ondol Heating",
    regionalCategory: "asian_rcc_frame",
    primaryStructuralSystem:
      "Cast-in-situ reinforced concrete bearing wall and slab (Byeoksik) structure or ductile RC column-beam frame designed for seismic performance and lateral wind resistance",
    wallTypology:
      "150-200 mm reinforced concrete structural core with autoclaved lightweight concrete (ALC) partition blocks or drywall with soundproofing insulation, finished with eco-friendly silk wallpaper (Silkeu Byeokji)",
    foundationTypology:
      "Monolithic reinforced concrete mat foundation (Mat Gi-cho) over anti-freeze gravel blanket (Dong-gyeol Bang-ji cheung) and thick extruded polystyrene perimeter thermal insulation",
    roofTypology:
      "Reinforced concrete flat slab roof with double-layer elastomeric urethane waterproofing coating, high-density insulation, and protective cement screed / rooftop green park pavers",
    applicableStandards:
      "Korean Design Standard (KDS 41 Structural), Korean Construction Specification (KCS 41), Building Act of Korea",
    typicalFramingOrUnitSize:
      "200 mm RC bearing walls; 600 x 200 x 100/150 mm ALC partition blocks; integrated 210 mm acoustic floor slab with Ondol pipes",
    disclaimer:
      "Preliminary material takeoff only. Frost penetration depth calculations, apartment acoustic floor vibration criteria, and registered Professional Engineer (Gisulsa) review are legally required.",
  },
  IT: {
    id: "it_poroton_laterocemento",
    marketCodes: ["IT"],
    name: "Italian Confined/Reinforced Poroton Masonry & Slab",
    regionalCategory: "european_masonry_concrete",
    primaryStructuralSystem:
      "Reinforced or confined clay masonry (Muratura armata o confinata) or ductile reinforced concrete frame with beam-and-pot clay hollow block slab (Solaio in latero-cemento)",
    wallTypology:
      "300 mm or 380 mm honeycomb clay thermal blocks (Blocchi termici tipo Poroton) with interlocking vertical joints and seismic grout pockets, rendered externally with breathable lime-cement plaster (Intonaco termico)",
    foundationTypology:
      "Continuous reinforced concrete strip footings (Travi rovesce di fondazione) or stiffened plate foundation (Platea in calcestruzzo armato) waterproofed against groundwater infiltration",
    roofTypology:
      "Pitched roof in precast RC joists with clay hollow pots or timber beams (Tetto in legno lamellare), insulated with mineral wool and finished with traditional terracotta tiles (Coppi o tegole portoghesi)",
    applicableStandards:
      "NTC 2018 (Norme Tecniche per le Costruzioni), Eurocodice 2, Eurocodice 6 e Eurocodice 8 (Progettazione antisismica)",
    typicalFramingOrUnitSize:
      "300 x 250 x 190 mm Poroton clay blocks; 120 x 40 mm precast concrete joists; 160 mm hollow clay floor blocks (Pignatte)",
    disclaimer:
      "Preliminary material takeoff only. Seismic classification (Zona sismica 1 to 4 per NTC 2018), geological site survey (Relazione geologica), and structural design registered with Genio Civile are mandatory.",
  },
};

export function getConstructionTypology(
  marketCode: string,
): ConstructionTypology {
  const upper = marketCode.toUpperCase();
  if (CONSTRUCTION_TYPOLOGIES[upper]) {
    return CONSTRUCTION_TYPOLOGIES[upper];
  }
  for (const typology of Object.values(CONSTRUCTION_TYPOLOGIES)) {
    if (typology.marketCodes.includes(upper)) {
      return typology;
    }
  }
  // Default localized typology for remaining markets
  return {
    id: `${upper.toLowerCase()}_regional_typology`,
    marketCodes: [upper],
    name: `${upper} Local Construction Practice`,
    regionalCategory: "general_rcc",
    primaryStructuralSystem:
      "Reinforced concrete frame / load-bearing masonry according to local construction methods",
    wallTypology:
      "Standard localized masonry or modular wall system with rendered or drylined finish",
    foundationTypology:
      "Reinforced strip footings or pad footings designed for local ground conditions and frost line",
    roofTypology:
      "Pitched or flat roof system suited to local climatic rainfall and thermal loading",
    applicableStandards:
      "National Building Code & Applicable Structural Standards",
    typicalFramingOrUnitSize:
      "Standard local modular masonry units or framing members",
    disclaimer:
      "Preliminary material takeoff only. Geotechnical soil testing and structural design calculations are mandatory prior to construction.",
  };
}
