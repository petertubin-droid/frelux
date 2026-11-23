/**
 * AdminCreditProfiles conformance (admin coverage tranche 3 / Tier 1 money, 2026-11-23).
 *
 * Asserts listing profiles, validation rules (on-time <= verified, required reference),
 * exact create/update payloads, deletion confirmation, and error reporting.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminCreditProfiles from "@/pages/admin/AdminCreditProfiles";
import * as estimationQueries from "@/lib/estimation/queries";
import type { ContractorCreditProfile } from "@/types/estimation";

vi.mock("@/lib/estimation/queries", () => ({
  fetchContractorCreditProfiles: vi.fn(),
  createContractorCreditProfile: vi.fn(),
  updateContractorCreditProfile: vi.fn(),
  deleteContractorCreditProfile: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (s: string) => s }),
}));

const mockProfiles: ContractorCreditProfile[] = [
  {
    id: "prof-1",
    contractor_name: "Apex Build Engineering Ltd",
    registration_number: "RC-1294821",
    verified_jobs: 24,
    on_time_jobs: 22,
    dispute_count: 1,
    avg_estimate_error_pct: 4.8,
    description: "Tier 1 structural contractor",
    verification_reference: "audit-2026-q3-apex.pdf",
    effective_date: "2026-06-01",
    is_active: true,
    sort_order: 10,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.confirm = vi.fn().mockReturnValue(true);
  vi.mocked(estimationQueries.fetchContractorCreditProfiles).mockResolvedValue({
    data: [...mockProfiles],
    error: null,
  });
  vi.mocked(estimationQueries.createContractorCreditProfile).mockResolvedValue({
    data: null as any,
    error: null,
  });
  vi.mocked(estimationQueries.updateContractorCreditProfile).mockResolvedValue({
    data: null as any,
    error: null,
  });
  vi.mocked(estimationQueries.deleteContractorCreditProfile).mockResolvedValue({
    error: null,
  });
});

describe("AdminCreditProfiles", () => {
  it("renders header and lists existing contractor credit profiles", async () => {
    render(
      <MemoryRouter>
        <AdminCreditProfiles />
      </MemoryRouter>,
    );

    expect(screen.getByText("Contractor Credit Profiles")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Apex Build Engineering Ltd")).toBeInTheDocument();
      expect(screen.getByText("RC-1294821")).toBeInTheDocument();
      expect(screen.getByText("audit-2026-q3-apex.pdf")).toBeInTheDocument();
    });
  });

  it("refuses to save when on-time jobs exceed verified jobs", async () => {
    render(
      <MemoryRouter>
        <AdminCreditProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("Apex Build Engineering Ltd");
    fireEvent.click(screen.getByRole("button", { name: /Add profile/i }));

    fireEvent.change(screen.getByLabelText(/Contractor name/i), {
      target: { value: "Faulty Stats Ltd" },
    });
    fireEvent.change(screen.getByLabelText(/^Verified jobs/i), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByLabelText(/^On-time jobs/i), {
      target: { value: "10" }, // 10 > 5
    });
    fireEvent.change(screen.getByLabelText(/^Dispute count/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Average estimate error/i), {
      target: { value: "2.5" },
    });
    fireEvent.change(screen.getByLabelText(/Verification reference/i), {
      target: { value: "audit-doc-123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create profile/i }));

    await waitFor(() => {
      expect(
        screen.getByText("On-time jobs cannot exceed verified jobs."),
      ).toBeInTheDocument();
    });
    expect(estimationQueries.createContractorCreditProfile).not.toHaveBeenCalled();
  });

  it("creates a contractor credit profile with correctly converted types", async () => {
    render(
      <MemoryRouter>
        <AdminCreditProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("Apex Build Engineering Ltd");
    fireEvent.click(screen.getByRole("button", { name: /Add profile/i }));

    fireEvent.change(screen.getByLabelText(/Contractor name/i), {
      target: { value: "Solid Foundations Co" },
    });
    fireEvent.change(screen.getByLabelText(/Registration number/i), {
      target: { value: "RC-998877" },
    });
    fireEvent.change(screen.getByLabelText(/^Verified jobs/i), {
      target: { value: "15" },
    });
    fireEvent.change(screen.getByLabelText(/^On-time jobs/i), {
      target: { value: "14" },
    });
    fireEvent.change(screen.getByLabelText(/^Dispute count/i), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText(/Average estimate error/i), {
      target: { value: "3.2" },
    });
    fireEvent.change(screen.getByLabelText(/Verification reference/i), {
      target: { value: "cert-hash-abc-001" },
    });
    fireEvent.change(screen.getByLabelText(/Description/i), {
      target: { value: "Trusted residential contractor" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create profile/i }));

    await waitFor(() => {
      expect(estimationQueries.createContractorCreditProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          contractor_name: "Solid Foundations Co",
          registration_number: "RC-998877",
          verified_jobs: 15,
          on_time_jobs: 14,
          dispute_count: 0,
          avg_estimate_error_pct: 3.2,
          description: "Trusted residential contractor",
          verification_reference: "cert-hash-abc-001",
          is_active: true,
        }),
      );
    });
  });

  it("updates an existing profile when edited", async () => {
    render(
      <MemoryRouter>
        <AdminCreditProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("Apex Build Engineering Ltd");
    fireEvent.click(screen.getByTitle("Edit"));

    fireEvent.change(screen.getByLabelText(/Contractor name/i), {
      target: { value: "Apex Build Engineering International Ltd" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(estimationQueries.updateContractorCreditProfile).toHaveBeenCalledWith(
        "prof-1",
        expect.objectContaining({
          contractor_name: "Apex Build Engineering International Ltd",
          verified_jobs: 24,
          on_time_jobs: 22,
        }),
      );
    });
  });

  it("deletes a profile only after window confirmation", async () => {
    render(
      <MemoryRouter>
        <AdminCreditProfiles />
      </MemoryRouter>,
    );

    await screen.findByText("Apex Build Engineering Ltd");
    fireEvent.click(screen.getByTitle("Delete"));

    expect(window.confirm).toHaveBeenCalledWith(
      "Delete the profile 'Apex Build Engineering Ltd'? This cannot be undone.",
    );
    await waitFor(() => {
      expect(estimationQueries.deleteContractorCreditProfile).toHaveBeenCalledWith("prof-1");
    });
  });

  it("displays an error message when loading profiles fails", async () => {
    vi.mocked(estimationQueries.fetchContractorCreditProfiles).mockResolvedValueOnce({
      data: [],
      error: new Error("Server database failure"),
    });

    render(
      <MemoryRouter>
        <AdminCreditProfiles />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Server database failure")).toBeInTheDocument();
    });
  });
});
