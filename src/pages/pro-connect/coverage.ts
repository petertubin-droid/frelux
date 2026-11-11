import { COUNTRY_OPTIONS } from "@/lib/international/countries";
import type { DbProLocation } from "@/types/pro-connect";
/** Resolve a label for a country already present in FRELUX market settings. */
export function proConnectCountryName(code?: string | null): string {
  if (!code) return "";
  return (
    COUNTRY_OPTIONS.flatMap((group) => group.countries).find(
      (country) => country.code === code.toUpperCase(),
    )?.name ?? code.toUpperCase()
  );
}

/**
 * Keep the structured directory filters grounded in the selected market.
 * Legacy locations without a country were created before country support and
 * are treated as NG, matching the database migration default.
 */
export function proConnectLocationsForCountry(
  locations: DbProLocation[],
  country?: string | null,
): DbProLocation[] {
  if (!country) return locations;
  const code = country.toUpperCase();
  return locations.filter(
    (location) => (location.country ?? "NG").toUpperCase() === code,
  );
}

export function proConnectStates(locations: DbProLocation[]): string[] {
  return [...new Set(locations.map((location) => location.state))].sort();
}

export function proConnectCities(
  locations: DbProLocation[],
  state?: string | null,
): string[] {
  if (!state) return [];
  return [
    ...new Set(
      locations
        .filter((location) => location.state === state)
        .map((location) => location.city),
    ),
  ].sort();
}
