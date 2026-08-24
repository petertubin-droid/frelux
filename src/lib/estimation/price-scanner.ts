// =========================================================
// FRELUX Price Scanner — Nigerian Construction Material Prices
// Provides fallback prices and a scanning function that
// compares current prices against market references.
// =========================================================

export interface FallbackPrice {
  price: number;
  unit: string;
  name: string;
}

export const FALLBACK_PRICES: Record<string, FallbackPrice> = {
  cement_per_bag: { price: 8500, unit: 'bag', name: 'Cement (50kg)' },
  block_per_piece: { price: 450, unit: 'piece', name: 'Block (9-inch)' },
  sand_per_m3: { price: 35000, unit: 'm³', name: 'Sharp Sand' },
  sand_per_trip: { price: 122500, unit: 'trip', name: 'Sharp Sand (5-tonne tipper)' },
  granite_per_m3: { price: 45000, unit: 'm³', name: 'Granite (3/4")' },
  granite_per_trip: { price: 157500, unit: 'trip', name: 'Granite (5-tonne tipper)' },
  hardcore_per_m3: { price: 18000, unit: 'm³', name: 'Hardcore / Laterite' },
  reinforcement_per_tonne: { price: 950000, unit: 'tonne', name: 'Reinforcement (bulk)' },
  rebar_12mm_per_length: { price: 11500, unit: '12m length', name: '12mm Rebar' },
  rebar_16mm_per_length: { price: 18500, unit: '12m length', name: '16mm Rebar' },
  rebar_20mm_per_length: { price: 27000, unit: '12m length', name: '20mm Rebar' },
  rebar_25mm_per_length: { price: 40000, unit: '12m length', name: '25mm Rebar' },
  binding_wire_per_kg: { price: 2500, unit: 'kg', name: 'Binding Wire' },
  timber_per_m: { price: 3500, unit: 'linear meter', name: 'Timber (2x4)' },
  roofing_sheet_per_piece: { price: 12000, unit: 'piece', name: 'Roofing Sheet' },
  ridge_cap_per_meter: { price: 2500, unit: 'linear meter', name: 'Ridge Cap' },
  roofing_screws_per_piece: { price: 150, unit: 'piece', name: 'Roofing Screw' },
  fascia_per_meter: { price: 3000, unit: 'linear meter', name: 'Fascia Board' },
  dpc_per_meter: { price: 500, unit: 'linear meter', name: 'DPC Roll' },
  dpm_per_m2: { price: 1500, unit: 'm²', name: 'DPM Membrane' },
  formwork_per_m2: { price: 8000, unit: 'm²', name: 'Formwork (plywood + nails)' },
};

export interface PriceScanResultItem {
  material_key: string;
  material_name: string;
  old_price: number;
  new_price: number;
  unit: string;
  change_percent: number;
  source: string;
  confidence: 'low' | 'medium' | 'high';
  scanned_at: string;
  success: boolean;
  error?: string;
}

export interface PriceScanReport {
  scan_date: string;
  materials_scanned: number;
  materials_updated: number;
  materials_failed: number;
  results: PriceScanResultItem[];
  currency: string;
  market_region: string;
}

export interface ScanOptions {
  region?: string;
  currency?: string;
}

/**
 * Scans current material prices against fallback reference prices.
 * In production this would fetch from live market APIs; for now it
 * returns the fallback prices with a small variance to simulate scanning.
 */
export async function scanMaterialPrices(
  currentPrices: Record<string, number>,
  options: ScanOptions = {}
): Promise<PriceScanReport> {
  const { region = 'Nigeria', currency = 'NGN' } = options;
  const scannedAt = new Date().toISOString();
  const results: PriceScanResultItem[] = [];

  for (const [key, fallback] of Object.entries(FALLBACK_PRICES)) {
    const oldPrice = currentPrices[key] ?? fallback.price;
    // Simulate a small market variation (+/- 3%)
    const variation = 1 + (Math.random() * 0.06 - 0.03);
    const newPrice = Math.round(fallback.price * variation);
    const changePercent = ((newPrice - oldPrice) / oldPrice) * 100;

    results.push({
      material_key: key,
      material_name: fallback.name,
      old_price: oldPrice,
      new_price: newPrice,
      unit: fallback.unit,
      change_percent: Math.round(changePercent * 100) / 100,
      source: 'FRELUX Market Reference (Nigeria)',
      confidence: 'medium',
      scanned_at: scannedAt,
      success: true,
    });
  }

  const updated = results.filter((r) => r.change_percent !== 0).length;

  return {
    scan_date: scannedAt,
    materials_scanned: results.length,
    materials_updated: updated,
    materials_failed: 0,
    results,
    currency,
    market_region: region,
  };
}
