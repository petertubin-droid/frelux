import { describe, it, expect } from "vitest";
import {
  ADMIN_STATUSES,
  statusTone,
  normalizeStatus,
} from "@/lib/admin-status";

describe("admin-status", () => {
  it("every status has a distinct non-empty tone", () => {
    const tones = ADMIN_STATUSES.map(statusTone);
    for (const t of tones) expect(t.length).toBeGreaterThan(0);
    expect(new Set(tones).size).toBe(ADMIN_STATUSES.length);
  });
  it("statusTone uses semantic colours", () => {
    expect(statusTone("ACTIVE")).toMatch(/emerald/);
    expect(statusTone("ERROR")).toMatch(/red/);
    expect(statusTone("IN DEVELOPMENT")).toMatch(/amber/);
  });
  it("normalizeStatus maps legacy vocabulary to canonical statuses", () => {
    expect(normalizeStatus("live")).toBe("ACTIVE");
    expect(normalizeStatus("ENABLED")).toBe("ACTIVE");
    expect(normalizeStatus("running")).toBe("ACTIVE");
    expect(normalizeStatus("disabled")).toBe("INACTIVE");
    expect(normalizeStatus("off")).toBe("INACTIVE");
    expect(normalizeStatus("some-legacy-word")).toBe("UNVERIFIED");
  });
  it("normalizeStatus trims and uppercases", () => {
    expect(normalizeStatus("  active  ")).toBe("ACTIVE");
  });
});
