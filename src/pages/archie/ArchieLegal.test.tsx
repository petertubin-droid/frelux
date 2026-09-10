import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// =========================================================
// ARCHIE LEGAL (PWA) — the public legal hub: document list,
// full document view, governance rules. Every assertion
// runs against the real page wired to the (mocked) legal
// client — which in production calls the archie-legal edge
// function with server-side owner checks.
// =========================================================

const fetchLegalDocs = vi.fn();
const fetchLegalDoc = vi.fn();
const fetchGovernance = vi.fn();

vi.mock("@/lib/archie/legal-client", () => ({
  fetchLegalDocs: (...a: unknown[]) => fetchLegalDocs(...a),
  fetchLegalDoc: (...a: unknown[]) => fetchLegalDoc(...a),
  fetchGovernance: (...a: unknown[]) => fetchGovernance(...a),
}));

import ArchieLegal from "./ArchieLegal";

const DOCS = [
  {
    doc_key: "terms_of_service",
    title: "Terms of Service",
    version: 2,
    effective_date: "2026-09-13",
    published_at: "2026-09-13T10:00:00Z",
  },
  {
    doc_key: "privacy_policy",
    title: "Privacy Policy",
    version: 1,
    effective_date: "2026-09-13",
    published_at: "2026-09-13T10:00:00Z",
  },
];

const RULES = [
  {
    rule_key: "no_deceptive_privacy_claims",
    category: "prohibited" as const,
    statement: "Never claim a privacy control exists that is not real.",
  },
  {
    rule_key: "owner_is_final_authority",
    category: "authority" as const,
    statement: "The Owner is the final authority over ARCHIE.",
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchieLegal />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchLegalDocs.mockResolvedValue({
    ok: true,
    data: {
      documents: DOCS,
      disclosure:
        "ARCHIE is an AI. Its statements are not professional advice.",
      copyright: "© 2026 FRENZY. All rights reserved.",
    },
  });
  fetchGovernance.mockResolvedValue({ ok: true, data: { rules: RULES } });
  fetchLegalDoc.mockResolvedValue({
    ok: true,
    data: {
      document: {
        id: "doc-1",
        doc_key: "terms_of_service",
        title: "Terms of Service",
        version: 2,
        effective_date: "2026-09-13",
        published_at: "2026-09-13T10:00:00Z",
        body: "# Terms\n\nReal terms body.",
      },
      copyright: "© 2026 FRENZY. All rights reserved.",
    },
  });
});

describe("ArchieLegal", () => {
  it("renders the published document list with versions", async () => {
    renderPage();
    expect(await screen.findByText("Terms of Service")).toBeTruthy();
    expect(screen.getByText("Privacy Policy")).toBeTruthy();
    expect(screen.getByText(/2026 FRENZY/)).toBeTruthy();
  });

  it("shows the AI disclosure text and governance rules", async () => {
    renderPage();
    expect(await screen.findByText(/ARCHIE is an AI/i)).toBeTruthy();
    expect(
      screen.getByText(/Never claim a privacy control exists that is not real/),
    ).toBeTruthy();
    expect(
      screen.getByText(/The Owner is the final authority over ARCHIE/),
    ).toBeTruthy();
  });

  it("opens a full document and returns to the hub", async () => {
    renderPage();
    fireEvent.click(await screen.findByText("Terms of Service"));
    expect(await screen.findByText(/Real terms body/)).toBeTruthy();
    expect(fetchLegalDoc).toHaveBeenCalledWith("terms_of_service");
    fireEvent.click(screen.getByRole("button", { name: /All documents/i }));
    expect(await screen.findByText("Privacy Policy")).toBeTruthy();
  });

  it("surfaces fetch errors honestly", async () => {
    fetchLegalDocs.mockResolvedValue({
      ok: false,
      error: "Legal corpus unavailable",
    });
    renderPage();
    expect(await screen.findByText(/Legal corpus unavailable/i)).toBeTruthy();
    // And it does NOT render fabricated documents alongside the error.
    expect(screen.queryByText("Privacy Policy")).toBeNull();
  });

  it("renders an honest empty state when no documents exist", async () => {
    fetchLegalDocs.mockResolvedValue({
      ok: true,
      data: { documents: [], disclosure: "", copyright: "© 2026 FRENZY." },
    });
    renderPage();
    expect(await screen.findByText(/Governance/)).toBeTruthy();
    expect(screen.queryByText("Terms of Service")).toBeNull();
  });
});
