import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ApiKeyRequestModal from "./ApiKeyRequestModal";
import type { ApiKeyPlan } from "@/lib/frelix-api/portal-client";

const MOCK_PLANS: ApiKeyPlan[] = [
  {
    key: "free",
    name: "Free",
    config: {
      priceMonthly: 0,
      currency: "USD",
      rateLimitPerMinute: 10,
      dailyQuota: 50,
      monthlyQuota: 1000,
      features: ["1,000 monthly calls", "10 req/min burst"],
    },
    active: true,
    sort_order: 1,
  },
  {
    key: "developer",
    name: "Developer",
    config: {
      priceMonthly: 19,
      currency: "USD",
      rateLimitPerMinute: 60,
      dailyQuota: 1000,
      monthlyQuota: 25000,
      features: ["25,000 monthly calls", "60 req/min burst"],
    },
    active: true,
    sort_order: 2,
  },
  {
    key: "pro",
    name: "Pro",
    config: {
      priceMonthly: 49,
      currency: "USD",
      rateLimitPerMinute: 120,
      dailyQuota: 5000,
      monthlyQuota: 100000,
      features: ["100,000 monthly calls", "120 req/min burst"],
    },
    active: true,
    sort_order: 3,
  },
  {
    key: "enterprise",
    name: "Enterprise",
    config: {
      priceMonthly: null,
      currency: "USD",
      rateLimitPerMinute: 600,
      dailyQuota: 50000,
      monthlyQuota: 1000000,
      features: ["Custom call quotas", "Dedicated support"],
    },
    active: true,
    sort_order: 5,
  },
];

vi.mock("@/lib/frelix-api/portal-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/frelix-api/portal-client")
  >("@/lib/frelix-api/portal-client");
  return {
    ...actual,
    createApiKey: vi.fn().mockResolvedValue({
      id: "key-uuid-1",
      name: "Test Frontend",
      rawKey: "FLX-TEST1234567890ABCDEF12345678",
      key_prefix: "FLX-TEST...",
      status: "active",
      plan_key: "free",
      created_at: new Date().toISOString(),
    }),
  };
});

describe("ApiKeyRequestModal", () => {
  it("progresses to step 2 and renders dynamic plans passed in props", () => {
    render(
      <ApiKeyRequestModal
        open={true}
        onOpenChange={vi.fn()}
        userPlanKey="free"
        plans={MOCK_PLANS}
        onUpgrade={vi.fn()}
      />,
    );

    // Enter key name on step 1
    const nameInput = screen.getByLabelText(/Key Name \/ Service Identifier/i);
    fireEvent.change(nameInput, { target: { value: "CI Runner" } });

    // Click Continue to Quota
    const nextBtn = screen.getByRole("button", { name: /Continue to Quota/i });
    fireEvent.click(nextBtn);

    // Step 2 should display plan names
    expect(screen.getByText("Developer")).toBeInTheDocument();
    expect(screen.getByText("Enterprise")).toBeInTheDocument();
    expect(screen.getAllByText(/\$19/).length).toBeGreaterThan(0);
  });

  it("triggers onUpgrade when clicking an unpurchased plan in step 2 and proceeding", () => {
    const onUpgradeMock = vi.fn();
    render(
      <ApiKeyRequestModal
        open={true}
        onOpenChange={vi.fn()}
        userPlanKey="free"
        plans={MOCK_PLANS}
        onUpgrade={onUpgradeMock}
      />,
    );

    // Step 1: name and advance
    const nameInput = screen.getByLabelText(/Key Name \/ Service Identifier/i);
    fireEvent.change(nameInput, { target: { value: "Mobile Client" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Quota/i }));

    // Step 2: Select Developer plan
    const devCard = screen.getByText("Developer");
    fireEvent.click(devCard);

    // Action button should say "Upgrade to Developer"
    const actionBtn = screen.getByRole("button", {
      name: /Upgrade to Developer/i,
    });
    expect(actionBtn).toBeInTheDocument();

    fireEvent.click(actionBtn);
    expect(onUpgradeMock).toHaveBeenCalledWith("developer");
  });

  it("generates key for current plan and presents copyable raw key in step 3", async () => {
    const onKeyCreatedMock = vi.fn();
    render(
      <ApiKeyRequestModal
        open={true}
        onOpenChange={vi.fn()}
        userPlanKey="free"
        plans={MOCK_PLANS}
        onKeyCreated={onKeyCreatedMock}
      />,
    );

    // Step 1: Enter name and continue
    const nameInput = screen.getByLabelText(/Key Name \/ Service Identifier/i);
    fireEvent.change(nameInput, { target: { value: "Test Frontend" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue to Quota/i }));

    // Step 2: Keep current Free plan, click "Generate API Key"
    const generateBtn = screen.getByRole("button", {
      name: /Generate API Key/i,
    });
    fireEvent.click(generateBtn);

    // Step 3: Raw key revealed
    await waitFor(() => {
      expect(
        screen.getAllByText(/FLX-TEST1234567890ABCDEF12345678/).length,
      ).toBeGreaterThan(0);
    });
    expect(onKeyCreatedMock).toHaveBeenCalled();
  });
});
