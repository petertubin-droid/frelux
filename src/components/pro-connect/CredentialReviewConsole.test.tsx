import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CredentialReviewConsole } from "@/components/pro-connect/CredentialReviewConsole";
import type { DbProCredential } from "@/types/pro-connect";

const queue = vi.hoisted(() => vi.fn());

vi.mock("@/lib/pro-connect", async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return {
    ...actual,
    adminListCredentialsForReview: queue,
    adminVerifyCredentialByReviewer: vi.fn().mockResolvedValue(true),
    adminVerifyCredentialBySource: vi.fn().mockResolvedValue(true),
    adminRequestCredentialCorrection: vi.fn().mockResolvedValue(true),
    adminUnableToVerifyCredential: vi.fn().mockResolvedValue(true),
    adminSuspendCredential: vi.fn().mockResolvedValue(true),
    adminRevokeCredential: vi.fn().mockResolvedValue(true),
    getCredentialEvents: vi.fn().mockResolvedValue([]),
  };
});

function row(
  overrides: Record<string, unknown>,
): Parameters<typeof queue.mockReturnValueOnce>[number] {
  return {
    id: "c1",
    profile_id: "p1",
    profile_display_name: "Ada Obi",
    profile_slug: "ada-obi",
    professional_body: "COREN",
    registration_number: "COREN/1234",
    credential_type: "Registered Engineer",
    verification_status: "submitted",
    country_code: "NG",
    subnational_scope: "Lagos",
    expires_at: null,
    ...overrides,
  } as unknown as Parameters<typeof queue.mockReturnValueOnce>[number];
}

beforeEach(() => {
  vi.clearAllMocks();
  queue.mockResolvedValue([]);
});

describe("CredentialReviewConsole", () => {
  it("renders the empty state honestly when the queue is empty", async () => {
    render(<CredentialReviewConsole />);
    await waitFor(() =>
      expect(screen.getByText("No credentials in this queue.")).toBeTruthy(),
    );
  });

  it("shows an awaiting-review credential with reviewer and source paths, never an unattributed verify", async () => {
    queue.mockResolvedValue([row({})]);
    render(<CredentialReviewConsole />);
    expect(await screen.findByText("Record source verification")).toBeTruthy();
    expect(screen.getByText("Verify after document review")).toBeTruthy();
    // the audit disclosure is visible
    expect(screen.getByText(/append-only audit trail/i)).toBeTruthy();
    expect(screen.getByText("Ada Obi")).toBeTruthy();
    expect(screen.getByText(/COREN\/1234/)).toBeTruthy();
  });

  it("does not offer verify actions on a revoked (terminal) credential", async () => {
    queue.mockResolvedValue([
      row({ id: "c2", verification_status: "revoked" }),
    ]);
    render(<CredentialReviewConsole />);
    await screen.findByText("Revoked");
    expect(screen.queryByText("Record source verification")).toBeNull();
    expect(screen.queryByText("Verify after document review")).toBeNull();
  });

  it("records a reviewer verification with the decision note and reloads the queue", async () => {
    const { adminVerifyCredentialByReviewer } =
      await import("@/lib/pro-connect");
    queue.mockResolvedValue([row({})]);
    render(<CredentialReviewConsole />);
    await screen.findByText("Verify after document review");
    await userEvent.type(
      screen.getByLabelText(/Decision note/i),
      "Checked the seal",
    );
    await userEvent.click(screen.getByText("Verify after document review"));
    await waitFor(() =>
      expect(adminVerifyCredentialByReviewer).toHaveBeenCalledWith("c1", {
        reason: "Checked the seal",
      }),
    );
    expect(queue).toHaveBeenCalledTimes(2);
  });

  it("maps a registry mismatch to an error outcome, never a verification", async () => {
    const { adminVerifyCredentialBySource } = await import("@/lib/pro-connect");
    queue.mockResolvedValue([row({})]);
    render(<CredentialReviewConsole />);
    await screen.findByText("Record source verification");
    await userEvent.selectOptions(
      screen.getByLabelText(/Registry lookup result/i),
      "mismatch",
    );
    await userEvent.click(screen.getByText("Record source verification"));
    await waitFor(() =>
      expect(adminVerifyCredentialBySource).toHaveBeenCalledWith("c1", {
        result: "error",
        reason: undefined,
      }),
    );
  });

  it("does not offer the source-verification path for a legacy verified credential", async () => {
    queue.mockResolvedValue([
      row({ id: "c3", verification_status: "verified" }),
    ]);
    render(<CredentialReviewConsole />);
    await screen.findByText("Verified (document review)");
    expect(screen.queryByText("Record source verification")).toBeNull();
    // but the reviewer can suspend or revoke it
    expect(screen.getByText("Suspend")).toBeTruthy();
    expect(screen.getByText("Revoke")).toBeTruthy();
  });
});
