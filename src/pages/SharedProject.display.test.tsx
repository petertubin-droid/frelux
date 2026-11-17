import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

const project = {
  id: "p1",
  name: "12 Adeola Street",
  description: "Three bedroom bungalow",
  project_type: "new_build",
  created_at: "2026-02-14T09:30:00Z",
  market_code: "NG",
  total_cost: 1250000,
  area: 148,
  quantities: { cement_bags: 96, sand_trips: 4 },
  materials: [{ name: "Cement", quantity: 96, unit: "bag" }],
};

vi.mock("@/lib/queries", async () => {
  const actual = await vi.importActual<any>("@/lib/queries");
  return {
    ...actual,
    fetchSharedResource: vi.fn().mockResolvedValue({
      data: { id: "link-1", resource_type: "project", resource_id: "p1" },
      error: null,
    }),
    fetchSharedProject: vi
      .fn()
      .mockResolvedValue({ data: project, error: null }),
  };
});

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ in: () => Promise.resolve({ data: [], error: null }) }),
    }),
  },
}));

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => vi.clearAllMocks());

async function renderPage() {
  const Comp = (await import("@/pages/SharedProject")).default;
  return render(
    <MemoryRouter initialEntries={["/shared/link-1"]}>
      <ToastProvider>
        <Routes>
          <Route path="/shared/:id" element={<Comp />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("SharedProject display", () => {
  it("shows a stored object as labelled rows, not a JSON dump", async () => {
    const { container } = await renderPage();
    expect(await screen.findByText(/Project Estimation Summary/i)).toBeTruthy();
    expect(container.textContent).toContain("Cement bags");
    expect(container.textContent).toContain("96");
    // Braces, quotes and stringified punctuation belong nowhere on a client page.
    expect(container.textContent).not.toContain("{");
    expect(container.textContent).not.toContain('"cement_bags"');
    expect(container.textContent).not.toContain("quantity");
  });

  it("formats the shared total in the project's market currency", async () => {
    const { container } = await renderPage();
    await screen.findByText(/Project Estimation Summary/i);
    expect(container.textContent).toContain("₦1,250,000");
    expect(container.textContent).not.toContain("1250000");
  });

  it("labels fields in readable words", async () => {
    const { container } = await renderPage();
    await screen.findByText(/Project Estimation Summary/i);
    expect(container.textContent).toContain("Total cost");
    expect(container.textContent).not.toContain("total_cost");
  });

  it("renders a list of materials by name and quantity", async () => {
    const { container } = await renderPage();
    await screen.findByText(/Project Estimation Summary/i);
    expect(container.textContent).toContain("Cement");
    expect(container.textContent).toContain("bag");
  });
});
