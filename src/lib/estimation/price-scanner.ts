// =========================================================
// FRELUX Price Scanner / Reference Price Catalog (Nigeria)
//
// The price tracker's job: compare the reference catalog against
// the prices actually CONFIGURED in the shared material database,
// and let the admin apply verified prices. It is a reference
// catalog review — NOT a live market feed, and it never invents
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
  /** Who/where the reference price was verified (retailer + date) */
  price_source?: string;
  unit: string;
  name: string;
  /** Shared estimation_materials slug this catalog entry prices */
  slug: string;
}

/**
 * Reference catalog. Values are FRELUX reference data for the
 * Nigerian market — the admin verifies each price before applying
 * it to the shared material database. The Tier 2 foundation and
 * reinforcement engines price these same slugs.
 */
export const FALLBACK_PRICES: Record<string, FallbackPrice> = {
  cement_per_bag: {
    price: 8500,
    unit: "bag",
    name: "Cement (50kg)",
    slug: "cement-per-bag",
  },
  block_per_piece: {
    price: 450,
    unit: "piece",
    name: "Block (9-inch)",
    slug: "block-per-piece",
  },
  sand_per_m3: {
    price: 35000,
    unit: "m³",
    name: "Sharp Sand",
    slug: "sand-per-m3",
  },
  sand_per_trip: {
    price: 122500,
    unit: "trip",
    name: "Sharp Sand (5-tonne tipper)",
    slug: "sand-per-trip",
  },
  granite_per_m3: {
    price: 45000,
    unit: "m³",
    name: 'Granite (3/4")',
    slug: "granite-per-m3",
  },
  granite_per_trip: {
    price: 157500,
    unit: "trip",
    name: "Granite (5-tonne tipper)",
    slug: "granite-per-trip",
  },
  hardcore_per_m3: {
    price: 18000,
    unit: "m³",
    name: "Hardcore / Laterite",
    slug: "hardcore-per-m3",
  },
  reinforcement_per_tonne: {
    price: 950000,
    unit: "tonne",
    name: "Reinforcement (bulk)",
    slug: "reinforcement-per-tonne",
  },
  rebar_12mm_per_length: {
    price: 11500,
    unit: "12m length",
    name: "12mm Rebar",
    slug: "rebar-12mm-per-length",
  },
  rebar_16mm_per_length: {
    price: 18500,
    unit: "12m length",
    name: "16mm Rebar",
    slug: "rebar-16mm-per-length",
  },
  rebar_20mm_per_length: {
    price: 27000,
    unit: "12m length",
    name: "20mm Rebar",
    slug: "rebar-20mm-per-length",
  },
  rebar_25mm_per_length: {
    price: 40000,
    unit: "12m length",
    name: "25mm Rebar",
    slug: "rebar-25mm-per-length",
  },
  binding_wire_per_kg: {
    price: 2500,
    unit: "kg",
    name: "Binding Wire",
    slug: "binding-wire-per-kg",
  },
  timber_per_m: {
    price: 3500,
    unit: "linear meter",
    name: "Timber (2x4)",
    slug: "timber-per-m",
  },
  roofing_sheet_per_piece: {
    price: 12000,
    unit: "piece",
    name: "Roofing Sheet",
    slug: "roofing-sheet-per-piece",
  },
  ridge_cap_per_meter: {
    price: 2500,
    unit: "linear meter",
    name: "Ridge Cap",
    slug: "ridge-cap-per-meter",
  },
  roofing_screws_per_piece: {
    price: 150,
    unit: "piece",
    name: "Roofing Screw",
    slug: "roofing-screws-per-piece",
  },
  fascia_per_meter: {
    price: 3000,
    unit: "linear meter",
    name: "Fascia Board",
    slug: "fascia-per-meter",
  },
  dpc_per_meter: {
    price: 500,
    unit: "linear meter",
    name: "DPC Roll",
    slug: "dpc-per-meter",
  },
  dpm_per_m2: {
    price: 1500,
    unit: "m²",
    name: "DPM Membrane",
    slug: "dpm-per-m2",
  },
  formwork_per_m2: {
    price: 8000,
    unit: "m²",
    name: "Formwork (plywood + nails)",
    slug: "formwork-per-m2",
  },

  // ── Tier 2 engine materials: listed for tracking, NO reference
  //    price — the admin enters the verified price from their
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
 * Value and list-price sources. null = no verified price yet —
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
      "Ace Hardware (Quikrete All-Purpose Sand 50 lb, Mfr# 115253) — verified 2026-10-05",
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
      "Home Depot (Concrobium 1 gal Mold Control Jug 025001) — verified 2026-10-05",
    unit: "gallon",
    name: "Concrobium Mold Control",
    slug: "us-concrobium-mold-control",
  },
  us_dap_amp_caulk: {
    price: 10.79,
    price_source:
      "Thomas Do it Center (DAP AMP 9 oz all-weather white) — verified 2026-10-05",
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
      "Ace Hardware (KILZ 2 All-Purpose 1 gal, Mfr# 20041) — verified 2026-10-05",
    unit: "gallon",
    name: "KILZ 2 All-Purpose Primer",
    slug: "us-kilz-2-primer",
  },
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
  market?: "NG" | "US";
}

/**
 * Compares the reference catalog against the prices actually
 * configured in the shared material database. Deterministic and
 * honest: it reports what IS configured versus the reference —
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
  const market = options.market ?? "NG";
  const catalog: Record<string, FallbackPrice> =
    market === "US" ? US_REFERENCE_PRICES : FALLBACK_PRICES;
  const catalogLabel =
    market === "US"
      ? "FRELUX Reference Catalog (US retail, verified 2026-10-05)"
      : "FRELUX Reference Catalog (Nigeria)";
  const effRegion = region ?? (market === "US" ? "United States" : "Nigeria");
  const effCurrency = currency ?? (market === "US" ? "USD" : "NGN");
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
        error: "No shared material record — add the material before pricing.",
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
