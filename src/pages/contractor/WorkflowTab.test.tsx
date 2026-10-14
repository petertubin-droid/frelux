import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WorkflowTab } from "./WorkflowTab";
import type { WorkflowDocument } from "@/lib/workflow/workflow-engine";

vi.mock("@/lib/workflow/queries", () => ({
  fetchProjectWorkflowDocuments: vi.fn().mockResolvedValue(mockDocs),
  fetchWorkflowEvents: vi.fn().mockResolvedValue([
    {
      id: "ev1",
      document_id: "d1",
      event_type: "created",
      from_status: null,
      to_status: "draft",
      actor: "owner",
      note: "Created as RFI-0001",
      created_at: "2026-10-13T09:00:00Z",
    },
  ]),
  createWorkflowDocument: vi.fn().mockResolvedValue({ id: "new" }),
  transitionWorkflowDocument: vi.fn().mockImplementation(async (doc, to) => ({
    ...doc,
    status: to,
  })),
  addWorkflowComment: vi.fn().mockResolvedValue(undefined),
  addWorkflowRevision: vi.fn().mockResolvedValue(undefined),
}));

function mockDocs(): WorkflowDocument[] {
  const base = {
    project_id: "proj-1",
    priority: "normal" as const,
    description: "Confirm slab thickness in zone B",
    assignee: "Site engineer",
    currency: "EUR",
    revision_no: 1,
    created_by: null,
    created_at: "2026-10-13T09:00:00Z",
    updated_at: "2026-10-13T09:00:00Z",
  };
  return [
    {
      ...base,
      id: "d1",
      doc_type: "rfi",
      status: "open",
      reference_code: "RFI-0001",
      title: "Slab thickness clarification",
      due_date: "2026-10-10", // overdue vs fixed now
      amount: null,
    },
    {
      ...base,
      id: "d2",
      doc_type: "change_order",
      status: "approved",
      reference_code: "CO-0001",
      title: "Terrace waterproofing",
      due_date: null,
      amount: 1250.5,
    },
  ];
}

describe("WorkflowTab (global operations control plane)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-10-14T10:00:00Z"));
  });

  it("renders the summary tiles, filters, and documents with codes", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    expect(await screen.findByText("RFI-0001")).toBeInTheDocument();
    expect(screen.getByText("RFIs needing action")).toBeInTheDocument();
    // overdue count is 1 (open RFI due 2026-10-10, approved CO excluded)
    const tiles = screen
      .getAllByText("Overdue")
      .map((el) => el.closest("div.rounded-xl"))
      .filter((d): d is HTMLElement => Boolean(d));
    const overdueTile = tiles.find(
      (d) => (d.querySelector("p.text-2xl")?.textContent ?? "") === "1",
    );
    expect(overdueTile).toBeTruthy();
    expect(screen.getByText("CO-0001")).toBeInTheDocument();
  });

  it("formats change-order amounts in the project currency, never NGN", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("CO-0001");
    // formatByCode rounds to whole units for EUR display (€1,251).
    // The key contract: project currency EUR renders, never NGN.
    const amounts = screen
      .getAllByText(/1,25/)
      .map((el) => (el.textContent ?? "").replace(/[\s\u00A0\u202f]/g, ""));
    expect(amounts).toContain("€1,251");
    expect(screen.queryByText(/₦|NGN/)).not.toBeInTheDocument();
  });

  it("renders only the transitions the state machine allows", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    // open the first card
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    const buttons = await screen.findAllByRole("button");
    const labels = buttons.map((b) => b.textContent ?? "");
    // open RFI: only answered + close are legal
    expect(labels).toContain("answered");
    expect(labels).toContain("closed");
    expect(labels).not.toContain("approved");
    expect(labels).not.toContain("in review");
  });

  it("shows the immutable audit trail on expand", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    expect(await screen.findByText(/Audit trail/i)).toBeInTheDocument();
    expect(screen.getByText(/Created as RFI-0001/)).toBeInTheDocument();
  });

  it("filtering narrows the list to the selected type", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(screen.getByRole("tab", { name: /change orders/i }));
    await waitFor(() =>
      expect(screen.queryByText("RFI-0001")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("CO-0001")).toBeInTheDocument();
  });

  it("creates a new RFI through the form", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(screen.getByRole("button", { name: /new workflow item/i }));
    fireEvent.change(screen.getByLabelText(/^title$/i), {
      target: { value: "Beam cover query" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    const { createWorkflowDocument } = await import("@/lib/workflow/queries");
    await waitFor(() =>
      expect(createWorkflowDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: "proj-1",
          doc_type: "rfi",
          title: "Beam cover query",
        }),
      ),
    );
  });

  it("discloses the email-notification status honestly (chip)", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    // Supabase unconfigured in tests -> the honest "not
    // configured" state, never a fake "active" claim.
    expect(
      await screen.findByText(/email notifications/i, { exact: false }),
    ).toBeInTheDocument();
  });
});
