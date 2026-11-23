import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminWebVitals from "@/pages/admin/AdminWebVitals";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const sampleRows = [
  {
    metric: "LCP",
    value: 1200,
    rating: "good",
    path: "/",
    device: "desktop",
    connection: "4g",
    created_at: "2026-11-20T12:00:00Z",
  },
  {
    metric: "LCP",
    value: 3200,
    rating: "poor",
    path: "/pricing",
    device: "phone",
    connection: "3g",
    created_at: "2026-11-20T12:05:00Z",
  },
  {
    metric: "CLS",
    value: 0.05,
    rating: "good",
    path: "/learn",
    device: "phone",
    connection: "4g",
    created_at: "2026-11-20T12:01:00Z",
  },
  {
    metric: "INP",
    value: 150,
    rating: "good",
    path: "/",
    device: "desktop",
    connection: "4g",
    created_at: "2026-11-20T12:02:00Z",
  },
];

describe("AdminWebVitals", () => {
  let gteMock: any;
  let orderMock: any;
  let limitMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    limitMock = vi.fn().mockResolvedValue({ data: sampleRows, error: null });
    orderMock = vi.fn().mockReturnValue({ limit: limitMock });
    gteMock = vi.fn().mockReturnValue({ order: orderMock });

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: gteMock,
      }),
    });
  });

  it("renders the Web Vitals field performance dashboard and day filters", async () => {
    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Field\s+performance/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "7 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "90 days" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });
  });

  it("displays metric summary cards and formatted target percentiles", async () => {
    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Percentiles against the target")).toBeInTheDocument();
      expect(screen.getByText("Largest contentful paint")).toBeInTheDocument();
      expect(screen.getByText("Cumulative layout shift")).toBeInTheDocument();
      expect(screen.getByText("Interaction to next paint")).toBeInTheDocument();
      // Formatted CLS number
      expect(screen.getAllByText("0.050").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("displays slowest routes by LCP p75 and device share breakdown", async () => {
    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Slowest routes by LCP p75")).toBeInTheDocument();
      expect(screen.getByText("/pricing")).toBeInTheDocument();
      expect(screen.getByText("By device")).toBeInTheDocument();
      expect(screen.getByText("phone")).toBeInTheDocument();
      expect(screen.getByText("desktop")).toBeInTheDocument();
    });
  });

  it("updates queries when selecting another time window", async () => {
    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "30 days" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "30 days" }));

    await waitFor(() => {
      expect(gteMock).toHaveBeenCalledTimes(2);
    });
  });

  it("refetches measurements when clicking Refresh", async () => {
    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(gteMock).toHaveBeenCalledTimes(2);
    });
  });

  it("shows empty state when no measurements exist in window", async () => {
    limitMock.mockResolvedValueOnce({ data: [], error: null });

    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No measurements in this window")).toBeInTheDocument();
    });
  });

  it("displays actionable migration message when table is missing (42P01)", async () => {
    limitMock.mockResolvedValueOnce({
      data: null,
      error: { code: "42P01", message: "relation web_vitals does not exist" },
    });

    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("No measurements yet")).toBeInTheDocument();
      expect(
        screen.getByText(/Measurements start once the vitals migration is applied/i),
      ).toBeInTheDocument();
    });
  });

  it("surfaces generic query errors", async () => {
    limitMock.mockResolvedValueOnce({
      data: null,
      error: { code: "500", message: "Internal server error reading vitals" },
    });

    render(
      <MemoryRouter>
        <AdminWebVitals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Internal server error reading vitals")).toBeInTheDocument();
    });
  });
});
