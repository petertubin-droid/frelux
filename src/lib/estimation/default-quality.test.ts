import { describe, it, expect } from "vitest";
import {
  buildDefaultQuality,
  defaultQualityIdFor,
  isDefaultQualityId,
  withDefaultQuality,
} from "./default-quality";
import { DEFAULT_COVERAGE_M2_PER_LITER } from "@/lib/calc";
import { validateRoomInput } from "./painting-engine";
import type {
  EstimationProduct,
  EstimationProductQuality,
} from "@/types/estimation";

const realQuality = (over: Partial<EstimationProductQuality> = {}) =>
  ({
    ...buildDefaultQuality("p1"),
    id: "11111111-1111-4111-8111-111111111111",
    name: "Premium",
    slug: "premium",
    coverage: 12,
    ...over,
  }) as EstimationProductQuality;

describe("default quality level", () => {
  it("offers a Standard level when a product has no quality rows", () => {
    const list = withDefaultQuality("p1", []);
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Standard");
    expect(list[0].is_active).toBe(true);
    expect(list[0].id).toBe(defaultQualityIdFor("p1"));
  });

  it("treats undefined (failed/empty load) the same as no rows", () => {
    expect(withDefaultQuality("p1", undefined)).toHaveLength(1);
  });

  it("carries the platform-wide default coverage, never an invented value", () => {
    const q = buildDefaultQuality("p1");
    expect(q.coverage).toBe(DEFAULT_COVERAGE_M2_PER_LITER);
    expect(q.coverage_unit).toBe("m2_per_liter");
  });

  it("steps aside as soon as the admin adds a real active quality", () => {
    const real = [realQuality()];
    const list = withDefaultQuality("p1", real);
    expect(list).toEqual(real);
    expect(list.some((q) => isDefaultQualityId(q.id))).toBe(false);
  });

  it("still offers the default when every real quality is inactive", () => {
    const list = withDefaultQuality("p1", [realQuality({ is_active: false })]);
    expect(list.some((q) => isDefaultQualityId(q.id))).toBe(true);
  });

  it("recognises only synthetic ids as default", () => {
    expect(isDefaultQualityId(defaultQualityIdFor("p1"))).toBe(true);
    expect(isDefaultQualityId("11111111-1111-4111-8111-111111111111")).toBe(
      false,
    );
    expect(isDefaultQualityId("")).toBe(false);
    expect(isDefaultQualityId(null)).toBe(false);
  });

  it("makes the room valid for the engine (the original blocker)", () => {
    const product = {
      id: "p1",
      name: "Frelux emulsion",
      category: "emulsion",
      is_active: true,
    } as unknown as EstimationProduct;
    const room = {
      room_id: "r1",
      room_name: "Room 1",
      length: 10,
      breadth: 12,
      height: 8,
      unit: "feet",
      doors: [{ quantity: 1, width: 3, height: 7 }],
      windows: [{ quantity: 1, width: 4, height: 4 }],
      doors_unknown: false,
      windows_unknown: false,
      product_id: "p1",
      quality_id: defaultQualityIdFor("p1"),
      colour_condition_key: "new_unpainted",
      surface_condition_key: "new_plastered",
      coats: 2,
      include_ceiling: false,
      ceiling_colour: "white",
    } as unknown as Parameters<typeof validateRoomInput>[0];

    const without = validateRoomInput(room, product, null);
    expect(without.errors).toContain("Quality level is required.");

    const withDefault = validateRoomInput(
      room,
      product,
      buildDefaultQuality("p1"),
    );
    expect(withDefault.errors).not.toContain("Quality level is required.");
    expect(withDefault.valid).toBe(true);
  });
});
