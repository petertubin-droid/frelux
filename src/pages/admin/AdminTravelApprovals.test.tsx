import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminTravelApprovals from "@/pages/admin/AdminTravelApprovals";
import { supabase } from "@/lib/supabase";

const mockOrders = [
  {
    id: "order-1",
    order_number: "ORD-101",
    job_city: "Abuja",
    job_state: "FCT",
    job_country: "NG",
    status: "in_progress",
    payment_status: "escrowed",
    client_id: "client-1",
    pro_profile_id: "pro-1",
    created_at: "2026-11-20T10:00:00Z",
  },
  {
    id: "order-2",
    order_number: "ORD-102",
    job_city: "Port Harcourt",
    job_state: "Rivers",
    job_country: "NG",
    status: "in_progress",
    payment_status: "escrowed",
    client_id: "client-2",
    pro_profile_id: "pro-2",
    created_at: "2026-11-21T12:00:00Z",
  },
];

const mockApprovals = [
  {
    id: "app-2",
    seller_user_id: "user-pro-2",
    buyer_user_id: "client-2",
    job_state: "Rivers",
    approved_at: "2026-11-21T14:00:00Z",
    expires_at: "2026-12-05T14:00:00Z",
    note: "Verified travel allowance provided",
  },
];

const mockPros = [
  {
    id: "pro-1",
    user_id: "user-pro-1",
    display_name: "Ade Engineer",
    service_area_text: "Lagos only",
  },
  {
    id: "pro-2",
    user_id: "user-pro-2",
    display_name: "Chidi Electrician",
    service_area_text: "Enugu only",
  },
];

const mockRpc = vi.fn().mockResolvedValue({ error: null });

function makeChain(table: string) {
  if (table === "marketplace_orders") {
    return {
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };
  }
  if (table === "cross_state_approvals") {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockApprovals, error: null }),
    };
  }
  if (table === "worker_safety_settings") {
    return {
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { allow_cross_state_jobs: false, auto_release_hours: 48 },
        error: null,
      }),
    };
  }
  if (table === "pro_profiles") {
    return {
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: mockPros, error: null }),
    };
  }
  return {
    select: vi.fn().mockReturnThis(),
  };
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: any[]) => mockRpc(...args),
    from: vi.fn((table: string) => makeChain(table)),
  },
}));

describe("AdminTravelApprovals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockImplementation(
      (table: string) => makeChain(table) as any,
    );
  });

  it("loads and displays orders requiring cross-state review with professional details", async () => {
    render(
      <MemoryRouter>
        <AdminTravelApprovals />
      </MemoryRouter>,
    );

    expect(screen.getByText("Travel approvals")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("ORD-101")).toBeInTheDocument();
      expect(screen.getByText("Abuja, FCT, NG")).toBeInTheDocument();
      expect(screen.getByText("Ade Engineer")).toBeInTheDocument();
      expect(screen.getByText("Lagos only")).toBeInTheDocument();

      expect(screen.getByText("ORD-102")).toBeInTheDocument();
      expect(screen.getByText("Port Harcourt, Rivers, NG")).toBeInTheDocument();
      expect(screen.getByText("Chidi Electrician")).toBeInTheDocument();
      expect(screen.getByText("Enugu only")).toBeInTheDocument();
    });
  });

  it("calls approve_cross_state_job RPC with order ID, note and expiry calculation", async () => {
    render(
      <MemoryRouter>
        <AdminTravelApprovals />
      </MemoryRouter>,
    );

    await screen.findByText("ORD-101");

    const noteInput = screen.getByLabelText("Why this move is safe");
    fireEvent.change(noteInput, {
      target: { value: "Accommodation confirmed in Abuja" },
    });

    const daysInput = screen.getByLabelText("Days");
    fireEvent.change(daysInput, { target: { value: "7" } });

    const approveButton = screen.getByRole("button", {
      name: /Approve travel/i,
    });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        "approve_cross_state_job",
        expect.objectContaining({
          p_order_id: "order-1",
          p_note: "Accommodation confirmed in Abuja",
          p_expires_at: expect.any(String),
        }),
      );
    });
  });

  it("calls revoke_cross_state_approval RPC when revoking an approved travel pairing", async () => {
    render(
      <MemoryRouter>
        <AdminTravelApprovals />
      </MemoryRouter>,
    );

    await screen.findByText("ORD-102");

    const noteInput = screen.getByLabelText("Why this move is safe");
    fireEvent.change(noteInput, {
      target: { value: "Job scope changed, no longer travelling" },
    });

    const revokeButton = screen.getByRole("button", { name: /^Revoke$/i });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith(
        "revoke_cross_state_approval",
        expect.objectContaining({
          p_approval_id: "app-2",
          p_reason: "Job scope changed, no longer travelling",
        }),
      );
    });
  });

  it("renders warning banner when allow_cross_state_jobs is enabled in safety settings", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "worker_safety_settings") {
        return {
          select: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { allow_cross_state_jobs: true, auto_release_hours: 48 },
            error: null,
          }),
        } as any;
      }
      return makeChain(table) as any;
    });

    render(
      <MemoryRouter>
        <AdminTravelApprovals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Cross state jobs are currently allowed for everyone in the safety settings/i,
        ),
      ).toBeInTheDocument();
    });
  });

  it("displays empty state when no open orders have destination states", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "marketplace_orders") {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        } as any;
      }
      return makeChain(table) as any;
    });

    render(
      <MemoryRouter>
        <AdminTravelApprovals />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "No open job has a destination state recorded, so there is nothing to approve.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("surfaces RPC errors safely when approval fails", async () => {
    mockRpc.mockResolvedValueOnce({
      error: { message: "Pro worker license not valid in target state" },
    });

    render(
      <MemoryRouter>
        <AdminTravelApprovals />
      </MemoryRouter>,
    );

    await screen.findByText("ORD-101");
    const approveButton = screen.getByRole("button", {
      name: /Approve travel/i,
    });
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(
        screen.getByText("Pro worker license not valid in target state"),
      ).toBeInTheDocument();
    });
  });
});
