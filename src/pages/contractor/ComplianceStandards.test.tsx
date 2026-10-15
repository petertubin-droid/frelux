import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import ComplianceStandards from "./ComplianceStandards";
import type { ComplianceChecklist } from "@/lib/regulatory/compliance-checklist";

const gen = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("@/lib/regulatory/compliance-checklist", () => ({
  generateComplianceChecklist: (...a: unknown[]) => gen.generate(...a),
}));

const mkChecklist = (
  over: Partial<ComplianceChecklist> = {},
): ComplianceChecklist => ({
  marketCode: "GB",
  requestedEngines: ["plumbing", "electrical"],
  items: [
    {
      key: "GB-plumbing-bs-en-1401",
      marketCode: "GB",
      domain: "plumbing",
      ref: "bs-en-1401",
      title: "UPVC drainage pipe standard",
      authority: "BSI",
      evidenceType: "national_standard",
      coverageSpec: "BS EN 1401-1",
      appliesToEngines: ["plumbing"],
      confidence: "high",
      evidenceUrl: "https://example.com",
      verifiedDate: "2026-10-11",
      citation:
        "bs-en-1401 — UPVC drainage pipe standard (BSI, verified 2026-10-11)",
      notes: null,
      status: "applicable",
      review: { status: "none", reviewerName: null, reviewedAt: null },
    },
    {
      key: "GB-plumbing-za-screed",
      marketCode: "GB",
      domain: "plumbing",
      ref: "gb-putty",
      title: "Wall putty planning default",
      authority: "FRELUX planning default",
      evidenceType: "planning_default",
      coverageSpec: "~18 m² per 25 kg bag",
      appliesToEngines: ["plumbing"],
      confidence: "low",
      evidenceUrl: null,
      verifiedDate: "2026-10-11",
      citation:
        "gb-putty — Wall putty planning default (FRELUX planning default, verified 2026-10-11)",
      notes: null,
      status: "pending_verification",
      review: {
        status: "approved",
        reviewerName: "Eng. A. Bello",
        reviewedAt: "2026-10-15T10:00:00Z",
      },
    },
  ],
  unknowns: ["electrical"],
  noStandardsOnFile: false,
  disclaimer:
    "This checklist cites applicable standards only. It does not certify compliance.",
  ...over,
});

describe("ComplianceStandards page", () => {
  beforeEach(() => {
    gen.generate.mockReset();
  });

  it("renders cited standards with exact citations", async () => {
    gen.generate.mockResolvedValue(mkChecklist());
    render(<ComplianceStandards />);
    expect(
      (await screen.findAllByText(/UPVC drainage pipe standard/)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(/bs-en-1401 — UPVC drainage pipe standard/),
    ).toBeInTheDocument();
    expect(screen.getByText(/evidence/)).toHaveAttribute(
      "href",
      "https://example.com",
    );
  });

  it("shows low-confidence items as pending verification", async () => {
    gen.generate.mockResolvedValue(mkChecklist());
    render(<ComplianceStandards />);
    expect(await screen.findAllByText("pending verification")).toHaveLength(1);
    expect(screen.getByText("verified")).toBeInTheDocument();
  });

  it("shows the expert-review gate status per item", async () => {
    gen.generate.mockResolvedValue(mkChecklist());
    render(<ComplianceStandards />);
    expect(
      await screen.findByText("expert-reviewed by Eng. A. Bello"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("not yet submitted for expert review"),
    ).toBeInTheDocument();
  });

  it("discloses unknown scopes instead of inventing standards", async () => {
    gen.generate.mockResolvedValue(mkChecklist());
    render(<ComplianceStandards />);
    expect(await screen.findByText(/Disclosed unknowns/)).toBeInTheDocument();
    expect(screen.getAllByText(/electrical/).length).toBeGreaterThan(0);
  });

  it("renders the never-certify disclaimer", async () => {
    gen.generate.mockResolvedValue(mkChecklist());
    render(<ComplianceStandards />);
    expect(
      await screen.findByText(/does not certify compliance/),
    ).toBeInTheDocument();
  });

  it("renders the honest no-standards disclosure for empty markets", async () => {
    gen.generate.mockResolvedValue(
      mkChecklist({
        marketCode: "ZZ",
        items: [],
        noStandardsOnFile: true,
        unknowns: ["plumbing", "electrical"],
      }),
    );
    render(<ComplianceStandards />);
    expect(
      await screen.findByText(/No standard is on file in the registry for ZZ/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing is invented/),
    ).toBeInTheDocument();
  });

  it("renders an honest refusal when the registry cannot be reached", async () => {
    gen.generate.mockRejectedValue(new Error("down"));
    render(<ComplianceStandards />);
    await waitFor(() =>
      expect(
        screen.getByText(/registry could not be reached/),
      ).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("cl-item")).toBeNull();
  });
});
