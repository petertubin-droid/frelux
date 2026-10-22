/**
 * System C: Localized Supplier Onboarding & Live Inventory Engine
 *
 * Suppliers in 20+ countries can onboard for free and list current inventory prices.
 * Pricing Resolver prioritizes verified, in-stock supplier quotes to ensure the
 * calculator uses the most local, real-time available market data.
 */

import { supabase } from "@/lib/supabase";
import type {
  SupplierProfile,
  SupplierInventoryItem,
  SupplierOffer,
} from "@/types/hybrid-pricing";

export const SAMPLE_SUPPLIER_PROFILES: SupplierProfile[] = [
  {
    id: "sup-kenya-savannah",
    user_id: "system-seed-ke",
    company_name: "Savannah Build Supplies Ltd",
    contact_name: "James Mwangi",
    country_name: "Kenya",
    market_code: "KE",
    city: "Nairobi",
    address: "Mombasa Road, Industrial Area, Nairobi",
    phone: "+254700000001",
    whatsapp: "+254700000001",
    email: "sales@savannahbuild.example",
    verification_status: "verified",
    verification_tier: "tier2_business_verified",
    is_verified: true,
    delivery_radius_km: 50,
    rating: 4.8,
    total_quotes_served: 1240,
    status: "active",
    is_active: true,
    verified_at: "2026-05-15T10:00:00Z",
    created_at: "2026-05-01T10:00:00Z",
    updated_at: "2026-10-14T09:00:00Z",
  },
  {
    id: "sup-nigeria-apex",
    user_id: "system-seed-ng",
    company_name: "Apex Continental Materials",
    contact_name: "Chidi Okafor",
    country_name: "Nigeria",
    market_code: "NG",
    city: "Lagos",
    address: "Trade Fair Complex, Lagos",
    phone: "+2348010000002",
    whatsapp: "+2348010000002",
    email: "quotes@apexcontinental.example",
    verification_status: "verified",
    verification_tier: "tier2_business_verified",
    is_verified: true,
    delivery_radius_km: 80,
    rating: 4.9,
    total_quotes_served: 3820,
    status: "active",
    is_active: true,
    verified_at: "2026-06-01T10:00:00Z",
    created_at: "2026-05-20T10:00:00Z",
    updated_at: "2026-10-14T09:00:00Z",
  },
  {
    id: "sup-ghana-accra",
    user_id: "system-seed-gh",
    company_name: "Accra Quality Building Depot",
    contact_name: "Kwame Mensah",
    country_name: "Ghana",
    market_code: "GH",
    city: "Accra",
    address: "Spintex Road, Accra",
    phone: "+233201000003",
    whatsapp: "+233201000003",
    email: "info@accraqbd.example",
    verification_status: "verified",
    verification_tier: "tier2_business_verified",
    is_verified: true,
    delivery_radius_km: 45,
    rating: 4.7,
    total_quotes_served: 650,
    status: "active",
    is_active: true,
    verified_at: "2026-07-10T10:00:00Z",
    created_at: "2026-06-15T10:00:00Z",
    updated_at: "2026-10-14T09:00:00Z",
  },
  {
    id: "sup-south-africa-builders",
    user_id: "system-seed-za",
    company_name: "Cape Builders Warehouse",
    contact_name: "Nomsa Dlamini",
    country_name: "South Africa",
    market_code: "ZA",
    city: "Cape Town",
    address: "Paarden Eiland, Cape Town",
    phone: "+27210000004",
    whatsapp: "+27210000004",
    email: "trade@capebuilders.example",
    verification_status: "verified",
    verification_tier: "tier2_business_verified",
    is_verified: true,
    delivery_radius_km: 35,
    rating: 4.9,
    total_quotes_served: 5100,
    status: "active",
    is_active: true,
    verified_at: "2026-05-01T10:00:00Z",
    created_at: "2026-04-10T10:00:00Z",
    updated_at: "2026-10-14T09:00:00Z",
  },
];

export const SAMPLE_SUPPLIER_INVENTORY: SupplierInventoryItem[] = [
  // Kenya - Savannah Build Supplies
  {
    id: "item-ke-cement-001",
    supplier_id: "sup-kenya-savannah",
    market_code: "KE",
    material_category: "cement",
    category: "cement",
    material_slug: "cement-bag-50kg",
    product_name: "Bamburi Power Plus 42.5",
    brand_name: "Bamburi",
    brand: "Bamburi",
    sku: "BAM-PP-425-50",
    unit: "50kg bag",
    unit_price: 980,
    currency: "KES",
    minimum_order_qty: 1,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 1,
    delivery_available: true,
    bulk_discount_threshold: 100,
    bulk_discount_pct: 3.5,
    is_featured: true,
    is_active: true,
  },
  {
    id: "item-ke-steel-001",
    supplier_id: "sup-kenya-savannah",
    market_code: "KE",
    material_category: "steel",
    category: "steel",
    material_slug: "reinforcement-steel-y12",
    product_name: "Y12 High Tensile Rebar (12m)",
    brand_name: "Devki Steel",
    brand: "Devki Steel",
    sku: "DEV-Y12-12M",
    unit: "12m length",
    unit_price: 1150,
    currency: "KES",
    minimum_order_qty: 1,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 1,
    delivery_available: true,
    bulk_discount_threshold: 50,
    bulk_discount_pct: 5,
    is_featured: true,
    is_active: true,
  },
  {
    id: "item-ke-paint-001",
    supplier_id: "sup-kenya-savannah",
    market_code: "KE",
    material_category: "paint",
    category: "paint",
    material_slug: "emulsion-paint-20l",
    product_name: "Crown Silk Vinyl Emulsion 20L",
    brand_name: "Crown Paints",
    brand: "Crown Paints",
    sku: "CROWN-SILK-20L",
    unit: "20L pail",
    unit_price: 8500,
    currency: "KES",
    minimum_order_qty: 1,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 1,
    delivery_available: true,
    bulk_discount_threshold: 12,
    bulk_discount_pct: 4.5,
    is_featured: true,
    is_active: true,
  },
  // Nigeria - Apex Continental Materials
  {
    id: "item-ng-cement-001",
    supplier_id: "sup-nigeria-apex",
    market_code: "NG",
    material_category: "cement",
    category: "cement",
    material_slug: "dangote-cement-50kg",
    product_name: "Dangote 42.5R Cement",
    brand_name: "Dangote",
    brand: "Dangote",
    sku: "DAN-425R-50",
    unit: "50kg bag",
    unit_price: 9000,
    currency: "NGN",
    minimum_order_qty: 1,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 2,
    delivery_available: true,
    bulk_discount_threshold: 100,
    bulk_discount_pct: 2.5,
    is_featured: true,
    is_active: true,
  },
  {
    id: "item-ng-steel-001",
    supplier_id: "sup-nigeria-apex",
    market_code: "NG",
    material_category: "steel",
    category: "steel",
    material_slug: "reinforcement-steel-12mm",
    product_name: "12mm Iron Rod (12m)",
    brand_name: "Kam Industries",
    brand: "Kam Industries",
    sku: "KAM-12MM-12M",
    unit: "12m length",
    unit_price: 7800,
    currency: "NGN",
    minimum_order_qty: 1,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 2,
    delivery_available: true,
    bulk_discount_threshold: 50,
    bulk_discount_pct: 4,
    is_featured: false,
    is_active: true,
  },
  // Ghana
  {
    id: "item-gh-cement-001",
    supplier_id: "sup-ghana-accra",
    market_code: "GH",
    material_category: "cement",
    category: "cement",
    material_slug: "ghacem-cement-50kg",
    product_name: "Ghacem Super Rapid 42.5N",
    brand_name: "Ghacem",
    brand: "Ghacem",
    sku: "GHA-SR-425N",
    unit: "50kg bag",
    unit_price: 105,
    currency: "GHS",
    minimum_order_qty: 1,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 1,
    delivery_available: true,
    bulk_discount_threshold: 100,
    bulk_discount_pct: 3,
    is_featured: true,
    is_active: true,
  },
  // South Africa
  {
    id: "item-za-cement-001",
    supplier_id: "sup-south-africa-builders",
    market_code: "ZA",
    material_category: "cement",
    category: "cement",
    material_slug: "ppc-cement-50kg",
    product_name: "PPC Surebuild Cement",
    brand_name: "PPC",
    brand: "PPC",
    sku: "PPC-SB-50",
    unit: "50kg bag",
    unit_price: 115,
    currency: "ZAR",
    minimum_order_qty: 1,
    in_stock: true,
    stock_status: "in_stock",
    lead_time_days: 1,
    delivery_available: true,
    bulk_discount_threshold: 100,
    bulk_discount_pct: 4,
    is_featured: true,
    is_active: true,
  },
];

/**
 * Load active supplier profiles by market.
 */
export async function fetchSupplierProfiles(
  marketCode: string,
): Promise<SupplierProfile[]> {
  try {
    const { data, error } = await supabase
      .from("supplier_profiles")
      .select("*")
      .eq("market_code", marketCode.toUpperCase())
      .eq("is_active", true)
      .order("rating", { ascending: false });

    if (error || !data) return [];
    return data as SupplierProfile[];
  } catch {
    return [];
  }
}

/**
 * Query verified, in-stock offers for a given material and market.
 * Prioritizes suppliers that are actively verified, then sorts by price.
 */
export async function fetchVerifiedSupplierOffers(params: {
  marketCode: string;
  materialSlug?: string;
  materialCategory?: string;
  city?: string;
  minQty?: number;
}): Promise<SupplierInventoryItem[]> {
  try {
    let query = supabase
      .from("supplier_inventory_items")
      .select("*, supplier:supplier_profiles!inner(*)")
      .eq("market_code", params.marketCode.toUpperCase())
      .eq("is_active", true)
      .eq("in_stock", true)
      .eq("supplier.is_verified", true)
      .eq("supplier.is_active", true);

    if (params.materialSlug) {
      query = query.eq("material_slug", params.materialSlug);
    }

    if (params.materialCategory) {
      query = query.eq("material_category", params.materialCategory);
    }

    const { data, error } = await query.order("unit_price", {
      ascending: true,
    });

    if (error || !data) return [];
    return data as SupplierInventoryItem[];
  } catch {
    return [];
  }
}

/**
 * Transform raw inventory items into user-facing calculator offer cards.
 */
export function toSupplierOffers(
  items: SupplierInventoryItem[],
): SupplierOffer[] {
  return items.map((item) => {
    const supplier = item.supplier;
    return {
      id: item.id,
      supplierId: item.supplier_id,
      supplierName: supplier?.company_name || "Supplier identity unavailable",
      isVerified:
        supplier?.is_verified === true ||
        supplier?.verification_status === "verified",
      city: supplier?.city || "Local market",
      productName: item.product_name || item.material_slug,
      brand: item.brand_name || item.brand,
      unitPrice: item.unit_price,
      currency: item.currency,
      unit: item.unit,
      inStock: item.in_stock === true,
      leadTimeDays: item.lead_time_days ?? 0,
      phone: supplier?.phone || "",
      whatsapp: supplier?.whatsapp,
    };
  });
}

/**
 * Select best supplier quote: verified stock and most competitive landed price.
 */
export function selectBestSupplierQuote(
  items: SupplierInventoryItem[],
  requiredQuantity: number,
): SupplierInventoryItem | null {
  if (items.length === 0) return null;
  const eligible = items.filter(
    (item) =>
      item.in_stock === true &&
      (item.minimum_order_qty === undefined ||
        item.minimum_order_qty <= requiredQuantity),
  );
  if (eligible.length === 0) return null;
  return [...eligible].sort((a, b) => {
    const aTotal = calculateBulkSupplierDiscount(
      a,
      requiredQuantity,
    ).totalPrice;
    const bTotal = calculateBulkSupplierDiscount(
      b,
      requiredQuantity,
    ).totalPrice;
    return aTotal - bTotal;
  })[0];
}

/**
 * Compute price with bulk supplier discounts applied where thresholds are met.
 */
export function calculateBulkSupplierDiscount(
  item: SupplierInventoryItem,
  quantity: number,
): {
  unitPrice: number;
  totalPrice: number;
  discountPct: number;
  savings: number;
} {
  const threshold = item.bulk_discount_threshold ?? Number.POSITIVE_INFINITY;
  const discountPct = quantity >= threshold ? item.bulk_discount_pct || 0 : 0;
  const unitPrice = Math.round(item.unit_price * (1 - discountPct / 100));
  const totalPrice = unitPrice * quantity;
  const savings = item.unit_price * quantity - totalPrice;
  return { unitPrice, totalPrice, discountPct, savings };
}

/**
 * Save or update a supplier profile after onboarding or price changes.
 */
export async function saveSupplierProfile(
  profile: Partial<SupplierProfile> &
    Pick<SupplierProfile, "company_name" | "market_code" | "user_id">,
): Promise<SupplierProfile> {
  const payload = {
    user_id: profile.user_id,
    company_name: profile.company_name,
    contact_name: profile.contact_name || null,
    country_name: profile.country_name || null,
    market_code: profile.market_code.toUpperCase(),
    city: profile.city || null,
    address: profile.address || null,
    phone: profile.phone || null,
    whatsapp: profile.whatsapp || null,
    email: profile.email || null,
    is_active: true,
  };

  const existing = await supabase
    .from("supplier_profiles")
    .select("id")
    .eq("user_id", profile.user_id)
    .eq("market_code", profile.market_code.toUpperCase())
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  const write = existing.data
    ? await supabase.from("supplier_profiles").update(payload).eq("id", existing.data.id).select().single()
    : await supabase.from("supplier_profiles").insert(payload).select().single();
  const { data, error } = write;

  if (error || !data) throw new Error(error?.message || "Supplier profile was not saved.");

  return data as SupplierProfile;
}

/**
 * Save or update supplier inventory item. This is how a supplier price update
 * propagates instantly into the hybrid resolver.
 */
export async function saveSupplierInventoryItem(
  item: Partial<SupplierInventoryItem> &
    Pick<
      SupplierInventoryItem,
      | "supplier_id"
      | "market_code"
      | "material_category"
      | "material_slug"
      | "product_name"
      | "unit"
      | "unit_price"
      | "currency"
    >,
): Promise<SupplierInventoryItem> {
  const payload = {
    supplier_id: item.supplier_id,
    market_code: (item.market_code || "").toUpperCase(),
    material_category: item.material_category,
    category: item.category || item.material_category,
    material_slug: item.material_slug,
    product_name: item.product_name,
    brand_name: item.brand_name || item.brand || null,
    sku: item.sku || null,
    unit: item.unit,
    unit_price: item.unit_price,
    currency: item.currency.toUpperCase(),
    minimum_order_qty: item.minimum_order_qty || 1,
    in_stock: item.in_stock ?? true,
    stock_status: item.stock_status || "in_stock",
    lead_time_days: item.lead_time_days || 1,
    delivery_available: item.delivery_available ?? true,
    bulk_discount_threshold: item.bulk_discount_threshold || null,
    bulk_discount_pct: item.bulk_discount_pct || null,
    is_active: item.is_active ?? true,
    last_updated_at: new Date().toISOString(),
  };

  let write;
  if (item.id) {
    write = await supabase.from("supplier_inventory_items").update(payload).eq("id", item.id).eq("supplier_id", item.supplier_id).select("*, supplier:supplier_profiles(*)").single();
  } else {
    const existing = await supabase.from("supplier_inventory_items").select("id").eq("supplier_id", item.supplier_id).eq("material_slug", item.material_slug).maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    write = existing.data
      ? await supabase.from("supplier_inventory_items").update(payload).eq("id", existing.data.id).eq("supplier_id", item.supplier_id).select("*, supplier:supplier_profiles(*)").single()
      : await supabase.from("supplier_inventory_items").insert(payload).select("*, supplier:supplier_profiles(*)").single();
  }
  const { data, error } = write;

  if (error || !data) throw new Error(error?.message || "Supplier inventory was not saved.");

  return data as SupplierInventoryItem;
}

export interface SupplierOfferCardData {
  supplierId: string;
  supplierName: string;
  city: string;
  materialSlug: string;
  productName: string;
  unitPrice: number;
  currency: string;
  unit: string;
  stockQuantity?: number;
  leadTimeDays: number;
  phone?: string;
  bulkDiscountApplied: boolean;
}

export async function fetchSupplierOffersForMaterial(params: {
  marketCode: string;
  materialSlug: string;
  quantity?: number;
}): Promise<SupplierOfferCardData[]> {
  const { marketCode, materialSlug, quantity = 1 } = params;
  try {
    const { data, error } = await supabase
      .from("supplier_inventory_items")
      .select("*, supplier:supplier_profiles!inner(*)")
      .eq("market_code", marketCode.toUpperCase())
      .eq("material_slug", materialSlug)
      .eq("is_active", true)
      .eq("in_stock", true)
      .eq("supplier.is_active", true)
      .eq("supplier.is_verified", true)
      .order("unit_price", { ascending: true });
    if (error || !data) return [];
    const now = Date.now();
    return (data as unknown as (SupplierInventoryItem & { supplier?: SupplierProfile })[])
      .filter((item) => {
        const updatedAt = Date.parse(item.last_updated_at || "");
        return item.market_code?.toUpperCase() === marketCode.toUpperCase()
          && item.supplier?.market_code?.toUpperCase() === marketCode.toUpperCase()
          && item.supplier?.is_verified === true
          && Number.isFinite(updatedAt)
          && now - updatedAt <= 30 * 24 * 60 * 60 * 1000;
      })
      .map((item) => {
        const discount = calculateBulkSupplierDiscount(item, quantity);
        return {
          supplierId: item.supplier_id,
          supplierName: item.supplier!.company_name,
          city: item.supplier!.city || "",
          materialSlug: item.material_slug,
          productName: item.product_name || item.material_slug,
          unitPrice: discount.unitPrice,
          currency: item.currency,
          unit: item.unit,
          stockQuantity: item.stock_quantity ?? 0,
          leadTimeDays: item.lead_time_days ?? 0,
          phone: item.supplier!.phone || undefined,
          bulkDiscountApplied: discount.discountPct > 0,
        };
      });
  } catch {
    return [];
  }
}
