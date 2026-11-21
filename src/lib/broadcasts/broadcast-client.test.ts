import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchCampaigns,
  fetchSubscriberStats,
  fetchSubscribers,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendTestEmail,
  sendCampaignNow,
  fetchDynamicPreviewData,
} from "./broadcast-client";

function queryable(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select",
    "order",
    "range",
    "eq",
    "ilike",
    "update",
    "insert",
    "delete",
  ]) {
    chain[m] = () => chain;
  }
  chain.single = () => Promise.resolve(result);
  chain.maybeSingle = () => Promise.resolve(result);
  chain.then = (resolve: (v: unknown) => unknown) => resolve(result);
  return chain;
}

const state = vi.hoisted(() => ({
  campaigns: [] as Record<string, unknown>[],
  subscribers: [] as Record<string, unknown>[],
  invokes: [] as Array<{ fn: string; body: unknown }>,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "newsletter_campaigns") {
        return queryable({ data: state.campaigns, error: null });
      }
      if (table === "newsletter_subscribers") {
        return queryable({
          data: state.subscribers,
          count: state.subscribers.length,
          error: null,
        });
      }
      return queryable({ data: [], error: null });
    },
    functions: {
      invoke: (fn: string, opts?: { body: unknown }) => {
        state.invokes.push({ fn, body: opts?.body });
        if (fn === "broadcast-campaign") {
          const body = opts?.body as Record<string, unknown>;
          if (body?.action === "send_test") {
            return Promise.resolve({
              data: { ok: true, sent_to: body.test_email },
              error: null,
            });
          }
          if (body?.action === "send_now") {
            return Promise.resolve({
              data: { ok: true, total: 10, successful: 10, failed: 0 },
              error: null,
            });
          }
          if (body?.action === "get_preview_data") {
            return Promise.resolve({
              data: {
                stats: { total: 10, active: 8, unsubscribed: 2 },
                material_prices: [
                  {
                    name: "Cement",
                    price: 9200,
                    currency: "NGN",
                    unit: "bag",
                    category: "Masonry",
                  },
                ],
                product_updates: [
                  {
                    title: "Update",
                    summary: "Digest",
                    category: "Product",
                    link_path: null,
                    published_at: "2026-11-21",
                  },
                ],
              },
              error: null,
            });
          }
        }
        return Promise.resolve({ data: { ok: true }, error: null });
      },
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.invokes = [];
  state.campaigns = [
    {
      id: "c1",
      title: "Weekly Update",
      subject: "Price movements",
      campaign_type: "weekly_price_update",
      status: "draft",
      created_at: "2026-11-20T10:00:00Z",
    },
  ];
  state.subscribers = [
    {
      id: "s1",
      email: "builder1@frelux.example",
      status: "active",
      source: "footer",
      created_at: "2026-11-01",
    },
    {
      id: "s2",
      email: "builder2@frelux.example",
      status: "unsubscribed",
      source: "calc",
      created_at: "2026-11-02",
    },
  ];
});

describe("broadcast-client", () => {
  it("fetches campaigns successfully", async () => {
    const list = await fetchCampaigns();
    expect(list.length).toBe(1);
    expect(list[0].subject).toBe("Price movements");
  });

  it("calculates subscriber stats with active vs unsubscribed counts", async () => {
    const stats = await fetchSubscriberStats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1);
    expect(stats.unsubscribed).toBe(1);
  });

  it("fetches subscriber lists", async () => {
    const res = await fetchSubscribers(0, 10);
    expect(res.subscribers.length).toBe(2);
    expect(res.count).toBe(2);
  });

  it("sends test email via edge function", async () => {
    const res = await sendTestEmail({
      test_email: "tester@freluxtools.com",
      subject: "Test Subject",
      content_text: "Test content",
    });

    expect(res.ok).toBe(true);
    expect(res.sent_to).toBe("tester@freluxtools.com");
    expect(state.invokes.length).toBe(1);
    expect(state.invokes[0].fn).toBe("broadcast-campaign");
  });

  it("dispatches immediate broadcast campaign", async () => {
    const res = await sendCampaignNow("c1");
    expect(res.ok).toBe(true);
    expect(res.successful).toBe(10);
  });

  it("fetches dynamic preview data for live prices and product changelog", async () => {
    const data = await fetchDynamicPreviewData();
    expect(data.material_prices.length).toBe(1);
    expect(data.material_prices[0].name).toBe("Cement");
    expect(data.product_updates.length).toBe(1);
  });
});
