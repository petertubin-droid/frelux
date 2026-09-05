import { useState } from "react";
import { MapPin, LocateFixed } from "lucide-react";
import { classNames } from "@/lib/utils";
import {
  WEATHER_LOCATIONS,
  findNearestWeatherLocation,
  useWeatherLocation,
} from "@/lib/weather-locations";

/** Sentinel option id for "detect my location" via browser geolocation. */
const AUTO_ID = "__auto__";

/**
 * Compact state selector for the weather widgets.
 * Lets users pick their current Nigerian state instead of everything
 * defaulting to Lagos. The choice is persisted and shared by all
 * weather widgets (they sync through localStorage events).
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
  const [detecting, setDetecting] = useState(false);

  function handleChange(value: string) {
    if (value !== AUTO_ID) {
      setLocation(value);
      return;
    }
    // Detect the user's coordinates and snap to the nearest state
    if (typeof navigator === "undefined" || !("geolocation" in navigator))
      return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestWeatherLocation(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        setLocation(nearest.id);
        setDetecting(false);
      },
      () => {
        // Denied or unavailable — keep the current selection
        setDetecting(false);
      },
      { timeout: 8000, maximumAge: 600000 },
    );
  }

  const onGradient = tone === "onGradient";

  return (
    <span
      className={classNames(
        "inline-flex min-w-0 items-center gap-1",
        className,
      )}
    >
      <MapPin
        aria-hidden="true"
        className={classNames(
          "h-3 w-3 shrink-0",
          onGradient ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      />
      <select
        aria-label="Select your state for local weather"
        value={location.id}
        onChange={(e) => handleChange(e.target.value)}
        disabled={detecting}
        className={classNames(
          "max-w-[9.5rem] cursor-pointer appearance-none truncate border-0 bg-transparent py-0 pr-1 font-medium outline-none focus:underline sm:max-w-none",
          onGradient
            ? "text-xs text-primary-foreground/80 hover:text-primary-foreground"
            : "text-xs text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-muted-foreground/80",
        )}
      >
        {detecting && <option value={location.id}>Detecting…</option>}
        <option value={AUTO_ID} className="text-foreground">
          📍 Use my current location
        </option>
        {WEATHER_LOCATIONS.map((loc) => (
          <option key={loc.id} value={loc.id} className="text-foreground">
            {loc.name}
          </option>
        ))}
      </select>
      {detecting && (
        <LocateFixed
          aria-hidden="true"
          className="h-3 w-3 animate-spin shrink-0"
        />
      )}
    </span>
  );
}
