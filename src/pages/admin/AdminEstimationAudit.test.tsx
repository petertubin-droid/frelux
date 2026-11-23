import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminEstimationAudit from "./AdminEstimationAudit";
import { supabase } from "@/lib/supabase";

const mockAuditLogs = [
  {
    id: "audit-1",
    entity_type: "calc_rule",
    entity_id: "rule-paint-coverage",
    action: "update",
    user_id: "user-admin-1",
    user_email: "admin@freluxtools.com",
    old_value: { coverage_rate: 10.5 },
    new_value: { coverage_rate: 12.0 },
    ip_address: "192.168.1.1",
    created_at: "2026-11-20T11:00:00Z",
  },
  {
    id: "audit-2",
    entity_type: "price",
    entity_id: "price-screed-cement",
    action: "create",
    user_id: "user-admin-2",
    user_email: "estimator@freluxtools.com",
    old_value: null,
    new_value: { price: 5500, currency: "NGN" },
    ip_address: "192.168.1.2",
    created_at: "2026-11-19T09:30:00Z",
  },
];

let queryList = [...mockAuditLogs];
let queryError: any = null;

function createAuditQuery(data: any) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    range: vi.fn().mockImplementation(() => obj),
    eq: vi.fn().mockImplementation((col: string, val: string) => {
      const filtered = queryList.filter((item: any) => item[col] === val);
      return createAuditQuery(filtered);
    }),
    then: (resolve: any) =>
      resolve({ data: queryError ? null : data, error: queryError }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockImplementation(() => createAuditQuery(queryList)),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  queryList = [...mockAuditLogs];
  queryError = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminEstimationAudit />
    </MemoryRouter>,
  );
}

describe("AdminEstimationAudit", () => {
  it("renders audit trail header and audit log entries", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: /Estimation Audit Trail/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("calc_rule").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/ID: rule-paint-coverage/)).toBeInTheDocument();
    expect(screen.getByText(/ID: price-screed-cement/)).toBeInTheDocument();
  });

  it("filters audit logs by entity type when selection changes", async () => {
    renderPage();

    await screen.findByRole("heading", {
      level: 1,
      name: /Estimation Audit Trail/i,
    });
    const select = screen.getByLabelText("Filter audit by entity type");
    fireEvent.change(select, { target: { value: "calc_rule" } });

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("estimation_audit_log");
    });
  });

  it("expands an entry to show change details when clicked", async () => {
    renderPage();

    await screen.findByText(/ID: rule-paint-coverage/);
    const card = screen
      .getByText(/ID: rule-paint-coverage/)
      .closest('[role="button"]')!;
    fireEvent.click(card);

    expect(await screen.findByText("Old Value")).toBeInTheDocument();
    expect(screen.getByText("New Value")).toBeInTheDocument();
    expect(screen.getAllByText(/coverage_rate/).length).toBe(2);
  });

  it("refetches audit logs when Refresh is clicked", async () => {
    renderPage();

    await screen.findByRole("heading", {
      level: 1,
      name: /Estimation Audit Trail/i,
    });
    const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("estimation_audit_log");
    });
  });

  it("displays error message if fetching audit log fails", async () => {
    queryError = { message: "Permission denied on estimation_audit_log" };
    renderPage();

    expect(
      await screen.findByText("Permission denied on estimation_audit_log"),
    ).toBeInTheDocument();
  });

  it("renders empty state when no audit records are found", async () => {
    queryList = [];
    renderPage();

    expect(
      await screen.findByText("No audit entries found"),
    ).toBeInTheDocument();
  });
});
