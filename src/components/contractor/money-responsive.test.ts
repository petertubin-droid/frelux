import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

/**
 * Responsive contract for the money screens.
 *
 * The contractor dashboard runs on phones on site, so a fixed width, a grid
 * that never collapses, or an unlabelled horizontal scroller is a real defect
 * rather than a cosmetic one. jsdom cannot measure layout, so this reads the
 * source and holds the structural promises the components make: single column
 * first, full width fields, tap targets at least 44px, and any wide table
 * inside its own named scroll region.
 */
const MONEY_TAB = readFileSync(
  "src/components/contractor/MoneyTab.tsx",
  "utf8",
);
const WIZARD = readFileSync(
  "src/components/contractor/InvoiceWizard.tsx",
  "utf8",
);

const classTokens = (source: string) =>
  source.match(/className="[^"]*"/g) ?? [];

/** Widths written as an outright w-[Npx], ignoring min-w-[Npx]. */
function fixedPixelWidths(source: string): number[] {
  const found: number[] = [];
  for (const token of classTokens(source)) {
    const matches = token.matchAll(/w-\[(\d+)px\]/g);
    for (const match of matches) {
      const index = match.index ?? 0;
      const isMinWidth = token
        .slice(Math.max(0, index - 4), index)
        .includes("min-");
      if (!isMinWidth) found.push(Number(match[1]));
    }
  }
  return found;
}

describe("money screens resize instead of spilling", () => {
  it("never hard-codes a width wider than a small phone", () => {
    for (const [name, source] of [
      ["MoneyTab", MONEY_TAB],
      ["InvoiceWizard", WIZARD],
    ] as const) {
      const wide = fixedPixelWidths(source).filter((width) => width > 360);
      expect(wide, `${name} fixed widths`).toEqual([]);
    }
  });

  it("keeps every money input full width", () => {
    // Radio inputs are 16px controls by design; every data entry field fills
    // the column it sits in.
    const fields = (WIZARD.match(/<input[\s\S]*?\/>/g) ?? []).filter(
      (tag) => !tag.includes('type="radio"'),
    );
    expect(fields.length).toBeGreaterThanOrEqual(4);
    for (const tag of fields) {
      expect(tag).toContain("w-full");
    }
  });

  it("stacks the wizard actions on a phone and rows them from sm upwards", () => {
    expect(WIZARD).toContain("flex flex-col gap-2 sm:flex-row");
    expect(WIZARD).toContain("sm:grid-cols-2");
    expect(WIZARD).not.toContain('className="grid grid-cols-2');
  });

  it("keeps primary taps at 44px or taller", () => {
    const wizardButtons = WIZARD.split("<Button").slice(1);
    const padded = wizardButtons.filter((button) =>
      button.includes("min-h-11"),
    );
    // Back, the full-form escape, Next, draft and raise: five actions, each at
    // least 44px tall.
    expect(padded.length).toBeGreaterThanOrEqual(5);
    // The amount field is the largest target on the flow.
    expect(WIZARD).toMatch(/id="wizard-amount"[\s\S]*?h-12 w-full/);
  });

  it("puts the wide invoice table in its own named scroll region", () => {
    expect(MONEY_TAB).toContain('role="region"');
    expect(MONEY_TAB).toContain('aria-label={tr("Invoice list")}');
    expect(MONEY_TAB).toContain("overflow-x-auto");
    // A wide table needs a keyboard tab stop so it can be scrolled without a mouse.
    expect(MONEY_TAB).toContain("tabIndex={0}");
  });

  it("lets long money figures shrink rather than push the row", () => {
    expect(MONEY_TAB).toContain(
      "whitespace-nowrap py-2 pr-3 text-right tabular-nums",
    );
    expect(MONEY_TAB).toContain("min-w-0 flex-1");
  });
});
