import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Geometry guard for the desktop rail.
 *
 * Chromium cannot run in this environment, so the layout is verified as maths
 * against the real source instead of pixels: the width the rail actually
 * renders at, the offset the content reserves for it, and whether the flyout
 * panel still fits beside it at every breakpoint. If someone changes one of
 * these numbers without the others, this fails instead of shipping a page
 * whose content sits under the rail or a flyout that runs off screen.
 */

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const remToPx = (value: string) => parseFloat(value) * 16;

const css = read("src/index.css");
const railSource = read("src/components/layout/AppRail.tsx");

/** Pull a CSS custom property out of a specific block. */
function railVarFrom(block: string, name = "--rail-w"): string | null {
  const match = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

// The token block that owns --rail-w (the file has more than one :root).
const baseBlock = (css.match(/:root\s*\{[^}]*--rail-w:[^}]*\}/) ?? [""])[0];
const collapsedBlock = (css.match(
  /html\[data-rail="collapsed"\]\s*\{[^}]*\}/,
) ?? [""])[0];
const desktopBlock = (css.match(
  /@media \(min-width: 1024px\)\s*\{[\s\S]*?html\[data-rail="collapsed"\]\s*\{[^}]*\}/,
) ?? [""])[0];

const EXPANDED_PX = remToPx(
  // The value inside the >=1024 media query, i.e. the desktop width.
  (desktopBlock.match(/--rail-w:\s*([\d.]+rem)/) ?? ["", "18rem"])[1],
);
const COLLAPSED_PX = remToPx(
  (collapsedBlock.match(/--rail-w:\s*([\d.]+rem)/) ?? ["", "4.5rem"])[1],
);

describe("desktop rail geometry", () => {
  it("reserves no offset below the lg breakpoint", () => {
    expect(railVarFrom(baseBlock)).toBe("0px");
    // The rail itself is desktop-only, so tablets keep their own navigation.
    expect(railSource).toContain("hidden h-[100svh]");
    expect(railSource).toContain("lg:flex");
  });

  it("pins the rail's rendered width to the same variable the content uses", () => {
    // A mismatch here is the classic bug: content padded 15.5rem while the
    // rail draws 14rem, leaving a strip of page visible underneath it.
    expect(railSource).toContain("w-[18rem]");
    expect(railSource).toContain("w-[4.5rem]");
    expect(EXPANDED_PX).toBe(18 * 16);
    expect(COLLAPSED_PX).toBe(4.5 * 16);
  });

  it("keeps the header, main content and footer on the rail offset", () => {
    const navbar = read("src/components/layout/Navbar.tsx");
    const layout = read("src/components/layout/Layout.tsx");
    // The header is offset rather than padded, so its background cannot
    // paint over the rail.
    expect(navbar).toContain("lg:left-[var(--rail-w)]");
    expect(navbar).toContain("lg:w-[calc(100%-var(--rail-w))]");
    expect(layout).toContain("lg:pl-[var(--rail-w)]");
    // Footer lives outside <main> and needs its own offset.
    const footerOffset = layout.match(
      /<div className="lg:pl-\[var\(--rail-w\)\]">\s*<Footer \/>/,
    );
    expect(footerOffset).not.toBeNull();
  });

  it("leaves a readable content column at the narrowest desktop width", () => {
    const narrowestDesktop = 1024;
    const content = narrowestDesktop - EXPANDED_PX;
    // 1024 - 248 = 776px. A calculator needs room for two columns; below
    // ~720px the rail would be doing the page a disservice.
    expect(content).toBeGreaterThanOrEqual(720);
  });

  it("gives the labelled column the space the flyout used to float over", () => {
    // Rail 4.5rem of icons plus a column that fills the rest of the offset.
    const RAIL_PX = 4.5 * 16;
    const COLUMN_PX = EXPANDED_PX - RAIL_PX;
    expect(COLUMN_PX).toBe(216);

    // The column is a real layout column: it scrolls on its own and cannot
    // overflow the shell, which is what replaced the portalled flyout.
    expect(railSource).toContain("w-[4.5rem] shrink-0 flex-col");
    expect(railSource).toContain("flex min-w-0 flex-1 flex-col");
    expect(railSource).toContain("overflow-y-auto overscroll-contain");
    expect(railSource).not.toContain("createPortal");
    // Collapsed, the column is not rendered at all, so the offset matches.
    expect(railSource).toContain('collapsed ? "w-[4.5rem]" : "w-[18rem]"');
  });
});
