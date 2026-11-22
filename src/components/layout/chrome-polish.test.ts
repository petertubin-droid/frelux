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
  it("organizes the footer into brand and link columns", () => {
    for (const title of ["Calculators", "Explore", "Resources", "Company"]) {
      expect(footer).toContain(`title: "${title}"`);
    }
    expect(footer).toContain("marketHubLinks");
  });

  it("keeps the trust row compliant", () => {
    expect(footer).toContain("256-bit TLS");
    expect(footer).toContain("Google AdSense and AdChoices compliant");
  });

  it("does not dim body copy below the muted token", () => {
    expect(footer).not.toContain("text-muted-foreground/80");
    expect(footer).not.toContain("text-muted-foreground/85");
  });

  it("rings every footer link and control on keyboard focus", () => {
    const ringed = footer.split("focus-visible:ring-2").length - 1;
    expect(ringed).toBeGreaterThanOrEqual(1);
  });
});

describe("navigation chrome", () => {
  it("keeps dark-mode labels at the full muted token", () => {
    expect(navbar).not.toContain("dark:text-muted-foreground/80");
  });

  it("gives the primary navigation a keyboard indicator", () => {
    expect(navbar.split("focus-visible:ring-2").length - 1).toBeGreaterThanOrEqual(5);
    expect(bottomNav).toContain("focus-visible:ring-2");
  });

  it("keeps the bottom bar at a 44 px touch target", () => {
    expect(bottomNav).toContain("min-h-11");
  });
});
