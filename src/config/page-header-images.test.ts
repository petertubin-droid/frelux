// Tests for the config-driven page header image registry. Every
// user-facing route resolves to a niche image; unknown routes fall
// back to the shared architectural shot from the welcome screen.

import { describe, expect, it } from "vitest";
import { DEFAULT_HEADER_IMAGE, resolveHeaderImage } from "./page-header-images";

describe("resolveHeaderImage", () => {
  it("maps trade tools to their niche images", () => {
    expect(resolveHeaderImage("/paint-calculator")).toBe(
      "/assets/headers/paint.jpg",
    );
    expect(resolveHeaderImage("/screeding-cost-estimator")).toBe(
      "/assets/headers/screed.jpg",
    );
    expect(resolveHeaderImage("/pop-ceiling-calculator")).toBe(
      "/assets/headers/pop.jpg",
    );
    expect(resolveHeaderImage("/tile-calculator")).toBe(
      "/assets/headers/tile.jpg",
    );
  });

  it("maps business and project routes", () => {
    expect(resolveHeaderImage("/colors/compare")).toBe(
      "/assets/headers/colors.jpg",
    );
    expect(resolveHeaderImage("/material-prices")).toBe(
      "/assets/headers/materials.jpg",
    );
    expect(resolveHeaderImage("/marketplace")).toBe("/assets/headers/pro.jpg");
    expect(resolveHeaderImage("/project-workspace/123")).toBe(
      "/assets/headers/projects.jpg",
    );
    expect(resolveHeaderImage("/learn/category/painting")).toBe(
      "/assets/headers/learn.jpg",
    );
    expect(resolveHeaderImage("/case-studies/45")).toBe(
      "/assets/headers/gallery.jpg",
    );
  });

  it("falls back to the default image for unmatched routes", () => {
    expect(resolveHeaderImage("/")).toBe(DEFAULT_HEADER_IMAGE);
    expect(resolveHeaderImage("/about")).toBe(DEFAULT_HEADER_IMAGE);
    expect(resolveHeaderImage("/terms")).toBe(DEFAULT_HEADER_IMAGE);
    expect(resolveHeaderImage("/some/future/page")).toBe(DEFAULT_HEADER_IMAGE);
  });

  it("only references assets that exist in the bundle", async () => {
    const samples = [
      "/paint-calculator",
      "/screeding-calculator",
      "/pop-ceiling-calculator",
      "/tile-calculator",
      "/colors",
      "/structural-calculator",
      "/build-to-roof-estimator",
      "/image-estimator",
      "/electrical",
      "/solar-pv-estimator",
      "/prices",
      "/marketplace",
      "/learn",
      "/gallery",
      "/my-projects",
    ];
    for (const route of samples) {
      const asset = resolveHeaderImage(route).replace("/", "public/");
      // Node-only fs check - vitest runs this file in Node
      const fs = (await import("node:fs")) as typeof import("node:fs");
      expect(fs.existsSync(asset), `${asset} for ${route}`).toBe(true);
    }
  });
});

describe("resolveHeaderImage with admin overrides", () => {
  it("lets an override beat the registry", () => {
    expect(
      resolveHeaderImage("/paint-calculator", {
        "/paint-calculator": "/custom.png",
      }),
    ).toBe("/custom.png");
  });

  it("matches parent prefixes and prefers the longest key", () => {
    const overrides = {
      "/learn": "/learn.png",
      "/learn/library": "/library.png",
    };
    expect(resolveHeaderImage("/learn", overrides)).toBe("/learn.png");
    expect(resolveHeaderImage("/learn/library", overrides)).toBe(
      "/library.png",
    );
    expect(resolveHeaderImage("/learn/category/painting", overrides)).toBe(
      "/learn.png",
    );
  });

  it("ignores empty override values", () => {
    expect(
      resolveHeaderImage("/paint-calculator", { "/paint-calculator": "" }),
    ).toBe("/assets/headers/paint.jpg");
  });
});
