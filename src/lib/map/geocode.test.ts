import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearPlaceCache, searchPlaces } from "@/lib/map/geocode";

const lagos = [
  {
    place_id: 1,
    name: "Lagos",
    display_name: "Lagos, Lagos State, Nigeria",
    lat: "6.4550575",
    lon: "3.3941795",
    addresstype: "city",
  },
  {
    place_id: 2,
    name: "Lagos",
    display_name: "Lagos, Faro, Portugal",
    lat: "37.102",
    lon: "-8.674",
    addresstype: "town",
  },
];

describe("map place search", () => {
  beforeEach(() => {
    clearPlaceCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not hit the network for one character", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(await searchPlaces("l")).toEqual([]);
    expect(await searchPlaces("   ")).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves any place on earth, not only the home market", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => lagos,
    } as Response);

    const results = await searchPlaces("lagos", { language: "en" });
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      name: "Lagos",
      label: "Lagos, Lagos State, Nigeria",
      lat: 6.4550575,
      lon: 3.3941795,
      type: "city",
    });
    expect(results[1].label).toContain("Portugal");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("nominatim");
    expect(String(fetchSpy.mock.calls[0][0])).toContain("accept-language=en");
  });

  it("caches a query and drops rows without coordinates", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [
        ...lagos,
        {
          place_id: 3,
          name: "Broken",
          display_name: "Broken",
          lat: "",
          lon: "",
        },
      ],
    } as Response);

    const first = await searchPlaces("lagos");
    expect(first).toHaveLength(2);
    const second = await searchPlaces("Lagos");
    expect(second).toEqual(first);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("returns nothing rather than throwing when the lookup fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    expect(await searchPlaces("nairobi")).toEqual([]);
  });
});
