/**
 * SiteTab — project site location capture + map preview
 * (FRELUX engine-1A GIS milestone 3, 2026-10-15).
 *
 * Loads the project's stored site location (WGS-84 pin, optional
 * boundary, disclosed spherical area) and offers explicit
 * capture: decimal-degree coordinates plus an optional boundary
 * (one "lat, lon" pair per line). All validation and area math
 * flow through the tested site-location.ts/crs.ts/geodesy.ts
 * chain; invalid input is refused with honest errors, never
 * guessed.
 */

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import SiteMap from "@/components/contractor/SiteMap";
import {
  getSiteLocation,
  saveSiteLocation,
  type SiteLocationInput,
} from "@/lib/geospatial/site-location";
import type { LatLon } from "@/lib/geospatial/geodesy";

function parseBoundary(text: string): { a: number; b: number }[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  return lines.map((l) => {
    const parts = l.split(/[,;]\s*/);
    if (parts.length !== 2) {
      throw new Error(`Each boundary line must be "lat, lon" (received: "${l}").`);
    }
    const a = Number(parts[0]);
    const b = Number(parts[1]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error(`Boundary line "${l}" is not numeric.`);
    }
    return { a, b };
  });
}

export function SiteTab({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<
    (Awaited<ReturnType<typeof getSiteLocation>>) | null
  >(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [boundary, setBoundary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    getSiteLocation(projectId)
      .then((s) => {
        if (!alive) return;
        setSite(s);
        if (s) {
          setLat(String(s.lat));
          setLon(String(s.lon));
          if (s.polygon && s.polygon.length > 0) {
            setBoundary(
              s.polygon.map((v) => `${v.lat}, ${v.lon}`).join("\n"),
            );
          }
        }
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [projectId]);

  const onSave = async () => {
    setError(null);
    setSaved(false);
    const a = Number(lat);
    const b = Number(lon);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      setError("Latitude and longitude must be decimal degrees (WGS-84).");
      return;
    }
    let polygon: { a: number; b: number }[] | null = null;
    try {
      polygon = parseBoundary(boundary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The boundary could not be read.");
      return;
    }
    const input: SiteLocationInput = {
      project_id: projectId,
      crs_code: "EPSG:4326",
      a,
      b,
      ...(polygon ? { polygon } : {}),
    };
    setSaving(true);
    try {
      const result = await saveSiteLocation(input);
      if (!result.ok) {
        setError(result.error ?? "The site location could not be saved.");
        return;
      }
      const fresh = await getSiteLocation(projectId);
      setSite(fresh);
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "The site location could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const polygonForMap: LatLon[] | null =
    site?.polygon && site.polygon.length >= 3 ? site.polygon : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Site location</h3>
          {site && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {site.source_crs}
            </span>
          )}
        </div>

        {site && (
          <div className="mt-3">
            <SiteMap
              lat={site.lat}
              lon={site.lon}
              polygon={polygonForMap}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p className="text-xs text-muted-foreground">
                Pin: {site.lat.toFixed(5)}, {site.lon.toFixed(5)} (WGS-84)
              </p>
              <p className="text-xs text-muted-foreground">
                {site.site_area_m2 !== null
                  ? `Boundary area: ${Math.round(site.site_area_m2).toLocaleString(
                      "en-NG",
                    )} m² (spherical, ~0.5%)`
                  : "No boundary captured yet."}
              </p>
            </div>
            {site.accuracy_note && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {site.accuracy_note}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-medium">
            Latitude (decimal degrees)
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 6.5244"
              inputMode="decimal"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Longitude (decimal degrees)
            <input
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="e.g. 3.3792"
              inputMode="decimal"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>
        <label className="mt-3 grid gap-1 text-xs font-medium">
          Optional site boundary (one "lat, lon" per line, at least 3 lines)
          <textarea
            value={boundary}
            onChange={(e) => setBoundary(e.target.value)}
            rows={3}
            placeholder={"6.5244, 3.3792\n6.5260, 3.3792\n6.5260, 3.3810"}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
          />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save site location"}
          </button>
          {saved && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              Saved.
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
