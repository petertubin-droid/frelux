import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BlueprintTakeoff from "./BlueprintTakeoff";
import {
  createTakeoffProjectExport,
  serializeTakeoffProject,
} from "@/lib/estimation/blueprint-takeoff-project";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isAdmin: false })),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

const emptyChain: Record<string, unknown> = {};
for (const method of [
  "select",
  "eq",
  "order",
  "limit",
  "in",
  "is",
  "not",
  "match",
]) {
  emptyChain[method] = vi.fn(() => emptyChain);
}
emptyChain.then = (resolve: (value: unknown) => unknown) =>
  resolve({ data: [], error: null });
emptyChain.maybeSingle = vi.fn(() =>
  Promise.resolve({ data: null, error: null }),
);
emptyChain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => emptyChain),
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null } })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe() {} } },
      })),
    },
  },
}));
vi.mock("@/lib/supabase-lazy", () => ({
  getSupabase: vi.fn(() => Promise.resolve({ from: vi.fn(() => emptyChain) })),
  isSupabaseConfigured: false,
}));

describe("BlueprintTakeoff draft retention", () => {
  const DRAFT_KEY = "frelux:blueprint_takeoff_draft";

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("detects and restores saved takeoff session from localStorage", async () => {
    const mockDraft = createTakeoffProjectExport({
      sourceFileName: "architectural-plan.pdf",
      marketCode: "NG",
      pageCount: 2,
      scalesByPage: { 1: 50 },
      marks: [
        {
          id: "m-1",
          page: 1,
          type: "linear",
          category: "masonry",
          label: "North Wall",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
          ],
          quantity: 12.5,
          unit: "m",
          color: "#2563eb",
        },
      ],
    });

    localStorage.setItem(DRAFT_KEY, serializeTakeoffProject(mockDraft));

    render(
      <MemoryRouter>
        <BlueprintTakeoff />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Saved takeoff session found: architectural-plan.pdf/i),
    ).toBeInTheDocument();

    const restoreBtn = screen.getByRole("button", { name: /Restore session/i });
    fireEvent.click(restoreBtn);

    expect(
      screen.getByText(
        /Restored saved markup session for architectural-plan.pdf/i,
      ),
    ).toBeInTheDocument();
  });

  it("clears saved takeoff session on dismiss", async () => {
    const mockDraft = createTakeoffProjectExport({
      sourceFileName: "site-drawing.png",
      marketCode: "NG",
      pageCount: 1,
      scalesByPage: { 1: 40 },
      marks: [],
    });

    localStorage.setItem(DRAFT_KEY, serializeTakeoffProject(mockDraft));

    render(
      <MemoryRouter>
        <BlueprintTakeoff />
      </MemoryRouter>,
    );

    const clearBtn = screen.getByRole("button", { name: /Dismiss \/ Clear/i });
    fireEvent.click(clearBtn);

    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(
      screen.queryByText(/Saved takeoff session found/i),
    ).not.toBeInTheDocument();
  });
});
