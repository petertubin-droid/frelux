import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useFaqJsonLd: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(),
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/components/ui/AdSlot", () => ({
  default: ({ slotKey }: { slotKey: string }) => (
    <div data-testid={`ad-${slotKey}`} />
  ),
}));
vi.mock("@/components/seo/SeoSections", () => ({
  RelatedTools: () => null,
  CALC_LINKS: { paintCalculator: {}, tileCalc: {}, finishEstimator: {} },
}));
vi.mock("@/components/ui/PageHeader", () => ({
  default: ({ title }: { title: string }) => (
    <header>
      <h1>{title}</h1>
    </header>
  ),
}));
vi.mock("@/components/estimation/RecommendedProducts", () => ({
  default: () => null,
}));
vi.mock("@/components/prices/PriceFreshnessNotice", () => ({
  default: () => null,
}));
vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => ({
    market: {
      marketCode: "NG",
      currencyCode: "NGN",
      currencySymbol: "₦",
      countryName: "Nigeria",
    },
    preferredLengthUnit: "meters",
    preferredAreaUnit: "sqm",
  }),
}));
vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ({
    currencyCode: "NGN",
    currencySymbol: "₦",
    format: (value: number) => value.toFixed(0),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FlooringEstimator", () => {
  it("module imports and exports a component", async () => {
    const mod = await import("@/pages/FlooringEstimator");
    expect(mod).toBeDefined();
    expect(Object.keys(mod).length).toBeGreaterThan(0);
    expect(Object.values(mod).some((x) => typeof x === "function")).toBe(true);
  });

  it("fills floor area and skirting from a building template and clears both on start over", async () => {
    const { default: Page } = await import("@/pages/FlooringEstimator");
    render(
      <MemoryRouter>
        <Page />
      </MemoryRouter>,
    );

    const picker = screen.getByLabelText(/building type/i) as HTMLSelectElement;
    const option = Array.from(picker.options).find(
      (item) => item.value && item.value !== "custom",
    );
    expect(option).toBeTruthy();
    fireEvent.change(picker, { target: { value: option!.value } });

    expect(
      (await screen.findAllByLabelText(/identical rooms/i)).length,
    ).toBeGreaterThan(0);
    const area = screen.getByLabelText(/floor area/i) as HTMLInputElement;
    const skirting = screen.getByLabelText(/skirting run/i) as HTMLInputElement;
    expect(Number(area.value)).toBeGreaterThan(0);
    expect(Number(skirting.value)).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /start over/i }));

    expect(
      (screen.getByLabelText(/floor area/i) as HTMLInputElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText(/skirting run/i) as HTMLInputElement).value,
    ).toBe("");
    expect(screen.queryAllByLabelText(/identical rooms/i)).toHaveLength(0);
  });
});
