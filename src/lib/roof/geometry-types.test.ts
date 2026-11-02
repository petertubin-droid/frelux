import { describe, it, expect } from "vitest";
import type {
  RoofPoint,
  GeometrySource,
  EdgeType,
} from "@/lib/roof/geometry-types";

describe("roof geometry types", () => {
  it("RoofPoint has x,y coordinates", () => {
    const p: RoofPoint = { id: "p1", x: 0, y: 0 };
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it("GeometrySource includes expected sources", () => {
    const sources: GeometrySource[] = ["manual", "satellite", "imported"];
    expect(sources).toContain("manual");
    expect(sources).toContain("satellite");
  });

  it("EdgeType includes expected edge types", () => {
    const edges: EdgeType[] = [
      "eave",
      "ridge",
      "hip",
      "valley",
      "rake",
      "parapet",
    ];
    expect(edges).toContain("eave");
    expect(edges).toContain("ridge");
  });
});
