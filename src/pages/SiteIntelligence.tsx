/**
 * Site & Soil Intelligence.
 *
 * A site brings together what can be screened about a location, what a person
 * states about the ground, and what an uploaded investigation actually says.
 * The page keeps those three apart on screen, because conflating them is how a
 * map pin ends up being treated as a soil report.
 *
 * Nothing here sizes a foundation from a city, a coordinate or a soil name: a
 * scenario runs only on a bearing capacity the user types or a reviewer verified.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  FileCheck2,
  FileUp,
  Info,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { GlobeMap } from "@/components/map/GlobeMap";
import { Button } from "@/components/ui/shadcn/button";
import { useSeo } from "@/lib/seo";
import { useMarket } from "@/lib/international/market-context";
import { useProjectCity } from "@/lib/price-index/use-project-city";
import { searchPlaces, type PlaceResult } from "@/lib/map/geocode";
import { supabase } from "@/lib/supabase";
import { buildScreening, slopeBand } from "@/lib/site-intelligence/screening";
import { runScenario, ScenarioInputError } from "@/lib/site-intelligence/foundation";
import {
  fetchMyProjects,
  fetchReports,
  fetchSites,
  fetchSoilClassifications,
  saveSite,
  signedReportUrl,
  uploadReport,
} from "@/lib/site-intelligence/queries";
import type {
  BearingSource,
  FoundationScenarioResult,
  FoundationType,
  GeotechReport,
  ProjectSite,
  SiteScreening,
  SoilClassification,
} from "@/lib/site-intelligence/types";

const FOUNDATION_TYPES: { key: FoundationType; label: string }[] = [
  { key: "strip", label: "Strip foundation" },
  { key: "pad", label: "Pad foundation" },
  { key: "raft", label: "Raft foundation" },
  { key: "pile", label: "Pile foundation" },
  { key: "ground_improvement", label: "Ground improvement" },
];

const naira = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

function ConfidenceChip({ level }: { level: string }) {
  const styles: Record<string, string> = {
    screening: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sourced: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    unknown: "border-border bg-muted text-muted-foreground",
  };
  const labels: Record<string, string> = {
    screening: "Screening",
    sourced: "Published source",
    unknown: "Not available",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${styles[level] ?? styles.unknown}`}
    >
      {labels[level] ?? level}
    </span>
  );
}

function ScreeningRow({
  label,
  value,
  confidence,
  source,
  limitation,
}: {
  label: string;
  value: string | null;
  confidence: string;
  source: string | null;
  limitation: string | null;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <ConfidenceChip level={confidence} />
      </div>
      <p className="mt-1 text-sm font-medium">{value ?? "No data for this location"}</p>
      {source && <p className="mt-0.5 text-[11px] text-muted-foreground">{source}</p>}
      {limitation && <p className="mt-1 text-[11px] text-muted-foreground">{limitation}</p>}
    </div>
  );
}

export default function SiteIntelligence() {
  const { marketCode } = useMarket();
  const { citySlug } = useProjectCity();

  useSeo({
    title: "Site & Soil Intelligence | FRELUXTOOLS",
    description:
      "Screen a project location for soil classification, groundwater, flood and terrain signals, compare preliminary foundation scenarios, and attach geotechnical reports. Screening information only, never a design.",
    canonicalPath: "/site-intelligence",
  });

  const [classes, setClasses] = useState<SoilClassification[]>([]);
  const [point, setPoint] = useState<{ lat: number; lon: number } | null>(null);
  const [address, setAddress] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [screening, setScreening] = useState<SiteScreening | null>(null);
  const [screeningBusy, setScreeningBusy] = useState(false);
  const [soilSlug, setSoilSlug] = useState("");
  const [sites, setSites] = useState<ProjectSite[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Scenario assumptions, all user supplied.
  const [bearing, setBearing] = useState("");
  const [bearingSource, setBearingSource] = useState<BearingSource>("user_assumption");
  const [depth, setDepth] = useState("1.0");
  const [wallLoad, setWallLoad] = useState("40");
  const [columnLoad, setColumnLoad] = useState("600");
  const [length, setLength] = useState("20");
  const [width, setWidth] = useState("12");
  const [pileCount, setPileCount] = useState("8");
  const [pileDepth, setPileDepth] = useState("12");
  const [improveArea, setImproveArea] = useState("150");
  const [pileRate, setPileRate] = useState("");
  const [improveRate, setImproveRate] = useState("");
  const [dewatering, setDewatering] = useState("");
  const [scenarios, setScenarios] = useState<
    { type: FoundationType; result: FoundationScenarioResult }[]
  >([]);
  const [running, setRunning] = useState(false);

  // Reports
  const [reports, setReports] = useState<GeotechReport[]>([]);
  const [reportType, setReportType] = useState<GeotechReport["report_type"]>("soil_investigation");
  const [reportTitle, setReportTitle] = useState("");
  const [reportPreparedBy, setReportPreparedBy] = useState("");
  const [reportBearing, setReportBearing] = useState("");
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchSoilClassifications().then(setClasses);
    fetchSites().then(setSites);
    fetchReports().then(setReports);
    fetchMyProjects().then(setProjects);
    supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
  }, []);

  useEffect(() => {
    if (!point) return;
    let cancelled = false;
    setScreeningBusy(true);
    buildScreening({
      lat: point.lat,
      lon: point.lon,
      countryCode: marketCode,
      citySlug,
    })
      .then((result) => {
        if (!cancelled) setScreening(result);
      })
      .catch(() => {
        if (!cancelled) setScreening(null);
      })
      .finally(() => {
        if (!cancelled) setScreeningBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [point, marketCode, citySlug]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.slug === soilSlug) ?? null,
    [classes, soilSlug],
  );

  const verifiedBearing = useMemo(() => {
    const verified = reports.filter(
      (r) => r.verification_status === "verified" && r.bearing_capacity_kpa,
    );
    return verified[0]?.bearing_capacity_kpa ?? null;
  }, [reports]);

  const handleSearch = useCallback(async () => {
    if (query.trim().length < 3) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchPlaces(query.trim());
      setResults(found.slice(0, 6));
      if (!found.length) setError("No place matched that search.");
    } catch {
      setError("The place search is unavailable right now.");
    } finally {
      setSearching(false);
    }
  }, [query]);

  const choose = (coords: { lat: number; lon: number }, label?: string) => {
    setPoint(coords);
    setScreening(null);
    if (label) setAddress(label);
    setResults([]);
  };

  async function handleSaveSite() {
    if (!point) return;
    if (!signedIn) {
      setError("Sign in to save a site to your projects.");
      return;
    }
    setSaving(true);
    setError(null);
    const { site, error: saveError } = await saveSite({
      label: address || `Site at ${point.lat.toFixed(4)}, ${point.lon.toFixed(4)}`,
      latitude: point.lat,
      longitude: point.lon,
      address: address || null,
      country_code: marketCode,
      city_slug: citySlug,
      project_id: projectId || null,
      soil_classification_id: selectedClass?.id ?? null,
      soil_source: selectedClass ? "user_selection" : "not_stated",
      screening: (screening ?? {}) as unknown as Record<string, unknown>,
    });
    setSaving(false);
    if (saveError) {
      setError(saveError);
      return;
    }
    setMessage("Site saved. Reports and scenarios attach to it.");
    setSites((prev) => (site ? [site, ...prev] : prev));
  }

  async function handleCompare() {
    const bearingValue = Number(bearing);
    if (!Number.isFinite(bearingValue) || bearingValue <= 0) {
      setError("Enter the allowable bearing capacity you want to compare on.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const assumptions = {
        bearing_capacity_kpa: bearingValue,
        bearing_source: bearingSource,
        depth_m: Number(depth) || 1,
        wall_load_kn_m: Number(wallLoad) || 0,
        column_load_kn: Number(columnLoad) || 0,
        building_length_m: Number(length) || undefined,
        building_width_m: Number(width) || undefined,
        pile_count: Number(pileCount) || undefined,
        pile_depth_m: Number(pileDepth) || undefined,
        ground_improvement_area_m2: Number(improveArea) || undefined,
        dewatering_allowance: dewatering ? Number(dewatering) : undefined,
      };
      const results = await Promise.all(
        FOUNDATION_TYPES.map(async (t) => ({
          type: t.key,
          result: await runScenario({
            type: t.key,
            assumptions,
            citySlug,
            pileRate: pileRate ? Number(pileRate) : null,
            groundImprovementRate: improveRate ? Number(improveRate) : null,
            dewateringRate: dewatering ? 1 : null,
          }),
        })),
      );
      setScenarios(results);
    } catch (e) {
      setError(e instanceof ScenarioInputError ? e.message : "The comparison could not run.");
    } finally {
      setRunning(false);
    }
  }

  async function handleUpload() {
    const siteId = sites[0]?.id;
    if (!siteId) {
      setError("Save this site first, then attach the report to it.");
      return;
    }
    if (!reportFile) {
      setError("Choose a file to attach.");
      return;
    }
    setUploading(true);
    setError(null);
    const { report, error: uploadError } = await uploadReport({
      siteId,
      file: reportFile,
      reportType,
      title: reportTitle || reportFile.name,
      preparedBy: reportPreparedBy,
      bearingCapacityKpa: reportBearing ? Number(reportBearing) : null,
    });
    setUploading(false);
    if (uploadError || !report) {
      setError(uploadError ?? "The report could not be attached.");
      return;
    }
    setReports((prev) => [report, ...prev]);
    setMessage("Report attached as unverified. A reviewer must confirm its findings.");
    setReportFile(null);
    setReportTitle("");
    setReportBearing("");
  }

  async function openReport(path: string) {
    const link = await signedReportUrl(path);
    if (link) window.open(link, "_blank", "noopener,noreferrer");
    else setError("That document could not be opened.");
  }

  return (
    <>
      <PageHeader
        variant="tool"
        eyebrow="Site intelligence"
        title="Site & Soil Intelligence"
        subtitle="Screen a location, record what is known about the ground, and compare preliminary foundation scenarios on a bearing capacity you supply."
        breadcrumbs={[
          { label: "Home", path: "/" },
          { label: "Tools", path: "/tools" },
          { label: "Site & Soil Intelligence" },
        ]}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            <strong>Screening, not a survey.</strong> Values marked as screening come from
            terrain models and published regional sources. They cannot identify your soil,
            prove a bearing capacity, or justify a foundation choice. Every foundation
            decision needs a geotechnical investigation and structural engineer review.
          </p>
        </div>

        {/* 1. Location */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">1. Project location</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search an address, city or neighbourhood"
                aria-label="Search an address, city or neighbourhood"
                className="h-10 w-full rounded-md border border-border/70 bg-card pl-9 pr-3 text-sm"
              />
            </div>
            <Button onClick={handleSearch} disabled={searching || query.trim().length < 3}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
            </Button>
          </div>

          {results.length > 0 && (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border border-border/70 bg-card text-sm">
              {results.map((r) => (
                <li key={`${r.lat}-${r.lon}-${r.label}`}>
                  <button
                    className="w-full px-3 py-2 text-left hover:bg-accent"
                    onClick={() => choose({ lat: r.lat, lon: r.lon }, r.label)}
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="overflow-hidden rounded-xl border border-border/70">
            <GlobeMap
              points={
                point
                  ? [
                      {
                        id: "site",
                        name: address || "Project site",
                        lat: point.lat,
                        lon: point.lon,
                      } as never,
                    ]
                  : []
              }
              center={point ?? { lat: 9.082, lon: 8.6753 }}
              zoom={point ? 12 : 5}
              height={320}
              label="Project site location picker"
              onPickCoordinate={(coords) =>
                choose(coords, `Map point (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`)
              }
              emptyTitle="Tap the map to place your site"
              emptyHint="Or search an address above."
            />
          </div>

          {point && (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <MapPin aria-hidden="true" className="h-4 w-4" />
                {point.lat.toFixed(4)}, {point.lon.toFixed(4)}
              </span>
              {projects.length > 0 && (
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  aria-label="Attach to project"
                  className="h-9 rounded-md border border-border/70 bg-card px-2 text-sm"
                >
                  <option value="">Not linked to a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              )}
              <Button variant="outline" onClick={handleSaveSite} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save this site"}
              </Button>
            </div>
          )}
        </section>

        {/* 2. Soil */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">2. Ground conditions as you understand them</h2>
          <p className="text-sm text-muted-foreground">
            A classification describes material. It carries no strength value, and selecting
            one does not establish what is under your site.
          </p>
          <select
            value={soilSlug}
            onChange={(e) => setSoilSlug(e.target.value)}
            aria-label="Soil classification"
            className="h-10 w-full rounded-md border border-border/70 bg-card px-3 text-sm sm:max-w-sm"
          >
            <option value="">Not stated</option>
            {classes.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>

          {selectedClass && (
            <div className="rounded-lg border border-border/70 bg-card p-4 text-sm">
              <p className="font-medium">{selectedClass.name}</p>
              <p className="mt-1 text-muted-foreground">{selectedClass.summary}</p>
              <p className="mt-2">{selectedClass.engineering_notes}</p>
              <p className="mt-2 text-muted-foreground">{selectedClass.implication}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {selectedClass.dewatering_flag && (
                  <span className="rounded-full border border-border px-2 py-0.5">
                    Dewatering may be needed
                  </span>
                )}
                {selectedClass.ground_improvement_flag && (
                  <span className="rounded-full border border-border px-2 py-0.5">
                    Ground improvement may be needed
                  </span>
                )}
                <span className="rounded-full border border-border px-2 py-0.5">
                  Investigation: {selectedClass.investigation_priority}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* 3. Screening */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">3. What can be screened here</h2>
          {screeningBusy && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Screening this location…
            </p>
          )}
          {!point && (
            <p className="text-sm text-muted-foreground">
              Choose a location to see screening information.
            </p>
          )}
          {screening && (
            <div className="grid gap-3 sm:grid-cols-2">
              <ScreeningRow
                label="Elevation"
                value={
                  screening.elevation_m.value != null
                    ? `${screening.elevation_m.value} m`
                    : null
                }
                confidence={screening.elevation_m.confidence}
                source={screening.elevation_m.source}
                limitation={screening.elevation_m.limitation}
              />
              <ScreeningRow
                label="Terrain slope"
                value={
                  screening.slope_degrees.value != null
                    ? `${screening.slope_degrees.value}° (${slopeBand(screening.slope_degrees.value)})`
                    : null
                }
                confidence={screening.slope_degrees.confidence}
                source={screening.slope_degrees.source}
                limitation={screening.slope_degrees.limitation}
              />
              <ScreeningRow
                label="Distance to coast"
                value={
                  screening.coastal_distance_km.value != null
                    ? `${screening.coastal_distance_km.value} km`
                    : null
                }
                confidence={screening.coastal_distance_km.confidence}
                source={screening.coastal_distance_km.source}
                limitation={screening.coastal_distance_km.limitation}
              />
              <ScreeningRow
                label="Flood exposure (regional)"
                value={screening.flood_exposure.value}
                confidence={screening.flood_exposure.confidence}
                source={screening.flood_exposure.source}
                limitation={screening.flood_exposure.limitation}
              />
              <ScreeningRow
                label="Drainage (regional)"
                value={screening.drainage_note.value}
                confidence={screening.drainage_note.confidence}
                source={screening.drainage_note.source}
                limitation={screening.drainage_note.limitation}
              />
              <ScreeningRow
                label="Groundwater (regional)"
                value={screening.groundwater_note.value}
                confidence={screening.groundwater_note.confidence}
                source={screening.groundwater_note.source}
                limitation={screening.groundwater_note.limitation}
              />
              <ScreeningRow
                label="Erosion (regional)"
                value={screening.erosion_note.value}
                confidence={screening.erosion_note.confidence}
                source={screening.erosion_note.source}
                limitation={screening.erosion_note.limitation}
              />
              <ScreeningRow
                label="Geotechnical reports attached"
                value={
                  reports.length
                    ? `${reports.filter((r) => r.verification_status === "verified").length} verified of ${reports.length}`
                    : "None attached"
                }
                confidence={reports.length ? "sourced" : "unknown"}
                source={null}
                limitation="Attachment count reflects your records only."
              />
            </div>
          )}
        </section>

        {/* 4. Scenarios */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">4. Preliminary scenario comparison</h2>
          <div className="flex gap-3 rounded-xl border border-border/70 bg-muted/40 p-3 text-sm">
            <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              This compares cost and quantity consequences of assumptions you enter. It does
              not choose a foundation, and it does not replace design.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs">
              <span className="text-muted-foreground">Allowable bearing capacity (kN/m²)</span>
              <input
                value={bearing}
                onChange={(e) => setBearing(e.target.value)}
                inputMode="decimal"
                placeholder="e.g. 150"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Where the value came from</span>
              <select
                value={bearingSource}
                onChange={(e) => setBearingSource(e.target.value as BearingSource)}
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              >
                <option value="user_assumption">My own assumption</option>
                <option value="report_verified">Verified report</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Founding depth (m)</span>
              <input
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Wall load (kN/m)</span>
              <input
                value={wallLoad}
                onChange={(e) => setWallLoad(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Column load (kN)</span>
              <input
                value={columnLoad}
                onChange={(e) => setColumnLoad(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Building length (m)</span>
              <input
                value={length}
                onChange={(e) => setLength(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Building width (m)</span>
              <input
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Area to improve (m²)</span>
              <input
                value={improveArea}
                onChange={(e) => setImproveArea(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Pile count</span>
              <input
                value={pileCount}
                onChange={(e) => setPileCount(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Pile depth (m)</span>
              <input
                value={pileDepth}
                onChange={(e) => setPileDepth(e.target.value)}
                inputMode="decimal"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Piling rate (currency per m)</span>
              <input
                value={pileRate}
                onChange={(e) => setPileRate(e.target.value)}
                inputMode="decimal"
                placeholder="From your piling contractor"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Ground improvement rate (per m²)</span>
              <input
                value={improveRate}
                onChange={(e) => setImproveRate(e.target.value)}
                inputMode="decimal"
                placeholder="From your contractor"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Dewatering allowance (amount)</span>
              <input
                value={dewatering}
                onChange={(e) => setDewatering(e.target.value)}
                inputMode="decimal"
                placeholder="What you are allowing for it"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-card px-2 text-sm"
              />
            </label>
          </div>

          {verifiedBearing && (
            <p className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              A reviewed report gives {verifiedBearing} kN/m². Use it here if it applies to
              this site.
            </p>
          )}

          <Button onClick={handleCompare} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : "Compare scenarios"}
          </Button>

          {scenarios.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-border/70">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Scenario</th>
                    <th className="px-3 py-2 font-medium">Excavation</th>
                    <th className="px-3 py-2 font-medium">Concrete</th>
                    <th className="px-3 py-2 font-medium">Reinforcement</th>
                    <th className="px-3 py-2 font-medium">Material cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {scenarios.map(({ type, result }) => (
                    <tr key={type}>
                      <td className="px-3 py-2 font-medium">
                        {FOUNDATION_TYPES.find((f) => f.key === type)?.label}
                      </td>
                      <td className="px-3 py-2">{result.quantities.excavation_m3} m³</td>
                      <td className="px-3 py-2">{result.quantities.concrete_m3} m³</td>
                      <td className="px-3 py-2">{result.quantities.reinforcement_kg} kg</td>
                      <td className="px-3 py-2">
                        {result.cost?.subtotal != null ? (
                          naira.format(result.cost.subtotal)
                        ) : (
                          <span className="text-muted-foreground">
                            Incomplete: {result.cost?.unpriced.join(", ") || "no priced lines"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {scenarios.some((s) => s.result.warnings.length) && (
            <div className="space-y-2 rounded-xl border border-border/70 bg-card p-4 text-xs">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle aria-hidden="true" className="h-4 w-4 text-amber-600" />
                Assumptions behind these numbers
              </p>
              <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                {Array.from(new Set(scenarios.flatMap((s) => s.result.warnings))).map((w) => (
                  <li key={w}>{w}</li>
                ))}
                <li>
                  Material lines use the FRELUX Material Price Index
                  {citySlug ? ` for ${citySlug.replace(/-/g, " ")}` : " at the national median"}.
                  Labour, plant and margin are excluded.
                </li>
              </ul>
            </div>
          )}
        </section>

        {/* 5. Reports */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">5. Geotechnical reports</h2>
          <p className="text-sm text-muted-foreground">
            Attach soil investigation reports, borehole logs, laboratory results, bearing
            capacity or groundwater reports. Findings stay unverified until a reviewer
            confirms them, and only then can they be used as a verified bearing capacity.
          </p>

          <div className="grid gap-3 rounded-xl border border-border/70 bg-card p-4 sm:grid-cols-2">
            <label className="text-xs">
              <span className="text-muted-foreground">Report type</span>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as GeotechReport["report_type"])}
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
              >
                <option value="soil_investigation">Soil investigation report</option>
                <option value="borehole_log">Borehole log</option>
                <option value="laboratory">Laboratory results</option>
                <option value="bearing_capacity">Bearing capacity report</option>
                <option value="groundwater">Groundwater report</option>
              </select>
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Title</span>
              <input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Borehole investigation, Phase 1"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">Prepared by (firm or engineer)</span>
              <input
                value={reportPreparedBy}
                onChange={(e) => setReportPreparedBy(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">
                Allowable bearing capacity stated in the report (kN/m²)
              </span>
              <input
                value={reportBearing}
                onChange={(e) => setReportBearing(e.target.value)}
                inputMode="decimal"
                placeholder="Leave blank if the report does not state one"
                className="mt-1 h-9 w-full rounded-md border border-border/70 bg-background px-2 text-sm"
              />
            </label>
            <label className="text-xs sm:col-span-2">
              <span className="text-muted-foreground">Document (PDF, image or Word, max 25 MB)</span>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={(e) => setReportFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
              />
            </label>
            <div className="sm:col-span-2">
              <Button onClick={handleUpload} disabled={uploading || !signedIn}>
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileUp aria-hidden="true" className="mr-2 h-4 w-4" /> Attach report
                  </>
                )}
              </Button>
              {!signedIn && (
                <span className="ml-2 text-xs text-muted-foreground">
                  Sign in to attach reports.
                </span>
              )}
            </div>
          </div>

          {reports.length > 0 && (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
              {reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.report_type.replace(/_/g, " ")} ·{" "}
                      {r.bearing_capacity_kpa
                        ? `${r.bearing_capacity_kpa} kN/m² stated`
                        : "no bearing capacity stated"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                        r.verification_status === "verified"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : r.verification_status === "rejected"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.verification_status === "verified" && (
                        <FileCheck2 aria-hidden="true" className="h-3 w-3" />
                      )}
                      {r.verification_status}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => openReport(r.storage_path)}>
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {message}
          </p>
        )}
      </div>
    </>
  );
}
