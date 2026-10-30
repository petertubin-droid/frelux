import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Crosshair,
  Droplets,
  Factory,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  Snowflake,
  Sun,
  ThermometerSun,
  Waves,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { GlobeMap } from "@/components/map/GlobeMap";
import { Button } from "@/components/ui/shadcn/button";
import { useSeo } from "@/lib/seo";
import { classNames } from "@/lib/utils";
import { useLocation as useGeoLocation } from "@/lib/location";
import { searchPlaces, type PlaceResult } from "@/lib/map/geocode";
import type { MapPoint } from "@/lib/map/geo";
import {
  fetchEnvironmentalData,
  clearEnvironmentalCache,
} from "@/lib/climate/environmental-data";
import {
  ADVISOR_DISCLOSURES,
  buildAdvisor,
} from "@/lib/climate/material-advisor";
import type {
  CategoryAdvice,
  EnvironmentalDataResult,
  GeoPoint,
} from "@/lib/climate/types";

const SITE_ID = "climate-site";

function parseCoordinate(value: string, bound: number): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > bound) return null;
  return parsed;
}

function FactorTile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card-elevated p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon aria-hidden="true" className="h-4 w-4" />
        <p className="text-[11px] font-semibold uppercase tracking-wide">
          {label}
        </p>
      </div>
      <p className="mt-2 text-lg font-bold text-foreground">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function AdviceCard({ advice }: { advice: CategoryAdvice }) {
  return (
    <article className="card-elevated p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {advice.category}
          </p>
          <h3 className="mt-1 text-lg font-bold text-foreground">
            {advice.title}
          </h3>
        </div>
        <span
          className={classNames(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold",
            advice.confidence === "climate-matched"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {advice.confidence === "climate-matched"
            ? "Climate-matched"
            : "General guidance"}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">{advice.summary}</p>

      {advice.properties.length > 0 && (
        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommended properties
          </h4>
          <ul className="mt-2 space-y-1.5">
            {advice.properties.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-foreground">
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent-green"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {advice.why.length > 0 && (
        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Why it suits this site
          </h4>
          <ul className="mt-2 space-y-1.5">
            {advice.why.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm text-muted-foreground"
              >
                <Info
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {advice.risks.length > 0 && (
        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Environmental risks to watch
          </h4>
          <ul className="mt-2 space-y-1.5">
            {advice.risks.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm text-muted-foreground"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {advice.standards.length > 0 && (
        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Relevant technical standards
          </h4>
          <ul className="mt-2 space-y-2">
            {advice.standards.map((standard) => (
              <li
                key={`${standard.code}-${standard.name}`}
                className="rounded-lg bg-muted/50 p-3"
              >
                <p className="text-sm font-semibold text-foreground">
                  {standard.code} — {standard.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {standard.applies}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {advice.installation.length > 0 && (
        <section className="mt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Installation considerations
          </h4>
          <ul className="mt-2 space-y-1.5">
            {advice.installation.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm text-muted-foreground"
              >
                <span
                  aria-hidden="true"
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function MaterialAdvisor() {
  useSeo({
    title:
      "Climate-Responsive Material Advisor: Materials for Your Site's Climate | FRELUX",
    description:
      "Pick your project location and get construction material guidance for its real climate: rainfall, humidity, UV, coastal exposure and frost. Exterior paints, waterproofing, roofing, tiles, concrete exposure classes, steel protection, insulation and drainage.",
    canonicalPath: "/material-advisor",
    ogType: "website",
    structuredDataArray: [
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "FRELUX Climate-Responsive Material Advisor",
        description:
          "Location-based construction material recommendations derived from measured climate normals, with explicit guidance-versus-specification distinctions.",
        url: "https://freluxtools.com/material-advisor",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "NGN" },
        isPartOf: {
          "@type": "WebSite",
          name: "FRELUX SMART CALC",
          url: "https://freluxtools.com",
        },
      },
    ],
  });

  // ── Location state ─────────────────────────────────────────────
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [label, setLabel] = useState<string>("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchTouched, setSearchTouched] = useState(false);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);
  const [focus, setFocus] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
    key: string | number;
  } | null>(null);
  const searchSeq = useRef(0);

  // ── Environmental data state ───────────────────────────────────
  const [envState, setEnvState] = useState<{
    status: "idle" | "loading" | "done";
    result: EnvironmentalDataResult | null;
  }>({ status: "idle", result: null });
  const fetchSeq = useRef(0);

  const geo = useGeoLocation();

  const choosePoint = useCallback((next: GeoPoint, nextLabel: string) => {
    setPoint(next);
    setLabel(nextLabel);
    setLatInput(next.lat.toFixed(4));
    setLonInput(next.lon.toFixed(4));
    setCoordError(null);
    setResults([]);
    setFocus({
      lat: next.lat,
      lon: next.lon,
      zoom: 9.5,
      key: `${next.lat},${next.lon}`,
    });
  }, []);

  // Address search (debounced).
  useEffect(() => {
    if (!searchTouched) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const seq = ++searchSeq.current;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const found = await searchPlaces(trimmed, { limit: 6 });
        if (seq === searchSeq.current) setResults(found);
      } catch {
        if (seq === searchSeq.current) setResults([]);
      } finally {
        if (seq === searchSeq.current) setSearching(false);
      }
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query, searchTouched]);

  // Environmental retrieval follows the chosen point.
  useEffect(() => {
    if (!point) return;
    const seq = ++fetchSeq.current;
    setEnvState((prev) => ({ status: "loading", result: prev.result }));
    fetchEnvironmentalData(point, { label }).then((result) => {
      if (seq !== fetchSeq.current) return;
      setEnvState({ status: "done", result });
    });
  }, [point, label]);

  const useMyLocation = useCallback(async () => {
    await geo.detect();
  }, [geo]);

  // The geolocation hook reports through state; consume it once resolved.
  useEffect(() => {
    if (geo.location?.latitude && geo.location.longitude) {
      choosePoint(
        { lat: geo.location.latitude, lon: geo.location.longitude },
        geo.location.label ??
          [geo.location.city, geo.location.state].filter(Boolean).join(", "),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.location]);

  const applyManualCoords = () => {
    const lat = parseCoordinate(latInput, 90);
    const lon = parseCoordinate(lonInput, 180);
    if (lat === null || lon === null) {
      setCoordError(
        "Enter a valid latitude (−90 to 90) and longitude (−180 to 180).",
      );
      return;
    }
    choosePoint(
      { lat, lon },
      `Custom point (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
    );
  };

  const retry = () => {
    if (!point) return;
    clearEnvironmentalCache();
    const seq = ++fetchSeq.current;
    setEnvState((prev) => ({ status: "loading", result: prev.result }));
    fetchEnvironmentalData(point, { label }).then((result) => {
      if (seq !== fetchSeq.current) return;
      setEnvState({ status: "done", result });
    });
  };

  const factors = envState.result?.factors ?? null;
  const advisor = useMemo(
    () => (envState.status === "done" ? buildAdvisor(factors) : null),
    [envState.status, factors],
  );

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (!point) return [];
    return [
      {
        id: SITE_ID,
        lat: point.lat,
        lon: point.lon,
        title: label || "Project site",
        subtitle: "Climate assessment point",
        kind: "you",
      },
    ];
  }, [point, label]);

  const factorTiles = factors
    ? [
        {
          icon: ThermometerSun,
          label: "Temperature",
          value: `${factors.tempMeanC.toFixed(1)} °C`,
          hint: `Mean min ${factors.tempMinC.toFixed(1)} °C · mean max ${factors.tempMaxC.toFixed(1)} °C`,
        },
        {
          icon: Droplets,
          label: "Rainfall",
          value: `${factors.annualRainfallMm.toLocaleString()} mm/yr`,
          hint: factors.highRainfall
            ? "High-rainfall site"
            : "Moderate rainfall",
        },
        {
          icon: Waves,
          label: "Humidity",
          value: `${factors.relativeHumidityPct.toFixed(0)} %`,
          hint: factors.highHumidity
            ? "Persistently humid"
            : "Moderate humidity",
        },
        {
          icon: Sun,
          label: "UV (annual mean)",
          value: factors.uvIndex.toFixed(2),
          hint: factors.strongUv ? "Strong UV exposure" : "Moderate UV",
        },
        {
          icon: Snowflake,
          label: "Frost",
          value:
            factors.frostRisk === "none"
              ? "None indicated"
              : `${factors.frostDaysPerYear.toFixed(0)} days/yr`,
          hint: `Snow exposure: ${factors.snowExposure.replace(/_/g, " ")}`,
        },
        {
          icon: MapPin,
          label: "Coastal exposure",
          value: factors.coastal.band.replace(/_/g, " "),
          hint: `≈${factors.coastal.distanceKm} km to generalized coastline`,
        },
        {
          icon: ShieldCheck,
          label: "Corrosion (indicative)",
          value: factors.corrosionIndicative.replace(/_/g, " "),
          hint: "Climate proxy — not an ISO 9223 classification",
        },
        {
          icon: Factory,
          label: "Ground / drainage",
          value:
            factors.elevationM !== null
              ? `${factors.elevationM.toFixed(0)} m`
              : "Not available",
          hint:
            factors.floodProxy === "not_assessed"
              ? "Elevation unavailable — flood exposure not assessed"
              : "Drainage-attention proxy — not a flood map",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <PageHeader
          eyebrow="Climate intelligence"
          title="Climate-Responsive Material Advisor"
          subtitle="Choose your project location. FRELUX reads measured climate normals for that coordinate — rainfall, humidity, UV, frost, salt air — and explains which material properties belong on that site, and why."
          backTo="/construction-tools"
          backLabel="All tools"
        />

        {/* ── Location picker ─────────────────────────────────── */}
        <section className="mt-6 card-elevated p-5 sm:p-6">
          <h2 className="text-base font-bold text-foreground">
            1. Project location
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search an address, use your current location, pick a point on the
            map, or enter coordinates. Only the coordinate leaves your device.
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="relative">
              <label htmlFor="advisor-address" className="sr-only">
                Search address or place
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="advisor-address"
                className="input-field pl-9"
                placeholder="Search address or town (e.g. Lekki, Lagos)"
                value={query}
                onChange={(event) => {
                  setSearchTouched(true);
                  setQuery(event.target.value);
                }}
                autoComplete="off"
              />
              {searching && (
                <Loader2
                  aria-hidden="true"
                  className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
              {results.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-lg">
                  {results.map((place) => (
                    <li key={place.id}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() =>
                          choosePoint(
                            { lat: place.lat, lon: place.lon },
                            place.label || place.name,
                          )
                        }
                      >
                        <span className="font-medium text-foreground">
                          {place.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {place.label}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={useMyLocation}
              disabled={geo.loading}
              className="lg:w-auto"
            >
              {geo.loading ? (
                <Loader2
                  aria-hidden="true"
                  className="mr-2 h-4 w-4 animate-spin"
                />
              ) : (
                <Crosshair aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              Use my location
            </Button>
          </div>

          {geo.error && (
            <p role="status" className="mt-2 text-xs text-muted-foreground">
              {geo.error}
            </p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <div>
              <label
                htmlFor="advisor-lat"
                className="text-xs font-medium text-muted-foreground"
              >
                Latitude
              </label>
              <input
                id="advisor-lat"
                className="input-field mt-1"
                inputMode="decimal"
                placeholder="6.4550"
                value={latInput}
                onChange={(event) => setLatInput(event.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="advisor-lon"
                className="text-xs font-medium text-muted-foreground"
              >
                Longitude
              </label>
              <input
                id="advisor-lon"
                className="input-field mt-1"
                inputMode="decimal"
                placeholder="3.3947"
                value={lonInput}
                onChange={(event) => setLonInput(event.target.value)}
              />
            </div>
            <div className="col-span-2 flex items-end sm:col-span-1">
              <Button
                type="button"
                variant="outline"
                onClick={applyManualCoords}
              >
                Set point
              </Button>
            </div>
          </div>
          {coordError && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {coordError}
            </p>
          )}

          <div className="mt-4 overflow-hidden rounded-xl border">
            <GlobeMap
              points={mapPoints}
              center={point ?? { lat: 9.082, lon: 8.6753 }}
              zoom={point ? 9.5 : 3.2}
              focus={focus}
              height={300}
              label="Project location picker"
              showTerrain={false}
              onPickCoordinate={(coords) =>
                choosePoint(
                  coords,
                  `Map point (${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)})`,
                )
              }
              emptyTitle="Tap the map to place your project site"
              emptyHint="Or search an address above."
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Selected:{" "}
            {point
              ? `${label || "Map point"} (${point.lat.toFixed(4)}, ${point.lon.toFixed(4)})`
              : "no location yet"}
          </p>
        </section>

        {/* ── Loading ─────────────────────────────────────────── */}
        {envState.status === "loading" && (
          <section
            aria-live="polite"
            className="mt-6 card-elevated flex items-center gap-3 p-5 text-sm text-muted-foreground"
          >
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            Reading climate normals for this coordinate…
          </section>
        )}

        {/* ── Environmental factors ───────────────────────────── */}
        {envState.status === "done" && factors && (
          <section className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-base font-bold text-foreground">
                2. Environmental conditions
              </h2>
              {envState.result?.sources.length ? (
                <p className="text-xs text-muted-foreground">
                  {envState.result.sources
                    .map((source) => source.name)
                    .join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {factorTiles.map((tile) => (
                <FactorTile
                  key={tile.label}
                  icon={tile.icon}
                  label={tile.label}
                  value={tile.value}
                  hint={tile.hint}
                />
              ))}
            </div>
            {factors.missing.length > 0 && (
              <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                Not assessed from data:{" "}
                {factors.missing
                  .map((item) => item.replace(/_/g, " ").replace(/^power:/, ""))
                  .join(", ")}
                . Nothing is guessed for these — they stay blank and the
                guidance says so.
              </p>
            )}
          </section>
        )}

        {/* ── Unavailable data ────────────────────────────────── */}
        {envState.status === "done" && !factors && (
          <section className="mt-6 card-elevated p-5" aria-live="polite">
            <div className="flex items-start gap-3">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-500"
              />
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Environmental data unavailable for this location
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {envState.result?.reason ??
                    "The climate data source did not answer."}{" "}
                  You still get general guidance below, clearly labelled — it is
                  not tailored to this site.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3"
                  onClick={retry}
                >
                  <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ── Recommendations ─────────────────────────────────── */}
        {advisor && factors && (
          <section className="mt-8">
            <h2 className="text-base font-bold text-foreground">
              3. Material recommendations
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Eight material groups, each with the properties that suit this
              site, the reason, the environmental risks, the governing standards
              and installation notes.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {advisor.categories.map((advice) => (
                <AdviceCard key={advice.id} advice={advice} />
              ))}
            </div>
          </section>
        )}

        {advisor && !factors && (
          <section className="mt-8">
            <h2 className="text-base font-bold text-foreground">
              3. General material guidance
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              General starting points only — no climate matching was possible.
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {advisor.categories.map((advice) => (
                <AdviceCard key={advice.id} advice={advice} />
              ))}
            </div>
          </section>
        )}

        {/* ── Safety / scope ──────────────────────────────────── */}
        <section className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
            />
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Important: guidance, not a specification
              </h2>
              <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                {(advisor?.disclosures ?? ADVISOR_DISCLOSURES).map((line) => (
                  <li key={line}>• {line}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-bold text-foreground">
            Keep going with FRELUX
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { to: "/heat-comfort", label: "Heat & comfort analyser" },
              { to: "/screeding-calculator", label: "Screeding calculator" },
              {
                to: "/pop-ceiling-calculator",
                label: "POP ceiling calculator",
              },
              { to: "/paint-calculator", label: "Paint calculator" },
              { to: "/map", label: "Construction map" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-full border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
