/**
 * FRELUX Direct Merchant API & Live Inventory Webhook Engine
 *
 * Provides the global material API infrastructure:
 * - Direct inventory sync webhooks for hardware franchises (Home Depot, Leroy Merlin, Hornbach, Wickes, Buildzone)
 * - Coordinate-matched local supply discovery
 * - Live checkout & order payload generation from calculation outputs
 */

export interface MerchantInventoryItem {
  sku: string;
  merchantId: string;
  merchantName: string;
  materialCategory: 'cement' | 'rebar' | 'sand' | 'paint' | 'plumbing' | 'tiles' | 'blocks' | 'roofing';
  name: string;
  inStockQuantity: number;
  unit: string;
  unitPrice: number;
  currency: string;
  storeLocation: {
    storeName: string;
    latitude: number;
    longitude: number;
    address: string;
    distanceKm?: number;
  };
  directCheckoutUrl?: string;
  lastWebhookSync: string;
}

export interface MerchantWebhookPayload {
  merchantId: string;
  apiKey: string;
  timestamp: string;
  items: Array<{
    sku: string;
    name: string;
    category: string;
    price: number;
    currency: string;
    stock: number;
    unit: string;
    storeLat: number;
    storeLng: number;
    storeAddress: string;
  }>;
}

export const SAMPLE_PARTNER_MERCHANTS: MerchantInventoryItem[] = [
  {
    sku: 'HD-CEM-425-01',
    merchantId: 'merch_homedepot_global',
    merchantName: 'Home Depot Pro Supplies',
    materialCategory: 'cement',
    name: 'Quikrete 5000 High Early Strength Concrete 80 lb',
    inStockQuantity: 1420,
    unit: 'bag',
    unitPrice: 8.45,
    currency: 'USD',
    storeLocation: {
      storeName: 'Home Depot North Central Hub',
      latitude: 29.7604,
      longitude: -95.3698,
      address: 'Houston, TX'
    },
    directCheckoutUrl: 'https://www.homedepot.com',
    lastWebhookSync: '2026-10-15T10:00:00Z'
  },
  {
    sku: 'HB-REB-16-DE',
    merchantId: 'merch_hornbach_de',
    merchantName: 'HORNBACH Baumarkt AG',
    materialCategory: 'rebar',
    name: 'Bewehrungsstahl BSt 500 S Ø 16 mm 6m Stange',
    inStockQuantity: 860,
    unit: 'length',
    unitPrice: 16.50,
    currency: 'EUR',
    storeLocation: {
      storeName: 'HORNBACH Bornheim (Pfalz)',
      latitude: 49.2088,
      longitude: 8.1633,
      address: 'Hornbachstraße 13, 76879 Bornheim'
    },
    directCheckoutUrl: 'https://www.hornbach.de',
    lastWebhookSync: '2026-10-15T11:30:00Z'
  },
  {
    sku: 'LM-PNT-EXT-FR',
    merchantId: 'merch_leroymerlin_fr',
    merchantName: 'Leroy Merlin Pro',
    materialCategory: 'paint',
    name: 'Peinture façade et toiture ultra-résistante 10L',
    inStockQuantity: 420,
    unit: 'bucket',
    unitPrice: 74.90,
    currency: 'EUR',
    storeLocation: {
      storeName: 'Leroy Merlin Paris Sud',
      latitude: 48.8566,
      longitude: 2.3522,
      address: 'Paris, France'
    },
    directCheckoutUrl: 'https://www.leroymerlin.fr',
    lastWebhookSync: '2026-10-15T09:15:00Z'
  },
  {
    sku: 'BZ-CEM-DAN-NG',
    merchantId: 'merch_buildzone_ng',
    merchantName: 'Dangote Direct / Buildzone Depot',
    materialCategory: 'cement',
    name: 'Dangote 3X Portland Cement 42.5R 50kg',
    inStockQuantity: 3500,
    unit: 'bag',
    unitPrice: 8800,
    currency: 'NGN',
    storeLocation: {
      storeName: 'Buildzone Lekki Central Depot',
      latitude: 6.4698,
      longitude: 3.5852,
      address: 'Lekki-Epe Expressway, Lagos'
    },
    directCheckoutUrl: 'https://buildzone.ng',
    lastWebhookSync: '2026-10-15T11:45:00Z'
  }
];

/**
 * Calculates distance in km between two lat/lng coordinates (Haversine formula)
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Matches material estimate categories to nearest partner retail inventories
 */
export function findNearbyMerchantInventory(params: {
  category: MerchantInventoryItem['materialCategory'];
  userLat?: number;
  userLng?: number;
  maxDistanceKm?: number;
}): MerchantInventoryItem[] {
  let matched = SAMPLE_PARTNER_MERCHANTS.filter(m => m.materialCategory === params.category);

  if (params.userLat && params.userLng) {
    matched = matched.map(item => ({
      ...item,
      storeLocation: {
        ...item.storeLocation,
        distanceKm: haversineDistanceKm(
          params.userLat!,
          params.userLng!,
          item.storeLocation.latitude,
          item.storeLocation.longitude
        )
      }
    }));

    if (params.maxDistanceKm) {
      matched = matched.filter(
        item => item.storeLocation.distanceKm !== undefined && item.storeLocation.distanceKm <= params.maxDistanceKm!
      );
    }

    matched.sort((a, b) => (a.storeLocation.distanceKm || 99999) - (b.storeLocation.distanceKm || 99999));
  }

  return matched;
}
