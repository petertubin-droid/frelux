import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminIntegrations from "@/pages/admin/AdminIntegrations";

const mockGetIntegrationSettings = vi.fn();
const mockUpdateIntegrationSetting = vi.fn();

vi.mock("@/lib/crm", () => ({
  getIntegrationSettings: () => mockGetIntegrationSettings(),
  updateIntegrationSetting: (...args: any[]) => mockUpdateIntegrationSetting(...args),
}));

vi.mock("@/components/admin/ProviderKeyCards", () => ({
  ProviderKeyCards: () => <div data-testid="provider-key-cards">Provider Key Cards Mock</div>,
}));

const mockIntegrations = [
  {
    id: "int-1",
    integration_key: "stripe",
    display_name: "Stripe Payments",
    category: "payment",
    is_enabled: true,
    config: {
      publishable_key: "pk_test_12345",
      webhook_secret: "whsec_secret_abc",
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "int-2",
    integration_key: "google_analytics",
    display_name: "Google Analytics 4",
    category: "analytics",
    is_enabled: false,
    config: {
      measurement_id: "G-ABC12345",
    },
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("AdminIntegrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIntegrationSettings.mockResolvedValue(mockIntegrations);
    mockUpdateIntegrationSetting.mockResolvedValue({ success: true });
  });

  it("renders integration cards, metrics, and provider key cards", async () => {
    render(
      <MemoryRouter>
        <AdminIntegrations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Stripe Payments")).toBeInTheDocument();
      expect(screen.getAllByText("Google Analytics 4").length).toBeGreaterThan(0);
      expect(screen.getByTestId("provider-key-cards")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Toggle Stripe Payments")).toBeInTheDocument();
    expect(screen.getByLabelText("Toggle Google Analytics 4")).toBeInTheDocument();
  });

  it("toggles an integration status on and off", async () => {
    render(
      <MemoryRouter>
        <AdminIntegrations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Toggle Stripe Payments")).toBeInTheDocument();
    });

    const toggle = screen.getByLabelText("Toggle Stripe Payments");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(mockUpdateIntegrationSetting).toHaveBeenCalledWith("stripe", {
        is_enabled: false,
      });
      expect(mockGetIntegrationSettings).toHaveBeenCalledTimes(2);
    });
  });

  it("edits configuration field and saves updated config", async () => {
    render(
      <MemoryRouter>
        <AdminIntegrations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Save config for Google Analytics 4")).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue("G-ABC12345");
    fireEvent.change(input, { target: { value: "G-XYZ99999" } });

    const saveBtn = screen.getByLabelText("Save config for Google Analytics 4");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdateIntegrationSetting).toHaveBeenCalledWith("google_analytics", {
        config: {
          measurement_id: "G-XYZ99999",
        },
      });
    });
  });

  it("displays error banner when loading integrations fails", async () => {
    mockGetIntegrationSettings.mockRejectedValueOnce(new Error("Database connection refused"));

    render(
      <MemoryRouter>
        <AdminIntegrations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Database connection refused")).toBeInTheDocument();
    });
  });

  it("displays error banner when toggling integration fails", async () => {
    mockUpdateIntegrationSetting.mockRejectedValueOnce(new Error("Permission denied to update"));

    render(
      <MemoryRouter>
        <AdminIntegrations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Toggle Stripe Payments")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText("Toggle Stripe Payments"));

    await waitFor(() => {
      expect(screen.getByText("Permission denied to update")).toBeInTheDocument();
    });
  });

  it("masks secret configuration values with placeholder", async () => {
    render(
      <MemoryRouter>
        <AdminIntegrations />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Stripe Payments")).toBeInTheDocument();
    });

    // The webhook_secret contains 'secret', so it should not display raw text
    expect(screen.queryByDisplayValue("whsec_secret_abc")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
  });
});
