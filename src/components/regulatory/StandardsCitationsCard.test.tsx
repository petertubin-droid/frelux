import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StandardsCitationsCard from "./StandardsCitationsCard";
import type { StandardsFlagSet } from "@/lib/regulatory/standards-citations";

const fl = vi.hoisted(() => ({ flag: vi.fn() }));
vi.mock("@/lib/regulatory/standards-citations", () => ({
  flagStandardsForCalculation: (...a: unknown[]) => fl.flag(...a),
}));

const mkFlags = (over: Partial<StandardsFlagSet> = {}): StandardsFlagSet => ({
  marketCode: "ID",
  flaggedEngines: ["structural"],
  unknownEngines: ["electrical"],
  flags: [
    {
      engine: "structural",
      citation:
        "sni-1726-2019 — Earthquake resistance planning standard (BSN, verified 2026-10-15)",
      ref: "sni-1726-2019",
      evidenceUrl: "https://sitaba.pu.go.id/x",
      coverageSpec: "Seismic requirements",
      confidence: "high",
      status: "flagged",
      note: "cites, does not certify",
    },
  ],
  disclaimer: "This flag cites; it does not certify.",
  ...over,
});

describe("StandardsCitationsCard (cite-and-flag)", () => {
  beforeEach(() => {
    fl.flag.mockReset();
  });

  it("renders flags with exact citations and evidence links", async () => {
    fl.flag.mockResolvedValue(mkFlags());
    render(
      <StandardsCitationsCard marketCode="ID" engines={["structural"]} />,
    );
    expect(await screen.findAllByTestId("std-flag")).toHaveLength(1);
    expect(screen.getAllByText(/sni-1726-2019/).length).toBeGreaterThan(0);
    expect(screen.getByText(/evidence/)).toHaveAttribute(
      "href",
      "https://sitaba.pu.go.id/x",
    );
    expect(screen.getByText(/does not certify/)).toBeInTheDocument();
  });

  it("renders nothing when the quote uses no engines", () => {
    const { container } = render(
      <StandardsCitationsCard marketCode="ID" engines={[]} />,
    );
    expect(container.innerHTML).toBe("");
    expect(fl.flag).not.toHaveBeenCalled();
  });

  it("discloses unknown engines, never inventing a flag", async () => {
    fl.flag.mockResolvedValue(mkFlags());
    render(
      <StandardsCitationsCard
        marketCode="ID"
        engines={["structural", "electrical"]}
      />,
    );
    expect(
      await screen.findByText(/No standard on file for: electrical/),
    ).toBeInTheDocument();
  });

  it("renders the all-unknown honest state when nothing is on file", async () => {
    fl.flag.mockResolvedValue(
      mkFlags({ flags: [], flaggedEngines: [], unknownEngines: ["electrical"] }),
    );
    render(
      <StandardsCitationsCard marketCode="ID" engines={["electrical"]} />,
    );
    expect(
      await screen.findByText(/No standard is on file in the registry/),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("std-flag")).toBeNull();
  });

  it("flags pending-verification for non-high confidence", async () => {
    fl.flag.mockResolvedValue(
      mkFlags({
        flags: [{ ...mkFlags().flags[0], confidence: "medium" }],
      }),
    );
    render(
      <StandardsCitationsCard marketCode="ID" engines={["structural"]} />,
    );
    expect(await screen.findByText("pending verification")).toBeInTheDocument();
  });

  it("renders an honest refusal when the registry is unreachable", async () => {
    fl.flag.mockRejectedValue(new Error("down"));
    render(
      <StandardsCitationsCard marketCode="ID" engines={["structural"]} />,
    );
    await waitFor(() =>
      expect(
        screen.getByText(/could not be reached right now/),
      ).toBeInTheDocument(),
    );
  });
});
