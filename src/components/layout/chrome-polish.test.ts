import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Guards for the site chrome: the footer grid, the copy in it, and the focus and
 * contrast treatment on the navigation. These are read from source because each
 * is a class or a string that a render test would only assert indirectly, and a
 * silent regression here is invisible until someone tabs through the header.
 */
const footer = readFileSync("src/components/layout/Footer.tsx", "utf8");
const navbar = readFileSync("src/components/layout/Navbar.tsx", "utf8");
const bottomNav = readFileSync("src/components/ui/MobileBottomNav.tsx", "utf8");

describe("footer chrome", () => {
  it("gives the brand block and four groups twelve tracks", () => {
    // The brand takes four of twelve tracks and each group two, so the wide
    // groups can carry two columns of links. Markets is no longer a track: it
    // is a wrapped band below the grid, because a column of thirty-two
    // countries was the single tallest thing in the footer.
    expect(footer).toContain("lg:grid-cols-12");
    expect(footer).not.toContain("lg:grid-cols-7");
    for (const title of ["Calculators", "Explore", "Resources", "Legal"]) {
      expect(footer).toContain(`title: "${title}"`);
    }
    expect(footer).toContain("FooterMarketBand");
  });

  it("states the opening hours without dashes or a repeated promise", () => {
    expect(footer).toContain("Monday to Friday, 8am to 6pm (WAT)");
    expect(footer).not.toContain("Mon–Fri");
    expect(footer).not.toContain("8am–6pm");
    // The reply promise appears once, in the contact line, not again below it.
    expect(footer.match(/business day/gi)?.length ?? 0).toBe(0);
  });

  it("keeps the trust row as plain list items with no separator glyphs", () => {
    expect(footer).toContain("256-bit TLS security");
    expect(footer).toContain("Google AdSense and AdChoices compliant");
    expect(footer).not.toMatch(/>\s*·\s*</);
  });

  it("does not dim body copy below the muted token", () => {
    expect(footer).not.toContain("text-muted-foreground/80");
    expect(footer).not.toContain("text-muted-foreground/85");
  });

  it("rings every footer link and control on keyboard focus", () => {
    // The group links, the email chip and the cookie preferences button.
    const ringed = footer.split("focus-visible:ring-2").length - 1;
    expect(ringed).toBeGreaterThanOrEqual(3);
  });
});

describe("navigation chrome", () => {
  it("keeps dark-mode labels at the full muted token", () => {
    expect(navbar).not.toContain("dark:text-muted-foreground/80");
  });

  it("gives the primary navigation a keyboard indicator", () => {
    expect(navbar.split("focus-visible:ring-2").length - 1).toBeGreaterThan(10);
    expect(bottomNav).toContain("focus-visible:ring-2");
  });

  it("keeps the bottom bar at a 44 px touch target", () => {
    expect(bottomNav).toContain("min-h-11");
  });
});
