import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTestimonials from "./AdminTestimonials";
import * as supabaseModule from "@/lib/supabase";

const rows = [
  {
    id: "t1",
    quote: "The paint calculator was spot on.",
    author_name: "Madam Clara",
    author_role: "Homeowner",
    author_location: "Lagos",
    is_active: true,
    sort_order: 1,
    created_at: "2026-01-01",
  },
  {
    id: "t2",
    quote: "An inactive quote that must still be listed here.",
    author_name: "Emeka",
    author_role: null,
    author_location: null,
    is_active: false,
    sort_order: 2,
    created_at: "2026-01-02",
  },
];

const mockSelect = () => ({
  order: vi.fn().mockResolvedValue({ data: rows, error: null }),
});

vi.mock("@/lib/supabase", async () => {
  const actual = await vi.importActual<typeof supabaseModule>("@/lib/supabase");
  return {
    ...actual,
    supabase: { from: () => ({ select: mockSelect }) },
  };
});

describe("AdminTestimonials", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists active and inactive testimonials", async () => {
    render(
      <MemoryRouter>
        <AdminTestimonials />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(screen.getByText(/paint calculator was spot on/i)).toBeTruthy();
    });
    expect(
      screen.getByText("Madam Clara, Homeowner — Lagos · order 1"),
    ).toBeTruthy();
    expect(screen.getByText("Emeka · order 2")).toBeTruthy();
  });

  it("shows the real-quotes-only guidance", () => {
    render(
      <MemoryRouter>
        <AdminTestimonials />
      </MemoryRouter>,
    );
    expect(screen.getByText(/real user quotes only/i)).toBeTruthy();
  });
});
