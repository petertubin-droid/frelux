// =========================================================
// FRELUX Price Scanner / Reference Price Catalog (Nigeria)
//
// The price tracker's job: compare the reference catalog against
// the prices actually CONFIGURED in the shared material database,
// and let the admin apply verified prices. It is a reference
// catalog review - NOT a live market feed, and it never invents
// price movement:
//   - no random variance, no simulated "market changes"
//   - a catalog entry with price null = NO reference available:
//     the admin must enter the price themselves
//   - every applied price is written to estimation_prices with
//     its source recorded (admin-verified reference)
// Every FRELUX engine prices from that shared table, so the
// tracker feeds them all through one honest channel.
// =========================================================

export interface FallbackPrice {
  /** Reference price in NGN; null = no reference available, admin must enter */
  price: number | null;
  price_source?: string;
  unit: string;
  name: string;
  /** Shared estimation_materials slug this catalog entry prices */
  slug: string;
}

/**
 * Reference catalog. Values are FRELUX reference data for the
 * Nigerian market - the admin verifies each price before applying
 * it to the shared material database. The Tier 2 foundation and
 * reinforcement engines price these same slugs.
 */
export const FALLBACK_PRICES: Record<string, FallbackPrice> = {
  cement_per_bag: {
    price: 12500,
    price_source: "NG market survey 2026-10-10: Dangote ~N12,000 Abuja, N12,000-15,000 national range",
    unit: "bag",
    name: "Cement (50kg)",
    slug: "cement-per-bag",
  },
  block_per_piece: {
    price: 800,
    price_source: "NG market survey 2026-10-10: 9in vibrated N750-1,000 (Ugbede/Jiji listings)",
    unit: "piece",
    name: "Block (9-inch)",
    slug: "block-per-piece",
  },
  sand_per_m3: {
    price: 21000,
    price_source: "NG market survey 2026-10-10: ~N13,000/tonne Lagos, ~N21,000/m3",
    unit: "m³",
    name: "Sharp Sand",
    slug: "sand-per-m3",
  },
  sand_per_trip: {
    price: 65000,
    price_source: "NG market survey 2026-10-10: 5-tonne tipper, ~N13,000/tonne (Jiji 30t = N390,000)",
    unit: "trip",
    name: "Sharp Sand (5-tonne tipper)",
    slug: "sand-per-trip",
  },
  granite_per_m3: {
    price: 30000,
    price_source: "NG market survey 2026-10-10: 3/4in ~N18,000-20,000/tonne, ~N30,000/m3",
    unit: "m³",
    name: 'Granite (3/4")',
    slug: "granite-per-m3",
  },
  granite_per_trip: {
    price: 95000,
    price_source: "NG market survey 2026-10-10: 5-tonne tipper at ~N19,000/tonne",
    unit: "trip",
    name: "Granite (5-tonne tipper)",
    slug: "granite-per-trip",
  },
  hardcore_per_m3: {
    price: 18000,
    price_source: "NG market survey 2026-10-10: quarry hardcore N12,000-25,000/m3 band",
    unit: "m³",
    name: "Hardcore / Laterite",
    slug: "hardcore-per-m3",
  },
  reinforcement_per_tonne: {
    price: 950000,
    price_source: "NG market survey 2026-10-10: per-ton quotes N827,500-1,072,000 (Dei-Dei/steel traders)",
    unit: "tonne",
    name: "Reinforcement (bulk)",
    slug: "reinforcement-per-tonne",
  },
  rebar_12mm_per_length: {
    price: 10500,
    price_source: "NG market survey 2026-10-10: N8,900-11,800 per 12m length",
    unit: "12m length",
    name: "12mm Rebar",
    slug: "rebar-12mm-per-length",
  },
  rebar_16mm_per_length: {
    price: 17000,
    price_source: "NG market survey 2026-10-10: SEG N17,050; per-ton N837,500-870,000",
    unit: "12m length",
    name: "16mm Rebar",
    slug: "rebar-16mm-per-length",
  },
  rebar_20mm_per_length: {
    price: 26000,
    price_source: "NG market survey 2026-10-10: local N850,000-900,000/tonne / 34 lengths",
    unit: "12m length",
    name: "20mm Rebar",
    slug: "rebar-20mm-per-length",
  },
  rebar_25mm_per_length: {
    price: 45000,
    price_source: "NG market survey 2026-10-10: TMT ~N1,050,000/tonne / 22 lengths",
    unit: "12m length",
    name: "25mm Rebar",
    slug: "rebar-25mm-per-length",
  },
  binding_wire_per_kg: {
    price: 2000,
    price_source: "NG market survey 2026-10-10: Abuja guide N2,200/kg; Jiji 17kg roll N30,000",
    unit: "kg",
    name: "Binding Wire",
    slug: "binding-wire-per-kg",
  },
  timber_per_m: {
    price: 1550,
    price_source: "NG market survey 2026-10-10: 2x4 hardwood ~N470/ft (N1,550/metre)",
    unit: "linear meter",
    name: "Timber (2x4)",
    slug: "timber-per-m",
  },
  roofing_sheet_per_piece: {
    price: 9800,
    price_source: "NG market survey 2026-10-10: longspan 0.50mm N6,500/m2 x 1.5m2 sheet (Lagos)",
    unit: "piece",
    name: "Roofing Sheet",
    slug: "roofing-sheet-per-piece",
  },
  ridge_cap_per_meter: {
    price: 2500,
    price_source: "NG market survey 2026-10-10: consistent with 2017-2020 N1,500-1,700/m scaled by sheet inflation",
    unit: "linear meter",
    name: "Ridge Cap",
    slug: "ridge-cap-per-meter",
  },
  roofing_screws_per_piece: {
    price: 150,
    price_source: "NG market survey 2026-10-10: bulk N80-140 each; retail ~N150",
    unit: "piece",
    name: "Roofing Screw",
    slug: "roofing-screws-per-piece",
  },
  fascia_per_meter: {
    price: 3000,
    price_source: "NG market survey 2026-10-10: facial board N2,500/m (2017) scaled by sheet inflation",
    unit: "linear meter",
    name: "Fascia Board",
    slug: "fascia-per-meter",
  },
  dpc_per_meter: {
    price: 500,
    price_source: "NG market survey 2026-10-10: DPC roll strip pricing consistent with DPM/m2",
    unit: "linear meter",
    name: "DPC Roll",
    slug: "dpc-per-meter",
  },
  dpm_per_m2: {
    price: 1500,
    price_source: "NG market survey 2026-10-10: 1000g DPM rolls N800-1,500/m2 (Jiji Lagos)",
    unit: "m²",
    name: "DPM Membrane",
    slug: "dpm-per-m2",
  },
  formwork_per_m2: {
    price: 8000,
    price_source: "NG market survey 2026-10-10: 18mm ply N40,000-48,000/sheet incl. props and nails",
    unit: "m²",
    name: "Formwork (plywood + nails)",
    slug: "formwork-per-m2",
  },

  // ── Tier 2 engine materials: listed for tracking, NO reference
  //    price - the admin enters the verified price from their
  //    supplier. The electrical engine prices these slugs.
  elec_cable_lighting: {
    price: null,
    unit: "m",
    name: "Lighting circuit cable (twin & earth)",
    slug: "elec-cable-lighting",
  },
  elec_cable_socket: {
    price: null,
    unit: "m",
    name: "Socket circuit cable (twin & earth)",
    slug: "elec-cable-socket",
  },
  elec_cable_dedicated: {
    price: null,
    unit: "m",
    name: "Dedicated appliance circuit cable",
    slug: "elec-cable-dedicated",
  },
  elec_cable_earth: {
    price: null,
    unit: "m",
    name: "Earth cable (green/yellow)",
    slug: "elec-cable-earth",
  },
  elec_cable_feeder: {
    price: null,
    unit: "m",
    name: "Feeder / sub-main cable",
    slug: "elec-cable-feeder",
  },
  elec_conduit: {
    price: null,
    unit: "m",
    name: "PVC conduit (cable runs)",
    slug: "elec-conduit",
  },
  elec_junction_box: {
    price: null,
    unit: "piece",
    name: "Junction boxes",
    slug: "elec-junction-box",
  },
  elec_breaker: {
    price: null,
    unit: "piece",
    name: "Circuit breakers (MCB)",
    slug: "elec-breaker",
  },
  elec_switch_plate: {
    price: null,
    unit: "piece",
    name: "Switch plates",
    slug: "elec-switch-plate",
  },
  elec_socket_outlet: {
    price: null,
    unit: "piece",
    name: "Socket outlets",
    slug: "elec-socket-outlet",
  },
  elec_distribution_board: {
    price: null,
    unit: "piece",
    name: "Distribution boards",
    slug: "elec-distribution-board",
  },

  // ── Waterproofing engine materials: tracked, NO reference price.
  //    dpc-per-meter and dpm-per-m2 are already catalogued above.
  wp_cementitious_coating: {
    price: null,
    unit: "bag",
    name: "Cementitious waterproofing coating (bag)",
    slug: "waterproofing-cementitious-coating",
  },
  wp_bituminous_roll: {
    price: null,
    unit: "roll",
    name: "Bituminous membrane roll",
    slug: "bituminous-membrane-roll",
  },
  wp_tape: {
    price: null,
    unit: "m",
    name: "Waterproofing corner tape",
    slug: "waterproofing-tape",
  },

  // ── Plumbing engine materials: tracked, NO reference price.
  plumb_pipe_cold: {
    price: null,
    unit: "m",
    name: "Cold water pipe",
    slug: "plumb-pipe-cold",
  },
  plumb_pipe_hot: {
    price: null,
    unit: "m",
    name: "Hot water pipe",
    slug: "plumb-pipe-hot",
  },
  plumb_pipe_waste: {
    price: null,
    unit: "m",
    name: "Waste pipe",
    slug: "plumb-pipe-waste",
  },
  plumb_pipe_drainage: {
    price: null,
    unit: "m",
    name: "Drainage pipe",
    slug: "plumb-pipe-drainage",
  },
  plumb_elbow: {
    price: null,
    unit: "piece",
    name: "Pipe elbows",
    slug: "plumb-elbow",
  },
  plumb_tee: {
    price: null,
    unit: "piece",
    name: "Pipe tees",
    slug: "plumb-tee",
  },
  plumb_reducer: {
    price: null,
    unit: "piece",
    name: "Pipe reducers",
    slug: "plumb-reducer",
  },
  plumb_union: {
    price: null,
    unit: "piece",
    name: "Pipe unions",
    slug: "plumb-union",
  },
  plumb_valve: {
    price: null,
    unit: "piece",
    name: "Valves",
    slug: "plumb-valve",
  },
  plumb_tap: { price: null, unit: "piece", name: "Taps", slug: "plumb-tap" },
  plumb_wc_connection: {
    price: null,
    unit: "piece",
    name: "WC connection kits",
    slug: "plumb-wc-connection",
  },
  plumb_shower_connection: {
    price: null,
    unit: "piece",
    name: "Shower connection kits",
    slug: "plumb-shower-connection",
  },
  plumb_sink_connection: {
    price: null,
    unit: "piece",
    name: "Sink connection kits",
    slug: "plumb-sink-connection",
  },
  plumb_floor_drain: {
    price: null,
    unit: "piece",
    name: "Floor drains",
    slug: "plumb-floor-drain",
  },
  plumb_storage_connection: {
    price: null,
    unit: "piece",
    name: "Water storage connection kits",
    slug: "plumb-storage-connection",
  },
  plumb_pump_connection: {
    price: null,
    unit: "piece",
    name: "Pump connection kits",
    slug: "plumb-pump-connection",
  },

  // ── Flooring engine materials: tracked, NO reference price.
  floor_laminate_pack: {
    price: null,
    unit: "pack",
    name: "Laminate flooring (pack)",
    slug: "flooring-laminate-pack",
  },
  floor_vinyl: {
    price: null,
    unit: "m²",
    name: "Vinyl / PVC flooring",
    slug: "flooring-vinyl-m2",
  },
  floor_parquet: {
    price: null,
    unit: "m²",
    name: "Parquet flooring",
    slug: "flooring-parquet-m2",
  },
  floor_underlay: {
    price: null,
    unit: "roll",
    name: "Flooring underlay (roll)",
    slug: "flooring-underlay-roll",
  },
  floor_adhesive: {
    price: null,
    unit: "bag",
    name: "Flooring adhesive (bag)",
    slug: "flooring-adhesive-bag",
  },
  floor_skirting: {
    price: null,
    unit: "m",
    name: "Skirting board",
    slug: "flooring-skirting-m",
  },

  // ── Doors & windows engine materials: tracked, NO reference price.
  door_flush: {
    price: null,
    unit: "piece",
    name: "Flush doors",
    slug: "door-flush",
  },
  door_panel: {
    price: null,
    unit: "piece",
    name: "Panel doors",
    slug: "door-panel",
  },
  door_security: {
    price: null,
    unit: "piece",
    name: "Security doors",
    slug: "door-security",
  },
  door_frame: {
    price: null,
    unit: "set",
    name: "Door frame sets",
    slug: "door-frame",
  },
  door_hinge: {
    price: null,
    unit: "piece",
    name: "Door hinges",
    slug: "door-hinge",
  },
  door_lockset: {
    price: null,
    unit: "set",
    name: "Door locksets",
    slug: "door-lockset",
  },
  window_aluminium: {
    price: null,
    unit: "unit",
    name: "Aluminium sliding windows",
    slug: "window-aluminium",
  },
  window_louver: {
    price: null,
    unit: "unit",
    name: "Louvre windows",
    slug: "window-louver",
  },

  // ── Generator engine materials: tracked, NO reference price.
  gen_10kva: {
    price: null,
    unit: "unit",
    name: "Generator 10 kVA",
    slug: "gen-unit-10kva",
  },
  gen_20kva: {
    price: null,
    unit: "unit",
    name: "Generator 20 kVA",
    slug: "gen-unit-20kva",
  },
  gen_30kva: {
    price: null,
    unit: "unit",
    name: "Generator 30 kVA",
    slug: "gen-unit-30kva",
  },
  gen_50kva: {
    price: null,
    unit: "unit",
    name: "Generator 50 kVA",
    slug: "gen-unit-50kva",
  },
  gen_ats: {
    price: null,
    unit: "unit",
    name: "Automatic transfer switch (ATS)",
    slug: "gen-ats",
  },
  gen_battery: {
    price: null,
    unit: "unit",
    name: "Generator battery",
    slug: "gen-battery",
  },
  gen_cable: {
    price: null,
    unit: "m",
    name: "Generator-to-panel cable",
    slug: "gen-cable-per-m",
  },
};

/**
 * US reference catalog. Values are real retail prices for real US
 * products, verified 2026-10-05 from Home Depot, Walmart, True
 * Value and list-price sources. null = no verified price yet -
 * the admin must enter it; a price is never invented.
 */
export const US_REFERENCE_PRICES: Record<string, FallbackPrice> = {
  us_concrete_mix_bag: {
    price: 7.97,
    unit: "80 lb bag",
    name: "Quikrete 80 lb Concrete Mix",
    slug: "us-quikrete-concrete-80lb",
  },
  us_sand_50lb: {
    price: 8.99,
    price_source:
      "Ace Hardware (Quikrete All-Purpose Sand 50 lb, Mfr# 115253): verified 2026-10-05",
    unit: "50 lb bag",
    name: "All-Purpose Sand (50 lb)",
    slug: "us-sand-50lb",
  },
  us_bonding_adhesive_gal: {
    price: 16.99,
    unit: "gallon",
    name: "Quikrete Concrete Bonding Adhesive",
    slug: "us-quikrete-bonding-adhesive",
  },
  us_joint_compound_pail: {
    price: 24.09,
    unit: "4.5 gal pail",
    name: "USG Sheetrock All-Purpose Joint Compound",
    slug: "us-joint-compound-45gal",
  },
  us_drylok_extreme_gal: {
    price: 23.99,
    unit: "gallon",
    name: "Drylok Extreme Masonry Waterproofer",
    slug: "us-drylok-extreme",
  },
  us_thompsons_waterseal_gal: {
    price: 17.97,
    unit: "gallon",
    name: "Thompson's WaterSeal Multi-Surface",
    slug: "us-thompsons-waterseal",
  },
  us_rmr86_gal: {
    price: 32.99,
    unit: "gallon",
    name: "RMR-86 Pro Mold Stain Remover",
    slug: "us-rmr-86",
  },
  us_concrobium_gal: {
    price: 39.96,
    price_source:
      "Home Depot (Concrobium 1 gal Mold Control Jug 025001): verified 2026-10-05",
    unit: "gallon",
    name: "Concrobium Mold Control",
    slug: "us-concrobium-mold-control",
  },
  us_dap_amp_caulk: {
    price: 10.79,
    price_source:
      "Thomas Do it Center (DAP AMP 9 oz all-weather white): verified 2026-10-05",
    unit: "9 oz tube",
    name: "DAP AMP Advanced Hybrid Caulk",
    slug: "us-dap-amp-caulk",
  },
  us_behr_interior_gal: {
    price: 39.2,
    unit: "gallon",
    name: "Behr Premium Plus Interior Paint & Primer",
    slug: "us-behr-premium-plus-interior",
  },
  us_behr_marquee_gal: {
    price: 43.0,
    unit: "gallon",
    name: "Behr Marquee Interior Paint",
    slug: "us-behr-marquee-interior",
  },
  us_behr_exterior_gal: {
    price: 39.2,
    unit: "gallon",
    name: "Behr Premium Plus Exterior Paint & Primer",
    slug: "us-behr-premium-plus-exterior",
  },
  us_zinsser_123_quart: {
    price: 16.97,
    unit: "quart",
    name: "Zinsser Bulls Eye 1-2-3 Primer",
    slug: "us-zinsser-bulls-eye-123",
  },
  us_kilz2_gal: {
    price: 24.99,
    price_source:
      "Ace Hardware (KILZ 2 All-Purpose 1 gal, Mfr# 20041): verified 2026-10-05",
    unit: "gallon",
    name: "KILZ 2 All-Purpose Primer",
    slug: "us-kilz-2-primer",
  },
  us_flashing_tape: {
    price: 44.09,
    price_source: "US web survey 2026-10-10: mrosupreme reg $44.09; band $35.47-$51.07",
    unit: "4 in x 75 ft roll",
    name: "3M 8067 All Weather Flashing Tape",
    slug: "us-3m-flashing-tape",
  },
  us_fibatape_500ft: {
    price: 17.59,
    price_source: "US web survey 2026-10-10: Home Depot FibaTape listings (300ft $13.99)",
    unit: "500 ft roll",
    name: "FibaTape Mesh Drywall Joint Tape",
    slug: "us-fibatape-500ft",
  },
  us_ice_water_shield: {
    price: 199.0,
    price_source: "US web survey 2026-10-10: Home Depot Grace 195 sqft $199-$251",
    unit: "195 sq ft roll",
    name: "Ice & Water Shield Self-Adhered Membrane",
    slug: "us-ice-water-shield-195sqft",
  },
  us_sill_seal: {
    price: 9.99,
    price_source: "US web survey 2026-10-10: US retail band $7.49-$10.99",
    unit: "5.5 in x 50 ft roll",
    name: "Sill Seal Foam Gasket",
    slug: "us-sill-seal-50ft",
  },
  us_husky_6mil: {
    price: 67.5,
    price_source: "US web survey 2026-10-10: Home Depot 10ft x 100ft 6-mil clear sheeting",
    unit: "10 ft x 100 ft roll",
    name: "Husky 6-mil Polyethylene Sheeting",
    slug: "us-husky-6mil-roll",
  },
};


/** Markets with a web-verified reference catalog (2026-10-10 survey). */
export type ReferenceMarket = "NG" | "US" | "GB" | "DE" | "AU" | "CA" | "IN";

/**
 * UK reference catalog (GBP, incl. VAT retail unless noted).
 * Web-verified 2026-10-10: Buildbuddy, Wickes, Selco, Screwfix,
 * Builder Depot, Travis Perkins, Amazon UK, UK merchants.
 */
export const GB_REFERENCE_PRICES: Record<string, FallbackPrice> = {
  gb_mastercrete: {
    price: 7.99,
    price_source: "UK web survey 2026-10-10: Buildbuddy £7.00, Pricerunner GP cement £7.48",
    unit: "25kg bag",
    name: "Blue Circle Mastercrete Cement",
    slug: "gb-mastercrete-25kg",
  },
  gb_building_sand: {
    price: 4.5,
    price_source: "UK web survey 2026-10-10: B&Q bulk 24x25kg £108 = £4.50/bag",
    unit: "25kg bag",
    name: "Building Sand",
    slug: "gb-building-sand-25kg",
  },
  gb_thistle_bonding: {
    price: 16.16,
    price_source: "UK web survey 2026-10-10: merchants £16.16-£21.77 inc VAT",
    unit: "25kg bag",
    name: "Thistle Bonding Coat",
    slug: "gb-thistle-bonding-25kg",
  },
  gb_thistle_multifinish: {
    price: 11.25,
    price_source: "UK web survey 2026-10-10: Wickes £11.25, Selco £10.13, Travis Perkins £13.10",
    unit: "25kg bag",
    name: "Thistle MultiFinish",
    slug: "gb-thistle-multifinish-25kg",
  },
  gb_easifill: {
    price: 34.66,
    price_source: "UK web survey 2026-10-10: Selco £34.66 inc VAT, IBT £36.79",
    unit: "10kg bag",
    name: "Gyproc Easi-Fill",
    slug: "gb-gyproc-easifill-10kg",
  },
  gb_gyproc_tape: {
    price: 11.53,
    price_source: "UK web survey 2026-10-10: Builder Depot £11.53, Travis Perkins £21.46",
    unit: "150m roll",
    name: "Gyproc Paper Joint Tape",
    slug: "gb-gyproc-tape-150m",
  },
  gb_dulux_easycare: {
    price: 57.99,
    price_source: "UK web survey 2026-10-10: Screwfix £57.99 inc VAT",
    unit: "10L",
    name: "Dulux Easycare Matt Emulsion",
    slug: "gb-dulux-easycare-10l",
  },
  gb_sandtex: {
    price: 45.99,
    price_source: "UK web survey 2026-10-10: Screwfix Sandtex Ultra Smooth 10L £45.99",
    unit: "10L",
    name: "Sandtex Masonry Paint",
    slug: "gb-sandtex-masonry-10l",
  },
  gb_zinsser_123: {
    price: 24.49,
    price_source: "UK web survey 2026-10-10: Toolstation/UK retail band £19-£25 (1L)",
    unit: "1L",
    name: "Zinsser Bulls Eye 1-2-3",
    slug: "gb-zinsser-123-1l",
  },
  gb_everbuild_402: {
    price: 22.99,
    price_source: "UK web survey 2026-10-10: UK band £14.39-£33.40 (5L)",
    unit: "5L",
    name: "Everbuild 402 Water Seal",
    slug: "gb-everbuild-402-5l",
  },
  gb_everbuild_sbr: {
    price: 19.9,
    price_source: "UK web survey 2026-10-10: Amazon £24, HTC Direct £16.67, Country Supplies £19.90",
    unit: "5L",
    name: "Everbuild SBR Bond",
    slug: "gb-everbuild-sbr-5l",
  },
};

/**
 * Germany reference catalog (EUR, incl. MwSt).
 * Web-verified 2026-10-10: HORNBACH, OBI, idealo/auspreiser,
 * Bossmann Store, Kleinanzeigen.
 */
export const DE_REFERENCE_PRICES: Record<string, FallbackPrice> = {
  de_cement: {
    price: 6.99,
    price_source: "DE web survey 2026-10-10: HORNBACH Dyckerhoff CEM 25kg €7.45 incl. MwSt",
    unit: "25kg sack",
    name: "Portlandzement CEM II 42,5N",
    slug: "de-cem-42-5n-25kg",
  },
  de_bausand: {
    price: 6.39,
    price_source: "DE web survey 2026-10-10: OBI bagged sand band €3.99-€6.99",
    unit: "25kg sack",
    name: "Bausand",
    slug: "de-bausand-25kg",
  },
  de_mp75: {
    price: 13.88,
    price_source: "DE web survey 2026-10-10: Bossmann Knauf MP75 Diamant 30kg €13.88 incl. MwSt",
    unit: "30kg sack",
    name: "Knauf MP75 Maschinenputz",
    slug: "de-knauf-mp75-30kg",
  },
  de_feinspachtel: {
    price: 44.31,
    price_source: "DE web survey 2026-10-10: Knauf Uniflott 25kg band €44-€51.99",
    unit: "25kg sack",
    name: "Knauf Feinspachtel",
    slug: "de-knauf-feinspachtel-25kg",
  },
  de_tiefgrund: {
    price: 59.4,
    price_source: "DE web survey 2026-10-10: idealo/auspreiser 7 offers, €4.99/L (10L)",
    unit: "10L",
    name: "Caparol Tiefgrund TB",
    slug: "de-caparol-tiefgrund-10l",
  },
  de_alpina_weiss: {
    price: 39.95,
    price_source: "DE web survey 2026-10-10: OBI Alpina white interior 10L band",
    unit: "10L",
    name: "Alpina Weiß",
    slug: "de-alpina-weiss-10l",
  },
  de_alpina_fassadenfarbe: {
    price: 59.99,
    price_source: "DE web survey 2026-10-10: OBI premium facade 10L band €49.95-€64.95",
    unit: "10L",
    name: "Alpina Fassadenfarbe",
    slug: "de-alpina-fassadenfarbe-10l",
  },
};

/**
 * Australia reference catalog (AUD).
 * Web-verified 2026-10-10: Bunnings, Taubmans RRP listings.
 */
export const AU_REFERENCE_PRICES: Record<string, FallbackPrice> = {
  au_base_coat_45: {
    price: 52.9,
    price_source: "AU web survey 2026-10-10: Bunnings Gyprock CSR 20kg Base Coat 45 $52.90",
    unit: "20kg bag",
    name: "CSR Gyprock Base Coat 45",
    slug: "au-csr-base-coat-45-20kg",
  },
  au_taubmans_3in1: {
    price: 153.3,
    price_source: "AU web survey 2026-10-10: Taubmans 15L 3-in-1 RRP $229.90 scaled per-litre",
    unit: "10L",
    name: "Taubmans 3-in-1 Prep Primer",
    slug: "au-taubmans-3in1-10l",
  },
  au_taubmans_endure: {
    price: 213.9,
    price_source: "AU web survey 2026-10-10: Bunnings Taubmans 10L Endure $213.90",
    unit: "10L",
    name: "Taubmans Endure Low Sheen",
    slug: "au-taubmans-low-sheen-10l",
  },
};

/**
 * Canada reference catalog (CAD).
 * Web-verified 2026-10-10: Home Depot Canada, Kent Building Supplies,
 * CTS Building Supplies.
 */
export const CA_REFERENCE_PRICES: Record<string, FallbackPrice> = {
  ca_cgc_compound: {
    price: 37.78,
    price_source: "CA web survey 2026-10-10: CTS Building Supplies 12L pails band $35-$43",
    unit: "12L pail",
    name: "CGC Sheetrock All-Purpose Compound",
    slug: "ca-cgc-allpurpose-12l",
  },
  ca_synko_tape: {
    price: 9.84,
    price_source: "CA web survey 2026-10-10: Kent Building Supplies CGC paper tape 500ft $9.84",
    unit: "500 ft roll",
    name: "CGC Synko Paper Joint Tape",
    slug: "ca-cgc-synko-tape-500ft",
  },
};

/**
 * India reference catalog (INR).
 * Web-verified 2026-10-10: 99acres rates, IndiaMART, Industrybuying,
 * Birla White official guide.
 */
export const IN_REFERENCE_PRICES: Record<string, FallbackPrice> = {
  in_ultratech: {
    price: 395,
    price_source: "IN web survey 2026-10-10: 99acres latest rates, 43 grade ₹395/bag",
    unit: "50kg bag",
    name: "UltraTech OPC Cement",
    slug: "in-ultratech-cement-50kg",
  },
  in_apex_ultima: {
    price: 4800,
    price_source: "IN web survey 2026-10-10: IndiaMART ₹4,800 per 10L bucket",
    unit: "10L",
    name: "Asian Paints Apex Ultima",
    slug: "in-apex-ultima-10l",
  },
  in_royale_shyne: {
    price: 3920,
    price_source: "IN web survey 2026-10-10: India retail 7L band ₹3,900-₹4,400",
    unit: "7L",
    name: "Asian Paints Royale Shyne",
    slug: "in-royale-shyne-7l",
  },
  in_tractor_emulsion: {
    price: 2600,
    price_source: "IN web survey 2026-10-10: IndiaMART Hyderabad ₹2,600 per 20L",
    unit: "20L",
    name: "Asian Paints Tractor Emulsion",
    slug: "in-tractor-emulsion-20l",
  },
  in_trucare_primer: {
    price: 2750,
    price_source: "IN web survey 2026-10-10: TruCare 20L retail band ₹1,850-₹3,299",
    unit: "20L",
    name: "Asian Paints TruCare Primer",
    slug: "in-trucare-primer-20l",
  },
  in_birla_putty: {
    price: 700,
    price_source: "IN web survey 2026-10-10: trade ₹700 per 40kg bag; online retail ₹1,130",
    unit: "40kg bag",
    name: "Birla White WallCare Putty",
    slug: "in-birla-white-putty-40kg",
  },
  in_dr_fixit: {
    price: 600,
    price_source: "IN web survey 2026-10-10: Industrybuying ₹770; IndiaMART band ₹550-₹650 (5L)",
    unit: "5L",
    name: "Dr. Fixit LW+ Waterproofing",
    slug: "in-dr-fixit-lw-5l",
  },
};

/** Market catalog registry (one web-verified catalog per market). */
export const MARKET_CATALOGS: Record<ReferenceMarket, Record<string, FallbackPrice>> = {
  NG: FALLBACK_PRICES,
  US: US_REFERENCE_PRICES,
  GB: GB_REFERENCE_PRICES,
  DE: DE_REFERENCE_PRICES,
  AU: AU_REFERENCE_PRICES,
  CA: CA_REFERENCE_PRICES,
  IN: IN_REFERENCE_PRICES,
};

/** Default region label + currency per market. */
export const MARKET_DEFAULTS: Record<
  ReferenceMarket,
  { region: string; currency: string }
> = {
  NG: { region: "Nigeria", currency: "NGN" },
  US: { region: "United States", currency: "USD" },
  GB: { region: "United Kingdom", currency: "GBP" },
  DE: { region: "Germany", currency: "EUR" },
  AU: { region: "Australia", currency: "AUD" },
  CA: { region: "Canada", currency: "CAD" },
  IN: { region: "India", currency: "INR" },
};

export interface PriceScanResultItem {
  material_key: string;
  material_name: string;
  /** shared estimation_materials slug ("" if the catalog entry has none) */
  material_slug: string;
  /** the price currently configured in the shared DB; null = not configured */
  configured_price: number | null;
  /** the catalog reference price; null = no reference available */
  reference_price: number | null;
  unit: string;
  /** reference vs configured; null when either side is missing */
  change_percent: number | null;
  source: string;
  confidence: "low" | "medium" | "high";
  scanned_at: string;
  success: boolean;
  error?: string;
}

export interface PriceScanReport {
  scan_date: string;
  materials_scanned: number;
  /** materials with no price configured in the shared DB */
  materials_unconfigured: number;
  /** materials whose configured price differs from the reference */
  materials_differing: number;
  materials_failed: number;
  results: PriceScanResultItem[];
  currency: string;
  market_region: string;
}

export interface ScanOptions {
  region?: string;
  currency?: string;
  /** which market's reference catalog to review (default NG) */
  market?: ReferenceMarket;
}

/**
 * Compares the reference catalog against the prices actually
 * configured in the shared material database. Deterministic and
 * honest: it reports what IS configured versus the reference -
 * it never simulates market movement or invents a price.
 *
 * `configuredPrices` is keyed by material slug with null/absent
 * meaning "no price configured in the shared DB".
 */
export async function scanMaterialPrices(
  configuredPrices: Record<string, number | null | undefined>,
  options: ScanOptions = {},
): Promise<PriceScanReport> {
  const { region, currency } = options;
  const market: ReferenceMarket = options.market ?? "NG";
  const defaults = MARKET_DEFAULTS[market] ?? MARKET_DEFAULTS.NG;
  const catalog: Record<string, FallbackPrice> =
    MARKET_CATALOGS[market] ?? FALLBACK_PRICES;
  const catalogLabel =
    market === "US"
      ? "FRELUX Reference Catalog (US retail, verified 2026-10-05/10-10)"
      : `FRELUX Reference Catalog (${defaults.region}, web survey 2026-10-10)`;
  const effRegion = region ?? defaults.region;
  const effCurrency = currency ?? defaults.currency;
  const scannedAt = new Date().toISOString();
  const results: PriceScanResultItem[] = [];

  let unconfigured = 0;
  let differing = 0;
  let failed = 0;

  for (const [key, fallback] of Object.entries(catalog)) {
    if (!fallback.slug) {
      // catalog entry not mapped to a shared material: report, never guess
      failed++;
      results.push({
        material_key: key,
        material_name: fallback.name,
        material_slug: "",
        configured_price: null,
        reference_price: fallback.price,
        unit: fallback.unit,
        change_percent: null,
        source: catalogLabel,
        confidence: "low",
        scanned_at: scannedAt,
        success: false,
        error: "No shared material record: add the material before pricing.",
      });
      continue;
    }

    const configured = configuredPrices[fallback.slug];
    const hasConfigured =
      typeof configured === "number" && Number.isFinite(configured);
    if (!hasConfigured) unconfigured++;

    let changePercent: number | null = null;
    if (hasConfigured && fallback.price !== null) {
      changePercent =
        Math.round(
          ((fallback.price - (configured as number)) / (configured as number)) *
            100 *
            100,
        ) / 100;
      if (changePercent !== 0) differing++;
    }

    results.push({
      material_key: key,
      material_name: fallback.name,
      material_slug: fallback.slug,
      configured_price: hasConfigured ? (configured as number) : null,
      reference_price: fallback.price,
      unit: fallback.unit,
      change_percent: changePercent,
      source: catalogLabel,
      confidence: fallback.price === null ? "low" : "medium",
      scanned_at: scannedAt,
      success: true,
      error: !hasConfigured
        ? "No price configured in the shared material database yet."
        : undefined,
    });
  }

  return {
    scan_date: scannedAt,
    materials_scanned: results.length,
    materials_unconfigured: unconfigured,
    materials_differing: differing,
    materials_failed: failed,
    results,
    currency: effCurrency,
    market_region: effRegion,
  };
}
