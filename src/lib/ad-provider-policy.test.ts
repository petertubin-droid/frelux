import { describe, expect, it } from "vitest";
import {
  getProvidersForPlacement,
  type AdProviderPolicy,
} from "@/lib/ad-config";
import type { DbAdPlacement, DbAdProvider } from "@/types/database";

function provider(id: string, slug: string, priority: number): DbAdProvider {
  return {
    id,
    slug,
    name: slug,
    provider_type: "display",
    is_active: true,
    priority,
    settings: {},
    credentials: {},
  } as unknown as DbAdProvider;
}

const ADSENSE = provider("p1", "google_adsense", 1);
const ADSTERRA = provider("p2", "adsterra", 2);
const MONETAG = provider("p3", "monetag", 3);
const PROVIDERS = [ADSENSE, ADSTERRA, MONETAG];

function placement(overrides: Partial<DbAdPlacement> = {}): DbAdPlacement {
  return {
    id: "pl1",
    placement_key: "calculator_mid",
    placement_type: "banner",
    is_active: true,
    provider_ids: [],
    ad_unit_ids: {},
    display_rules: { mobile: true, desktop: true, min_height: 100 },
    ...overrides,
  } as unknown as DbAdPlacement;
}

const AUTO: AdProviderPolicy = { mode: "auto", slug: null };

describe("sitewide ad provider policy", () => {
  it("serves every active provider in priority order on auto", () => {
    const chain = getProvidersForPlacement(
      "calculator_mid",
      PROVIDERS,
      [placement()],
      AUTO,
    );
    expect(chain.map((p) => p.slug)).toEqual([
      "google_adsense",
      "adsterra",
      "monetag",
    ]);
  });

  it("filters every placement to AdSense alone", () => {
    const chain = getProvidersForPlacement(
      "calculator_mid",
      PROVIDERS,
      [placement()],
      { mode: "adsense_only", slug: null },
    );
    expect(chain.map((p) => p.slug)).toEqual(["google_adsense"]);
  });

  it("honours a named provider and never quietly falls back", () => {
    const onlyMonetag = getProvidersForPlacement(
      "calculator_mid",
      PROVIDERS,
      [placement()],
      { mode: "single", slug: "monetag" },
    );
    expect(onlyMonetag.map((p) => p.slug)).toEqual(["monetag"]);

    // A provider that is not in the roster must leave the slot empty rather
    // than serving a network the owner did not choose.
    const absent = getProvidersForPlacement(
      "calculator_mid",
      PROVIDERS,
      [placement()],
      { mode: "single", slug: "taboola" },
    );
    expect(absent).toEqual([]);
  });

  it("overrides a placement that pinned its own provider list", () => {
    const pinned = placement({ provider_ids: ["p2", "p3"] });
    const chain = getProvidersForPlacement(
      "calculator_mid",
      PROVIDERS,
      [pinned],
      { mode: "adsense_only", slug: null },
    );
    expect(chain.map((p) => p.slug)).toEqual(["google_adsense"]);
  });

  it("serves nothing when the owner switches ads off", () => {
    const chain = getProvidersForPlacement(
      "calculator_mid",
      PROVIDERS,
      [placement()],
      { mode: "off", slug: null },
    );
    expect(chain).toEqual([]);
  });

  it("leaves rewarded offerwalls on their own providers", () => {
    const rewarded = placement({
      placement_key: "rewarded_unlock",
      placement_type: "rewarded",
    });
    const chain = getProvidersForPlacement(
      "rewarded_unlock",
      PROVIDERS,
      [rewarded],
      { mode: "adsense_only", slug: null },
    );
    expect(chain.map((p) => p.slug)).toEqual([
      "google_adsense",
      "adsterra",
      "monetag",
    ]);
  });
});
