// ============================================================
// Phase 3 procurement state machine: deterministic transition
// tests. These mirror the database authority; drift between
// this map and migration 20261025150000 is a defect.
// ============================================================

import { describe, expect, it } from "vitest";
import {
  PROCUREMENT_STATUSES,
  PROCUREMENT_STATUS_LABELS,
  PROCUREMENT_TRANSITIONS,
  canTransition,
  isTerminal,
} from "./state-machine";

describe("procurement state machine", () => {
  it("covers all twelve auditable states from the roadmap", () => {
    expect(PROCUREMENT_STATUSES).toEqual([
      "listed",
      "quote_requested",
      "quoted",
      "approved",
      "purchase_ordered",
      "dispatched",
      "in_transit",
      "customs_hold",
      "delivered",
      "partial_delivery",
      "exception",
      "cancelled",
    ]);
  });

  it("starts at listed and can reach delivered via the happy path", () => {
    const happyPath = [
      "listed",
      "quote_requested",
      "quoted",
      "approved",
      "purchase_ordered",
      "dispatched",
      "in_transit",
      "delivered",
    ] as const;
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransition(happyPath[i], happyPath[i + 1])).toBe(true);
    }
  });

  it("makes delivered and cancelled terminal", () => {
    expect(isTerminal("delivered")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
  });

  it("rejects jumps and reversals outside the auditable map", () => {
    expect(canTransition("listed", "delivered")).toBe(false);
    expect(canTransition("quoted", "dispatched")).toBe(false);
    expect(canTransition("in_transit", "listed")).toBe(false);
    expect(canTransition("delivered", "in_transit")).toBe(false);
    expect(canTransition("cancelled", "listed")).toBe(false);
  });

  it("supports exception resolution without fabricating progress", () => {
    // From exception, recovery returns to the last physical state.
    expect(canTransition("exception", "purchase_ordered")).toBe(true);
    expect(canTransition("exception", "in_transit")).toBe(true);
    expect(canTransition("exception", "delivered")).toBe(true);
    expect(canTransition("exception", "cancelled")).toBe(true);
    // ...but never skips back to pre-order states.
    expect(canTransition("exception", "approved")).toBe(false);
    expect(canTransition("exception", "listed")).toBe(false);
  });

  it("supports customs hold and partial delivery flows", () => {
    expect(canTransition("in_transit", "customs_hold")).toBe(true);
    expect(canTransition("customs_hold", "in_transit")).toBe(true);
    expect(canTransition("in_transit", "partial_delivery")).toBe(true);
    expect(canTransition("partial_delivery", "in_transit")).toBe(true);
    expect(canTransition("partial_delivery", "delivered")).toBe(true);
    expect(canTransition("customs_hold", "delivered")).toBe(false);
  });

  it("allows cancelling before commitment, not after dispatch", () => {
    expect(canTransition("listed", "cancelled")).toBe(true);
    expect(canTransition("quoted", "cancelled")).toBe(true);
    expect(canTransition("approved", "cancelled")).toBe(true);
    expect(canTransition("purchase_ordered", "cancelled")).toBe(true);
    expect(canTransition("dispatched", "cancelled")).toBe(false);
    expect(canTransition("in_transit", "cancelled")).toBe(false);
  });

  it("labels every status professionally", () => {
    for (const status of PROCUREMENT_STATUSES) {
      const label = PROCUREMENT_STATUS_LABELS[status];
      expect(label).toBeTruthy();
      expect(label).not.toMatch(/magic|auto|smart/i);
    }
  });

  it("has a transition entry for every status (complete map)", () => {
    for (const status of PROCUREMENT_STATUSES) {
      expect(Array.isArray(PROCUREMENT_TRANSITIONS[status])).toBe(true);
    }
  });
});
