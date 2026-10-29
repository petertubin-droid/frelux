/**
 * SiteTab — project site location capture + map preview
 * (FRELUX engine-1A GIS milestone 3, 2026-10-15; milestone 4
 * adds the licensed imagery section).
 *
 * Loads the project's stored site location (WGS-84 pin, optional
 * boundary, disclosed spherical area) and offers explicit
 * capture: decimal-degree coordinates plus an optional boundary
 * (one "lat, lon" pair per line). All validation and area math
 * flow through the tested site-location.ts/crs.ts/geodesy.ts
 * chain; invalid input is refused with honest errors, never
 * guessed.
 *
 * M4 — licensed imagery: satellite basemaps render only with a
 * registered, unexpired license record; drone imagery is
 * registered (license, capture date, coverage, optional hosted
 * XYZ tiles) and license-tracked per project. Every record
 * carries its source/date/coverage disclosure.
 */

import { useEffect, useState } from "react";
import { MapPin, Satellite, Trash2, ShieldCheck, Plus } from "lucide-react";
import SiteMap from "@/components/contractor/SiteMap";
import {
  getSiteLocation,
  saveSiteLocation,
  type SiteLocationInput,
} from "@/lib/geospatial/site-location";
import {
  IMAGERY_PROVIDERS,
  checkImageryLicense,
  deleteImageryRecord,
  fetchImageryRecords,
  imageryRecordDisclosure,
  saveImageryRecord,
  type ImageryRecord,
} from "@/lib/geospatial/imagery";
import type { LatLon } from "@/lib/geospatial/geodesy";
import { useLanguage } from "@/lib/i18n";

function parseBoundary(text: string): { a: number; b: number }[] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  return lines.map((l) => {
    const parts = l.split(/[,;]\s*/);
    if (parts.length !== 2) {
      throw new Error(
        `Each boundary line must be "lat, lon" (received: "${l}").`,
      );
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
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [site, setSite] = useState<Awaited<
    ReturnType<typeof getSiteLocation>
  > | null>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [boundary, setBoundary] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // ── M4: licensed imagery state ──
  const [imagery, setImagery] = useState<ImageryRecord[]>([]);
  const [basemap, setBasemap] = useState<string>("osm-standard");
  const [droneForm, setDroneForm] = useState({
    name: "",
    license_name: "",
    license_url: "",
    captured_on: "",
    coverage_note: "",
    tile_url_template: "",
  });
  const [droneSaving, setDroneSaving] = useState(false);
  const [imageryError, setImageryError] = useState<string | null>(null);
  const [imageryNote, setImageryNote] = useState<string | null>(null);

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
            setBoundary(s.polygon.map((v) => `${v.lat}, ${v.lon}`).join("\n"));
          }
        }
      })
      .finally(() => alive && setLoading(false));
    fetchImageryRecords(projectId)
      .then((r) => {
        if (alive && r.ok) setImagery(r.records);
      })
      .catch(() => {
        /* imagery is optional; the panel shows its own error state */
      });
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
      setError(
        e instanceof Error ? e.message : "The boundary could not be read.",
      );
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

  // ── M4: imagery actions ──
  const refreshImagery = async () => {
    const r = await fetchImageryRecords(projectId);
    if (r.ok) setImagery(r.records);
  };

  const registerDrone = async () => {
    setImageryError(null);
    setImageryNote(null);
    setDroneSaving(true);
    try {
      const result = await saveImageryRecord({
        project_id: projectId,
        provider_id: "custom",
        name: droneForm.name,
        license_name: droneForm.license_name,
        license_url: droneForm.license_url || null,
        captured_on: droneForm.captured_on || null,
        coverage_note: droneForm.coverage_note || null,
        tile_url_template: droneForm.tile_url_template || null,
      });
      if (!result.ok) {
        setImageryError(result.error);
        return;
      }
      setDroneForm({
        name: "",
        license_name: "",
        license_url: "",
        captured_on: "",
        coverage_note: "",
        tile_url_template: "",
      });
      await refreshImagery();
      setImageryNote("Drone imagery registered with its license record.");
    } finally {
      setDroneSaving(false);
    }
  };

  const removeRecord = async (id: string) => {
    setImageryError(null);
    const r = await deleteImageryRecord(id);
    if (!r.ok) setImageryError(r.error);
    else await refreshImagery();
  };

  const polygonForMap: LatLon[] | null =
    site?.polygon && site.polygon.length >= 3 ? site.polygon : null;

  const selectedRecord =
    basemap === "osm-standard"
      ? null
      : (imagery.find((r) => r.provider_id === basemap) ?? null);

  const satelliteRecord = imagery.find(
    (r) => r.provider_id === "esri-world-imagery",
  );
  const satelliteCheck = checkImageryLicense(
    "esri-world-imagery",
    satelliteRecord ?? null,
  );

  return (
    <div className="space-y-4">
      {/* ── Premium imagery hero ── */}
      <div className="relative overflow-hidden rounded-xl border border-border dark:border-white/5">
        <img
          src="https://images.pexels.com/photos/2099136/pexels-photo-2099136.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
        <div className="relative p-5">
          <div className="flex items-center gap-2">
            <Satellite aria-hidden="true" className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              {t("Licensed site imagery")}
            </h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-snug text-muted-foreground">
            Satellite basemaps render under their provider license with
            attribution; drone imagery is registered here with its license,
            capture date and coverage so every image on this project stays
            license-tracked.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">{t("Site location")}</h3>
          {site && (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {site.source_crs}
            </span>
          )}
        </div>

        {site && (
          <div className="mt-3">
            {/* ── Basemap switcher (M4) ── */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Basemap:
              </span>
              <div className="flex overflow-hidden rounded-lg border border-border">
                {IMAGERY_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setBasemap(p.id)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      basemap === p.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Satellite license gate notice */}
            {basemap === "esri-world-imagery" && !satelliteCheck.usable && (
              <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-snug text-amber-700 dark:text-amber-400">
                {satelliteCheck.reason} Until then the satellite basemap stays
                on the street map below.
              </div>
            )}

            <SiteMap
              lat={site.lat}
              lon={site.lon}
              polygon={polygonForMap}
              providerId={
                basemap === "esri-world-imagery" && !satelliteCheck.usable
                  ? "osm-standard"
                  : basemap
              }
              imageryRecord={
                basemap === "esri-world-imagery" && satelliteCheck.usable
                  ? satelliteRecord
                  : selectedRecord
              }
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <p className="text-xs text-muted-foreground">
                Pin: {site.lat.toFixed(5)}, {site.lon.toFixed(5)} (WGS-84)
              </p>
              <p className="text-xs text-muted-foreground">
                {site.site_area_m2 !== null
                  ? `Boundary area: ${Math.round(
                      site.site_area_m2,
                    ).toLocaleString("en-NG")} m² (spherical, ~0.5%)`
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
            {t("Latitude (decimal degrees)")}
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 6.5244"
              inputMode="decimal"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            {t("Longitude (decimal degrees)")}
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
              {t("Saved.")}
            </span>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {/* ── M4: imagery license records ── */}
      <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">
            {t("Imagery license records")}
          </h3>
          {satelliteCheck.usable && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {t("Satellite licensed")}
            </span>
          )}
        </div>

        {imagery.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No imagery registered for this project yet. The street basemap needs
            no record; the satellite basemap and drone imagery register their
            licenses below.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {imagery.map((r) => {
              const check = checkImageryLicense(r.provider_id, r);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border bg-background/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {r.name}
                      <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                        {r.provider_id}
                      </span>
                    </p>
                    <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground">
                      {imageryRecordDisclosure(r)}
                    </p>
                    {!check.usable && (
                      <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {check.reason}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove imagery record ${r.name}`}
                    onClick={() => removeRecord(r.id)}
                    className="rounded-md border border-border p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Register drone imagery */}
        <details className="mt-4 rounded-lg border border-border bg-background/50 p-3">
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold">
            <Plus aria-hidden="true" className="h-3.5 w-3.5 text-primary" />
            {t("Register drone / hosted imagery")}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-medium">
              Imagery set name *
              <input
                value={droneForm.name}
                onChange={(e) =>
                  setDroneForm((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="e.g. Site flyover 2026-09-30"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              License it is used under *
              <input
                value={droneForm.license_name}
                onChange={(e) =>
                  setDroneForm((d) => ({ ...d, license_name: e.target.value }))
                }
                placeholder="e.g. Contractor-owned survey license"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              {t("License URL")}
              <input
                value={droneForm.license_url}
                onChange={(e) =>
                  setDroneForm((d) => ({ ...d, license_url: e.target.value }))
                }
                placeholder="https://… (optional)"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Capture date *
              <input
                type="date"
                value={droneForm.captured_on}
                onChange={(e) =>
                  setDroneForm((d) => ({ ...d, captured_on: e.target.value }))
                }
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium sm:col-span-2">
              {t("Coverage note")}
              <input
                value={droneForm.coverage_note}
                onChange={(e) =>
                  setDroneForm((d) => ({ ...d, coverage_note: e.target.value }))
                }
                placeholder="e.g. Full site boundary, ~2 cm/px orthophoto"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium sm:col-span-2">
              {t(
                "Hosted XYZ tile URL (renders the imagery as the site basemap)",
              )}
              <input
                value={droneForm.tile_url_template}
                onChange={(e) =>
                  setDroneForm((d) => ({
                    ...d,
                    tile_url_template: e.target.value,
                  }))
                }
                placeholder="https://your-host/tiles/{z}/{x}/{y}.png"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={registerDrone}
              disabled={droneSaving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {droneSaving ? "Registering…" : "Register imagery record"}
            </button>
            {imageryNote && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                {imageryNote}
              </span>
            )}
          </div>
          {imageryError && (
            <p className="mt-2 text-sm text-destructive">{imageryError}</p>
          )}
        </details>
      </div>
    </div>
  );
}
