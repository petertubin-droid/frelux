// =========================================================
// HEADER IMAGE OVERRIDES — admin-configurable header backdrops
// =========================================================
// Loads the `header_image_overrides` table (Admin > Header Images)
// once per session and feeds it into PageHeader resolution. The
// fetch is cached at module level: every header on the site
// shares one request. Failures degrade silently to the code
// registry in src/config/page-header-images.ts.
// =========================================================

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase-lazy";

let cached: Record<string, string> | null = null;
let inflight: Promise<Record<string, string>> | null = null;

/**
 * Fetches the override map (route -> image). Cached module-wide;
 * concurrent callers share one request.
 */
export async function fetchHeaderImageOverrides(): Promise<
  Record<string, string>
> {
  if (cached) return cached;
  if (!inflight) {
    inflight = (async () => {
      try {
        const supabase = await getSupabase();
        if (!supabase) return {};
        const { data, error } = await supabase
          .from("header_image_overrides")
          .select("route, image_url");
        if (error || !data) return {};
        const map: Record<string, string> = {};
        for (const row of data as { route: string; image_url: string }[]) {
          if (row.route && row.image_url) map[row.route] = row.image_url;
        }
        cached = map;
        return map;
      } catch {
        return {};
      } finally {
        inflight = null;
      }
    })();
  }
  return inflight;
}

/** Test helper: clears the module cache. */
export function resetHeaderImageOverridesCache(): void {
  cached = null;
  inflight = null;
}

/**
 * React hook returning the override map. Resolves immediately with
 * the cached value (if any) and swaps in fresh data once loaded.
 */
export function useHeaderImageOverrides(): Record<string, string> {
  const [overrides, setOverrides] = useState<Record<string, string>>(
    cached ?? {},
  );
  useEffect(() => {
    let alive = true;
    fetchHeaderImageOverrides()
      .then((map) => {
        if (alive && map) setOverrides(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return overrides;
}
