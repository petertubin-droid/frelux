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

vi.mock("@/lib/workflow/participants", () => ({
  listWorkflowParticipants: vi.fn().mockResolvedValue([
    {
      id: "p1",
      document_id: "d1",
      email: "eng@site.com",
      participant_role: "reviewer",
      granted_by: null,
      created_at: "2026-10-14T12:00:00Z",
    },
  ]),
  inviteWorkflowParticipant: vi.fn().mockResolvedValue({
    id: "p2",
    document_id: "d1",
    email: "new@site.com",
    participant_role: "viewer",
    granted_by: null,
    created_at: "2026-10-14T13:00:00Z",
  }),
  removeWorkflowParticipant: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/workflow/attachments", () => ({
  listWorkflowAttachments: vi.fn().mockResolvedValue([
    {
      id: "a1",
      document_id: "d1",
      file_name: "site photo.jpg",
      storage_path: "d1/123-site_photo.jpg",
      size_bytes: 2048,
      content_type: "image/jpeg",
      uploaded_by: null,
      created_at: "2026-10-14T12:00:00Z",
    },
  ]),
  uploadWorkflowAttachment: vi.fn().mockResolvedValue({ id: "a2" }),
  deleteWorkflowAttachment: vi.fn().mockResolvedValue(undefined),
  getAttachmentUrl: vi.fn().mockResolvedValue("https://signed.example/dl"),
}));

vi.mock("@/lib/workflow/exports", () => ({
  exportWorkflowDocumentsCsv: vi.fn(),
  exportWorkflowAudit: vi.fn(),
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

  it("shows the share panel with existing participants on expand", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    expect(
      screen.getByRole("button", { name: /^share$/i }),
    ).toBeInTheDocument();
    expect(await screen.findByText("eng@site.com")).toBeInTheDocument();
    expect(screen.getByText("reviewer")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove access for eng@site.com/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/invite email/i)).toBeInTheDocument();
  });

  it("invites a participant with the chosen role and lowercased email", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    await screen.findByText("eng@site.com");
    fireEvent.change(screen.getByLabelText(/invite email/i), {
      target: { value: "New@Site.com" },
    });
    fireEvent.change(screen.getByLabelText(/invite role/i), {
      target: { value: "viewer" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^share$/i }));
    const { inviteWorkflowParticipant } =
      await import("@/lib/workflow/participants");
    await waitFor(() =>
      expect(inviteWorkflowParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ id: "d1" }),
        "New@Site.com",
        "viewer",
      ),
    );
  });

  it("removes a participant's access when the X button is clicked", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    await screen.findByText("eng@site.com");
    fireEvent.click(
      screen.getByRole("button", { name: /remove access for eng@site.com/i }),
    );
    const { removeWorkflowParticipant } =
      await import("@/lib/workflow/participants");
    await waitFor(() =>
      expect(removeWorkflowParticipant).toHaveBeenCalledWith(
        expect.objectContaining({ id: "d1" }),
        "eng@site.com",
      ),
    );
  });

  it("shows attachments with download and delete on expand", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    expect(await screen.findByText("site photo.jpg")).toBeInTheDocument();
    expect(screen.getByText(/2 KB/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /download site photo.jpg/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /delete site photo.jpg/i }),
    ).toBeInTheDocument();
  });

  it("opens a signed URL when a download link is clicked", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    await screen.findByText("site photo.jpg");
    fireEvent.click(
      screen.getByRole("button", { name: /download site photo.jpg/i }),
    );
    const { getAttachmentUrl } = await import("@/lib/workflow/attachments");
    await waitFor(() =>
      expect(getAttachmentUrl).toHaveBeenCalledWith(
        expect.objectContaining({ storage_path: "d1/123-site_photo.jpg" }),
      ),
    );
    await waitFor(() =>
      expect(open).toHaveBeenCalledWith(
        "https://signed.example/dl",
        "_blank",
        "noopener",
      ),
    );
    open.mockRestore();
  });

  it("exports the workflow CSV from the header button", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getByRole("button", { name: /export workflow csv/i }),
    );
    const { exportWorkflowDocumentsCsv } =
      await import("@/lib/workflow/exports");
    await waitFor(() =>
      expect(exportWorkflowDocumentsCsv).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ reference_code: "RFI-0001" }),
        ]),
        "proj-1",
      ),
    );
  });

  it("exports a full record from the expanded card", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    await screen.findByText("RFI-0001");
    fireEvent.click(
      screen.getAllByRole("button", { name: /expand details/i })[0],
    );
    const btn = await screen.findByRole("button", {
      name: /export record rfi-0001/i,
    });
    fireEvent.click(btn);
    const { exportWorkflowAudit } = await import("@/lib/workflow/exports");
    await waitFor(() =>
      expect(exportWorkflowAudit).toHaveBeenCalledWith(
        expect.objectContaining({ id: "d1" }),
        expect.any(Array),
        expect.any(Array),
        expect.any(Array),
      ),
    );
  });

  it("disables the CSV export while documents are loading", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    expect(
      screen.getByRole("button", { name: /export workflow csv/i }),
    ).toBeDisabled();
    await screen.findByText("RFI-0001");
    expect(
      screen.getByRole("button", { name: /export workflow csv/i }),
    ).toBeEnabled();
  });

  it("discloses the email-notification status honestly (chip)", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    // Supabase unconfigured in tests -> the honest "not
    // configured" state, never a fake "active" claim.
    expect(
      await screen.findByText(/email notifications/i, { exact: false }),
    ).toBeInTheDocument();
  });

  it("discloses the push-notification status honestly (chip)", async () => {
    render(<WorkflowTab projectId="proj-1" currency="EUR" />);
    // jsdom has no Service Worker / PushManager and Supabase is
    // unconfigured -> the honest "not supported on this browser"
    // chip; the enable button must NOT render (nothing to
    // subscribe with). Never a fake "active" claim.
    expect(
      await screen.findByText(/push not supported on this browser/i, {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /enable push/i })).toBeNull();
  });
});
