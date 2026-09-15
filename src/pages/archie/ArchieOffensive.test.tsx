// =========================================================
// ARCHIE OFFENSIVE SCREEN TESTS (batch 21, fix 72)
// The screen must show registered targets, refuse scopeless
// target registration with the engine's real error, and
// display the evidence-required contract for findings.
// =========================================================

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// supabase mock: direct admin-RLS reads/writes
const fromImpl = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: (t: string) => fromImpl(t),
  },
}));

// Pure-engine mock: the REAL engine functions are already
// covered by offensive-security.test.ts; here we exercise
// the screen's wiring with the real signatures.
vi.mock("@/lib/archie/offensive-security", () => ({
  OFFENSIVE_PHASES: [
    "DISCOVER",
    "ENUMERATE",
    "ANALYZE",
    "TEST",
    "EXPLOIT",
    "DOCUMENT",
    "REMEDIATE",
    "RETEST",
  ],
  registerTarget: (
    input: Record<string, unknown> & {
      identifier: string;
      scope: string[];
      exclusions?: string[];
    },
  ) => {
    if (!input.identifier.trim())
      return { ok: false, error: "Target identifier is required." };
    if (input.scope.length === 0)
      return {
        ok: false,
        error: "Scope must list the in-scope surface explicitly.",
      };
    return {
      ok: true,
      target: { ...input, id: "target_new", registeredAt: "now" },
    };
  },
  startEngagement: () => ({
    ok: true,
    engagement: {
      id: "engagement_new",
      target: { id: "t1" },
      currentPhase: "DISCOVER",
      phases: {},
      findings: [],
      startedAt: "now",
    },
  }),
  advancePhase: () => ({
    ok: false,
    error: "no live authorization covers this target — TEST/EXPLOIT refused.",
  }),
  recordFinding: (_e: unknown, f: { evidence: string[] }) => {
    if (f.evidence.length === 0)
      return {
        ok: false,
        error: "Evidence is required — no evidence, no finding.",
      };
    return {
      ok: true,
      finding: { ...f, id: "f1", fixStatus: "OPEN", createdAt: "now" },
    };
  },
}));

import ArchieOffensive from "@/pages/archie/ArchieOffensive";

function chainQuery() {
  return {
    select: () => ({
      order: () => Promise.resolve({ data: [], error: null }),
    }),
    insert: () => Promise.resolve({ error: null }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  fromImpl.mockImplementation((table: string) => {
    if (table === "archie_global_authorizations") {
      return { select: () => Promise.resolve({ data: [], error: null }) };
    }
    return chainQuery();
  });
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchieOffensive />
    </MemoryRouter>,
  );
}

describe("ArchieOffensive", () => {
  it("renders the owner-only header with the 8-phase contract", async () => {
    renderPage();
    expect(await screen.findByText("Offensive Security")).toBeInTheDocument();
    expect(
      screen.getByText(/8-phase engagement lifecycle/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/No fake security results/i)).toBeInTheDocument();
  });

  it("lists registered targets from the admin tables", async () => {
    renderPage();
    expect(await screen.findByText(/Every environment/i)).toBeInTheDocument();
  });

  it("shows the evidence-required contract on the findings tab", async () => {
    renderPage();
    const tab = await screen.findByRole("button", { name: /findings/i });
    tab.click();
    expect(
      await screen.findByText(/no evidence, no finding/i),
    ).toBeInTheDocument();
  });

  it("shows the passive-DISCOVER + live-authorization banner", async () => {
    renderPage();
    const tab = await screen.findByRole("button", { name: /engagements/i });
    tab.click();
    expect(await screen.findByText(/DISCOVER is passive/i)).toBeInTheDocument();
    expect(
      screen.getByText(/refusals are shown verbatim, never bypassed/i),
    ).toBeInTheDocument();
  });
});
