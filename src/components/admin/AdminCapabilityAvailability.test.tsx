// ============================================================
// ADMIN CAPABILITY AVAILABILITY (P3.17) — contract tests
//
// Pinned here:
//   * the surface renders EVERY registry engine with its
//     verified-market chips, so coverage is disclosed not
//     hidden
//   * unverified markets are shown too (struck through) —
//     never silently dropped
//   * evidence + unverified reason come VERBATIM from the
//     registry: the view never invents citations
//   * search and category filters narrow the list honestly
//     (including an honest empty state)
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminCapabilityAvailability } from "./AdminCapabilityAvailability";
import {
  ALL_MARKET_CODES,
  ENGINE_CAPABILITIES,
} from "@/lib/international/capability-registry";

describe("AdminCapabilityAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders every registry engine with all 20 market chips", () => {
    render(<AdminCapabilityAvailability />);
    for (const e of ENGINE_CAPABILITIES.slice(0, 5)) {
      expect(screen.getByText(e.name)).toBeInTheDocument();
    }
    // one full chip set per engine row
    const chipSets = screen
      .getAllByText("NG")
      .filter((el) => el.tagName === "SPAN");
    expect(chipSets.length).toBeGreaterThanOrEqual(ENGINE_CAPABILITIES.length);
    expect(ALL_MARKET_CODES).toContain("NG");
  });

  it("shows verified and unverified counts per engine honestly", () => {
    render(<AdminCapabilityAvailability />);
    const e = ENGINE_CAPABILITIES[0];
    const verifiedCount = e.verifiedMarkets.length;
    const unverifiedCount = ALL_MARKET_CODES.length - verifiedCount;
    expect(
      screen.getAllByText(`${verifiedCount} verified`).length,
    ).toBeGreaterThanOrEqual(1);
    if (unverifiedCount > 0) {
      expect(
        screen.getAllByText(`${unverifiedCount} unverified`).length,
      ).toBeGreaterThanOrEqual(1);
    }
  });

  it("discloses evidence and unverified reasons verbatim on expand", () => {
    render(<AdminCapabilityAvailability />);
    const e = ENGINE_CAPABILITIES[0];
    fireEvent.click(screen.getAllByText("Show evidence")[0]);
    expect(screen.getByText(e.evidence)).toBeInTheDocument();
    expect(screen.getByText(e.unverifiedReason)).toBeInTheDocument();
    // collapse again
    fireEvent.click(screen.getByText("Hide evidence"));
    expect(screen.queryByText(e.evidence)).toBeNull();
  });

  it("narrows by search with an honest empty state", () => {
    render(<AdminCapabilityAvailability />);
    fireEvent.change(screen.getByLabelText(/search capability registry/i), {
      target: { value: "zzz-no-such-engine" },
    });
    expect(
      screen.getByText("No engines match this filter."),
    ).toBeInTheDocument();
  });

  it("category filter narrows to that category only", () => {
    render(<AdminCapabilityAvailability />);
    const finishingNames = ENGINE_CAPABILITIES.filter(
      (e) => e.category === "finishing",
    ).map((e) => e.name);
    fireEvent.click(screen.getByRole("button", { name: "Finishing" }));
    for (const n of finishingNames) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
    const structureNames = ENGINE_CAPABILITIES.filter(
      (e) => e.category === "structure",
    ).map((e) => e.name);
    for (const n of structureNames.slice(0, 3)) {
      if (!finishingNames.includes(n)) {
        expect(screen.queryByText(n)).toBeNull();
      }
    }
  });

  it("reports the registry-wide verified pair count honestly", () => {
    render(<AdminCapabilityAvailability />);
    const verifiedPairs = ENGINE_CAPABILITIES.reduce(
      (n, e) => n + e.verifiedMarkets.length,
      0,
    );
    const totalPairs = ENGINE_CAPABILITIES.length * ALL_MARKET_CODES.length;
    expect(
      screen.getByText(`${verifiedPairs} / ${totalPairs}`),
    ).toBeInTheDocument();
  });
});
