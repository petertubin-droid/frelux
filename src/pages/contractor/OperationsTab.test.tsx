// ============================================================
// OperationsTab tests — Phase 4 cross-engine summary.
// The persistence layer (Supabase) and the calendar resolver
// are mocked; all labels and statuses rendered by the tab come
// from the tested credential-status / procurement state-machine
// modules. Honesty rules are asserted: no green "complete" state
// exists for missing data, and document-reviewed credentials are
// never displayed as registry-verified.
// ============================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { OperationsTab } from "./OperationsTab";
import type { DbContractorProject, DbProjectQuotation } from "@/types/database";
import type { DbProjectTimeline } from "@/types/database";

const mockCredThen = vi.fn();
const mockProcThen = vi.fn();
const mockCalendar = vi.fn();
const navigateTab = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, _val: string) => ({
          order: () => ({
            then: (cb: (r: { data: unknown; error: unknown }) => void) =>
              mockProcThen(cb),
          }),
          then: (cb: (r: { data: unknown; error: unknown }) => void) => {
            if (table === "pro_credentials") return mockCredThen(cb);
            return mockProcThen(cb);
          },
        }),
      }),
    }),
  },
  isSupabaseConfigured: true,
}));

const MOCK_USER = { id: "u1" };

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: MOCK_USER }),
}));

vi.mock("@/lib/calendars/work-calendar", () => ({
  resolveWorkCalendar: (...a: unknown[]) => mockCalendar(...a),
}));

function setCredentials(data: unknown[] | null, error = false) {
  mockCredThen.mockImplementation(
    (cb: (r: { data: unknown; error: unknown }) => void) => {
      cb({ data: error ? null : data, error: error ? "db down" : null });
      return Promise.resolve();
    },
  );
}

function setProcurement(data: unknown[] | null, error = false) {
  mockProcThen.mockImplementation(
    (cb: (r: { data: unknown; error: unknown }) => void) => {
      // Mirror the component's updated_at descending ordering.
      const rows = (data ?? []) as { updated_at: string }[];
      const sorted = rows
        .slice()
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      cb({ data: error ? null : sorted, error: error ? "db down" : null });
      return Promise.resolve();
    },
  );
}

const baseProject = {
  id: "p1",
  user_id: "u1",
  name: "Ops project",
  currency: "NGN",
  location: null,
} as unknown as DbContractorProject;

const noQuotations: DbProjectQuotation[] = [];

function quotation(overrides: Partial<DbProjectQuotation>): DbProjectQuotation {
  return {
    id: "q1",
    project_id: "p1",
    quotation_number: "Q-001",
    version: 1,
    tax_source: null,
    tax_percentage: null,
    tax_rule_code: null,
    tax_citation_title: null,
    tax_citation_publisher: null,
    tax_validation_state: null,
    ...overrides,
  } as unknown as DbProjectQuotation;
}

const timeline: DbProjectTimeline[] = [
  { id: "t1", end_day: 5, is_completed: true },
  { id: "t2", end_day: 12, is_completed: true },
  { id: "t3", end_day: 20, is_completed: false },
].map((t) => t as unknown as DbProjectTimeline);

function renderTab(props: Partial<Parameters<typeof OperationsTab>[0]> = {}) {
  return render(
    <MemoryRouter>
      <OperationsTab
        project={baseProject}
        quotations={noQuotations}
        timeline={[]}
        onNavigateTab={navigateTab}
        {...props}
      />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  navigateTab.mockReset();
  setCredentials([]);
  setProcurement([]);
  mockCalendar.mockResolvedValue({
    status: "missing",
    calendar: null,
    note: "No verified calendar for this site.",
  });
});

describe("Tax status section", () => {
  it("shows an honest empty state with an action when no quotation exists", async () => {
    renderTab();
    await waitFor(() =>
      expect(screen.getByText("No quotation on record")).toBeTruthy(),
    );
    fireEvent.click(screen.getByText("Create a quotation"));
    expect(navigateTab).toHaveBeenCalledWith("quotation");
  });

  it("labels tax_not_determined as tax that was not applied", async () => {
    renderTab({
      quotations: [quotation({ tax_source: "not_determined" })],
    });
    await waitFor(() =>
      expect(
        screen.getByText("Tax not determined on the latest quotation"),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/no tax was applied/i)).toBeTruthy();
  });

  it("shows verified rule provenance with citation and validation state", async () => {
    renderTab({
      quotations: [
        quotation({
          tax_source: "verified_rule",
          tax_rule_code: "NG-VAT",
          tax_percentage: 7.5,
          tax_citation_title: "Nigerian VAT Act",
          tax_citation_publisher: "Federal Inland Revenue Service",
          tax_validation_state: "validated",
        }),
      ],
    });
    await waitFor(() =>
      expect(screen.getByText(/Applied verified rule NG-VAT/)).toBeTruthy(),
    );
    expect(screen.getByText(/Nigerian VAT Act/)).toBeTruthy();
    expect(
      screen.getByText(/validated by an accountable reviewer/i),
    ).toBeTruthy();
  });

  it("labels manual assumptions as weaker than a validated rule", async () => {
    renderTab({
      quotations: [
        quotation({
          tax_source: "manual_assumption",
          tax_percentage: 5,
          tax_citation_title: "Client instruction",
        }),
      ],
    });
    await waitFor(() =>
      expect(screen.getByText(/manual tax assumption \(5%\)/)).toBeTruthy(),
    );
    expect(
      screen.getByText(/manual assumption is not a validated rule/i),
    ).toBeTruthy();
  });

  it("uses the latest quotation version", async () => {
    renderTab({
      quotations: [
        quotation({ version: 1, tax_source: "not_determined" }),
        quotation({
          version: 2,
          tax_source: "verified_rule",
          tax_rule_code: "V2",
        }),
      ],
    });
    await waitFor(() =>
      expect(screen.getByText(/Applied verified rule V2/)).toBeTruthy(),
    );
    expect(
      screen.queryByText("Tax not determined on the latest quotation"),
    ).toBeNull();
  });
});

describe("Workforce credentials section", () => {
  it("shows an honest empty state when none are on file", async () => {
    renderTab();
    await waitFor(() =>
      expect(screen.getByText("No credentials on file")).toBeTruthy(),
    );
  });

  it("separates registry verified from document reviewed counts", async () => {
    setCredentials([
      { id: "c1", verification_status: "verified_by_source", expires_at: null },
      { id: "c2", verification_status: "verified", expires_at: null },
    ]);
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByText(/1 registry verified, 1 document reviewed/),
      ).toBeTruthy(),
    );
  });

  it("shows pending review and expiring soon states", async () => {
    const soon = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    setCredentials([
      { id: "c1", verification_status: "pending_review", expires_at: null },
      { id: "c2", verification_status: "verified_by_source", expires_at: soon },
    ]);
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByText(/1 credential is\s*awaiting review/),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/1 expires\s*within 30 days/)).toBeTruthy();
  });
});

describe("Procurement section", () => {
  it("shows the linked-records empty state", async () => {
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByText("No procurement records linked to this project"),
      ).toBeTruthy(),
    );
  });

  it("groups statuses from the state machine and flags attention", async () => {
    setProcurement([
      {
        id: "r1",
        title: "Cement",
        supplier: "A",
        status: "quoted",
        updated_at: "2026-10-01",
      },
      {
        id: "r2",
        title: "Rebar",
        supplier: "B",
        status: "approved",
        updated_at: "2026-10-02",
      },
      {
        id: "r3",
        title: "Tiles",
        supplier: "C",
        status: "in_transit",
        updated_at: "2026-10-03",
      },
      {
        id: "r4",
        title: "Paint",
        supplier: "D",
        status: "exception",
        updated_at: "2026-10-09",
      },
      {
        id: "r5",
        title: "Roofing",
        supplier: "E",
        status: "delivered",
        updated_at: "2026-10-05",
      },
    ]);
    renderTab();
    await waitFor(() =>
      expect(screen.getByText("Needs attention")).toBeTruthy(),
    );
    expect(screen.getByText(/1 record needs\s*attention/)).toBeTruthy();
    expect(screen.getByText("Exception")).toBeTruthy();
    expect(screen.getByText(/only through the auditable trail/i)).toBeTruthy();
  });
});

describe("Schedule section", () => {
  it("reports the missing site country instead of inventing a schedule", async () => {
    renderTab();
    await waitFor(() =>
      expect(
        screen.getByText("Calendar-verified scheduling unavailable"),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/site country is not recorded/i)).toBeTruthy();
  });

  it("reports phase progress when a verified calendar covers the site", async () => {
    mockCalendar.mockResolvedValue({
      status: "available",
      calendar: { country_code: "NG" },
      note: "",
    });
    renderTab({
      project: {
        ...baseProject,
        location: { country_code: "NG" },
      } as unknown as DbContractorProject,
      timeline,
    });
    await waitFor(() =>
      expect(
        screen.getByText("Verified work calendar covers the site country"),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/2 of 3\s*phases complete/)).toBeTruthy();
    expect(screen.getByText(/planning estimate/i)).toBeTruthy();
  });

  it("keeps fail-closed wording when no verified calendar exists for the country", async () => {
    mockCalendar.mockResolvedValue({
      status: "stale",
      calendar: null,
      note: "The saved calendar has not been refreshed recently.",
    });
    renderTab({
      project: {
        ...baseProject,
        location: { country_code: "KE" },
      } as unknown as DbContractorProject,
    });
    await waitFor(() =>
      expect(
        screen.getByText("No verified work calendar for the site country"),
      ).toBeTruthy(),
    );
    expect(screen.getByText(/not been refreshed recently/i)).toBeTruthy();
  });
});
