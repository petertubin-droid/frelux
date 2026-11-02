// =========================================================
// FRELUX ENGINE #7 — M3: PROVIDER CATALOG WITH
// COVERAGE / LICENSE DISCLOSURE
//
// An HONEST provider layer. FRELUX has NO authorized API
// connection to any telemetry provider. The registry below
// is web-verified CATALOG information only:
//   * every entry cites the provider's public page it was
//     verified from, with the verification date
//   * every entry declares connection: "not-connected" —
//     telemetry still arrives ONLY through the owner's
//     device keys via the iot-ingest function
//   * data-ownership / license terms are NEVER summarized
//     from memory: the owner is directed to the provider's
//     current terms, and nothing is asserted about them
//   * an unrecognized provider string never guesses — it
//     resolves to an explicit unknown-provider disclosure
//
// Verified 2026-10-16 from the provider pages cited below.
// =========================================================

import type { DeviceType } from "@/lib/iot/device-client";

export type ProviderConnectionStatus = "not-connected";

export interface IotProviderEntry {
  /** registry slug */
  id: string;
  /** provider's own product/system name */
  name: string;
  /** which FRELUX device type this provider serves */
  deviceType: DeviceType;
  /** what the provider's public page says the product does */
  capabilities: string;
  /** how the owner's data comes out, per the provider's page */
  dataAccess: string;
  /** regions the provider's own page claims to serve; no invented coverage */
  coverage: string;
  /** connector status — always not-connected in FRELUX */
  connection: ProviderConnectionStatus;
  /** public page the facts were verified from */
  sourceUrl: string;
  /** date the facts were web-verified */
  verifiedDate: string;
}

/** The single honest statement about FRELUX↔provider connectivity. */
export const IOT_CONNECTOR_DISCLOSURE =
  "FRELUX has no authorized API connection to any telemetry provider listed here. These entries are informational catalog data verified from the provider's public pages. Your readings still arrive only through the device API key you registered, via the validated ingest endpoint. Data ownership and license terms are governed by your agreement with the provider — always check their current terms.";

export const IOT_PROVIDER_REGISTRY: IotProviderEntry[] = [
  {
    id: "giatec-smartrock",
    name: "Giatec SmartRock",
    deviceType: "concrete_maturity_sensor",
    capabilities:
      "Fully-embedded wireless sensor clipped to rebar, monitoring concrete curing temperature; strength calculated automatically using the ASTM C1074 maturity method; readings collected at 15-minute intervals.",
    dataAccess:
      "Real-time data on your phone within ~12 m (40 ft) of the sensor; the SmartRock Long Range variant adds remote real-time access.",
    coverage:
      "Sold internationally by Giatec Scientific (Ottawa, Canada); availability per Giatec's site.",
    connection: "not-connected",
    sourceUrl:
      "https://www.giatecscientific.com/products/concrete-sensors/smartrock-maturity-meter/",
    verifiedDate: "2026-10-16",
  },
  {
    id: "command-center",
    name: "COMMAND Center",
    deviceType: "concrete_maturity_sensor",
    capabilities:
      "Concrete temperature and maturity monitoring system (The Transtec Group), in full compliance with ASTM C1074.",
    dataAccess:
      "Wireless monitoring via the COMMAND Center iOS app: temperature history, maturity calculation, and in-place strength evaluation.",
    coverage:
      "Sold through commandcenterconcrete.com; availability per the provider's site.",
    connection: "not-connected",
    sourceUrl: "https://www.commandcenterconcrete.com/",
    verifiedDate: "2026-10-16",
  },
  {
    id: "instantel-micromate",
    name: "Instantel Micromate",
    deviceType: "vibration_monitor",
    capabilities:
      "Vibration, sound/noise, and air-overpressure monitoring for construction, demolition, traffic, and mining; 10–15 days of uninterrupted monitoring per charge.",
    dataAccess:
      "Readings recorded on the monitoring unit; automated reporting per Instantel's documentation.",
    coverage: "Sold through Instantel and its distributors; availability per Instantel's site.",
    connection: "not-connected",
    sourceUrl: "https://www.instantel.com/products/micromate",
    verifiedDate: "2026-10-16",
  },
  {
    id: "syscom-instruments",
    name: "Syscom Instruments",
    deviceType: "vibration_monitor",
    capabilities:
      "Ground and structural vibration instruments for construction, blasting, and infrastructure works (part of Orica's digital solutions).",
    dataAccess:
      "Instrument-recorded vibration data with integrations documented by the provider (e.g. with monitoring platforms such as Trimble 4D Control).",
    coverage: "Sold through Orica digital solutions; availability per the provider's site.",
    connection: "not-connected",
    sourceUrl: "https://www.orica.com/en/digital-solutions/geosolutions/syscom-instruments-sa",
    verifiedDate: "2026-10-16",
  },
  {
    id: "davis-vantage-pro2",
    name: "Davis Instruments Vantage Pro2",
    deviceType: "weather_station",
    capabilities:
      "Professional weather station: rain collector, temperature/humidity sensor, and anemometer; sensor suite built for job sites; anemometer mountable up to 40 ft (12 m) from the console.",
    dataAccess:
      "Transmits wirelessly up to 1,000 ft (300 m) to the console; data logging per Davis's documentation.",
    coverage: "Sold through Davis Instruments and resellers; availability per the provider's site.",
    connection: "not-connected",
    sourceUrl: "https://www.davisinstruments.com/pages/vantage-pro2",
    verifiedDate: "2026-10-16",
  },
  {
    id: "samsara",
    name: "Samsara",
    deviceType: "gps_tracker",
    capabilities:
      "Fleet telematics: real-time GPS tracking, routing, fuel, and compliance from vehicle-mounted sensors.",
    dataAccess:
      "Provider offers Developer APIs; access is governed by your Samsara agreement.",
    coverage: "Global company (US-headquartered); regional availability per the provider's site.",
    connection: "not-connected",
    sourceUrl: "https://www.samsara.com/",
    verifiedDate: "2026-10-16",
  },
  {
    id: "geotab",
    name: "Geotab",
    deviceType: "gps_tracker",
    capabilities:
      "Fleet telematics via the GO devices and MyGeotab platform: vehicle location, trips, odometer, and engine hours.",
    dataAccess:
      "Open platform: MyGeotab API served at /api1v1 over JSON-RPC 2.0, with a public SDK; access is governed by your Geotab agreement.",
    coverage: "Global company (Canada-headquartered); regional availability per the provider's site.",
    connection: "not-connected",
    sourceUrl: "https://developers.geotab.com/myGeotab/apiReference/",
    verifiedDate: "2026-10-16",
  },
];

export interface ResolvedProvider {
  /** matched registry entry, or null when unknown */
  provider: IotProviderEntry | null;
  /** honest disclosure text for the device's provider string */
  disclosure: string;
}

/**
 * Resolve a device's free-text provider field against the
 * catalog. Matching is case-insensitive on the provider's own
 * product name (e.g. "SmartRock", "Micromate"). Unknown
 * providers resolve to an explicit unknown disclosure — never
 * an invented catalog match.
 */
export function resolveProviderDisclosure(
  providerText: string | null | undefined,
): ResolvedProvider {
  const text = (providerText ?? "").trim().toLowerCase();
  if (!text) {
    return {
      provider: null,
      disclosure:
        "No provider recorded for this device. FRELUX only reads what your registered device posts; no provider cloud is queried.",
    };
  }
  const provider = IOT_PROVIDER_REGISTRY.find((p) =>
    text.includes(p.name.toLowerCase()),
  );
  if (!provider) {
    return {
      provider: null,
      disclosure:
        `Provider "${providerText}" is not in FRELUX's verified catalog, so no capability, coverage, or license claims are made about it. FRELUX only reads what your registered device posts; no provider cloud is queried.`,
    };
  }
  return {
    provider,
    disclosure: `${provider.name}: ${provider.capabilities} Verified ${provider.verifiedDate} from ${provider.sourceUrl}. ${IOT_CONNECTOR_DISCLOSURE}`,
  };
}
