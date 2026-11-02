import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearEnvironmentalCache,
  fetchClimateNormals,
  fetchElevationM,
  fetchEnvironmentalData,
} from "./environmental-data";

const LAGOS = { lat: 6.455, lon: 3.3947 };

function powerPayload(overrides: Record<string, number> = {}) {
  const base: Record<string, number> = {
    T2M: 26.38,
    T2M_MIN: 15.17,
    T2M_MAX: 32.38,
    RH2M: 85.81,
    PRECTOTCORR: 4.23,
    ALLSKY_SFC_UV_INDEX: 1.64,
    FROST_DAYS: 0,
    WS2M: 2.25,
    ...overrides,
  };
  const parameter: Record<string, { ANN: number }> = {};
  for (const [key, value] of Object.entries(base)) {
    parameter[key] = { ANN: value };
  }
  return {
    header: { start: "20010101", end: "20201231" },
    properties: { parameter },
  };
}

function response(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** A fetch mock that answers POWER and elevation by URL. */
function mockFetch(
  power: () => Response | Promise<Response>,
  elevation: () => Response | Promise<Response> = async () =>
    response({ elevation: [12] }),
) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("power.larc.nasa.gov")) return power();
    if (url.includes("/v1/elevation")) return elevation();
    throw new Error(`unexpected fetch: ${url}`);
  }) as unknown as typeof fetch;
}

describe("fetchClimateNormals", () => {
  beforeEach(() => clearEnvironmentalCache());

  it("parses the annual normals and records the data period", async () => {
    const fetchImpl = mockFetch(async () => response(powerPayload()));
    const result = await fetchClimateNormals(LAGOS, { fetchImpl });
    expect(result.normals).toEqual({
      tempMeanC: 26.38,
      tempMinC: 15.17,
      tempMaxC: 32.38,
      humidityPct: 85.81,
      precipMmPerDay: 4.23,
      uvIndex: 1.64,
      frostDaysPerYear: 0,
      windMs: 2.25,
    });
    expect(result.period).toBe("20010101–20201231");
  });

  it("treats NASA fill values (-999) as missing and refuses partial data", async () => {
    const fetchImpl = mockFetch(async () =>
      response(powerPayload({ RH2M: -999 })),
    );
    const result = await fetchClimateNormals(LAGOS, { fetchImpl });
    expect(result.normals).toBeNull();
    expect(result.missing).toContain("power:humidityPct");
  });

  it("reports an HTTP failure as unavailable, never a guess", async () => {
    const fetchImpl = mockFetch(async () => response({}, false, 503));
    const result = await fetchClimateNormals(LAGOS, { fetchImpl });
    expect(result.normals).toBeNull();
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("survives network errors", async () => {
    const fetchImpl = mockFetch(async () => {
      throw new Error("offline");
    });
    const result = await fetchClimateNormals(LAGOS, { fetchImpl });
    expect(result.normals).toBeNull();
  });
});

describe("fetchElevationM", () => {
  it("returns the first elevation value", async () => {
    const fetchImpl = mockFetch(
      async () => response(powerPayload()),
      async () => response({ elevation: [-4.5] }),
    );
    expect(await fetchElevationM(LAGOS, { fetchImpl })).toBe(-4.5);
  });

  it("returns null when the service fails", async () => {
    const fetchImpl = mockFetch(
      async () => response(powerPayload()),
      async () => response({}, false, 500),
    );
    expect(await fetchElevationM(LAGOS, { fetchImpl })).toBeNull();
  });
});

describe("fetchEnvironmentalData", () => {
  beforeEach(() => clearEnvironmentalCache());

  it("builds a full factor set for Lagos with both sources cited", async () => {
    const fetchImpl = mockFetch(async () => response(powerPayload()));
    const result = await fetchEnvironmentalData(LAGOS, {
      fetchImpl,
      label: "Lekki, Lagos",
    });
    expect(result.status).toBe("ok");
    const factors = result.factors!;
    expect(factors.highHumidity).toBe(true);
    expect(factors.highRainfall).toBe(true);
    expect(factors.annualRainfallMm).toBe(Math.round(4.23 * 365));
    expect(factors.coastal.band).not.toBe("inland");
    expect(factors.snowExposure).toBe("not_indicated");
    // Flood exposure is always declared as not assessed.
    expect(factors.missing).toContain("flood_map");
    const names = result.sources.map((source) => source.name);
    expect(names.some((n) => n.includes("NASA POWER"))).toBe(true);
    expect(names.some((n) => n.includes("Open-Meteo"))).toBe(true);
  });

  it("degrades honestly when climate normals are unavailable", async () => {
    const fetchImpl = mockFetch(async () => response({}, false, 500));
    const result = await fetchEnvironmentalData(LAGOS, { fetchImpl });
    expect(result.status).toBe("unavailable");
    expect(result.factors).toBeUndefined();
    expect(result.reason).toBeTruthy();
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it("still delivers factors when only elevation fails, marking it missing", async () => {
    const fetchImpl = mockFetch(
      async () => response(powerPayload()),
      async () => {
        throw new Error("elevation down");
      },
    );
    const result = await fetchEnvironmentalData(LAGOS, { fetchImpl });
    expect(result.status).toBe("ok");
    expect(result.factors!.elevationM).toBeNull();
    expect(result.factors!.floodProxy).toBe("not_assessed");
    expect(result.missing).toContain("elevation");
  });

  it("rejects invalid coordinates without any network call", async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch;
    const result = await fetchEnvironmentalData(
      { lat: 120, lon: 3 },
      { fetchImpl },
    );
    expect(result.status).toBe("unavailable");
    expect(result.missing).toContain("location");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("caches by grid cell: a repeat lookup does not refetch", async () => {
    const fetchImpl = mockFetch(async () => response(powerPayload()));
    await fetchEnvironmentalData(LAGOS, { fetchImpl });
    const callsAfterFirst = (fetchImpl as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.length;
    await fetchEnvironmentalData({ lat: 6.4551, lon: 3.3948 }, { fetchImpl });
    const callsAfterSecond = (fetchImpl as unknown as ReturnType<typeof vi.fn>)
      .mock.calls.length;
    expect(callsAfterSecond).toBe(callsAfterFirst);
  });
});
