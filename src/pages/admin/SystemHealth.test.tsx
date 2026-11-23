import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SystemHealth from "@/pages/admin/SystemHealth";
import { useAuth } from "@/lib/auth";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({
    t: (s: string) => s,
  }),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/error-analysis", () => ({
  analyzeErrorWithAI: vi.fn().mockResolvedValue({
    diagnosis: { summary: "Database timeout on large payload", rootCause: "Missing index" },
  }),
  generateErrorFix: vi.fn().mockResolvedValue({
    fix: { title: "Add composite index", description: "Creates index on user_id and last_seen" },
  }),
  approveFix: vi.fn().mockResolvedValue(true),
}));

const mockFrom = vi.fn();
const mockInvoke = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: {} }, error: null }),
    },
    storage: {
      from: vi.fn().mockReturnValue({
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const sampleErrors = [
  {
    id: "err-1",
    created_at: "2026-11-20T10:00:00Z",
    severity: "critical",
    error_type: "DatabaseTimeout",
    message: "Connection pool exhausted on calculation sync",
    stack_trace: "Error: timeout at syncCalculation (/src/calc.ts:42)",
    route: "/paint-calculator",
    feature: "Paint Estimator",
    calculator: "paint",
    http_status: 504,
    service: "edge-function",
    occurrence_count: 5,
    first_seen: "2026-11-20T08:00:00Z",
    last_seen: new Date().toISOString(),
    resolved: false,
    fingerprint: "fp-db-timeout",
  },
  {
    id: "err-2",
    created_at: "2026-11-20T09:00:00Z",
    severity: "medium",
    error_type: "ValidationError",
    message: "Invalid wall height parameter provided",
    stack_trace: null,
    route: "/stucco-calculator",
    feature: "Stucco Estimator",
    calculator: "stucco",
    http_status: 400,
    service: "client",
    occurrence_count: 2,
    first_seen: "2026-11-20T09:00:00Z",
    last_seen: new Date().toISOString(),
    resolved: true,
    fingerprint: "fp-val-err",
  },
];

const sampleAlertConfigs = [
  {
    id: "cfg-1",
    alert_type: "critical_error_spike",
    enabled: true,
    threshold_count: 5,
    threshold_window_minutes: 10,
    cooldown_minutes: 30,
  },
];

function createChainableBuilder(result: any) {
  const b: any = {
    select: vi.fn((_cols?: string, opts?: any) => {
      if (opts?.head && opts?.count === "exact") {
        return createChainableBuilder({ count: 1, data: null, error: null });
      }
      return b;
    }),
    order: vi.fn(() => b),
    limit: vi.fn(() => b),
    eq: vi.fn(() => b),
    gte: vi.fn(() => b),
    update: vi.fn(() => b),
    insert: vi.fn(() => b),
    then: vi.fn((resolve: any) => Promise.resolve(resolve(result))),
  };
  return b;
}

describe("SystemHealth", () => {
  let updateErrorMock: any;
  let updateAlertMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      isAdmin: true,
      user: { id: "admin-1" },
    });

    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    updateErrorMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    updateAlertMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "application_errors") {
        const errorBuilder = createChainableBuilder({ count: null, data: sampleErrors, error: null });
        errorBuilder.update = updateErrorMock;
        return errorBuilder;
      }
      if (table === "error_alert_config") {
        const alertBuilder = createChainableBuilder({ count: null, data: sampleAlertConfigs, error: null });
        alertBuilder.update = updateAlertMock;
        return alertBuilder;
      }
      if (table === "site_settings") {
        return createChainableBuilder({ data: [{ id: "settings-1" }], error: null });
      }
      if (table === "error_fix_history") {
        return createChainableBuilder({ data: [], error: null });
      }
      return createChainableBuilder({ data: [], error: null });
    });
  });

  it("blocks non-administrator users", () => {
    (useAuth as any).mockReturnValue({
      isAdmin: false,
      user: { id: "user-1" },
    });

    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    expect(screen.getByText("Administrator access required.")).toBeInTheDocument();
  });

  it("renders the system health dashboard, status banner, and stats cards", async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "System Health" })).toBeInTheDocument();
      expect(screen.getByText("Errors Today")).toBeInTheDocument();
      expect(screen.getByText("Last 24h")).toBeInTheDocument();
      expect(screen.getByText("Unresolved")).toBeInTheDocument();
      expect(screen.getByText("Paint Estimator")).toBeInTheDocument();
    });
  });

  it("switches to the Error List tab and displays errors with severity badges", async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Error List" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Error List" }));

    await waitFor(() => {
      expect(
        screen.getByText("Connection pool exhausted on calculation sync"),
      ).toBeInTheDocument();
      expect(screen.getByText("critical")).toBeInTheDocument();
    });
  });

  it("filters errors by search keyword", async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Error List" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Error List" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Search errors")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Search errors"), {
      target: { value: "exhausted" },
    });

    await waitFor(() => {
      expect(
        screen.getByText("Connection pool exhausted on calculation sync"),
      ).toBeInTheDocument();
    });
  });

  it("opens error detail modal when an error row is clicked", async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Error List" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Error List" }));

    await waitFor(() => {
      expect(
        screen.getByText("Connection pool exhausted on calculation sync"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Connection pool exhausted on calculation sync"));

    await waitFor(() => {
      expect(screen.getByText("Error Details")).toBeInTheDocument();
      expect(screen.getByText(/Error: timeout at syncCalculation/i)).toBeInTheDocument();
    });
  });

  it("toggles error resolution status from open to resolved", async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Error List" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Error List" }));

    await waitFor(() => {
      expect(
        screen.getByText("Connection pool exhausted on calculation sync"),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Connection pool exhausted on calculation sync"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Mark Resolved" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Mark Resolved" }));

    await waitFor(() => {
      expect(updateErrorMock).toHaveBeenCalledWith({ resolved: true });
    });
  });

  it("switches to the Health Checks tab and displays service statuses", async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Health Checks" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Health Checks" }));

    await waitFor(() => {
      expect(screen.getByText("Service Health")).toBeInTheDocument();
      expect(screen.getByText("Website")).toBeInTheDocument();
      expect(screen.getByText("Database")).toBeInTheDocument();
      expect(screen.getByText("Authentication")).toBeInTheDocument();
    });
  });

  it("switches to the Alert Config tab and toggles an alert threshold", async () => {
    render(
      <MemoryRouter>
        <SystemHealth />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Alert Config" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Alert Config" }));

    await waitFor(() => {
      expect(screen.getByText("Alert Thresholds")).toBeInTheDocument();
      expect(screen.getByText("critical error spike")).toBeInTheDocument();
    });

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(updateAlertMock).toHaveBeenCalledWith({ enabled: false });
    });
  });
});
