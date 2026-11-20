import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The marketplace inquiry thread's data layer.
 *
 * These tests hold the two promises the thread makes to the page: a read that
 * fails returns nothing rather than throwing (so the UI shows an empty thread,
 * not a crash), and a send reports *why* it failed instead of returning null,
 * because a composer that silently does nothing is the bug this replaced.
 */

const state: {
  user: { id: string } | null;
  rows: unknown[];
  selectError: { message: string } | null;
  insertError: { message: string } | null;
  updateError: { message: string } | null;
  inserted: Record<string, unknown> | null;
  inquiry: { id: string; status: string; created_at: string } | null;
} = {
  user: { id: "buyer-1" },
  rows: [],
  selectError: null,
  insertError: null,
  updateError: null,
  inserted: null,
  inquiry: null,
};

const insertedRows: Record<string, unknown>[] = [];
type CapturedUpdate = {
  table: string;
  payload: Record<string, unknown>;
  builder: Record<string, unknown>;
};
const updateFilters: CapturedUpdate[] = [];

/** Filter pairs recorded by a mock builder, as [column, value] tuples. */
function filters(builder: Record<string, unknown>, key: "__eq" | "__neq") {
  return (builder[key] ?? []) as [string, unknown][];
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: state.user } })),
    },
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      const chain = () => builder;
      Object.assign(builder, {
        select: chain,
        eq: (column: string, value: unknown) => {
          const list = (builder.__eq ||= []) as [string, unknown][];
          list.push([column, value]);
          return builder;
        },
        neq: (column: string, value: unknown) => {
          const list = (builder.__neq ||= []) as [string, unknown][];
          list.push([column, value]);
          return builder;
        },
        order: chain,
        limit: chain,
        update: (payload: Record<string, unknown>) => {
          updateFilters.push({ table, payload, builder });
          return builder;
        },
        insert: (payload: Record<string, unknown>) => {
          insertedRows.push(payload);
          state.inserted = payload;
          return builder;
        },
        maybeSingle: async () => ({
          data:
            table === "marketplace_product_inquiries" ? state.inquiry : null,
          error: state.selectError,
        }),
        single: async () =>
          state.insertError
            ? { data: null, error: state.insertError }
            : {
                data: {
                  id: "msg-new",
                  inquiry_id: (state.inserted || {}).inquiry_id,
                  sender_id: (state.inserted || {}).sender_id,
                  body: (state.inserted || {}).body,
                  is_read: false,
                  created_at: "2026-11-20T00:00:00.000Z",
                },
                error: null,
              },
        // Awaiting the builder resolves the read/update chain.
        then: (resolve: (value: unknown) => unknown) =>
          resolve({
            data: state.rows,
            error: state.selectError ?? state.updateError,
          }),
      });
      return builder;
    },
  },
}));

import {
  INQUIRY_MESSAGE_MAX,
  getInquiryMessages,
  getMyInquiryForProduct,
  markInquiryMessagesRead,
  sendInquiryMessage,
} from "@/lib/marketplace-inquiry-thread";

beforeEach(() => {
  state.user = { id: "buyer-1" };
  state.rows = [];
  state.selectError = null;
  state.insertError = null;
  state.updateError = null;
  state.inserted = null;
  state.inquiry = null;
  insertedRows.length = 0;
  updateFilters.length = 0;
});

describe("getInquiryMessages", () => {
  it("returns the thread rows", async () => {
    state.rows = [{ id: "m1", body: "hello" }];
    await expect(getInquiryMessages("inq-1")).resolves.toEqual([
      { id: "m1", body: "hello" },
    ]);
  });

  it("returns an empty thread instead of throwing when the read fails", async () => {
    state.selectError = { message: "permission denied" };
    await expect(getInquiryMessages("inq-1")).resolves.toEqual([]);
  });

  it("does not query without an inquiry id", async () => {
    await expect(getInquiryMessages("")).resolves.toEqual([]);
  });
});

describe("sendInquiryMessage", () => {
  it("refuses empty and over-long bodies before touching the network", async () => {
    await expect(sendInquiryMessage("inq-1", "   ")).resolves.toEqual({
      ok: false,
      reason: "empty",
    });
    await expect(
      sendInquiryMessage("inq-1", "x".repeat(INQUIRY_MESSAGE_MAX + 1)),
    ).resolves.toEqual({ ok: false, reason: "too-long" });
    expect(insertedRows).toHaveLength(0);
  });

  it("refuses when nobody is signed in", async () => {
    state.user = null;
    await expect(sendInquiryMessage("inq-1", "hello")).resolves.toEqual({
      ok: false,
      reason: "not-signed-in",
    });
    expect(insertedRows).toHaveLength(0);
  });

  it("stores the message against the signed-in sender", async () => {
    const result = await sendInquiryMessage("inq-1", "  Is this 42.5N?  ");
    expect(result.ok).toBe(true);
    expect(insertedRows[0]).toMatchObject({
      inquiry_id: "inq-1",
      sender_id: "buyer-1",
      body: "Is this 42.5N?",
    });
  });

  it("reports a rejected insert instead of pretending it was sent", async () => {
    state.insertError = { message: "new row violates row-level security" };
    await expect(sendInquiryMessage("inq-1", "hello")).resolves.toEqual({
      ok: false,
      reason: "rejected",
    });
  });

  it("marks the inquiry as answered without reopening a closed one", async () => {
    await sendInquiryMessage("inq-1", "hello");
    const update = updateFilters.find(
      (u) => u.table === "marketplace_product_inquiries",
    );
    expect(update).toBeDefined();
    expect(update!.payload).toEqual({ status: "responded" });
    expect(filters(update!.builder, "__neq")).toEqual([["status", "closed"]]);
  });
});

describe("markInquiryMessagesRead", () => {
  it("only clears the other side's unread messages", async () => {
    await markInquiryMessagesRead("inq-1");
    const update = updateFilters.find(
      (u) => u.table === "marketplace_inquiry_messages",
    );
    expect(update).toBeDefined();
    expect(update!.payload).toEqual({ is_read: true });
    expect(filters(update!.builder, "__neq")).toEqual([
      ["sender_id", "buyer-1"],
    ]);
    expect(filters(update!.builder, "__eq")).toContainEqual(["is_read", false]);
  });

  it("is false when signed out", async () => {
    state.user = null;
    await expect(markInquiryMessagesRead("inq-1")).resolves.toBe(false);
  });
});

describe("getMyInquiryForProduct", () => {
  it("returns the buyer's latest inquiry", async () => {
    state.inquiry = {
      id: "inq-1",
      status: "pending",
      created_at: "2026-11-19T00:00:00.000Z",
    };
    await expect(getMyInquiryForProduct("prod-1")).resolves.toEqual(
      state.inquiry,
    );
  });

  it("is null when signed out", async () => {
    state.user = null;
    await expect(getMyInquiryForProduct("prod-1")).resolves.toBeNull();
  });
});
