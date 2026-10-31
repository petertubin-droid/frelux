import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  MAP_KIND_COLOR,
  pointsFromJobs,
  pointsFromMaterials,
  pointsFromPros,
  pointsFromSuppliers,
  sortByDistance,
  type MapLayerKind,
  type MapPoint,
} from "@/lib/map/geo";

export type MapLayer = "pros" | "jobs" | "materials" | "suppliers";

export const MAP_LAYER_META: Record<
  MapLayer,
  { label: string; blurb: string; empty: string }
> = {
  pros: {
    label: "Professionals",
    blurb: "Verified trade professionals, plotted at their own base",
    empty:
      "No professional has published a location yet. Professionals appear here as soon as they add a base on their FRELUX Pro Connect profile.",
  },
  jobs: {
    label: "Open projects",
    blurb: "Live project requests open to bids, plotted at the site",
    empty:
      "No project has a site location yet. Posted projects appear here once the client sets a location on the job.",
  },
  suppliers: {
    label: "Suppliers",
    blurb:
      "Verified-level material suppliers, plotted at their trading location",
    empty:
      "No supplier has a mapped trading location yet. Suppliers appear here once their city is tracked by the price index or their address is verified.",
  },
  materials: {
    label: "Materials",
    blurb: "Listed stock and supplies, plotted where the seller is",
    empty:
      "No material listing carries a location yet. Sellers appear here when they list stock with pickup or delivery area.",
  },
};

export const LAYER_KIND: Record<MapLayer, MapLayerKind> = {
  pros: "pro",
  jobs: "job",
  materials: "material",
  suppliers: "supplier",
};

export const LAYER_COLOR: Record<MapLayer, string> = {
  pros: MAP_KIND_COLOR.pro,
  jobs: MAP_KIND_COLOR.job,
  materials: MAP_KIND_COLOR.material,
  suppliers: MAP_KIND_COLOR.supplier,
};

interface LayerState {
  points: MapPoint[];
  loading: boolean;
  error: string | null;
}

const PAGE_LIMIT = 400;

async function loadLayer(layer: MapLayer): Promise<MapPoint[]> {
  if (layer === "pros") {
    const { data, error } = await supabase
      .from("pro_profiles")
      .select(
        `id, display_name, business_name, slug, verification_status, rating_avg,
         category:pro_categories(name),
         locations:pro_profile_locations(
           location:pro_locations(latitude, longitude, city, state, country)
         )`,
      )
      .eq("is_listed", true)
      .neq("verification_status", "suspended")
      .limit(PAGE_LIMIT);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pointsFromPros((data ?? []) as any);
  }

  if (layer === "jobs") {
    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(
        `id, title, project_type, budget_min, budget_max, currency, bid_count,
         location_city, location_state, location_country, latitude, longitude`,
      )
      .eq("is_active", true)
      .eq("admin_removed", false)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(PAGE_LIMIT);
    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return pointsFromJobs((data ?? []) as any);
  }

  if (layer === "suppliers") {
    const { data, error } = await supabase
      .from("supplier_profiles")
      .select(
        "id, company_name, city, neighbourhood, market_code, verification_level, latitude, longitude, public_slug, product_categories",
      )
      .eq("is_active", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .limit(PAGE_LIMIT);
    if (error) throw error;
    return pointsFromSuppliers(data ?? []);
  }

  const { data, error } = await supabase
    .from("marketplace_products")
    .select(
      `id, title, price, currency, unit, delivery_available,
       location_city, location_state, location_country, latitude, longitude`,
    )
    .eq("admin_removed", false)
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .limit(PAGE_LIMIT);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pointsFromMaterials((data ?? []) as any);
}

/**
 * Real records for one map layer, nearest first. Nothing is synthesised:
 * an empty result is reported as empty so the map can say so.
 */
export function useMapLayerPoints(
  layer: MapLayer,
  viewer: { lat: number; lon: number } | null,
): LayerState {
  const [state, setState] = useState<LayerState>({
    points: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    loadLayer(layer)
      .then((points) => {
        if (cancelled) return;
        setState({
          points: sortByDistance(points, viewer),
          loading: false,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({
          points: [],
          loading: false,
          error:
            err instanceof Error ? err.message : "Could not load map records",
        });
      });

    return () => {
      cancelled = true;
    };
    // Primitive deps on purpose: refetch on layer or coordinates only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, viewer?.lat, viewer?.lon]);

  return state;
}
