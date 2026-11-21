import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import type {
  NewsletterCampaign,
  SubscriberStats,
  DynamicPreviewData,
} from "@/lib/broadcasts/broadcast-client";

// Mock Auth
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { email: "admin@freluxtools.com" },
    loading: false,
  })),
}));

// Mock Broadcast Client
const state = vi.hoisted(() => ({
  campaigns: [] as NewsletterCampaign[],
  stats: { total: 120, active: 110, unsubscribed: 10 } as SubscriberStats,
  dynamicData: {
    stats: { total: 120, active: 110, unsubscribed: 10 },
    material_prices: [
      {
        name: "Dangote 3X 42.5R Cement",
        category: "Masonry",
        unit: "50kg bag",
        price: 9200,
        currency: "NGN",
      },
      {
        name: "Screeding Putty",
        category: "Finishes",
        unit: "20kg bucket",
        price: 7500,
        currency: "NGN",
      },
    ],
    product_updates: [
      {
        title: "Tyrolene Engine Integration",
        summary:
          "Surface finishes now integrate the tyrolene texturing engine.",
        category: "Engines",
        link_path: "/tyrolene-calculator",
        published_at: "2026-11-20T10:00:00Z",
      },
    ],
  } as DynamicPreviewData,
  createCall: null as unknown,
  sendTestCall: null as unknown,
  sendNowCall: null as unknown,
}));

vi.mock("@/lib/broadcasts/broadcast-client", () => ({
  fetchCampaigns: vi.fn(() => Promise.resolve(state.campaigns)),
  fetchSubscriberStats: vi.fn(() => Promise.resolve(state.stats)),
  fetchSubscribers: vi.fn(() =>
    Promise.resolve({
      subscribers: [
        {
          id: "sub-1",
          email: "builder@lagos.example",
          status: "active",
          source: "footer",
          created_at: "2026-11-01T08:00:00Z",
        },
      ],
      count: 1,
    }),
  ),
  fetchDynamicPreviewData: vi.fn(() => Promise.resolve(state.dynamicData)),
  createCampaign: vi.fn((input) => {
    state.createCall = input;
    const newCamp: NewsletterCampaign = {
      id: "camp-new-1",
      title: input.title,
      subject: input.subject,
      preview_text: input.preview_text || null,
      campaign_type: input.campaign_type,
      target_audience: "all_active",
      content_html: input.content_text,
      content_text: input.content_text,
      cta_label: input.cta_label || null,
      cta_url: input.cta_url || null,
      include_price_snapshot: Boolean(input.include_price_snapshot),
      include_recent_updates: Boolean(input.include_recent_updates),
      status: input.scheduled_for ? "scheduled" : "draft",
      scheduled_for: input.scheduled_for || null,
      sent_at: null,
      total_recipients: 0,
      successful_sends: 0,
      failed_sends: 0,
      error_log: null,
      created_at: "2026-11-21T12:00:00Z",
      updated_at: "2026-11-21T12:00:00Z",
    };
    return Promise.resolve(newCamp);
  }),
  updateCampaign: vi.fn((id, input) => {
    return Promise.resolve({
      id,
      ...input,
      title: input.title || "Updated",
      subject: input.subject || "Updated",
    } as unknown as NewsletterCampaign);
  }),
  deleteCampaign: vi.fn(() => Promise.resolve()),
  sendTestEmail: vi.fn((input) => {
    state.sendTestCall = input;
    return Promise.resolve({ ok: true, sent_to: input.test_email });
  }),
  sendCampaignNow: vi.fn((id) => {
    state.sendNowCall = id;
    return Promise.resolve({
      ok: true,
      total: 110,
      successful: 110,
      failed: 0,
    });
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  state.createCall = null;
  state.sendTestCall = null;
  state.sendNowCall = null;
  state.campaigns = [
    {
      id: "camp-1",
      title: "Weekly Price Update #42",
      subject: "Weekly Price Movement Digest: Cement & Sand",
      preview_text: "Latest updates on Lagos wholesale prices",
      campaign_type: "weekly_price_update",
      target_audience: "all_active",
      content_html: "Prices update summary...",
      content_text: "Prices update summary...",
      cta_label: "View Prices",
      cta_url: "https://freluxtools.com/price-index",
      include_price_snapshot: true,
      include_recent_updates: false,
      status: "scheduled",
      scheduled_for: new Date(Date.now() + 3600000 * 24).toISOString(), // 24 hours in future
      sent_at: null,
      total_recipients: 110,
      successful_sends: 0,
      failed_sends: 0,
      error_log: null,
      created_at: "2026-11-20T10:00:00Z",
      updated_at: "2026-11-20T10:00:00Z",
    },
  ];
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

async function renderComponent() {
  const AdminBroadcasts = (await import("@/pages/admin/AdminBroadcasts"))
    .default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminBroadcasts />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminBroadcasts Page", () => {
  it("renders subscriber stats and scheduled broadcast timers", async () => {
    await renderComponent();

    // Verify stats and scheduled count
    await waitFor(() => {
      expect(screen.getByText("Active Subscribers")).toBeDefined();
    });
    expect(screen.getByText("Scheduled Queue")).toBeDefined();

    // Verify scheduled timer banner
    expect(screen.getByText(/Scheduled Broadcasts \(1\)/i)).toBeDefined();
    expect(
      screen.getAllByText(/Weekly Price Movement Digest: Cement & Sand/i)
        .length,
    ).toBeGreaterThan(0);
  });

  it("opens composer with prefilled Weekly Price Update template", async () => {
    await renderComponent();

    const newBtn = await screen.findByRole("button", {
      name: /new broadcast/i,
    });
    fireEvent.click(newBtn);

    // Modal should be open with prefilled fields
    expect(await screen.findByText(/Compose New Broadcast/i)).toBeDefined();
    const subjectInput = screen.getByDisplayValue(
      "Weekly Construction Material Prices & Market Digest",
    );
    expect(subjectInput).toBeDefined();

    // Price snapshot checkbox should be checked by default for weekly price template
    const priceCheckbox = screen.getByRole("checkbox", {
      name: /attach current material prices snapshot/i,
    });
    expect(priceCheckbox).toBeChecked();
  });

  it("sends test email preview to specified administrator address", async () => {
    await renderComponent();

    const newBtn = await screen.findByRole("button", {
      name: /new broadcast/i,
    });
    fireEvent.click(newBtn);
    await screen.findByText(/Compose New Broadcast/i);

    const testBtn = screen.getByRole("button", { name: /send test email/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(state.sendTestCall).not.toBeNull();
    });
    expect((state.sendTestCall as { test_email: string }).test_email).toBe(
      "admin@freluxtools.com",
    );
  });

  it("switches to Campaign Templates tab and selects a starter", async () => {
    await renderComponent();

    const templatesTab = await screen.findByRole("button", {
      name: /campaign templates/i,
    });
    fireEvent.click(templatesTab);

    expect(await screen.findByText(/New Features & Tools/i)).toBeDefined();
    expect(
      screen.getByRole("heading", { name: "Platform Improvements", level: 3 }),
    ).toBeDefined();

    // Click on Feature Launch template
    const featureBtn = screen.getByRole("button", {
      name: /use feature launch template/i,
    });
    fireEvent.click(featureBtn);

    // Composer should open with feature template values
    expect(
      await screen.findByDisplayValue(
        "New in Frelux: Expanded Estimator Engines & Tools",
      ),
    ).toBeDefined();
  });

  it("switches to Subscribers Directory tab and renders subscribers", async () => {
    await renderComponent();

    const subsTab = await screen.findByRole("button", {
      name: /subscribers directory/i,
    });
    fireEvent.click(subsTab);

    expect(await screen.findByText("builder@lagos.example")).toBeDefined();
    expect(screen.getByRole("button", { name: /export csv/i })).toBeDefined();
  });
});
