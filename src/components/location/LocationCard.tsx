/**
 * FRELUX LOCATION INTELLIGENCE, LocationCard
 *
 * Premium, mobile-first canonical location widget. Every project /
 * property surface renders THIS card, one location system, no
 * duplicates. Implements the full state set:
 *
 *   not_set · detecting · permission_requested · found ·
 *   permission_denied · unavailable · search selected ·
 *   map-pin selected · saved · regional data available ·
 *   regional data unavailable
 *
 * Free-first: works with no external/paid provider. GPS via the native
 * browser API; search via the configured (keyless) geocoding provider;
 * map pin appears only when a map provider is configured; manual entry
 * always available as the last-resort fallback.
 */

import { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Navigation,
  Search,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  LocateFixed,
  Pencil,
  RefreshCw,
  X,
  Globe2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  useFreluxLocation,
  resolveRegionalContext,
  formatLocationLabel,
  formatCoordinates,
  formatAccuracy,
  formatCapturedAt,
  SOURCE_LABELS,
  type FreluxLocation,
  type RegionalContext,
} from "@/lib/location-intelligence";
import { Button } from "@/components/ui/shadcn/button";

export interface LocationCardProps {
  /** Existing canonical location loaded from the project/property row. */
  initialLocation?: FreluxLocation | null;
  /** Persist the location (called on save and on clear). */
  onSave?: (location: FreluxLocation | null) => Promise<void> | void;
  /**
   * Staging callback, fires whenever the staged record changes.
   * Used by create/edit dialogs that persist the record only on submit.
   */
  onLocationChange?: (location: FreluxLocation | null) => void;
  compact?: boolean;
}

export default function LocationCard({
  initialLocation = null,
  onSave,
  onLocationChange,
  compact = false,
}: LocationCardProps) {
  const loc = useFreluxLocation();
  const [editing, setEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [regional, setRegional] = useState<RegionalContext | null>(null);
  const [regionalLoading, setRegionalLoading] = useState(false);

  // ---- Hydrate from the row (project reload), provenance preserved ----
  useEffect(() => {
    if (!initialLocation) return;
    loc.hydrateLocation(
      initialLocation as unknown as Record<string, unknown>,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLocation]);

  // ---- Staging callback ----
  useEffect(() => {
    onLocationChange?.(loc.location);
  }, [loc.location, onLocationChange]);

  // ---- Regional resolution whenever the staged record changes ----
  useEffect(() => {
    let active = true;
    if (!loc.location) {
      setRegional(null);
      return;
    }
    setRegionalLoading(true);
    resolveRegionalContext(loc.location)
      .then((ctx) => {
        if (active) setRegional(ctx);
      })
      .finally(() => {
        if (active) setRegionalLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loc.location]);

  // ---- Persist ----
  async function handleSave() {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(loc.location);
      loc.markSaved();
    } finally {
      setSaving(false);
    }
  }

  const regionalBadge = useMemo(() => {
    if (!loc.location || regionalLoading) return null;
    if (!regional) return null;
    if (regional.status === "available") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3" />
          Regional data available · {regional.country_name}
        </span>
      );
    }
    if (regional.status === "unavailable") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="h-3 w-3" />
          Regional data unavailable
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Globe2 className="h-3 w-3" />
        Country needs confirmation
      </span>
    );
  }, [loc.location, regional, regionalLoading]);

  const dirty = loc.state === "found";

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className="rounded-xl border bg-card text-card-foreground shadow-sm"
      data-testid="location-card"
      data-state={loc.state}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight">
              Project Location
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Sets regional context, currency, units, terminology
            </p>
          </div>
        </div>
        {(loc.state === "saved" || loc.state === "found") && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            data-testid="change-location"
          >
            <Pencil className="h-3 w-3" />
            Change
          </button>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5">
        {/* ---------- State: not set ---------- */}
        {loc.state === "not_set" && (
          <div className="space-y-3" data-testid="state-not-set">
            <p className="text-sm text-muted-foreground">
              No location set yet. Detect it, search for it, or enter it
              manually.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => loc.useMyLocation()}
                className="gap-2"
                size="sm"
                data-testid="use-my-location"
              >
                <Navigation className="h-4 w-4" />
                Use My Location
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setEditing(true)}
                data-testid="open-search"
              >
                <Search className="h-4 w-4" />
                Search Location
              </Button>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              FRELUX only accesses your device location when you ask it to,
              never automatically. Location services are free; no map
              subscription required.
            </p>
          </div>
        )}

        {/* ---------- State: detecting / permission requested ---------- */}
        {loc.state === "detecting" && (
          <div
            className="flex flex-col items-center gap-2 py-6"
            data-testid="state-detecting"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">Detecting your location…</p>
            <p className="text-xs text-muted-foreground">
              Allow location access in your browser if prompted.
            </p>
          </div>
        )}

        {/* ---------- State: permission denied ---------- */}
        {loc.state === "permission_denied" && (
          <div className="space-y-3" data-testid="state-permission-denied">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-medium">Location permission denied</p>
                <p className="text-muted-foreground">{loc.error}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  setEditing(true);
                }}
                data-testid="denied-manual-fallback"
              >
                Enter manually instead
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={loc.retryPermission}
                data-testid="retry-permission"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry permission
              </Button>
            </div>
            {!editing && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-2"
                onClick={() => setEditing(true)}
                data-testid="denied-search-fallback"
              >
                <Search className="h-3.5 w-3.5" />
                Search for my location
              </Button>
            )}
          </div>
        )}

        {/* ---------- State: unavailable ---------- */}
        {loc.state === "unavailable" && (
          <div className="space-y-3" data-testid="state-unavailable">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div className="text-sm">
                <p className="font-medium">Location detection unavailable</p>
                <p className="text-muted-foreground">{loc.error}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loc.useMyLocation()}
                data-testid="retry-detect"
              >
                Try again
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditing(true);
                }}
                data-testid="unavailable-manual-fallback"
              >
                Enter manually
              </Button>
            </div>
          </div>
        )}

        {/* ---------- Found / Saved: location display ---------- */}
        {(loc.state === "found" || loc.state === "saved") &&
          loc.location &&
          !editing && (
            <div className="space-y-3" data-testid={`state-${loc.state}`}>
              <div className="flex items-start gap-2">
                <span
                  className={
                    loc.state === "saved"
                      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300"
                      : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
                  }
                >
                  {loc.state === "saved" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <LocateFixed className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {formatLocationLabel(loc.location)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {SOURCE_LABELS[loc.location.source]} ·{" "}
                    {formatCapturedAt(loc.location)}
                    {loc.state === "saved" ? " · saved to project" : ""}
                  </p>
                </div>
              </div>

              {/* Coordinates + accuracy, always shown when present */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {formatCoordinates(loc.location) && (
                  <div className="rounded-lg bg-muted px-2.5 py-1.5">
                    <span className="block text-muted-foreground">
                      Coordinates
                    </span>
                    <span className="font-mono">
                      {formatCoordinates(loc.location)}
                    </span>
                  </div>
                )}
                {formatAccuracy(loc.location) && (
                  <div className="rounded-lg bg-muted px-2.5 py-1.5">
                    <span className="block text-muted-foreground">
                      Accuracy
                    </span>
                    <span className="font-mono">
                      {formatAccuracy(loc.location)}
                    </span>
                  </div>
                )}
              </div>

              {/* Reverse-geocode availability, honest reporting */}
              {loc.location.source === "gps" &&
                loc.reverseGeocode.attempted &&
                !loc.reverseGeocode.ok && (
                  <p
                    className="text-[11px] leading-relaxed text-muted-foreground"
                    data-testid="reverse-unavailable"
                  >
                    Address lookup unavailable, coordinates shown exactly as
                    detected. No address was guessed.
                  </p>
                )}
              {loc.reverseGeocode.message && loc.reverseGeocode.ok && (
                <p
                  className="text-[11px] text-muted-foreground"
                  data-testid="reverse-ok"
                >
                  {loc.reverseGeocode.message}
                </p>
              )}

              {/* Regional context */}
              <div
                className="rounded-lg border bg-background/50 p-3"
                data-testid="regional-panel"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Regional intelligence
                  </span>
                  {regionalBadge}
                </div>
                {regionalLoading && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" /> Resolving
                    regional context…
                  </p>
                )}
                {!regionalLoading && regional?.status === "available" && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-3">
                    <div>
                      <span className="block text-[11px] text-muted-foreground">
                        Country
                      </span>
                      {regional.country_name}
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground">
                        Currency
                      </span>
                      {regional.currency_code} ({regional.currency_symbol})
                    </div>
                    <div>
                      <span className="block text-[11px] text-muted-foreground">
                        Measurement
                      </span>
                      {regional.measurement_system}
                    </div>
                  </div>
                )}
                {!regionalLoading && regional?.status === "unavailable" && (
                  <p className="text-xs text-muted-foreground">
                    {regional.reason}
                  </p>
                )}
                {!regionalLoading &&
                  regional?.status === "needs_confirmation" && (
                    <p className="text-xs text-muted-foreground">
                      {regional.reason}
                    </p>
                  )}
              </div>

              {/* Privacy note */}
              {!compact && (
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
                  Only you can see this project's location. FRELUX never shares
                  location between users and never tracks you continuously.
                </p>
              )}

              {/* Save (staged changes) */}
              {onSave && dirty && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                    className="gap-1.5"
                    data-testid="save-location"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {saving ? "Saving…" : "Save location"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loc.clearLocation()}
                    disabled={saving}
                  >
                    Discard
                  </Button>
                </div>
              )}
            </div>
          )}

        {/* ---------- Editing: search + map + manual ---------- */}
        {editing && (
          <div className="space-y-4" data-testid="state-editing">
            {/* Search */}
            {loc.searchEnabled ? (
              <div className="space-y-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    loc.search(searchQuery);
                  }}
                  className="flex gap-2"
                >
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search address, city, or postcode…"
                      className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      data-testid="search-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={loc.searching}
                  >
                    {loc.searching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                </form>
                {loc.searchError && (
                  <p
                    className="text-[11px] text-muted-foreground"
                    data-testid="search-error"
                  >
                    {loc.searchError}
                  </p>
                )}
                {loc.searchResults.length > 0 && (
                  <ul
                    className="divide-y rounded-lg border"
                    data-testid="search-results"
                  >
                    {loc.searchResults.map((c, i) => (
                      <li key={i}>
                        <button
                          onClick={() => {
                            loc.selectSearchResult(c);
                            setEditing(false);
                          }}
                          className="flex w-full items-start gap-2 px-3 py-2 text-left text-xs hover:bg-accent"
                          data-testid={`search-result-${i}`}
                        >
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {c.formatted_address}
                            </span>
                            {c.country && (
                              <span className="text-[11px] text-muted-foreground">
                                {c.country}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Location search is unavailable, no geocoding provider
                configured.
              </p>
            )}

            {/* Map pin, only when a map provider is configured */}
            {loc.mapEnabled ? (
              <div
                className="rounded-lg border p-3 text-xs"
                data-testid="map-picker-slot"
              >
                Map provider configured, pin selection renders here.
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Map pin selection is unavailable, no map provider configured.
              </p>
            )}

            {/* Manual entry (always available) */}
            <ManualEntry
              loc={loc}
              onCancel={() => {
                setEditing(false);
              }}
            />

            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditing(false)}
              >
                <X className="h-3.5 w-3.5" /> Close
              </Button>
              {!loc.permissionDeniedRemembered && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setEditing(false);
                    loc.useMyLocation();
                  }}
                  data-testid="editing-use-gps"
                >
                  <Navigation className="h-3.5 w-3.5" /> Use GPS
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Manual entry sub-form (last-resort fallback, always available)
// ============================================================

function ManualEntry({
  loc,
  onCancel,
}: {
  loc: ReturnType<typeof useFreluxLocation>;
  onCancel: () => void;
}) {
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [postcode, setPostcode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    const latNum = lat.trim() === "" ? null : Number.parseFloat(lat);
    const lngNum = lng.trim() === "" ? null : Number.parseFloat(lng);
    const ok = loc.setManualLocation({
      latitude: latNum,
      longitude: lngNum,
      formatted_address: address.trim() || null,
      city: city.trim() || null,
      region: region.trim() || null,
      country_code: countryCode.trim() || null,
      country: countryCode.trim() || null,
      postcode: postcode.trim() || null,
    });
    if (ok) onCancel();
    else setErr(loc.error ?? "Enter at least the coordinates or the country.");
  }

  return (
    <div className="space-y-2 rounded-lg border p-3" data-testid="manual-entry">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Enter location manually
      </p>
      <div className="grid grid-cols-2 gap-2">
        <input
          value={lat}
          onChange={(e) => setLat(e.target.value)}
          inputMode="decimal"
          placeholder="Latitude (e.g. 6.5244)"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          data-testid="manual-lat"
        />
        <input
          value={lng}
          onChange={(e) => setLng(e.target.value)}
          inputMode="decimal"
          placeholder="Longitude (e.g. 3.3792)"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          data-testid="manual-lng"
        />
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address (optional)"
          className="col-span-2 h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          data-testid="manual-address"
        />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City / area (optional)"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          data-testid="manual-city"
        />
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="State / region (optional)"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          data-testid="manual-region"
        />
        <input
          value={countryCode}
          onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
          maxLength={2}
          placeholder="Country code (e.g. NG)"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs uppercase outline-none focus:ring-2 focus:ring-ring"
          data-testid="manual-country"
        />
        <input
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="Postcode (optional)"
          className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
          data-testid="manual-postcode"
        />
      </div>
      {err && <p className="text-[11px] text-destructive">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={submit} data-testid="manual-submit">
          Set location
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Manual entries are never verified against a map service, you confirm
        them, FRELUX stores exactly what you typed.
      </p>
    </div>
  );
}
