import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

/**
 * Guard for the result-card action buttons.
 *
 * Print, share, save, open in the studio and find-a-supplier used to be built
 * at primary-CTA size: `px-4 py-2 text-sm` on each, up to five to a row on a
 * 360 px phone. The row could not wrap and pushed past the card instead, which
 * is what made those buttons look oversized.
 *
 * The layout gate only screenshots pages it knows about, so the class strings
 * are checked at the source: no page may reintroduce the large size on an
 * action button, and the shared components keep the 32 px token.
 */

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry))
      out.push(full);
  }
  return out;
}

/**
 * The oversized size that was used for secondary actions in a result card.
 * A form's own Calculate/Generate button is a primary action and keeps its
 * weight; these two strings only ever appeared on the row under a result.
 */
const OVERSIZED = [
  'className="rounded-lg border px-4 py-2 text-sm font-semibold',
  'className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold',
];

describe("calculator action buttons", () => {
  it("no page uses the oversized secondary-action size", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const source = readFileSync(file, "utf8");
      for (const needle of OVERSIZED) {
        if (source.includes(needle))
          offenders.push(`${file.replace(SRC, "src")}: ${needle}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the shared components use the compact token", () => {
    const share = readFileSync(
      join(SRC, "components/ShareEstimateButton.tsx"),
      "utf8",
    );
    expect(share).toContain("ACTION_BTN");
    const save = readFileSync(
      join(SRC, "components/calculators/SaveToProjectButton.tsx"),
      "utf8",
    );
    // both trigger forms are the same size now: 12 px text, 32 px tall
    const compactTriggers =
      save.match(/px-3 py-1\.5 text-xs font-semibold leading-none/g) ?? [];
    expect(compactTriggers.length).toBe(2);
    const nearby = readFileSync(
      join(SRC, "components/map/NearbySuppliersLink.tsx"),
      "utf8",
    );
    expect(nearby).toContain("px-3 py-1.5 text-xs");
    expect(nearby).not.toContain("px-4 py-2.5 text-sm");
  });

it("pins one height, so a shadcn Button and a plain button match", () => {
    // The token had no height: <Button> kept the shadcn default h-10 (40 px)
    // while a plain <button> with the same token came out ~24 px, so Share and
    // WhatsApp stood a head taller than Print in the same row. h-8 fixes both
    // at 32 px.
    const actions = readFileSync(
      join(SRC, "components/calculators/CalculatorActions.tsx"),
      "utf8",
    );
    expect(actions).toContain('"inline-flex h-8 items-center justify-center');
    expect(actions).not.toContain("h-10");

    const share = readFileSync(
      join(SRC, "components/ShareEstimateButton.tsx"),
      "utf8",
    );
    // Every compact action goes through the token, and none may reintroduce a
    // tall tile or a shadcn default height.
    // one import plus three actions: every compact button goes through the token
    expect(share.match(/ACTION_BTN/g)?.length).toBe(4);
    expect(share).not.toContain("h-auto");
    expect(share).not.toContain("h-10");
    // The full-width share tiles are 36 px, not the old ~47 px.
    expect(share.match(/flex h-9 flex-col/g)?.length).toBe(3);

    const save = readFileSync(
      join(SRC, "components/calculators/SaveToProjectButton.tsx"),
      "utf8",
    );
    expect(save.match(/group inline-flex h-8 items-center/g)?.length).toBe(2);

    const nearby = readFileSync(
      join(SRC, "components/map/NearbySuppliersLink.tsx"),
      "utf8",
    );
    expect(nearby).toContain("inline-flex h-8 min-w-0 items-center");
  });

  it("the action bar wraps instead of overflowing", () => {
    const bar = readFileSync(
      join(SRC, "components/calculators/CalculatorActions.tsx"),
      "utf8",
    );
    expect(bar).toContain("flex-wrap");
    expect(bar).toContain("min-w-0");
  });
});
