import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ADSENSE_ONLY_PLACEMENT_KEYS,
  CODE_DEFINED_ACTIVE_PLACEMENT_KEYS,
} from "@/lib/ad-config";

/**
 * Guards for ad coverage.
 *
 * A slot key that is not in the registry resolves to no placement and renders
 * nothing, so a typo costs the page its advertising silently. The first test
 * holds every key used by a page to the registry. The second records which
 * public content pages now carry a slot, so dropping one is a visible change.
 */
const REGISTERED = new Set<string>([
  ...CODE_DEFINED_ACTIVE_PLACEMENT_KEYS,
  ...ADSENSE_ONLY_PLACEMENT_KEYS,
]);

const pageFiles = readdirSync("src/pages")
  .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
  .map((f) => `src/pages/${f}`);

function slotKeysIn(file: string): string[] {
  const text = readFileSync(file, "utf8");
  return [...text.matchAll(/slotKey="([a-z0-9_]+)"/g)].map((m) => m[1]);
}

describe("ad placement keys", () => {
  it("registers every key a page asks for", () => {
    const unregistered: string[] = [];
    for (const file of pageFiles) {
      for (const key of slotKeysIn(file)) {
        if (!REGISTERED.has(key)) unregistered.push(`${file}: ${key}`);
      }
    }
    expect(unregistered).toEqual([]);
  });

  it("registers the content placements the reference pages use", () => {
    expect(REGISTERED.has("content_native")).toBe(true);
    expect(REGISTERED.has("content_mid")).toBe(true);
  });
});

describe("content page coverage", () => {
  const covered: Record<string, string> = {
    "src/pages/Faq.tsx": "content_native",
    "src/pages/EngineeringStandards.tsx": "content_native",
    "src/pages/CaseStudies.tsx": "content_native",
    "src/pages/Gallery.tsx": "gallery_native",
    "src/pages/Glossary.tsx": "content_native",
    "src/pages/MaterialPrices.tsx": "content_native",
  };

  it("keeps a slot on each public reference page", () => {
    for (const [file, key] of Object.entries(covered)) {
      expect(slotKeysIn(file)).toContain(key);
    }
  });

  it("imports the slot component wherever a key is used", () => {
    for (const file of Object.keys(covered)) {
      expect(readFileSync(file, "utf8")).toContain(
        'from "@/components/ui/AdSlot"',
      );
    }
  });
});
