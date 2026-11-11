/**
 * ProConnectRegister tests.
 *
 * Pins the owner's registration decisions:
 *  - SMS OTP step is gone (no gateway); email verification is the path.
 *  - No auto elevation to pro_worker on page load.
 *  - Government ID submission is what triggers elevation, and the account
 *    stays unverified until an admin reviews the document.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

const submitIdentityDocument = vi.fn(
  async (
    _documentType: string,
    _documentNumber: string,
    _userId: string,
  ): Promise<{ success: boolean; message: string }> => ({
    success: true,
    message: "Identity document submitted. It stays pending review.",
  }),
);
const upgradeToProWorker = vi.fn(async (): Promise<boolean> => true);

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: {
      id: "u1",
      email: "pro@example.com",
      email_confirmed_at: "2026-11-01T10:00:00Z",
    },
    loading: false,
  })),
}));

vi.mock("@/lib/worker-channels", () => ({
  submitIdentityDocument: (
    documentType: string,
    documentNumber: string,
    userId: string,
  ) => submitIdentityDocument(documentType, documentNumber, userId),
}));

vi.mock("@/lib/pro-connect", () => ({
  fetchCategories: vi.fn(async () => [
    { id: "c1", name: "Painters", slug: "painters", icon: null },
  ]),
  fetchServices: vi.fn(async () => []),
  fetchLocations: vi.fn(async () => [
    { id: "l1", country: "NG", state: "Lagos", city: "Ikeja" },
  ]),
  createProProfile: vi.fn(async () => ({ id: "p1", slug: "pro" })),
  updateProProfile: vi.fn(async () => true),
  updateProfileServices: vi.fn(async () => true),
  updateProfileLocations: vi.fn(async () => true),
  getMyProProfile: vi.fn(async () => null),
  getMyProContactPhone: vi.fn(async () => null),
  getProProfileCoverageForEdit: vi.fn(async () => ({
    ok: true,
    services: [],
    locations: [],
  })),
  generateProSlug: vi.fn(() => "pro"),
  isSlugAvailable: vi.fn(async () => true),
  upgradeToProWorker: () => upgradeToProWorker(),
  getAccountType: vi.fn(async () => "client"),
}));

vi.mock("@/lib/email-verification", () => ({
  resendSignupConfirmation: vi.fn(async () => ({
    success: true,
    message: "Confirmation email sent to pro@example.com",
  })),
  isEmailConfirmed: vi.fn(() => true),
}));

type IdentityStatusMock = {
  status: "none" | "pending" | "approved" | "rejected" | "more_info";
  documentType: string | null;
  submittedAt: string | null;
  autoVerified: boolean;
  verifiedAt: string | null;
  autoVerifyAt: string | null;
};

const fetchMyIdentityVerification = vi.fn(
  async (): Promise<IdentityStatusMock> => ({
    status: "none",
    documentType: null,
    submittedAt: null,
    autoVerified: false,
    verifiedAt: null,
    autoVerifyAt: null,
  }),
);

vi.mock("@/lib/identity-verification", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/identity-verification")>();
  return {
    ...actual,
    fetchMyIdentityVerification: () => fetchMyIdentityVerification(),
  };
});

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: "en" }),
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  submitIdentityDocument.mockResolvedValue({
    success: true,
    message: "Identity document submitted. It stays pending review.",
  });
  upgradeToProWorker.mockResolvedValue(true);
  fetchMyIdentityVerification.mockResolvedValue({
    status: "none",
    documentType: null,
    submittedAt: null,
    autoVerified: false,
    verifiedAt: null,
    autoVerifyAt: null,
  });
});

async function renderPage() {
  const Comp = (await import("@/pages/pro-connect/ProConnectRegister")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

/** Drive steps 1 to 3 so the email verification step is reachable. */
async function advanceToEmailStep() {
  await renderPage();
  const combos = await screen.findAllByRole("combobox");
  fireEvent.change(combos[0], { target: { value: "c1" } });
  fireEvent.click(screen.getByRole("button", { name: /^Continue$/ }));
  fireEvent.click(await screen.findByRole("button", { name: /^Continue$/ }));
  fireEvent.click(
    await screen.findByRole("button", { name: /Complete Profile/i }),
  );
}

describe("ProConnectRegister verification flow", () => {
  it("reaches the email verification step with no SMS OTP controls", async () => {
    await advanceToEmailStep();

    expect(
      await screen.findByRole("heading", { name: /Email Verification/i }),
    ).toBeTruthy();
    expect(screen.getByText("pro@example.com")).toBeTruthy();
    expect(screen.getByText(/Email confirmed/i)).toBeTruthy();
    expect(screen.queryByText(/Send Verification Code/i)).toBeNull();
    expect(screen.queryByText(/6-digit code/i)).toBeNull();
    expect(screen.getByText(/SMS gateway/i)).toBeTruthy();
  });

  it("does not elevate the account on page load", async () => {
    await renderPage();
    await screen.findAllByRole("combobox");
    await waitFor(() => {
      expect(upgradeToProWorker).not.toHaveBeenCalled();
    });
  });

  it("requires a government ID submission before elevation", async () => {
    await advanceToEmailStep();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue$/ }));

    expect(
      await screen.findByRole("heading", {
        name: /Government ID Verification/i,
      }),
    ).toBeTruthy();
    expect(screen.getAllByText(/unverified/i).length).toBeGreaterThan(0);
    // The submit button is disabled until a document number is entered.
    const submit = screen.getByRole("button", {
      name: /Submit ID for verification/i,
    });
    expect(submit).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByLabelText(/National Identification Number/i), {
      target: { value: "12345678901" },
    });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(submitIdentityDocument).toHaveBeenCalledWith(
        "national_id",
        "12345678901",
        "u1",
      );
    });
    await waitFor(() => expect(upgradeToProWorker).toHaveBeenCalledTimes(1));
    expect(
      await screen.findByText(/pending review|pending admin|submitted/i),
    ).toBeTruthy();
  });

  it("tells the professional the ID is verified automatically after the review window", async () => {
    await advanceToEmailStep();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue$/ }));

    expect(await screen.findByText(/verified automatically/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/National Identification Number/i), {
      target: { value: "12345678901" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Submit ID for verification/i }),
    );

    const pending = await screen.findByTestId("identity-pending-panel");
    expect(pending.textContent).toMatch(/automatic verification in about 15/i);
    expect(pending.textContent).toMatch(/automatically verified/i);
    expect(screen.queryByTestId("identity-verified-panel")).toBeNull();
  });

  it("shows the verified state when the automatic review has completed", async () => {
    fetchMyIdentityVerification.mockResolvedValue({
      status: "approved",
      documentType: "national_id",
      submittedAt: "2026-11-05T18:00:00Z",
      autoVerified: true,
      verifiedAt: "2026-11-05T18:16:00Z",
      autoVerifyAt: null,
    });
    await advanceToEmailStep();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue$/ }));

    const verified = await screen.findByTestId("identity-verified-panel");
    expect(verified.textContent).toMatch(/Identity verified/i);
    expect(verified.textContent).toMatch(/verified automatically/i);
  });

  it("rejects an invalid document number locally without calling the RPC", async () => {
    await advanceToEmailStep();
    fireEvent.click(await screen.findByRole("button", { name: /^Continue$/ }));

    fireEvent.change(
      await screen.findByLabelText(/National Identification Number/i),
      { target: { value: "12345" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Submit ID for verification/i }),
    );
    expect(await screen.findByText(/11-digit/i)).toBeTruthy();
    expect(submitIdentityDocument).not.toHaveBeenCalled();
    expect(upgradeToProWorker).not.toHaveBeenCalled();
  });
});
