/**
 * ExpensesTab i18n contract tests (roadmap Wave 1.1).
 *
 * Locks the internationalization rules:
 * - Money always renders in the PROJECT's own currency.
 * - A non-NGN project never shows NGN/₦ anywhere.
 * - Variance states (under / on track / over) render correctly.
 * - Empty state renders without crash.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExpensesTab } from "@/pages/contractor/ProjectDashboard";
import { computeBudgetVariance } from "@/lib/estimation/budget-variance-engine";
import type {
  BudgetVarianceResult,
} from "@/lib/estimation/budget-variance-engine";
import type { DbProjectExpense } from "@/types/database";

const noop = () => {};

function makeExpense(
  overrides: Partial<DbProjectExpense> = {},
): DbProjectExpense {
  return {
    id: "exp-1",
    project_id: "proj-1",
    category: "material",
    name: "Cement bags",
    amount: 4500,
    currency: "KES",
    spent_at: "2026-10-10",
    shopping_item_id: null,
    room_id: null,
    notes: null,
    sort_order: 0,
    created_at: "2026-10-10T00:00:00Z",
    updated_at: "2026-10-10T00:00:00Z",
    ...overrides,
  };
}

function baseProps(overrides: Record<string, unknown> = {}) {
  return {
    expenses: [] as DbProjectExpense[],
    variance: null as BudgetVarianceResult | null,
    currency: "KES",
    showForm: false,
    editingId: null,
    form: {
      category: "material" as const,
      name: "",
      amount: "",
      spent_at: "2026-10-14",
      notes: "",
    },
    saving: false,
    actionLoading: false,
    onFormChange: noop,
    onShowFormChange: noop,
    onSubmit: noop,
    onEdit: noop,
    onDelete: noop,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ExpensesTab internationalization", () => {
  it("renders amounts in the project's own currency (KES project, no ₦)", () => {
    const variance = computeBudgetVariance({
      estimated: { material: 10000, labour: 5000 },
      expenses: [{ category: "material", amount: 8000 }],
    });
    const { container } = render(
      <ExpensesTab
        {...baseProps({
          expenses: [makeExpense({ amount: 8000 })],
          variance,
        })}
      />,
    );

    const text = container.textContent ?? "";
    // KES formatting must appear; the NGN sign must never appear
    expect(text).toMatch(/KSh/i);
    expect(text).not.toContain("₦");
    expect(text).toContain("Cement bags");
  });

  it("renders every listed expense with its formatted amount", () => {
    const expenses = [
      makeExpense({ id: "e1", name: "Cement", amount: 12000 }),
      makeExpense({
        id: "e2",
        name: "Mason wages",
        amount: 6000,
        category: "labour",
      }),
    ];
    const { container } = render(
      <ExpensesTab {...baseProps({ expenses })} />,
    );
    const text = container.textContent ?? "";

    expect(screen.getByText("Cement")).toBeDefined();
    expect(screen.getByText("Mason wages")).toBeDefined();
    expect(text).toContain("Labour");
  });

  it("shows the variance summary with correct budget-burn percent", () => {
    const variance = computeBudgetVariance({
      estimated: { material: 10000, labour: 5000, transport: 2000, misc: 1000 },
      expenses: [
        { category: "material", amount: 9000 },
        { category: "labour", amount: 5000 },
        { category: "transport", amount: 2200 },
      ],
    });
    // 16200 of 18000 = 90%
    const { container } = render(
      <ExpensesTab
        {...baseProps({
          expenses: [makeExpense()],
          variance,
        })}
      />,
    );
    const text = container.textContent ?? "";
    expect(text).toMatch(/90%/);
    expect(screen.getByText("Estimated vs Actual")).toBeDefined();
    // Category rows present
    expect(screen.getByText("Materials")).toBeDefined();
    expect(screen.getByText("Transport")).toBeDefined();
    expect(screen.getByText("Miscellaneous")).toBeDefined();
  });

  it("labels over-budget categories and totals", () => {
    const variance = computeBudgetVariance({
      estimated: { material: 5000 },
      expenses: [{ category: "material", amount: 7000 }],
    });
    const { container } = render(
      <ExpensesTab {...baseProps({ variance })} />,
    );
    const text = container.textContent ?? "";
    expect(text).toContain("Over budget");
    expect(text).toMatch(/over estimate/i);
  });

  it("renders the empty state when no expenses exist", () => {
    const { container } = render(<ExpensesTab {...baseProps()} />);
    expect(container.textContent).toMatch(/No expenses recorded yet/i);
  });

  it("hides the variance summary when there is no estimated budget", () => {
    const variance = computeBudgetVariance({
      estimated: {},
      expenses: [{ category: "material", amount: 100 }],
    });
    const { container } = render(
      <ExpensesTab {...baseProps({ variance })} />,
    );
    expect(container.textContent).not.toContain("Estimated vs Actual");
  });
});
