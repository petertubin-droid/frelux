/**
 * Prompt 2 / Phase 12, market profile behavior tests.
 *
 * The purpose of these tests is to verify the ARCHITECTURE, never to
 * fabricate market datasets. Regional profile facts below (ISO codes,
 * currencies, unit conventions) are objective, sourced data. Price
 * data for non-NG markets intentionally does NOT exist: the tests
 * assert that absence surfaces honestly ("not available in your
 * region yet") rather than as a fabricated number or a crash.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  MarketProfile,
  ResolvedMarketContext,
} from "@/types/international";
import { NIGERIA_DEFAULTS, isMarketSupported } from "./market-context";
import { fetchCurrentPrice, clearPriceCache } from "./pricing-resolver";

// ── Supabase mock (chainable query builder) ──────────────────────
type Row = Record<string, unknown>;

function createChainable() {
  const chain: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: Record<string, unknown>, prop: string | symbol) {
      if (typeof prop === "symbol") return undefined;
      if (prop in target) return target[prop];
      if (prop === "then") return target.then;
      target[prop] = vi.fn().mockReturnValue(proxy);
      return target[prop];
    },
  });
  return proxy;
}

const { fromMock } = vi.hoisted(() => {
  function createChainable() {
    const chain = {};
    const proxy = new Proxy(chain, {
      get(target: Record<string, unknown>, prop: string) {
        if (prop in target) return target[prop];
        if (prop === "then") return target.then;
        target[prop] = vi.fn().mockReturnValue(proxy);
        return target[prop];
      },
    });
    return proxy;
  }
  return { fromMock: vi.fn().mockReturnValue(createChainable()) };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: fromMock,
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
  isSupabaseConfigured: false,
}));

vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn().mockResolvedValue({
    from: fromMock,
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  }),
}));

// ── Seeded profile facts (mirror of the Phase 45 migration seed) ─
// Objective facts only, ISO 4217 currency codes/symbols and each
// country's construction unit conventions. No prices, no rules.
const SEEDED_PROFILE_FACTS: Record<
  string,
  Pick<
    MarketProfile,
    | "country_code"
    | "country_name"
    | "currency_code"
    | "currency_symbol"
    | "default_measurement_system"
    | "default_length_unit"
    | "default_area_unit"
    | "status"
    | "is_visible"
  >
> = {
  NG: {
    country_code: "NG",
    country_name: "Nigeria",
    currency_code: "NGN",
    currency_symbol: "₦",
    default_measurement_system: "mixed",
    default_length_unit: "meters",
    default_area_unit: "sqm",
    status: "active",
    is_visible: true,
  },
  GB: {
    country_code: "GB",
    country_name: "United Kingdom",
    currency_code: "GBP",
    currency_symbol: "£",
    default_measurement_system: "mixed",
    default_length_unit: "meters",
    default_area_unit: "sqm",
    status: "coming_soon",
    is_visible: false,
  },
  US: {
    country_code: "US",
    country_name: "United States",
    currency_code: "USD",
    currency_symbol: "$",
    default_measurement_system: "imperial",
    default_length_unit: "feet",
    default_area_unit: "sqft",
    status: "coming_soon",
    is_visible: false,
  },
  CA: {
    country_code: "CA",
    country_name: "Canada",
    currency_code: "CAD",
    currency_symbol: "C$",
    default_measurement_system: "mixed",
    default_length_unit: "meters",
    default_area_unit: "sqm",
    status: "coming_soon",
    is_visible: false,
  },
  AU: {
    country_code: "AU",
    country_name: "Australia",
    currency_code: "AUD",
    currency_symbol: "A$",
    default_measurement_system: "metric",
    default_length_unit: "meters",
    default_area_unit: "sqm",
    status: "coming_soon",
    is_visible: false,
  },
  ZA: {
    country_code: "ZA",
    country_name: "South Africa",
    currency_code: "ZAR",
    currency_symbol: "R",
    default_measurement_system: "metric",
    default_length_unit: "meters",
    default_area_unit: "sqm",
    status: "coming_soon",
    is_visible: false,
  },
  AE: {
    country_code: "AE",
    country_name: "United Arab Emirates",
    currency_code: "AED",
    currency_symbol: "د.إ",
    default_measurement_system: "metric",
    default_length_unit: "meters",
    default_area_unit: "sqm",
    status: "coming_soon",
    is_visible: false,
  },
};

function profileToContext(p: Partial<MarketProfile>): ResolvedMarketContext {
  return {
    marketCode: p.country_code ?? "NG",
    countryName: p.country_name ?? "Nigeria",
    currencyCode: p.currency_code ?? "NGN",
    currencySymbol: p.currency_symbol ?? "₦",
    measurementSystem: p.default_measurement_system ?? "mixed",
    defaultLengthUnit: (p.default_length_unit ??
      "meters") as ResolvedMarketContext["defaultLengthUnit"],
    defaultAreaUnit: (p.default_area_unit ??
      "sqm") as ResolvedMarketContext["defaultAreaUnit"],
    supportedLengthUnits: ["meters", "feet", "inches"],
    supportedAreaUnits: ["sqm", "sqft"],
    defaultLanguage: p.default_language ?? "en",
    localTerminology: {},
    status: p.status ?? "coming_soon",
    profileVersion: p.profile_version ?? "1.0.0",
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  clearPriceCache();
  fromMock.mockReturnValue(createChainable());
});

describe("Seeded market profile facts (NG / GB / US / CA / AU / ZA / AE)", () => {
  const expectedCountries = ["NG", "GB", "US", "CA", "AU", "ZA", "AE"];

  it("covers all seven target countries", () => {
    expect(Object.keys(SEEDED_PROFILE_FACTS).sort()).toEqual(
      expectedCountries.slice().sort(),
    );
  });

  it("only Nigeria is active, every other market honestly reports coming_soon", () => {
    for (const [code, facts] of Object.entries(SEEDED_PROFILE_FACTS)) {
      expect(facts.status).toBe(code === "NG" ? "active" : "coming_soon");
    }
  });

  it("non-NG markets are NOT visible in the country selector (no priced data)", () => {
    for (const [code, facts] of Object.entries(SEEDED_PROFILE_FACTS)) {
      expect(facts.is_visible).toBe(code === "NG");
    }
  });

  it("currency facts match ISO 4217", () => {
    const iso: Record<string, string> = {
      NG: "NGN",
      GB: "GBP",
      US: "USD",
      CA: "CAD",
      AU: "AUD",
      ZA: "ZAR",
      AE: "AED",
    };
    for (const [code, facts] of Object.entries(SEEDED_PROFILE_FACTS)) {
      expect(facts.currency_code).toBe(iso[code]);
      expect(facts.currency_symbol.length).toBeGreaterThan(0);
    }
  });

  it("unit systems follow each country's construction convention", () => {
    // US construction is imperial-first; the UK, Canada and Nigeria are
    // officially metric with common imperial use; AU/ZA/AE are metric.
    expect(SEEDED_PROFILE_FACTS.US.default_length_unit).toBe("feet");
    expect(SEEDED_PROFILE_FACTS.US.default_area_unit).toBe("sqft");
    for (const code of ["NG", "GB", "CA", "AU", "ZA", "AE"]) {
      expect(SEEDED_PROFILE_FACTS[code].default_length_unit).toBe("meters");
      expect(SEEDED_PROFILE_FACTS[code].default_area_unit).toBe("sqm");
    }
  });

  it("contains NO price data, regional pricing must never be fabricated", () => {
    // The seeded facts carry identity, currency and units only.
    for (const facts of Object.values(SEEDED_PROFILE_FACTS)) {
      expect("price" in facts).toBe(false);
      expect("prices" in facts).toBe(false);
    }
  });
});

describe("Market availability gating (isMarketSupported)", () => {
  it("Nigeria (active) is supported", () => {
    const ctx = profileToContext({ country_code: "NG", status: "active" });
    expect(isMarketSupported(ctx)).toBe(true);
  });

  it.each(["GB", "US", "CA", "AU", "ZA", "AE"])(
    "%s (coming_soon) is NOT supported for priced calculations",
    (code) => {
      const ctx = profileToContext({
        country_code: code,
        status: "coming_soon",
      });
      expect(isMarketSupported(ctx)).toBe(false);
    },
  );

  it("an 'unsupported' market is not supported", () => {
    const ctx = profileToContext({ country_code: "XX", status: "unsupported" });
    expect(isMarketSupported(ctx)).toBe(false);
  });

  it("the Nigeria default fallback context is supported (preserves existing behavior)", () => {
    expect(NIGERIA_DEFAULTS.status).toBe("active");
    expect(isMarketSupported(NIGERIA_DEFAULTS)).toBe(true);
  });
});

describe("Pricing resolution with provenance (Phase 6)", () => {
  it("a resolved price carries source, collection date and confidence", async () => {
    const priceRow: Row = {
      id: "price-1",
      market_code: "NG",
      product_id: "prod-1",
      price_label: "Premium emulsion 20L",
      price_type: "product",
      price: 45000,
      currency_code: "NGN",
      price_unit: "bucket",
      package_size: 20,
      package_unit: "litres",
      effective_from: "2026-09-01",
      effective_to: null,
      source_name: "Admin manual entry",
      source_url: "https://example.com/product/1",
      collected_at: "2026-09-01",
      confidence: "high",
      pricing_version: "1.0.0",
      created_at: "2026-09-01T00:00:00Z",
      updated_at: "2026-09-01T00:00:00Z",
    };
    const chain = createChainable();
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: priceRow,
      error: null,
    });
    fromMock.mockReturnValue(chain);

    const price = await fetchCurrentPrice("NG", "prod-1");
    expect(price).not.toBeNull();
    expect(price!.source_name).toBe("Admin manual entry");
    expect(price!.source_url).toBe("https://example.com/product/1");
    expect(price!.collected_at).toBe("2026-09-01");
    expect(price!.confidence).toBe("high");
    expect(price!.effective_from).toBe("2026-09-01");
  });

  it("a market with NO stored price returns null, never a fabricated number", async () => {
    const chain = createChainable();
    (chain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: null,
    });
    fromMock.mockReturnValue(chain);

    const price = await fetchCurrentPrice("GB", "prod-1");
    expect(price).toBeNull();
  });
});
