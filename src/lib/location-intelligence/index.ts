/**
 * FRELUX LOCATION INTELLIGENCE — Barrel Export
 *
 * Import from here:
 *   import { useFreluxLocation, resolveRegionalContext, ... } from "@/lib/location-intelligence";
 *
 * One canonical location system reused across FRELUX:
 * Construction Intelligence, Property Intelligence, calculators and
 * estimators (Build-to-Roof, Painting, Screeding, Tile, POP, Tyrolene,
 * Cost), marketplace, and future market intelligence.
 *
 * Free-first: works with zero external/paid providers.
 */

// Canonical model
export type { FreluxLocation, LocationSource, LocationVerification } from "./model";
export {
  emptyLocation,
  fromGeolocationPosition,
  sanitizeLocationRecord,
  validateFreluxLocation,
  normalizeCountryCode,
  isValidLatitude,
  isValidLongitude,
  hasValidCoordinates,
  formatLocationLabel,
  formatCoordinates,
  formatAccuracy,
  formatCapturedAt,
  SOURCE_LABELS,
} from "./model";

// Provider adapters + registry
export type {
  GeolocationProvider,
  GeolocationResult,
  ReverseGeocodingProvider,
  ForwardGeocodingProvider,
  MapProvider,
  SearchCandidate,
  LocationProviderStatus,
} from "./providers";
export {
  BrowserGeolocationProvider,
  NominatimReverseGeocoder,
  NominatimForwardGeocoder,
  locationProviderRegistry,
  locationFromSearchCandidate,
} from "./providers";

// Canonical hook
export { useFreluxLocation } from "./useFreluxLocation";
export type { FreluxLocationApi, LocationState } from "./useFreluxLocation";

// Regional resolution
export { resolveRegionalContext, fetchRegionalProfileFromDb } from "./regional";
export type { RegionalContext, RegionalDataStatus } from "./regional";

// Shared consumption layer (project location context)
export {
  ProjectLocationProvider,
  useProjectLocation,
  useProjectLocationCurrency,
  useUserMarketFallback,
} from "./project-location-context";
export type { ProjectLocationContextValue } from "./project-location-context";

// Persistence
export {
  saveContractorProjectLocation,
  saveUserProjectLocation,
  syncProjectCurrencyFromRegional,
  locationFromProjectRow,
  locationFromPropertyRow,
  propertyFieldsFromLocation,
} from "./persistence";
export type { CurrencySyncResult } from "./persistence";
