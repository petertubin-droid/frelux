import { describe, expect, it } from "vitest";
import {
  calculateTypologyAssembly,
  resolveDefaultTypology,
} from "@/lib/estimation/typology-assemblies";

describe("Building Typology Assemblies", () => {
  describe("resolveDefaultTypology", () => {
    it("maps US and CA to North American light timber framing", () => {
      expect(resolveDefaultTypology("US")).toBe("north_american_timber");
      expect(resolveDefaultTypology("CA")).toBe("north_american_timber");
    });

    it("maps GB, IE and ZA to European cavity wall", () => {
      expect(resolveDefaultTypology("GB")).toBe("european_cavity_wall");
      expect(resolveDefaultTypology("IE")).toBe("european_cavity_wall");
      expect(resolveDefaultTypology("ZA")).toBe("european_cavity_wall");
    });

    it("maps AU and NZ to light gauge steel", () => {
      expect(resolveDefaultTypology("AU")).toBe("light_gauge_steel");
      expect(resolveDefaultTypology("NZ")).toBe("light_gauge_steel");
    });

    it("defaults other markets (NG, GH, IN, etc.) to RC frame with block infill", () => {
      expect(resolveDefaultTypology("NG")).toBe("rc_frame_block_infill");
      expect(resolveDefaultTypology("GH")).toBe("rc_frame_block_infill");
      expect(resolveDefaultTypology("IN")).toBe("rc_frame_block_infill");
    });
  });

  describe("North American Light Timber Framing", () => {
    it("computes complete dimensional lumber, sheathing, insulation and shingles schedule", () => {
      const result = calculateTypologyAssembly({
        typology: "north_american_timber",
        market_code: "US",
        building_length_m: 12,
        building_width_m: 8,
        floor_to_floor_height_m: 2.7,
        number_of_floors: 1,
        timber_stud_size: "2x6",
        stud_spacing_inches: 16,
        openings_area_m2: 15,
        openings_count: 6,
      });

      expect(result.assembly_name).toContain("North American Light-Frame Wood");
      expect(result.applicable_standards).toContain("IRC 2024");
      expect(result.wall_area_gross_m2).toBe(2 * (12 + 8) * 2.7); // 108 m²
      expect(result.wall_area_net_m2).toBe(108 - 15); // 93 m²

      // Check materials
      const extStuds = result.materials.find((m) => m.id === "ext_studs");
      expect(extStuds).toBeDefined();
      expect(extStuds?.final_quantity).toBeGreaterThan(100);
      expect(extStuds?.unit).toBe("pcs");

      const plates = result.materials.find((m) => m.id === "plates");
      expect(plates).toBeDefined();
      expect(plates?.unit).toBe("linear m");

      const sheathing = result.materials.find((m) => m.id === "wall_sheathing");
      expect(sheathing).toBeDefined();
      expect(sheathing?.final_quantity).toBeGreaterThan(30);

      const wrb = result.materials.find((m) => m.id === "wrb_housewrap");
      expect(wrb).toBeDefined();
      expect(wrb?.final_quantity).toBeGreaterThan(93);

      const insulation = result.materials.find(
        (m) => m.id === "cavity_insulation",
      );
      expect(insulation).toBeDefined();
      expect(insulation?.name).toContain("R-20");

      const trusses = result.materials.find((m) => m.id === "roof_trusses");
      expect(trusses).toBeDefined();
      expect(trusses?.final_quantity).toBe(Math.ceil(12 / 0.61) + 1);

      const shingles = result.materials.find(
        (m) => m.id === "asphalt_shingles",
      );
      expect(shingles).toBeDefined();
      expect(shingles?.unit).toBe("squares (100 sq ft)");
    });
  });

  describe("Light Gauge Cold-Formed Steel Framing", () => {
    it("computes CFS C-studs, U-tracks, fiber-cement boards and self-drilling screws", () => {
      const result = calculateTypologyAssembly({
        typology: "light_gauge_steel",
        market_code: "AU",
        building_length_m: 15,
        building_width_m: 10,
        floor_to_floor_height_m: 3.0,
        number_of_floors: 1,
        stud_spacing_mm: 400,
        openings_area_m2: 20,
        openings_count: 8,
      });

      expect(result.assembly_name).toContain("Cold-Formed Light Gauge Steel");
      expect(result.applicable_standards).toContain("AS/NZS 4600");

      const cfsStuds = result.materials.find((m) => m.id === "cfs_ext_studs");
      expect(cfsStuds).toBeDefined();
      expect(cfsStuds?.final_quantity).toBeGreaterThan(120);

      const cfsTracks = result.materials.find((m) => m.id === "cfs_tracks");
      expect(cfsTracks).toBeDefined();
      expect(cfsTracks?.unit).toBe("linear m");

      const sheathing = result.materials.find(
        (m) => m.id === "fiber_cement_sheathing",
      );
      expect(sheathing).toBeDefined();

      const screws = result.materials.find((m) => m.id === "cfs_fasteners");
      expect(screws).toBeDefined();
      expect(screws?.final_quantity).toBeGreaterThan(1000);
    });
  });

  describe("European Insulated Cavity Wall", () => {
    it("computes outer facing bricks, cavity insulation, wall ties, inner aircrete blocks, lintels and cavity trays", () => {
      const result = calculateTypologyAssembly({
        typology: "european_cavity_wall",
        market_code: "GB",
        building_length_m: 10,
        building_width_m: 8,
        floor_to_floor_height_m: 2.6,
        number_of_floors: 2,
        openings_area_m2: 24,
        openings_count: 10,
      });

      expect(result.assembly_name).toContain(
        "British & European Insulated Cavity Wall",
      );
      expect(result.applicable_standards).toContain("BS EN 1996");

      const grossArea = 2 * (10 + 8) * 2.6 * 2; // 187.2 m²
      const netArea = grossArea - 24; // 163.2 m²

      // Outer leaf bricks: ~60 bricks per m²
      const bricks = result.materials.find((m) => m.id === "facing_bricks");
      expect(bricks).toBeDefined();
      expect(bricks?.base_quantity).toBe(Math.ceil(netArea * 60));

      // Inner leaf blocks: ~10 blocks per m²
      const blocks = result.materials.find((m) => m.id === "inner_leaf_blocks");
      expect(blocks).toBeDefined();
      expect(blocks?.base_quantity).toBe(Math.ceil(netArea * 10));

      // Stainless wall ties: 2.5 per m² + perimeter
      const ties = result.materials.find((m) => m.id === "stainless_wall_ties");
      expect(ties).toBeDefined();
      expect(ties?.final_quantity).toBeGreaterThan(Math.ceil(grossArea * 2.5));

      // Cavity insulation
      const insulation = result.materials.find(
        (m) => m.id === "cavity_insulation_boards",
      );
      expect(insulation).toBeDefined();
      expect(insulation?.final_quantity).toBeGreaterThan(netArea);

      // Lintels and cavity trays
      const lintels = result.materials.find(
        (m) => m.id === "insulated_steel_lintels",
      );
      expect(lintels).toBeDefined();
      expect(lintels?.final_quantity).toBe(10);

      const trays = result.materials.find((m) => m.id === "cavity_trays_weeps");
      expect(trays).toBeDefined();
      expect(trays?.final_quantity).toBe(Math.ceil(10 * 2 * 1.05));
    });
  });
});
