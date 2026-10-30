import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapPin,
  LocateFixed,
  Search,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { classNames } from "@/lib/utils";
import {
  WEATHER_LOCATIONS,
  MARKET_WEATHER_CITIES,
  currentMarketCode,
  defaultWeatherLocationForMarket,
  describeCoordinates,
  locationFromCoordinates,
  searchWeatherCities,
  useWeatherLocation,
  type WeatherLocation,
} from "@/lib/weather-locations";

/**
 * Location picker for the weather widgets.
 *
 * Weather is global: the visitor's market supplies the default city, the
 * search box resolves any city in the world through a keyless geocoder,
 * and "use my current location" turns device coordinates into a named
 * place. The choice is persisted and shared by every weather widget.
 *
 * `tone="onGradient"` renders for use on colored gradient headers
 * (white text); `tone="muted"` renders for light surfaces.
 */
export function WeatherLocationSelect({
  tone = "muted",
  className,
}: {
  tone?: "onGradient" | "muted";
  className?: string;
}) {
  const { location, setLocation } = useWeatherLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  const marketCode = useMemo(() => currentMarketCode(), []);
  const marketCity = useMemo(
    () => defaultWeatherLocationForMarket(marketCode),
    [marketCode],
  );

  // Close on outside click or Escape, the way a premium popover behaves.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Debounced worldwide search.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchWeatherCities(term);
        if (!cancelled) setResults(found);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const localMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const curated = [
      marketCity,
      ...WEATHER_LOCATIONS,
      ...Object.values(MARKET_WEATHER_CITIES),
    ];
    const seen = new Set<string>();
    return curated.filter((l) => {
      if (seen.has(l.id)) return false;
      const haystack = `${l.name} ${l.country ?? ""}`.toLowerCase();
      if (!haystack.includes(term)) return false;
      seen.add(l.id);
      return true;
    });
  }, [query, marketCity]);

  const suggestions = useMemo(() => {
    if (query.trim()) return [...localMatches, ...results].slice(0, 8);
    // No query: the visitor's own list. An unset market is Nigeria, which
    // is what the app defaults to everywhere else.
    const base =
      (marketCode ?? "NG") === "NG" ? WEATHER_LOCATIONS : [marketCity];
    return base;
  }, [query, localMatches, results, marketCity, marketCode]);

  function choose(next: WeatherLocation) {
    setLocation(next);
    setOpen(false);
    setQuery("");
  }

  function detectLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { lat, lon } = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };
        const described = await describeCoordinates(lat, lon);
        choose(
          locationFromCoordinates(lat, lon, described.name, described.country),
        );
        setDetecting(false);
      },
      () => setDetecting(false),
      { timeout: 8000, maximumAge: 600000 },
    );
  }

  const onGradient = tone === "onGradient";
  const subtitle = location.custom ? location.country : undefined;

  return (
    <span ref={containerRef} className={classNames("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Weather location: ${location.name}. Change location`}
        className={classNames(
          "inline-flex max-w-[11rem] items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          onGradient
            ? "text-primary-foreground/85 hover:text-primary-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <MapPin aria-hidden="true" className="h-3 w-3 shrink-0" />
        <span className="truncate">{location.name}</span>
        <ChevronDown
          aria-hidden="true"
          className={classNames(
            "h-3 w-3 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose weather location"
          className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-border/60 bg-card/95 shadow-premium backdrop-blur-xl dark:border-white/10 dark:bg-card/95"
        >
          <div className="border-b border-border/60 p-2 dark:border-white/10">
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city or state"
                aria-label="Search for a city or state"
                className="h-9 w-full rounded-lg border border-border/60 bg-background pl-8 pr-8 text-xs text-foreground outline-none transition-all placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/25 dark:border-white/10 dark:bg-background"
              />
              {searching && (
                <Loader2
                  aria-hidden="true"
                  className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5">
            <button
              type="button"
              onClick={detectLocation}
              disabled={detecting}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:opacity-60 dark:hover:bg-white/5"
            >
              <LocateFixed
                aria-hidden="true"
                className={classNames(
                  "h-3.5 w-3.5 shrink-0 text-primary",
                  detecting && "animate-spin",
                )}
              />
              {detecting
                ? "Detecting your location…"
                : "Use my current location"}
            </button>

            <div className="my-1 h-px bg-border/60 dark:bg-white/10" />

            {suggestions.length === 0 &&
              query.trim().length >= 2 &&
              !searching && (
                <p className="px-2.5 py-6 text-center text-xs text-muted-foreground">
                  No place matches “{query.trim()}”.
                </p>
              )}

            {suggestions.map((option) => {
              const selected = option.id === location.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(option)}
                  className={classNames(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                    selected
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/5",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold text-foreground">
                      {option.name}
                    </span>
                    {option.country && (
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {option.country}
                      </span>
                    )}
                  </span>
                  {selected && (
                    <Check
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-primary"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {subtitle && (
            <p className="border-t border-border/60 px-3 py-2 text-[10px] text-muted-foreground dark:border-white/10">
              Showing the feed for {location.name}, {subtitle}
            </p>
          )}
        </div>
      )}
    </span>
  );
}

export default WeatherLocationSelect;
