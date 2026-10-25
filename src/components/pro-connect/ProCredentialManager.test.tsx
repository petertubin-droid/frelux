import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProCredentialManager } from "./ProCredentialManager";
import type {
  DbProCredential,
  DbProCredentialEvent,
} from "@/types/pro-connect";

// ============================================================
// Phase 2 worker credential manager: guided submission, honest
// status display, and fail-closed resubmission. Never a claim
// of verification beyond what the audit trail supports.
// ============================================================

const credential = (status: DbProCredential["verification_status"]) =>
  ({
    id: "c1",
    profile_id: "p1",
    professional_body: "COREN",
    registration_number: "REG-1",
    credential_type: "Registered Builder",
    verification_status: status,
    verified_by: null,
    verified_at: null,
    expires_at: null,
    document_path: null,
    credential_class: "trade_registration",
    country_code: "NG",
    subnational_scope: "Lagos",
    registry_identifier: null,
    issued_at: null,
    evidence_type: "document_upload",
    evidence_source: null,
    verification_method: null,
    verification_result: null,
    verification_checked_at: null,
    insurance_provider: null,
    insurance_policy_number: null,
    insurance_expiry: null,
    safety_training_type: null,
    safety_training_expiry: null,
    created_at: "2026-10-25T00:00:00Z",
    updated_at: "2026-10-25T00:00:00Z",
  }) as unknown as DbProCredential;

const addCredential = vi.fn();
const resubmitCredential = vi.fn();
const getCredentials = vi.fn();
const getCredentialEvents = vi.fn();

vi.mock("@/lib/pro-connect", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  addCredential: (...args: unknown[]) => addCredential(...args),
  resubmitCredential: (...args: unknown[]) => resubmitCredential(...args),
  getCredentials: (...args: unknown[]) => getCredentials(...args),
  getCredentialEvents: (...args: unknown[]) => getCredentialEvents(...args),
  uploadVerificationDocument: vi.fn(async () => "docs/1.pdf"),
}));

const events: DbProCredentialEvent[] = [
  {
    id: "e1",
    credential_id: "c1",
    event_type: "submission",
    actor_id: null,
    actor_role: "worker",
    actor: null,
    notes_private: null,
    source: "app",
    method: null,
    result: null,
    reason: null,
    notes: null,
    metadata: null,
    occurred_at: "2026-10-25T10:00:00Z",
  } as DbProCredentialEvent,
];

describe("ProCredentialManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCredentials.mockResolvedValue([credential("rejected")]);
    resubmitCredential.mockResolvedValue(true);
    addCredential.mockResolvedValue(true);
    getCredentialEvents.mockResolvedValue(events);
  });

  it("shows the precise status label for a rejected credential", async () => {
    render(<ProCredentialManager profileId="p1" />);
    await waitFor(() => expect(getCredentials).toHaveBeenCalled());
    expect(await screen.findByText("Rejected")).toBeTruthy();
    expect(screen.queryByText("Verified")).toBeNull();
  });

  it("distinguishes source verification from reviewer verification", async () => {
    getCredentials.mockResolvedValue([credential("verified_by_source")]);
    render(<ProCredentialManager profileId="p1" />);
    expect(await screen.findByText("Verified by issuing source")).toBeTruthy();
  });

  it("validates required fields before submitting", async () => {
    getCredentials.mockResolvedValue([]);
    render(<ProCredentialManager profileId="p1" />);
    await waitFor(() => expect(getCredentials).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /add credential/i }));
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    expect(
      await screen.findByText(/Professional body or authority is required/i),
    ).toBeTruthy();
    expect(addCredential).not.toHaveBeenCalled();
  });

  it("submits a complete credential with jurisdiction fields", async () => {
    getCredentials.mockResolvedValue([]);
    render(<ProCredentialManager profileId="p1" />);
    await waitFor(() => expect(getCredentials).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /add credential/i }));
    fireEvent.change(screen.getByLabelText(/Professional body or authority/i), {
      target: { value: "COREN" },
    });
    fireEvent.change(screen.getByLabelText(/Registration or license number/i), {
      target: { value: "REG-9" },
    });
    fireEvent.change(screen.getByLabelText(/Credential title/i), {
      target: { value: "Registered Builder" },
    });
    fireEvent.change(screen.getByLabelText(/Country \(two-letter code\)/i), {
      target: { value: "NG" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit for review/i }));

    await waitFor(() => expect(addCredential).toHaveBeenCalled());
    const submitted = addCredential.mock.calls[0][1];
    expect(submitted.country_code).toBe("NG");
    expect(submitted.verification_status).toBeUndefined(); // never set by the client
    expect(await screen.findByText(/Submitted for review/i)).toBeTruthy();
  });

  it("offers resubmission only for rejected or unable-to-verify credentials", async () => {
    getCredentials.mockResolvedValue([credential("verified_by_reviewer")]);
    render(<ProCredentialManager profileId="p1" />);
    await waitFor(() => expect(getCredentials).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /resubmit/i })).toBeNull();
  });

  it("resubmits a rejected credential and refreshes the list", async () => {
    render(<ProCredentialManager profileId="p1" />);
    fireEvent.click(await screen.findByRole("button", { name: /resubmit/i }));
    await waitFor(() =>
      expect(resubmitCredential).toHaveBeenCalledWith("c1", {}),
    );
    expect(await screen.findByText(/Resubmitted for review/i)).toBeTruthy();
    expect(getCredentials).toHaveBeenCalledTimes(2);
  });

  it("discloses the event history for a credential", async () => {
    render(<ProCredentialManager profileId="p1" />);
    fireEvent.click(await screen.findByRole("button", { name: /history/i }));
    expect(await screen.findByText(/submission/i)).toBeTruthy();
  });
});
