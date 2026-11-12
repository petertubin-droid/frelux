import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

/**
 * The admin could not see who had registered. This tab is the fix, so the test
 * pins the things that were missing: both populations appear, signup dates are
 * shown, brand-new accounts are marked, and a database that has not had the
 * function applied yet reports that plainly instead of showing an empty register
 * that looks like "nobody signed up".
 */

const rpc = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import AdminRegistrationsTab from "@/components/admin/AdminRegistrationsTab";

const payload = {
  window_days: 30,
  since: "2026-10-13T00:00:00Z",
  pros_in_window: 2,
  clients_in_window: 1,
  pros_total: 9,
  pros_pending: 3,
  clients_total: 41,
  pros: [
    {
      id: "pro-1",
      user_id: "u-1",
      display_name: "Chidi Okeke",
      business_name: "Chidi Interiors",
      verification_status: "pending",
      created_at: new Date().toISOString(),
      email: "chidi@example.com",
    },
    {
      id: "pro-2",
      user_id: "u-2",
      display_name: "Amara Bello",
      business_name: null,
      verification_status: "verified",
      created_at: "2026-09-01T00:00:00Z",
      email: "amara@example.com",
    },
  ],
  clients: [
    {
      id: "c-1",
      email: "buyer@example.com",
      created_at: "2026-11-10T00:00:00Z",
    },
  ],
};

beforeEach(() => {
  rpc.mockReset();
});

describe("AdminRegistrationsTab", () => {
  it("lists professionals and clients with signup dates", async () => {
    rpc.mockResolvedValue({ data: payload, error: null });
    render(<AdminRegistrationsTab />);

    await waitFor(() => expect(screen.getByText("Chidi Okeke")).toBeTruthy());
    expect(screen.getByText(/Chidi Interiors/)).toBeTruthy();
    expect(screen.getByText("buyer@example.com")).toBeTruthy();
    expect(
      screen.getByText(/Joined 1 Sep 2026|Joined Sep 1, 2026/),
    ).toBeTruthy();
    expect(screen.getByText("pending")).toBeTruthy();
  });

  it("marks an account created this week as new, and leaves older ones alone", async () => {
    rpc.mockResolvedValue({ data: payload, error: null });
    render(<AdminRegistrationsTab />);

    await waitFor(() => expect(screen.getByText("Chidi Okeke")).toBeTruthy());
    // One for the fresh pro, one for the fresh client; the September pro has none.
    expect(screen.getAllByText("New")).toHaveLength(2);
  });

  it("says the function is missing rather than showing an empty register", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "does not exist" } });
    render(<AdminRegistrationsTab />);

    await waitFor(() =>
      expect(screen.getByText(/Registrations unavailable/)).toBeTruthy(),
    );
    expect(screen.getByText(/admin_recent_registrations/)).toBeTruthy();
  });

  it("asks for the selected window", async () => {
    rpc.mockResolvedValue({ data: payload, error: null });
    render(<AdminRegistrationsTab />);
    await waitFor(() => expect(rpc).toHaveBeenCalled());
    expect(rpc).toHaveBeenCalledWith("admin_recent_registrations", {
      p_days: 30,
    });
  });
});
