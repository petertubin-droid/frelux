// =========================================================
// FRELUX Pricing Plans, Configuration
//
// Subscription tiers with feature lists and prices in US dollars.
// USD is the canonical subscription currency: it is what the site
// advertises, what the server prices from, and what the checkout
// charges. Local settlement (naira on a Nigerian card) is quoted at
// checkout from an exchange rate the server records, never guessed
// on the client.
// =========================================================

import type { SubscriptionPlan } from "@/lib/subscription";

/** Canonical currency for subscription prices. */
export const SUBSCRIPTION_CURRENCY = "USD" as const;

export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  /** US dollars per month. */
  monthlyPrice: number;
  /** US dollars per year (two months free). */
  yearlyPrice: number;
  badge?: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Essential tools for planning your build",
    monthlyPrice: 0,
    yearlyPrice: 0,
    cta: "Get Started",
    features: [
      "Paint Calculator",
      "Screeding Calculator",
      "POP Ceiling Calculator",
      "Tile Calculator",
      "Community marketplace access",
      "Pro Connect profile",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For contractors and serious builders",
    monthlyPrice: 4.99,
    yearlyPrice: 49.99,
    cta: "Start Pro",
    features: [
      "Everything in Free",
      "Unlimited AI Photo Estimations",
      "Build-to-Roof Cost Estimator",
      "Painting Cost Estimator",
      "Screeding Cost Estimator",
      "Project management dashboard",
      "Saved projects (up to 25)",
      "Priority support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Full engineering toolkit for professionals",
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    badge: "Most Popular",
    highlight: true,
    cta: "Start Premium",
    features: [
      "Everything in Pro",
      "Structural Load Calculator",
      "Foundation Designer",
      "Construction Sequence Planner",
      "Project Timeline Estimator",
      "AI Color Consultation",
      "AI Project Assistant",
      "Unlimited saved projects",
      "Template downloads",
      "Pro Connect messaging",
      "Dedicated support line",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For firms managing multiple projects",
    monthlyPrice: 49.99,
    yearlyPrice: 499.99,
    cta: "Start Enterprise",
    features: [
      "Everything in Premium",
      "Multi-seat team accounts",
      "Centralized billing",
      "Custom material pricing",
      "White-label reports",
      "API access",
      "Dedicated account manager",
      "Custom integrations",
    ],
  },
];

/** Dollars to cents, without floating point drift (4.99 -> 499). */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Price in cents for a plan and billing cycle. Free is always 0. */
export function planPriceCents(
  plan: PricingPlan,
  cycle: "monthly" | "yearly",
): number {
  return toCents(cycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice);
}

/** Formatted USD price, e.g. $4.99, $0, $499.99. */
export function formatUsdPrice(amount: number): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: SUBSCRIPTION_CURRENCY,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Saving on the annual plan, as a whole percent. Computed from the
 * prices so the "save X%" badge can never drift from what is charged.
 */
export function yearlySavingPercent(plan: PricingPlan): number {
  if (plan.monthlyPrice <= 0 || plan.yearlyPrice <= 0) return 0;
  const full = plan.monthlyPrice * 12;
  if (plan.yearlyPrice >= full) return 0;
  return Math.round(((full - plan.yearlyPrice) / full) * 100);
}

export function getPlanById(id: SubscriptionPlan): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.id === id);
}

/** Plans that can be bought through checkout (everything with a price). */
export function isPurchasablePlan(id: SubscriptionPlan): boolean {
  const plan = getPlanById(id);
  return !!plan && plan.monthlyPrice > 0;
}
