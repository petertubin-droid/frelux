import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTravelApprovals from "@/pages/admin/AdminTravelApprovals";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      let data: unknown[] = [];
      if (table === "marketplace_orders") {
        data = [
          {
            id: "ord-1",
            order_number: "ORD-101",
            buyer_id: "buyer-1",
            pro_id: "pro-1",
            order_status: "pending_review",
            city: "Ibadan",
            state: "Oyo",
            created_at: "2026-11-19T10:00:00Z",
          },
        ];
      } else if (table === "marketplace_travel_approvals") {
        data = [];
      } else if (table === "pro_profiles") {
        data = [
          {
            id: "pro-1",
            user_id: "usr-1",
            display_name: "Master Tiler",
            service_area_text: "Lagos only",
          },
        ];
      } else if (table === "marketplace_worker_settings") {
        return {
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { allow_cross_state_jobs: true, auto_release_hours: 48 },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) => Promise.resolve(fn({ data, error: null }))),
      };
    }),
  },
}));

describe("AdminTravelApprovals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders travel and cross-state safety approvals header", async () => {
    render(
      <MemoryRouter>
        <AdminTravelApprovals />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Cross-state and travel approvals/i)).toBeDefined();
  });
});
