import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminSettings from "./AdminSettings";

const { mockSettings, updateMock } = vi.hoisted(() => {
  const mockSettings = {
    id: "settings-row-1",
    site_name: "FRELUX Global",
    short_name: "FRELUX",
    tagline: "Intelligent ConTech Platform",
    description: "Building calculation and estimation",
    logo_url: "https://example.com/logo.png",
    contact_email: "admin@frelux.com",
    whatsapp_number: "+234800000000",
    default_currency: "NGN",
    default_currency_symbol: "₦",
    default_unit: "metric",
    maintenance_mode: false,
    maintenance_banner_enabled: false,
    maintenance_banner_message: "Scheduled server maintenance on Saturday.",
    seo_title: "FRELUX - ConTech Software",
    seo_description: "Top construction estimating platform",
    premium_subscriptions_enabled: true,
    payment_gateway: "paystack",
    manual_paint_bucket_sizes: [20, 4],
    loader_config: null,
  };

  return {
    mockSettings,
    updateMock: vi.fn(),
  };
});

vi.mock("@/lib/widget-settings", () => ({
  useWidgetSettings: vi.fn(() => ({
    bottomNavEnabled: true,
    liveChatEnabled: false,
    updateWidgetSettings: vi.fn(),
  })),
}));

vi.mock("@/lib/useHeroContent", () => ({
  invalidateHeroContentCache: vi.fn(),
}));

vi.mock("@/components/ui/BrandedLoader", () => ({
  DEFAULT_LOADER_CONFIG: {},
  LOADER_CATEGORY_ORDER: [
    { value: "premium", label: "Premium", hint: "Brand-forward circles" },
  ],
  LOADER_STYLE_OPTIONS: [
    {
      value: "gradient_ring",
      label: "Aurora Ring",
      description: "Default ring",
      category: "premium",
    },
  ],
  LoaderVisual: () => <div data-testid="loader-visual">Loader</div>,
  invalidateLoaderConfigCache: vi.fn(),
}));

vi.mock("@/components/admin/MediaUploader", () => ({
  MediaUploader: () => <div data-testid="media-uploader">Media Uploader</div>,
}));

vi.mock("@/components/layout/MaintenanceTicker", () => ({
  default: () => <div data-testid="maintenance-ticker">Ticker</div>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "site_settings") {
        return {
          select: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { ...mockSettings },
                error: null,
              }),
            })),
          })),
          update: vi.fn((patch: any) => ({
            eq: vi.fn().mockImplementation((col: string, val: string) => {
              updateMock(patch, col, val);
              return Promise.resolve({ error: null });
            }),
          })),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminSettings />
    </MemoryRouter>,
  );
}

function selectWithOption(value: string): HTMLSelectElement {
  const found = screen
    .getAllByRole("combobox")
    .find((el) =>
      Array.from((el as HTMLSelectElement).options).some(
        (o) => o.value === value,
      ),
    );
  if (!found) throw new Error(`no select offers the option ${value}`);
  return found as HTMLSelectElement;
}

describe("AdminSettings", () => {
  it("renders page header and site settings fields", async () => {
    renderPage();

    expect(
      await screen.findByRole("heading", { level: 1, name: /Site Settings/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Save changes/i }),
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("FRELUX Global")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Intelligent ConTech Platform"),
    ).toBeInTheDocument();
  });

  it("modifies site name and saves updates", async () => {
    renderPage();

    const siteNameInput = await screen.findByDisplayValue("FRELUX Global");
    fireEvent.change(siteNameInput, {
      target: { value: "FRELUX International" },
    });

    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          site_name: "FRELUX International",
        }),
        "id",
        "settings-row-1",
      );
    });

    expect(await screen.findByText(/Settings saved\./i)).toBeInTheDocument();
  });

  it("handles bucket sizes modification", async () => {
    renderPage();

    const bucketInput = await screen.findByDisplayValue("20, 4");
    fireEvent.change(bucketInput, { target: { value: "25, 5, 1" } });

    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          manual_paint_bucket_sizes: [25, 5, 1],
        }),
        "id",
        "settings-row-1",
      );
    });
  });

  it("validates empty bucket sizes", async () => {
    renderPage();

    const bucketInput = await screen.findByDisplayValue("20, 4");
    fireEvent.change(bucketInput, { target: { value: "invalid, abc" } });

    expect(
      await screen.findByText(/Enter at least one valid bucket size/i),
    ).toBeInTheDocument();
  });

  it("offers every rail FRELUX can charge through, including crypto and Bitcoin", async () => {
    // The console listed Paystack and Flutterwave only, so FRELUX PAY could
    // not be chosen even though the checkout, verification, webhook and key
    // registry for both crypto rails already existed.
    renderPage();

    await screen.findByDisplayValue("FRELUX Global");
    const gateway = selectWithOption("btcpay");
    const values = Array.from(gateway.options).map((o) => o.value);

    expect(values).toEqual([
      "paystack",
      "flutterwave",
      "nowpayments",
      "btcpay",
    ]);
    expect(
      screen.getByRole("option", { name: /Crypto, multi-currency/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Bitcoin \(BTCPay\)/i }),
    ).toBeInTheDocument();
  });

  it("saves a Bitcoin gateway selection instead of falling back to Paystack", async () => {
    renderPage();

    await screen.findByDisplayValue("FRELUX Global");
    fireEvent.change(selectWithOption("btcpay"), {
      target: { value: "btcpay" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ payment_gateway: "btcpay" }),
        "id",
        "settings-row-1",
      );
    });
  });

  it("only offers default currencies a rail can actually collect", async () => {
    renderPage();

    await screen.findByDisplayValue("FRELUX Global");
    const currency = selectWithOption("USD");
    const values = Array.from(currency.options).map((o) => o.value);

    // A free-text field let an admin save a code no gateway settles.
    expect(values).toContain("USD");
    expect(values).toContain("GHS");
    expect(values).toContain("KES");
    expect(values).not.toContain("XXX");
    expect(values).not.toContain("ABC");
  });
});
