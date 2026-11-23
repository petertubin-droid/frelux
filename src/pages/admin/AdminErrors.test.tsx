import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminErrors from "./AdminErrors";
import { supabase } from "@/lib/supabase";

const mockErrors = [
  {
    id: "err-1",
    severity: "critical",
    boundary_name: "CalculatorBoundary",
    error_message: "Cannot read properties of undefined (reading 'calculate')",
    error_stack: "Error: at RoomCalculator.tsx:42:15",
    component_stack: "in Calculator (at Room.tsx:10)",
    url: "https://freluxtools.com/paint-calculator",
    user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    is_resolved: false,
    resolved_at: null,
    created_at: "2026-11-20T14:00:00Z",
  },
  {
    id: "err-2",
    severity: "warning",
    boundary_name: "ApiBoundary",
    error_message: "Network timeout fetching live market rates",
    error_stack: "NetworkError: Request timed out",
    component_stack: null,
    url: "https://freluxtools.com/admin/pricing",
    user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    is_resolved: true,
    resolved_at: "2026-11-20T15:00:00Z",
    created_at: "2026-11-20T12:00:00Z",
  },
];

let queryList = [...mockErrors];
const updateEqMock = vi.fn().mockResolvedValue({ error: null });
const updateInMock = vi.fn().mockResolvedValue({ error: null });

function createChainableQuery(data: any, count?: number) {
  const obj: any = {
    order: vi.fn().mockImplementation(() => obj),
    range: vi.fn().mockImplementation(() => obj),
    eq: vi.fn().mockImplementation(() => obj),
    gte: vi.fn().mockImplementation(() => obj),
    in: vi.fn().mockImplementation(() => obj),
    then: (resolve: any) =>
      resolve({ data, count: count ?? data?.length ?? 0, error: null }),
  };
  return obj;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockImplementation((cols: string, opts?: any) => {
        if (opts?.head) {
          return createChainableQuery(null, queryList.length);
        }
        return createChainableQuery(queryList);
      }),
      update: vi.fn().mockImplementation((payload: any) => ({
        eq: updateEqMock,
        in: updateInMock,
      })),
    })),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  queryList = [...mockErrors];
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminErrors />
    </MemoryRouter>,
  );
}

describe("AdminErrors", () => {
  it("renders Error Monitor header and statistics", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Error Monitor/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Errors")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cannot read properties of undefined (reading 'calculate')",
      ),
    ).toBeInTheDocument();
  });

  it("filters errors when severity tab is clicked", async () => {
    renderPage();

    await screen.findByRole("heading", { level: 1, name: /Error Monitor/i });
    const criticalTab = screen.getByRole("button", { name: "critical" });
    fireEvent.click(criticalTab);

    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith("error_logs");
    });
  });

  it("opens modal with stack trace details when Details is clicked", async () => {
    renderPage();

    await screen.findByText(
      "Cannot read properties of undefined (reading 'calculate')",
    );
    const detailButtons = screen.getAllByRole("button", { name: /Details/i });
    fireEvent.click(detailButtons[0]);

    expect(
      await screen.findByRole("heading", { name: /Error Details/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Error: at RoomCalculator.tsx:42:15"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("CalculatorBoundary").length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("resolves a single error when Resolve is clicked", async () => {
    renderPage();

    await screen.findByText(
      "Cannot read properties of undefined (reading 'calculate')",
    );
    const resolveBtn = screen.getByRole("button", { name: /^Resolve$/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(updateEqMock).toHaveBeenCalledWith("id", "err-1");
    });
  });

  it("resolves all unresolved errors when Resolve All is clicked", async () => {
    renderPage();

    await screen.findByText(
      "Cannot read properties of undefined (reading 'calculate')",
    );
    const resolveAllBtn = screen.getByRole("button", { name: /Resolve all/i });
    fireEvent.click(resolveAllBtn);

    await waitFor(() => {
      expect(updateInMock).toHaveBeenCalledWith("id", ["err-1"]);
    });
  });

  it("renders empty state when no errors exist", async () => {
    queryList = [];
    renderPage();

    expect(await screen.findByText("No errors found 🎉")).toBeInTheDocument();
  });
});
