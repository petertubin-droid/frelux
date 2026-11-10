/**
 * Doors & Windows engine tests (Tier 2, Engine 7)
 *
 * Pins the honesty contract:
 *  - counts never assumed; all-zero schedule reported missing
 *  - frames/hinges/locksets labelled as derived assumptions
 *  - missing hinge rule → reported, never guessed
 *  - PRICE NOT CONFIGURED; totals null; labour separate
 *  - deterministic
 */

import { describe, it, expect } from "vitest";
import {
  DEFAULT_DOORS_WINDOWS_RULES,
  parseDoorsWindowsRules,
  calculateDoorsWindows,
  type DoorsWindowsInput,
  type DoorsWindowsRules,
} from "../doors-windows-engine";

const rules: DoorsWindowsRules = { hinges_per_door: 3 };

function makeInput(
  overrides: Partial<DoorsWindowsInput> = {},
): DoorsWindowsInput {
  return {
    flush_doors: 4,
    panel_doors: 2,
    security_doors: 1,
    aluminium_windows: 5,
    louvre_windows: 3,
    include_locksets: true,
    labour: { mode: "none" },
    ...overrides,
  };
}

const FULL_PRICES = {
  "door-flush": 22000,
  "door-panel": 45000,
  "door-security": 95000,
  "door-frame": 8500,
  "door-hinge": 1500,
  "door-lockset": 7500,
  "window-aluminium": 65000,
  "window-louver": 28000,
};

// ─────────────────────────────────────────────
// Rules parsing
// ─────────────────────────────────────────────

describe("parseDoorsWindowsRules", () => {
  it("defaults to no hinge rule: nothing silently invented", () => {
    expect(parseDoorsWindowsRules([]).hinges_per_door).toBeNull();
  });

  it("applies the rule; ignores nonsense and inactive rows", () => {
    const a = parseDoorsWindowsRules([
      { rule_key: "hinges_per_door", rule_value: { value: 4 } },
    ]);
    expect(a.hinges_per_door).toBe(4);
    const b = parseDoorsWindowsRules([
      { rule_key: "hinges_per_door", rule_value: { value: 0 } },
    ]);
    expect(b.hinges_per_door).toBeNull();
    const c = parseDoorsWindowsRules([
      { rule_key: "hinges_per_door", rule_value: { value: 99 } },
    ]);
    expect(c.hinges_per_door).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

describe("input validation", () => {
  it("refuses negative and fractional counts with the field named", () => {
    const a = calculateDoorsWindows(
      makeInput({ flush_doors: -1 }),
      rules,
      FULL_PRICES,
    );
    expect(a.ok).toBe(false);
    expect(a.errors[0]).toMatch(/Flush doors/i);
    const b = calculateDoorsWindows(
      makeInput({ aluminium_windows: 2.5 }),
      rules,
      FULL_PRICES,
    );
    expect(b.ok).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Lines
// ─────────────────────────────────────────────

describe("material lines", () => {
  it("door leaves and windows take user counts directly", () => {
    const r = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "flush_doors")?.quantity).toBe(4);
    expect(r.lines.find((l) => l.key === "panel_doors")?.quantity).toBe(2);
    expect(r.lines.find((l) => l.key === "security_doors")?.quantity).toBe(1);
    expect(r.lines.find((l) => l.key === "aluminium_windows")?.quantity).toBe(
      5,
    );
    expect(r.lines.find((l) => l.key === "louvre_windows")?.quantity).toBe(3);
    expect(r.lines.find((l) => l.key === "flush_doors")?.quantity_source).toBe(
      "user_provided",
    );
  });

  it("frames follow door counts, labelled", () => {
    const r = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    const frames = r.lines.find((l) => l.key === "door_frames");
    expect(frames?.quantity).toBe(7);
    expect(frames?.quantity_source).toBe("rule_derived");
    expect(frames?.detail).toMatch(/labelled assumption/);
  });

  it("hinges follow the visible planning rule", () => {
    const r = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    const hinges = r.lines.find((l) => l.key === "hinges");
    expect(hinges?.quantity).toBe(21); // 7 doors × 3
    expect(hinges?.detail).toMatch(/planning allowance/);
  });

  it("locksets: one per door when included, absent when not", () => {
    const withLocks = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    expect(withLocks.lines.find((l) => l.key === "locksets")?.quantity).toBe(7);
    const withoutLocks = calculateDoorsWindows(
      makeInput({ include_locksets: false }),
      rules,
      FULL_PRICES,
    );
    expect(
      withoutLocks.lines.find((l) => l.key === "locksets"),
    ).toBeUndefined();
  });

  it("zero-count types are omitted cleanly", () => {
    const r = calculateDoorsWindows(
      makeInput({ security_doors: 0, louvre_windows: 0 }),
      rules,
      FULL_PRICES,
    );
    expect(r.lines.find((l) => l.key === "security_doors")).toBeUndefined();
    expect(r.lines.find((l) => l.key === "louvre_windows")).toBeUndefined();
    expect(r.incomplete).toBe(false);
  });

  it("an all-zero schedule is reported missing, never invented", () => {
    const r = calculateDoorsWindows(
      makeInput({
        flush_doors: 0,
        panel_doors: 0,
        security_doors: 0,
        aluminium_windows: 0,
        louvre_windows: 0,
      }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(true);
    expect(r.lines).toHaveLength(0);
    expect(r.missing.some((m) => /will not invent openings/.test(m))).toBe(
      true,
    );
    expect(r.incomplete).toBe(true);
    expect(r.grand_total).toBeNull();
  });

  it("no hinge rule → hinges reported missing, never guessed", () => {
    const bare = { ...DEFAULT_DOORS_WINDOWS_RULES };
    const r = calculateDoorsWindows(makeInput(), bare, FULL_PRICES);
    expect(r.lines.find((l) => l.key === "hinges")).toBeUndefined();
    expect(r.missing.some((m) => /Hinges/.test(m))).toBe(true);
    expect(r.incomplete).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Prices, labour, determinism
// ─────────────────────────────────────────────

describe("pricing honesty", () => {
  it("unpriced materials keep quantities but null totals", () => {
    const r = calculateDoorsWindows(makeInput(), rules, {});
    expect(r.lines.every((l) => l.unit_price === null)).toBe(true);
    expect(r.material_subtotal).toBeNull();
    expect(r.priced_subtotal).toBe(0);
    expect(r.lines.find((l) => l.key === "flush_doors")?.quantity).toBe(4);
  });

  it("fully priced → complete with grand total", () => {
    const r = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    expect(r.incomplete).toBe(false);
    expect(r.grand_total).toBe(r.material_subtotal);
  });

  it("always carries the sizes-on-site warning", () => {
    const r = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    expect(
      r.warnings.some((w) => /confirm actual unit sizes on site/.test(w)),
    ).toBe(true);
  });
});

describe("labour", () => {
  it("per-unit labour on doors + windows", () => {
    const r = calculateDoorsWindows(
      makeInput({ labour: { mode: "per_door", per_door_rate: 5000 } }),
      rules,
      FULL_PRICES,
    );
    // 7 doors + 8 windows = 15 × 5000
    expect(r.labour_total).toBe(75000);
  });

  it("missing rate is an error, never guessed", () => {
    const r = calculateDoorsWindows(
      makeInput({ labour: { mode: "per_door", per_door_rate: null } }),
      rules,
      FULL_PRICES,
    );
    expect(r.ok).toBe(false);
    expect(r.grand_total).toBeNull();
  });
});

describe("determinism", () => {
  it("identical inputs produce identical outputs", () => {
    const a = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    const b = calculateDoorsWindows(makeInput(), rules, FULL_PRICES);
    expect(a).toEqual(b);
  });

  // ───────────────────────────────────────────
  // Measured glazing area: a glazed envelope is quoted by area, not by units
  // ───────────────────────────────────────────

  it("prices a measured glazed area per m² and rounds part panes up", () => {
    const res = calculateDoorsWindows(
      makeInput({
        flush_doors: 0,
        panel_doors: 0,
        security_doors: 0,
        aluminium_windows: 0,
        louvre_windows: 0,
        glazed_area_m2: 110,
        pane_area_m2: 4.5,
        glass_thickness_mm: 10,
      }),
      rules,
      { ...FULL_PRICES, "glazing-per-m2": 42000 },
    );
    expect(res.ok).toBe(true);
    const area = res.lines.find((l) => l.key === "glazing_area");
    expect(area?.quantity).toBe(110);
    expect(area?.unit).toBe("m²");
    // 110 / 4.5 = 24.44 panes, and a part pane is bought whole.
    expect(res.steps.some((s) => s.detail.includes("= 25 panes"))).toBe(true);
    // 110 m² x 10 mm x 2.5 kg/m² per mm = 2750 kg.
    expect(res.steps.some((s) => s.detail.includes("2750 kg"))).toBe(true);
    expect(area?.line_total).toBe(110 * 42000);
  });

  it("does not treat an area-only schedule as missing", () => {
    const res = calculateDoorsWindows(
      makeInput({
        flush_doors: 0,
        panel_doors: 0,
        security_doors: 0,
        aluminium_windows: 0,
        louvre_windows: 0,
        glazed_area_m2: 20,
        glass_thickness_mm: 6,
      }),
      rules,
      { "glazing-per-m2": 30000 },
    );
    expect(res.missing.some((m) => m.includes("Door/window schedule"))).toBe(
      false,
    );
    expect(res.material_subtotal).toBe(600000);
    expect(res.grand_total).toBe(600000);
  });

  it("refuses to price an area without a configured rate", () => {
    const res = calculateDoorsWindows(
      makeInput({
        flush_doors: 0,
        panel_doors: 0,
        security_doors: 0,
        aluminium_windows: 0,
        louvre_windows: 0,
        glazed_area_m2: 30,
      }),
      rules,
      {},
    );
    const area = res.lines.find((l) => l.key === "glazing_area");
    expect(area?.quantity).toBe(30);
    expect(area?.unit_price).toBeNull();
    expect(area?.line_total).toBeNull();
    expect(res.material_subtotal).toBeNull();
  });

  it("warns instead of assuming a thickness for the glass mass", () => {
    const res = calculateDoorsWindows(
      makeInput({ glazed_area_m2: 12 }),
      rules,
      { "glazing-per-m2": 30000 },
    );
    expect(res.steps.some((s) => s.label === "Glass mass")).toBe(false);
    expect(
      res.warnings.some((w) => w.includes("thickness not entered")),
    ).toBe(true);
  });

  it("warns when counts and area describe the same openings", () => {
    const res = calculateDoorsWindows(
      makeInput({ glazed_area_m2: 10 }),
      rules,
      { ...FULL_PRICES, "glazing-per-m2": 30000 },
    );
    expect(
      res.warnings.some((w) => w.includes("counted twice")),
    ).toBe(true);
  });

  it("rejects a non-positive pane area rather than dividing by it", () => {
    const res = calculateDoorsWindows(
      makeInput({ glazed_area_m2: 10, pane_area_m2: 0 }),
      rules,
      { ...FULL_PRICES, "glazing-per-m2": 30000 },
    );
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes("Pane area"))).toBe(true);
  });
});
