/**
 * Broadcast & Subscriber Campaign Client
 *
 * Client interface for administrator newsletter broadcast management,
 * scheduling, and test dispatches.
 */

import { supabase } from "@/lib/supabase";

export type CampaignType =
  | "weekly_price_update"
  | "new_feature"
  | "improvement"
  | "general_announcement"
  | "custom";

export type CampaignStatus =
  "draft" | "scheduled" | "sending" | "sent" | "cancelled" | "failed";

export interface NewsletterCampaign {
  id: string;
  title: string;
  subject: string;
  preview_text: string | null;
  campaign_type: CampaignType;
  target_audience: string;
  content_html: string;
  content_text: string;
  cta_label: string | null;
  cta_url: string | null;
  include_price_snapshot: boolean;
  include_recent_updates: boolean;
  status: CampaignStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  error_log: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  status: "active" | "unsubscribed";
  source: string | null;
  created_at: string;
}

export interface SubscriberStats {
  total: number;
  active: number;
  unsubscribed: number;
}

export interface DynamicPreviewData {
  stats: SubscriberStats;
  material_prices: Array<{
    name: string;
    category: string;
    unit: string;
    price: number;
    currency: string;
  }>;
  product_updates: Array<{
    title: string;
    summary: string;
    category: string;
    link_path: string | null;
    published_at: string;
  }>;
}

export interface CreateCampaignInput {
  title: string;
  subject: string;
  preview_text?: string;
  campaign_type: CampaignType;
  content_text: string;
  cta_label?: string;
  cta_url?: string;
  include_price_snapshot?: boolean;
  include_recent_updates?: boolean;
  scheduled_for?: string | null;
}

/**
 * Fetch all campaigns, sorted newest first
 */
export async function fetchCampaigns(): Promise<NewsletterCampaign[]> {
  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data as NewsletterCampaign[]) || [];
}

/**
 * Fetch subscriber statistics
 */
export async function fetchSubscriberStats(): Promise<SubscriberStats> {
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("status");

  if (error) {
    // Fallback if RLS or empty
    return { total: 0, active: 0, unsubscribed: 0 };
  }

  const subs = (data as Array<{ status: string }>) || [];
  const active = subs.filter((s) => s.status === "active").length;
  const unsubscribed = subs.filter((s) => s.status === "unsubscribed").length;

  return {
    total: subs.length,
    active,
    unsubscribed,
  };
}

/**
 * Fetch paginated subscriber list
 */
export async function fetchSubscribers(
  page = 0,
  pageSize = 50,
  filterStatus?: "active" | "unsubscribed",
  searchQuery?: string,
): Promise<{ subscribers: NewsletterSubscriber[]; count: number }> {
  let query = supabase
    .from("newsletter_subscribers")
    .select("id,email,status,source,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (filterStatus) {
    query = query.eq("status", filterStatus);
  }

  if (searchQuery && searchQuery.trim()) {
    query = query.ilike("email", `%${searchQuery.trim()}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return {
    subscribers: (data as NewsletterSubscriber[]) || [],
    count: count || 0,
  };
}

/**
 * Create a new campaign (draft or scheduled)
 */
export async function createCampaign(
  input: CreateCampaignInput,
): Promise<NewsletterCampaign> {
  const isScheduled = Boolean(
    input.scheduled_for && new Date(input.scheduled_for) > new Date(),
  );
  const status: CampaignStatus = isScheduled ? "scheduled" : "draft";

  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .insert({
      title: input.title.trim(),
      subject: input.subject.trim(),
      preview_text: input.preview_text?.trim() || null,
      campaign_type: input.campaign_type,
      content_html: input.content_text.trim(), // Stored as text / rendered securely
      content_text: input.content_text.trim(),
      cta_label: input.cta_label?.trim() || null,
      cta_url: input.cta_url?.trim() || null,
      include_price_snapshot: Boolean(input.include_price_snapshot),
      include_recent_updates: Boolean(input.include_recent_updates),
      status,
      scheduled_for: isScheduled ? input.scheduled_for : null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as NewsletterCampaign;
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  id: string,
  input: Partial<CreateCampaignInput> & { status?: CampaignStatus },
): Promise<NewsletterCampaign> {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) payload.title = input.title.trim();
  if (input.subject !== undefined) payload.subject = input.subject.trim();
  if (input.preview_text !== undefined)
    payload.preview_text = input.preview_text?.trim() || null;
  if (input.campaign_type !== undefined)
    payload.campaign_type = input.campaign_type;
  if (input.content_text !== undefined) {
    payload.content_text = input.content_text.trim();
    payload.content_html = input.content_text.trim();
  }
  if (input.cta_label !== undefined)
    payload.cta_label = input.cta_label?.trim() || null;
  if (input.cta_url !== undefined)
    payload.cta_url = input.cta_url?.trim() || null;
  if (input.include_price_snapshot !== undefined)
    payload.include_price_snapshot = input.include_price_snapshot;
  if (input.include_recent_updates !== undefined)
    payload.include_recent_updates = input.include_recent_updates;
  if (input.status !== undefined) payload.status = input.status;
  if (input.scheduled_for !== undefined)
    payload.scheduled_for = input.scheduled_for;

  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as NewsletterCampaign;
}

/**
 * Delete a draft or cancelled campaign
 */
export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from("newsletter_campaigns")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Send a test preview email to an admin address
 */
export async function sendTestEmail(
  campaign: Partial<CreateCampaignInput> & { test_email: string },
): Promise<{ ok: boolean; sent_to?: string }> {
  const { data, error } = await supabase.functions.invoke(
    "broadcast-campaign",
    {
      body: {
        action: "send_test",
        test_email: campaign.test_email,
        subject: campaign.subject,
        preview_text: campaign.preview_text,
        heading: campaign.title || campaign.subject,
        content_text: campaign.content_text,
        cta_label: campaign.cta_label,
        cta_url: campaign.cta_url,
        include_price_snapshot: campaign.include_price_snapshot,
        include_recent_updates: campaign.include_recent_updates,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to send test email");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Trigger immediate broadcast to all active subscribers
 */
export async function sendCampaignNow(
  campaignId: string,
): Promise<{ ok: boolean; total: number; successful: number; failed: number }> {
  const { data, error } = await supabase.functions.invoke(
    "broadcast-campaign",
    {
      body: {
        action: "send_now",
        campaign_id: campaignId,
      },
    },
  );

  if (error) {
    throw new Error(error.message || "Failed to dispatch broadcast");
  }
  if (data?.error) {
    throw new Error(data.error);
  }
  return data;
}

/**
 * Fetch dynamic preview data (live material prices & product updates)
 */
export async function fetchDynamicPreviewData(): Promise<DynamicPreviewData> {
  const { data, error } = await supabase.functions.invoke(
    "broadcast-campaign",
    {
      body: { action: "get_preview_data" },
    },
  );

  if (error || !data) {
    return {
      stats: { total: 0, active: 0, unsubscribed: 0 },
      material_prices: [],
      product_updates: [],
    };
  }

  return data as DynamicPreviewData;
}
