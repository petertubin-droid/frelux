/**
 * What an API request costs, and when a key may keep working.
 *
 * The rule this file exists to enforce: an integrator should never be cut off
 * in the middle of a run, and should never be surprised by an invoice. Calls
 * inside the included allowance cost nothing. Calls past it fall into a grace
 * band that is always allowed, so a batch that slightly overshoots finishes.
 * Past the grace band, overage is paid from a prepaid balance. Only when the
 * grace band and the balance are both gone does the API refuse, and then it
 * refuses loudly with a 402 and the numbers attached.
 *
 * Money here is only a decision about permission and accounting. It never
 * changes what an engine computes.
 */

export interface ApiPlanConfig {
  monthlyQuota?: number | null;
  calculatorRequestsMonthly?: number | null;
  aiRequestsMonthly?: number | null;
  gracePercent?: number | null;
  overagePerRequestUsd?: number | null;
  overagePerAiRequestUsd?: number | null;
  effectivePerRequestUsd?: number | null;
}

export interface ApiPlanLimits {
  /** Included billable requests per calendar month. */
  included: number;
  /** Included AI-assisted requests inside that total. */
  includedAi: number;
  /** Percentage of the allowance always granted past the limit. */
  gracePercent: number;
  overagePerRequestUsd: number | null;
  overagePerAiRequestUsd: number | null;
  /** Included rate, used for reporting what the allowance is worth. */
  effectivePerRequestUsd: number;
}

const DEFAULT_GRACE_PERCENT = 5;

export function limitsFromPlanConfig(
  config: ApiPlanConfig | null | undefined,
): ApiPlanLimits {
  const included = Math.max(
    0,
    Math.floor(Number(config?.monthlyQuota ?? 0) || 0),
  );
  const includedAi = Math.max(
    0,
    Math.floor(Number(config?.aiRequestsMonthly ?? 0) || 0),
  );
  const grace = Number(config?.gracePercent ?? DEFAULT_GRACE_PERCENT);
  return {
    included,
    includedAi,
    gracePercent:
      Number.isFinite(grace) && grace >= 0 ? grace : DEFAULT_GRACE_PERCENT,
    overagePerRequestUsd:
      config?.overagePerRequestUsd == null
        ? null
        : Number(config.overagePerRequestUsd),
    overagePerAiRequestUsd:
      config?.overagePerAiRequestUsd == null
        ? null
        : Number(config.overagePerAiRequestUsd),
    effectivePerRequestUsd: Number(config?.effectivePerRequestUsd ?? 0) || 0,
  };
}

export type BillingState = "included" | "grace" | "overage" | "exhausted";

export interface BillingDecision {
  state: BillingState;
  /** Requests charged against the allowance plus the one in flight. */
  usedAfter: number;
  /** Requests still available inside the grace band. */
  graceRemaining: number;
  /** Amount this request draws from the prepaid balance, in USD. */
  chargeUsd: number;
  /** True when the request may proceed. */
  allowed: boolean;
}

export interface BillingInput {
  limits: ApiPlanLimits;
  /** Billable requests already used this month, before this one. */
  usedThisMonth: number;
  /** Whether this request used an AI-assisted capability. */
  isAi: boolean;
  /** Prepaid balance in USD. */
  balanceUsd: number;
}

/**
 * Decide one request. Pure: no clock, no IO, so the rules can be tested
 * exactly and reasoned about on an invoice.
 */
export function decideBilling(input: BillingInput): BillingDecision {
  const { limits, isAi, balanceUsd } = input;
  const usedThisMonth = Math.max(0, Math.floor(input.usedThisMonth));
  const usedAfter = usedThisMonth + 1;
  const graceAllowance = Math.floor(
    (limits.included * limits.gracePercent) / 100,
  );

  if (usedAfter <= limits.included) {
    return {
      state: "included",
      usedAfter,
      graceRemaining: graceAllowance,
      chargeUsd: 0,
      allowed: true,
    };
  }

  const overageRate = isAi
    ? limits.overagePerAiRequestUsd
    : limits.overagePerRequestUsd;

  // A plan with no overage rate (the free tier) has no way to pay past the
  // allowance, so its grace band is the end of the road. That is deliberate:
  // an unpaid key must never accrue a debt.
  if (overageRate == null) {
    const graceRemaining = Math.max(
      0,
      limits.included + graceAllowance - usedThisMonth,
    );
    if (graceRemaining > 0) {
      return {
        state: "grace",
        usedAfter,
        graceRemaining: graceRemaining - 1,
        chargeUsd: 0,
        allowed: true,
      };
    }
    return {
      state: "exhausted",
      usedAfter,
      graceRemaining: 0,
      chargeUsd: 0,
      allowed: false,
    };
  }

  const cost = round4(overageRate);
  const inGrace = usedAfter <= limits.included + graceAllowance;

  if (inGrace) {
    // Grace is granted even with an empty balance, so a running batch finishes.
    // The charge is still recorded when the balance can cover it.
    return {
      state: "grace",
      usedAfter,
      graceRemaining: Math.max(0, limits.included + graceAllowance - usedAfter),
      chargeUsd: balanceUsd >= cost ? cost : 0,
      allowed: true,
    };
  }

  if (balanceUsd >= cost) {
    return {
      state: "overage",
      usedAfter,
      graceRemaining: 0,
      chargeUsd: cost,
      allowed: true,
    };
  }

  return {
    state: "exhausted",
    usedAfter,
    graceRemaining: 0,
    chargeUsd: 0,
    allowed: false,
  };
}

/** Statuses that cost the caller money. A rejection is never billed. */
export function isBillableStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

export interface QuotaHeaderInput {
  limits: ApiPlanLimits;
  decision: BillingDecision;
  /** Billable requests used this month, including this one. */
  usedThisMonth: number;
  balanceUsd: number;
  /** USD spent this calendar month, for the caller's own records. */
  monthCostUsd: number;
}

/**
 * Headers on every response, success or refusal. An integrator should be able
 * to plan capacity from the response itself rather than from support email.
 */
export function billingHeaders(
  input: QuotaHeaderInput,
): Record<string, string> {
  const { limits, decision, usedThisMonth, balanceUsd, monthCostUsd } = input;
  return {
    "X-Frelux-Quota-Included": String(limits.included),
    "X-Frelux-Quota-Used": String(usedThisMonth),
    "X-Frelux-Quota-Remaining": String(
      Math.max(0, limits.included - usedThisMonth),
    ),
    "X-Frelux-Grace-Remaining": String(decision.graceRemaining),
    "X-Frelux-Billing-State": decision.state,
    "X-Frelux-Request-Cost-Usd": decision.chargeUsd.toFixed(4),
    "X-Frelux-Month-Cost-Usd": round4(monthCostUsd).toFixed(4),
    "X-Frelux-Balance-Usd": round4(balanceUsd).toFixed(4),
  };
}

/** What a refused call says, in words an integrator can act on tonight. */
export function exhaustedMessage(limits: ApiPlanLimits): string {
  return (
    `Monthly allowance of ${limits.included} billable requests is used, ` +
    `including the ${limits.gracePercent}% grace band. ` +
    `Raise the plan or top up the prepaid API balance to continue. ` +
    `Requests that returned 4xx or 5xx are never billed.`
  );
}
