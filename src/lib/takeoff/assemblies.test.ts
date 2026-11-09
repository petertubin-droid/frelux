import { describe, expect, it } from "vitest";
import {
  type AssemblyMaterialLine,
  blockworkAssembly,
  floorTileAssembly,
  paintAssembly,
  renderAssembly,
  screedAssembly,
} from "./assemblies";

const byMaterial = (lines: AssemblyMaterialLine[], name: string) =>
  lines.find((line) => line.material === name);

describe("blockwork assembly", () => {
  const lines = blockworkAssembly(10);

  it("counts blocks on the face, not on the volume", () => {
    const blocks = byMaterial(lines, "Blocks");
    // 450 x 225 face is 0.10125 m2, so 9.88 blocks per square metre.
    expect(blocks?.netQuantity).toBeCloseTo(98.77, 1);
    expect(blocks?.quantity).toBeCloseTo(103.7, 1);
    expect(blocks?.purchaseQuantity).toBe(104);
  });

  it("derives cement from the mortar volume and the mix", () => {
    const mortar = byMaterial(lines, "Mortar");
    const cement = byMaterial(lines, "Cement");
    expect(mortar?.quantity).toBeCloseTo(0.33, 2);
    // 0.33 m3 of 1:6 mortar is 0.047 m3 of cement, which is 1.35 bags.
    expect(cement?.purchaseQuantity).toBe(2);
    expect(cement?.quantity).toBe(100);
  });

  it("splits the mortar between cement and sand in mix proportions", () => {
    const cement = byMaterial(lines, "Cement");
    const sand = byMaterial(lines, "Sand");
    const cementVolume = (cement?.purchaseQuantity ?? 0) * 0.035;
    expect(sand?.quantity).toBeGreaterThan(cementVolume);
  });

  it("honours a different block size", () => {
    const small = blockworkAssembly(10, {
      blockLengthMm: 400,
      blockHeightMm: 200,
    });
    const blocks = byMaterial(small, "Blocks");
    // 0.08 m2 face is 12.5 blocks per square metre.
    expect(blocks?.netQuantity).toBeCloseTo(125, 1);
  });

  it("prints the values it actually used", () => {
    const blocks = byMaterial(lines, "Blocks");
    expect(blocks?.derivation.inputs.blockLengthMm).toBe(450);
    expect(
      blocks?.derivation.steps?.some((step) => step.label === "Blocks per m2"),
    ).toBe(true);
  });
});

describe("render and paint", () => {
  it("converts render thickness into mortar volume", () => {
    const lines = renderAssembly(20, { thicknessMm: 15 });
    expect(byMaterial(lines, "Render mortar")?.quantity).toBeCloseTo(0.33, 2);
  });

  it("multiplies paint by coats and divides by coverage", () => {
    const lines = paintAssembly(40, { coats: 2, coverageM2PerLitre: 10 });
    const paint = byMaterial(lines, "Paint");
    expect(paint?.netQuantity).toBe(8);
    expect(paint?.quantity).toBeCloseTo(8.4, 2);
    expect(paint?.purchaseQuantity).toBe(2);
    expect(paint?.purchaseUnit).toBe("5 L packs");
  });

  it("does not let a single coat hide a second coat", () => {
    const one = paintAssembly(40, { coats: 1 });
    const two = paintAssembly(40, { coats: 2 });
    const oneQty = byMaterial(one, "Paint")?.quantity ?? 0;
    const twoQty = byMaterial(two, "Paint")?.quantity ?? 0;
    expect(twoQty).toBeCloseTo(oneQty * 2, 4);
  });
});

describe("floor tiling", () => {
  it("counts tiles from the tile face and adds waste", () => {
    const lines = floorTileAssembly(20);
    const tiles = byMaterial(lines, "Tiles");
    expect(tiles?.netQuantity).toBeCloseTo(55.56, 1);
    expect(tiles?.purchaseQuantity).toBe(62);
  });

  it("reports packs only when a pack coverage is known", () => {
    expect(byMaterial(floorTileAssembly(20), "Tile packs")).toBeUndefined();
    const withPacks = floorTileAssembly(20, { packCoverageM2: 1.44 });
    expect(byMaterial(withPacks, "Tile packs")?.purchaseQuantity).toBe(16);
  });

  it("scales adhesive and grout with area", () => {
    const lines = floorTileAssembly(20, {
      adhesiveKgPerM2: 4,
      groutKgPerM2: 0.5,
    });
    expect(byMaterial(lines, "Tile adhesive")?.quantity).toBeCloseTo(88, 2);
    expect(byMaterial(lines, "Grout")?.quantity).toBeCloseTo(11, 2);
  });
});

describe("screed", () => {
  it("turns 50 mm over 20 m2 into one cubic metre before waste", () => {
    const lines = screedAssembly(20, { thicknessMm: 50 });
    const volume = byMaterial(lines, "Screed concrete");
    expect(volume?.netQuantity).toBe(1);
    expect(volume?.quantity).toBeCloseTo(1.1, 2);
  });

  it("rounds cement up to whole bags", () => {
    const bags =
      byMaterial(screedAssembly(20), "Cement")?.purchaseQuantity ?? 0;
    expect(Number.isInteger(bags)).toBe(true);
    expect(bags).toBeGreaterThan(0);
  });
});

describe("assembly invariants", () => {
  it("never returns a negative quantity for a positive area", () => {
    for (const lines of [
      blockworkAssembly(5),
      renderAssembly(5),
      paintAssembly(5),
      floorTileAssembly(5),
      screedAssembly(5),
    ]) {
      for (const line of lines) {
        expect(line.quantity).toBeGreaterThanOrEqual(0);
        expect(line.netQuantity).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("returns nothing priced for an empty area", () => {
    expect(blockworkAssembly(0).every((line) => line.quantity === 0)).toBe(
      true,
    );
    expect(paintAssembly(0)[0].quantity).toBe(0);
  });
});
