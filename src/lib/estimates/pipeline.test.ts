import { describe, expect, it } from "vitest";
import {
  daysSince,
  daysUntilExpiry,
  filterQuotes,
  needsFollowUp,
  quoteExpiryDate,
  summariseQuotes,
} from "./pipeline";
import type { DbClientEstimate } from "@/types/database";

const NOW = new Date("2026-10-31T10:00:00.000Z");

function quote(overrides: Partial<DbClientEstimate> = {}): DbClientEstimate {
  return {
    id: overrides.id ?? "q1",
    project_id: "p1",
    user_id: "u1",
    estimate_number: overrides.estimate_number ?? "EST-001",
    title: overrides.title ?? "Three bed repaint",
    description: null,
    materials_cost: 0,
    labour_cost: 0,
    transport_cost: 0,
    misc_cost: 0,
    markup_percentage: 0,
    markup_amount: 0,
    grand_total: overrides.grand_total ?? 1000,
    currency: overrides.currency ?? "NGN",
    materials_summary: [],
    validity_days: overrides.validity_days ?? 30,
    notes: null,
    terms_conditions: null,
    client_name: overrides.client_name ?? "Ada",
    client_email: null,
    client_phone: null,
    status: overrides.status ?? "sent",
    share_token: null,
    shared_at: overrides.shared_at ?? null,
    viewed_at: overrides.viewed_at ?? null,
    approved_at: overrides.approved_at ?? null,
    changes_requested_at: overrides.changes_requested_at ?? null,
    client_feedback: null,
    price_snapshot: {},
    created_at: overrides.created_at ?? "2026-10-20T10:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-10-20T10:00:00.000Z",
  } as DbClientEstimate;
}

describe("quote timing", () => {
  it("counts whole days and never reports a negative age", () => {
    expect(daysSince("2026-10-01T10:00:00.000Z", NOW)).toBe(30);
    expect(daysSince("2026-11-05T10:00:00.000Z", NOW)).toBe(0);
    expect(daysSince(null, NOW)).toBeNull();
  });

  it("counts validity from the day the client received the quote", () => {
    const expiry = quoteExpiryDate({
      validity_days: 30,
      shared_at: "2026-10-01T00:00:00.000Z",
      created_at: "2026-09-01T00:00:00.000Z",
    });
    expect(expiry?.toISOString()).toBe("2026-10-31T00:00:00.000Z");
  });

  it("falls back to creation when the quote was never shared", () => {
    const expiry = quoteExpiryDate({
      validity_days: 10,
      shared_at: null,
      created_at: "2026-10-25T00:00:00.000Z",
    });
    expect(expiry?.toISOString()).toBe("2026-11-04T00:00:00.000Z");
  });

  it("stops counting validity once the client has answered", () => {
    const base = {
      validity_days: 30,
      shared_at: "2026-10-01T00:00:00.000Z",
      created_at: "2026-09-01T00:00:00.000Z",
    };
    expect(daysUntilExpiry({ ...base, status: "approved" }, NOW)).toBeNull();
    expect(daysUntilExpiry({ ...base, status: "sent" }, NOW)).toBe(0);
  });
});

describe("follow up", () => {
  it("flags an open quote that has been quiet for the window", () => {
    const quiet = quote({
      status: "sent",
      shared_at: "2026-10-26T09:00:00.000Z",
    });
    expect(needsFollowUp(quiet, NOW)).toBe(true);
  });

  it("does not flag a quote the client opened yesterday", () => {
    const fresh = quote({
      status: "viewed",
      shared_at: "2026-10-20T09:00:00.000Z",
      viewed_at: "2026-10-30T09:00:00.000Z",
    });
    expect(needsFollowUp(fresh, NOW)).toBe(false);
  });

  it("never flags a decided quote", () => {
    const approved = quote({
      status: "approved",
      shared_at: "2026-09-01T09:00:00.000Z",
    });
    expect(needsFollowUp(approved, NOW)).toBe(false);
  });
});

describe("summary", () => {
  it("keeps currencies apart instead of adding them", () => {
    const summary = summariseQuotes(
      [
        quote({ id: "a", status: "sent", grand_total: 1000, currency: "NGN" }),
        quote({
          id: "b",
          status: "viewed",
          grand_total: 4000,
          currency: "NGN",
        }),
        quote({
          id: "c",
          status: "approved",
          grand_total: 300,
          currency: "USD",
        }),
      ],
      NOW,
    );

    const ngn = summary.currencies.find((row) => row.currency === "NGN");
    const usd = summary.currencies.find((row) => row.currency === "USD");
    expect(ngn).toMatchObject({ open: 5000, openCount: 2, approved: 0 });
    expect(usd).toMatchObject({ open: 0, approved: 300, approvedCount: 1 });
  });

  it("reports no acceptance rate until a client has answered", () => {
    const summary = summariseQuotes([quote({ status: "sent" })], NOW);
    expect(summary.acceptanceRate).toBeNull();
    expect(summary.decidedCount).toBe(0);
  });

  it("derives acceptance from answered quotes only", () => {
    const summary = summariseQuotes(
      [
        quote({ id: "a", status: "approved" }),
        quote({ id: "b", status: "changes_requested" }),
        quote({ id: "c", status: "sent" }),
      ],
      NOW,
    );
    expect(summary.acceptedCount).toBe(1);
    expect(summary.decidedCount).toBe(2);
    expect(summary.acceptanceRate).toBe(0.5);
    expect(summary.byStage.sent).toBe(1);
  });

  it("surfaces quotes that need chasing and ones about to lapse", () => {
    const summary = summariseQuotes(
      [
        quote({
          id: "quiet",
          status: "sent",
          shared_at: "2026-10-20T09:00:00.000Z",
        }),
        quote({
          id: "lapsing",
          status: "viewed",
          validity_days: 15,
          shared_at: "2026-10-15T09:00:00.000Z",
        }),
      ],
      NOW,
    );
    expect(summary.followUp.map((row) => row.id)).toEqual(["quiet", "lapsing"]);
    expect(summary.expiringSoon.map((row) => row.id)).toEqual(["lapsing"]);
  });
});

describe("filtering", () => {
  const rows = [
    quote({
      id: "a",
      status: "draft",
      estimate_number: "EST-100",
      client_name: "Ada Obi",
    }),
    quote({
      id: "b",
      status: "sent",
      estimate_number: "EST-101",
      title: "Roof repair",
      client_name: "Bola Eze",
    }),
    quote({
      id: "c",
      status: "approved",
      estimate_number: "EST-102",
      title: "Office repaint",
      client_name: "Chidi Umeh",
    }),
  ];

  it("treats open as the two stages still with the client", () => {
    expect(filterQuotes(rows, { stage: "open" }).map((row) => row.id)).toEqual([
      "b",
    ]);
  });

  it("searches number, title and client name", () => {
    expect(
      filterQuotes(rows, { stage: "all", search: "est-102" }).map(
        (row) => row.id,
      ),
    ).toEqual(["c"]);
    expect(
      filterQuotes(rows, { stage: "all", search: "roof" }).map((row) => row.id),
    ).toEqual(["b"]);
    expect(
      filterQuotes(rows, { stage: "all", search: "ada" }).map((row) => row.id),
    ).toEqual(["a"]);
  });

  it("combines a stage with a search", () => {
    expect(filterQuotes(rows, { stage: "approved", search: "ada" })).toEqual(
      [],
    );
  });
});
