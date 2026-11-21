import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import StandaloneTakeoffPage from "./StandaloneTakeoffPage";

const mockUseCalcRules = vi.fn();
vi.mock("@/lib/use-calc-defaults", () => ({
  useCalcRules: (type?: string) => mockUseCalcRules(type),
  getRuleValue: (
    rule: { rule_value?: { value?: number } } | undefined,
    fallback: number,
  ) => {
    if (typeof rule?.rule_value?.value === "number") {
      return rule.rule_value.value;
    }
    return fallback;
  },
}));

vi.mock("@/lib/international/market-context", () => ({
  useSeoOfferCurrency: () => "NGN",
  useMarket: () => ({
    market: { marketCode: "NG", country_name: "Nigeria" },
    availableMarkets: [{ country_code: "NG", country_name: "Nigeria" }],
  }),
}));

vi.mock("@/lib/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/i18n")>();
  return {
    ...actual,
    useLanguage: () =>
      ({ t: (key: string) => key }) as unknown as ReturnType<
        typeof actual.useLanguage
      >,
  };
});

vi.mock("@/lib/seo", () => ({
  useFaqJsonLd: vi.fn(),
  useSeo: () => {},
  useBreadcrumbJsonLd: () => {},
}));

vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

describe("StandaloneTakeoffPage dynamic admin rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads admin defaults for drainage", async () => {
    mockUseCalcRules.mockReturnValue({
      rules: {
        default_pipe_diameter_mm: { rule_value: { value: 160 } },
        default_fall_mm_per_m: { rule_value: { value: 20 } },
      },
      loading: false,
      loadedCalculatorType: "drainage",
      error: null,
    });

    render(
      <MemoryRouter>
        <StandaloneTakeoffPage initialEngine="drainage" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Administrator-configured starting values are loaded/i,
        ),
      ).toBeInTheDocument();
    });

    const diameterInput = screen.getByLabelText(
      /Pipe diameter/i,
    ) as HTMLInputElement;
    expect(diameterInput.value).toBe("160");

    const fallInput = screen.getByLabelText(
      /Specified fall/i,
    ) as HTMLInputElement;
    expect(fallInput.value).toBe("20");
  });

  it("loads admin defaults for temporary-works (mapped to temporary_works)", async () => {
    mockUseCalcRules.mockReturnValue({
      rules: {
        default_scaffold_length_m: { rule_value: { value: 24 } },
        default_scaffold_height_m: { rule_value: { value: 8 } },
      },
      loading: false,
      loadedCalculatorType: "temporary_works",
      error: null,
    });

    render(
      <MemoryRouter>
        <StandaloneTakeoffPage initialEngine="temporary-works" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Administrator-configured starting values are loaded/i,
        ),
      ).toBeInTheDocument();
    });

    const scaffoldLen = screen.getByLabelText(
      /Scaffold run/i,
    ) as HTMLInputElement;
    expect(scaffoldLen.value).toBe("24");

    const scaffoldHt = screen.getByLabelText(
      /Working height/i,
    ) as HTMLInputElement;
    expect(scaffoldHt.value).toBe("8");
  });

  it("loads admin defaults for insulation", async () => {
    mockUseCalcRules.mockReturnValue({
      rules: {
        default_thickness_mm: { rule_value: { value: 150 } },
        default_pack_coverage_m2: { rule_value: { value: 7.5 } },
      },
      loading: false,
      loadedCalculatorType: "insulation",
      error: null,
    });

    render(
      <MemoryRouter>
        <StandaloneTakeoffPage initialEngine="insulation" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Administrator-configured starting values are loaded/i,
        ),
      ).toBeInTheDocument();
    });

    const thicknessInput = screen.getByLabelText(
      /Insulation thickness/i,
    ) as HTMLInputElement;
    expect(thicknessInput.value).toBe("150");

    const packCoverageInput = screen.getByLabelText(
      /Product pack coverage/i,
    ) as HTMLInputElement;
    expect(packCoverageInput.value).toBe("7.5");
  });

  it("loads admin defaults for demolition", async () => {
    mockUseCalcRules.mockReturnValue({
      rules: {
        default_bulking_factor: { rule_value: { value: 1.5 } },
        default_skip_capacity_m3: { rule_value: { value: 12 } },
      },
      loading: false,
      loadedCalculatorType: "demolition",
      error: null,
    });

    render(
      <MemoryRouter>
        <StandaloneTakeoffPage initialEngine="demolition" />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          /Administrator-configured starting values are loaded/i,
        ),
      ).toBeInTheDocument();
    });

    const bulkingInput = screen.getByLabelText(
      /Debris bulking factor/i,
    ) as HTMLInputElement;
    expect(bulkingInput.value).toBe("1.5");

    const skipInput = screen.getByLabelText(
      /Skip capacity/i,
    ) as HTMLInputElement;
    expect(skipInput.value).toBe("12");
  });
});
