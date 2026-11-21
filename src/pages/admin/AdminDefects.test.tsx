import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminDefects from "./AdminDefects";
import * as estimationQueries from "@/lib/estimation/queries";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "admin-1" }, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

vi.mock("@/lib/estimation/queries", () => ({
  fetchDefects: vi.fn(),
  createDefect: vi.fn(),
  updateDefect: vi.fn(),
  deleteDefect: vi.fn(),
  fetchDefectCauses: vi.fn(),
  createDefectCause: vi.fn(),
  updateDefectCause: vi.fn(),
  deleteDefectCause: vi.fn(),
}));

const mockDefectsList = [
  {
    id: "defect-1",
    symptom_key: "efflorescence",
    symptom_label: "Efflorescence / Salt Deposits",
    description: "White chalky deposits on wall surfaces",
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "defect-2",
    symptom_key: "blistering",
    symptom_label: "Paint Blistering & Peeling",
    description: "Bubbles and detachment under paint film",
    is_active: true,
    sort_order: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const mockCausesList = [
  {
    id: "cause-1",
    defect_id: "defect-1",
    cause_key: "rising_damp",
    cause_label: "Rising Damp from Subgrade",
    root_cause: "Lack of functional damp-proof membrane",
    severity: "high" as const,
    fix_summary: "Install chemical DPC barrier and neutralizing primer",
    fix_material: "Anti-efflorescence primer",
    fix_consumption_per_sqm: 0.25,
    fix_unit: "litres",
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(estimationQueries.fetchDefects).mockResolvedValue({
    data: mockDefectsList,
    error: null,
  } as any);
  vi.mocked(estimationQueries.fetchDefectCauses).mockResolvedValue({
    data: mockCausesList,
    error: null,
  } as any);
});

describe("AdminDefects Interactive Suite", () => {
  it("renders symptoms table with configured defects", async () => {
    render(
      <MemoryRouter>
        <AdminDefects />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Defects")).toBeInTheDocument();
    expect(await screen.findByText("Efflorescence / Salt Deposits")).toBeInTheDocument();
    expect(screen.getByText("Paint Blistering & Peeling")).toBeInTheDocument();
  });

  it("opens symptom creation modal when clicking Add Symptom", async () => {
    render(
      <MemoryRouter>
        <AdminDefects />
      </MemoryRouter>,
    );

    await screen.findByText("Defects");
    const addBtn = screen.getByRole("button", { name: /Add Symptom/i });
    fireEvent.click(addBtn);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("drills into a symptom to inspect its associated root causes", async () => {
    render(
      <MemoryRouter>
        <AdminDefects />
      </MemoryRouter>,
    );

    const symptomRow = await screen.findByText("Efflorescence / Salt Deposits");
    fireEvent.click(symptomRow);

    expect(await screen.findByText("Rising Damp from Subgrade")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add Cause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /All symptoms/i })).toBeInTheDocument();

    // Click back to all symptoms
    fireEvent.click(screen.getByRole("button", { name: /All symptoms/i }));
    expect(await screen.findByText("Paint Blistering & Peeling")).toBeInTheDocument();
  });
});
