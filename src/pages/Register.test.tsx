import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "./Register";

const mockSignUp = vi.fn();

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    signUp: mockSignUp,
    configured: true,
  })),
}));

vi.mock("@/components/security/TurnstileWidget", () => ({
  TurnstileWidget: () => <div data-testid="turnstile-widget" />,
}));

vi.mock("@/components/security/useTurnstileGate", () => ({
  useTurnstileGate: vi.fn(() => ({
    gate: vi.fn().mockResolvedValue({ ok: true }),
    setToken: vi.fn(),
    errorMessage: vi.fn().mockReturnValue("Security check failed"),
  })),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockSignUp.mockResolvedValue({ error: null, needsConfirmation: false });
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );
}

describe("Register Component - Premium Google Form", () => {
  it("renders Google Form header, required question indicator, and account types", () => {
    renderRegister();

    expect(
      screen.getByText(/FRELUX Worldwide Registration/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\* Indicates required question/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Client \/ Property Developer/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pro Worker \/ Contractor/i)).toBeInTheDocument();
  });

  it("requires Email and Location as mandatory fields", async () => {
    renderRegister();

    const submitBtn = screen.getByRole("button", {
      name: /Submit Registration/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Full legal name is required/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Email address is required/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Location \(City, State \/ Region\) is a mandatory field/i,
        ),
      ).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it("shows 11-digit NIN requirement when Nigeria (NG) is selected", async () => {
    renderRegister();

    expect(
      screen.getByText(/Federal Republic of Nigeria — NIMC Standard/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/National Identification Number \(NIN\)/i),
    ).toBeInTheDocument();

    const ninInput = screen.getByPlaceholderText(
      /Enter official 11-digit NIN/i,
    );
    expect(ninInput).toBeInTheDocument();

    // Fill invalid NIN (< 11 digits)
    fireEvent.change(ninInput, { target: { value: "12345" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Submit Registration/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(/NIN must contain exactly 11 digits/i),
      ).toBeInTheDocument();
    });
  });

  it("switches to Government ID Document for international countries (e.g. US)", async () => {
    renderRegister();

    const countrySelect = screen.getByLabelText(/Country \/ Jurisdiction/i);
    fireEvent.change(countrySelect, { target: { value: "US" } });

    await waitFor(() => {
      expect(
        screen.getByText(/United States — Government Identity Document/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Document Type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Document Number/i)).toBeInTheDocument();
    });

    expect(
      screen.queryByPlaceholderText(/Enter official 11-digit NIN/i),
    ).not.toBeInTheDocument();
  });

  it("submits Client account registration end-to-end with email, location, phone, and NIN", async () => {
    renderRegister();

    fireEvent.change(screen.getByLabelText(/Full Legal Name/i), {
      target: { value: "Emeka Okafor" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "emeka@example.com" },
    });
    fireEvent.change(
      screen.getByLabelText(/Location \(City, State \/ Region\)/i),
      {
        target: { value: "Victoria Island, Lagos" },
      },
    );
    fireEvent.change(screen.getByLabelText(/Mobile \/ Phone Number/i), {
      target: { value: "8023456789" },
    });
    fireEvent.change(
      screen.getByPlaceholderText(/Enter official 11-digit NIN/i),
      {
        target: { value: "12345678901" },
      },
    );
    fireEvent.change(screen.getByLabelText(/Create Password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "Password123!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Submit Registration/i }),
    );

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        "emeka@example.com",
        "Password123!",
        "client",
        expect.objectContaining({
          full_name: "Emeka Okafor",
          location: "Victoria Island, Lagos",
          phone: "+2348023456789",
          country_code: "NG",
          nin_number: "12345678901",
          government_id_type: "national_id",
          government_id_number: "12345678901",
        }),
      );
    });

    // Check Google-Form styled success view
    await waitFor(() => {
      expect(screen.getByText(/Response Recorded/i)).toBeInTheDocument();
      expect(
        screen.getByText(/FRELUX Registration Completed/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/Victoria Island, Lagos/i)).toBeInTheDocument();
      expect(screen.getByText(/NIN: 12345678901/i)).toBeInTheDocument();
    });
  });

  it("submits Pro Worker account registration with trade specialization and international ID", async () => {
    renderRegister();

    // Select Pro Worker
    fireEvent.click(screen.getByText(/Pro Worker \/ Contractor/i));

    // Change country to United Kingdom (GB)
    fireEvent.change(screen.getByLabelText(/Country \/ Jurisdiction/i), {
      target: { value: "GB" },
    });

    fireEvent.change(screen.getByLabelText(/Full Legal Name/i), {
      target: { value: "James Wilson" },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: "james.wilson@builduk.example" },
    });
    fireEvent.change(
      screen.getByLabelText(/Location \(City, State \/ Region\)/i),
      {
        target: { value: "Manchester, England" },
      },
    );
    fireEvent.change(screen.getByLabelText(/Mobile \/ Phone Number/i), {
      target: { value: "7911123456" },
    });

    // Fill Government ID
    fireEvent.change(screen.getByLabelText(/Document Number/i), {
      target: { value: "GB-PASS-998877" },
    });

    // Fill Pro Worker Trade Info
    expect(
      screen.getByText(/4\. Professional Trade & Experience/i),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Business \/ Trade Name/i), {
      target: { value: "Wilson Master Builders" },
    });

    // Passwords
    fireEvent.change(screen.getByLabelText(/Create Password/i), {
      target: { value: "SecurePass2026!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: "SecurePass2026!" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Submit Registration/i }),
    );

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        "james.wilson@builduk.example",
        "SecurePass2026!",
        "pro_worker",
        expect.objectContaining({
          full_name: "James Wilson",
          location: "Manchester, England",
          country_code: "GB",
          government_id_type: "national_id",
          government_id_number: "GB-PASS-998877",
          business_name: "Wilson Master Builders",
        }),
      );
    });
  });
});
