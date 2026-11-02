/**
 * FRELUX Ad Manager.
 *
 * One place to create, schedule, target, pause and measure campaigns. Campaigns
 * are first-party rows, so a FRELUX promotion today and a paying sponsor
 * tomorrow use the same fields: advertiser, sponsorship label, market and
 * placement targeting, priority, schedule and formats.
 *
 * Security is not handled here: the table's RLS policies and the audit trigger
 * decide who may read or write, so opening this page without administrator
 * rights shows a refusal rather than an editor that cannot save.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Eye,
  Loader2,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Switch } from "@/components/ui/shadcn/switch";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { supabase } from "@/lib/supabase";
import { useMarket } from "@/lib/international/market-context";
import {
  CALCULATOR_TOOL_KEYS,
  FORMAT_LABELS,
  PLACEMENT_LABELS,
  breakdownBy,
  invalidateCampaignCache,
  summariseEvents,
  validateCampaign,
  type Campaign,
  type CampaignDraft,
  type CampaignEventRow,
  type CampaignFormat,
  type DeviceKind,
} from "@/lib/ads/campaigns";
import { SponsoredBanner } from "@/components/ads/CampaignSlot";

const EMPTY_DRAFT: CampaignDraft = {
  name: "",
  slug: "",
  campaign_type: "internal",
  status: "draft",
  format: "native",
  headline: "",
  description: "",
  cta_label: "Learn more",
  destination_url: "",
  advertiser_name: "FRELUX",
  image_url: "",
  image_alt: "",
  is_sponsored: false,
  target_markets: ["ALL"],
  placements: ["calculator_results"],
  target_tools: [],
  target_categories: [],
  target_devices: ["desktop", "tablet", "mobile"],
  priority: 50,
  starts_at: null,
  ends_at: null,
};

function toDraft(campaign: Campaign): CampaignDraft {
  return {
    name: campaign.name,
    slug: campaign.slug,
    campaign_type: campaign.campaign_type,
    status: campaign.status,
    format: campaign.format,
    headline: campaign.headline,
    description: campaign.description ?? "",
    cta_label: campaign.cta_label,
    destination_url: campaign.destination_url,
    advertiser_name: campaign.advertiser_name ?? "",
    image_url: campaign.image_url ?? "",
    image_alt: campaign.image_alt ?? "",
    is_sponsored: campaign.is_sponsored,
    target_markets: campaign.target_markets,
    placements: campaign.placements,
    target_tools: campaign.target_tools,
    target_categories: campaign.target_categories,
    target_devices: campaign.target_devices,
    priority: campaign.priority,
    starts_at: campaign.starts_at,
    ends_at: campaign.ends_at,
  };
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {hint ? (
        <span className="ml-1 text-xs text-muted-foreground">{hint}</span>
      ) : null}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";

export default function AdManager() {
  const { user, loading: authLoading } = useAuth();
  const market = useMarket();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [events, setEvents] = useState<CampaignEventRow[]>([]);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState<CampaignDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useSeo({
    title: "FRELUX Ad Manager",
    description:
      "Create, schedule, target and measure FRELUX advertising campaigns.",
    canonicalPath: "/admin/ad-manager",
    noIndex: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const { data: profile } = await supabase.auth.getUser();
    if (!profile.user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", profile.user.id)
      .maybeSingle();
    const admin = (me as { role?: string } | null)?.role === "admin";
    setIsAdmin(admin);
    if (!admin) {
      setLoading(false);
      return;
    }

    const [
      { data: rows, error: listError },
      { data: eventRows, error: eventError },
    ] = await Promise.all([
      supabase
        .from("ad_campaigns")
        .select("*")
        .order("priority", { ascending: false }),
      supabase
        .from("ad_campaign_events")
        .select(
          "id,campaign_id,event_type,placement,tool_key,market_code,device,value,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(5000),
    ]);
    if (listError) setError(listError.message);
    else setError(null);
    if (eventError)
      setNotice(`Campaign events could not be read: ${eventError.message}`);
    setCampaigns(
      ((rows ?? []) as unknown as Campaign[]).map((row) => ({
        ...row,
        target_markets: row.target_markets ?? ["ALL"],
        placements: row.placements ?? [],
        target_tools: row.target_tools ?? [],
        target_categories: row.target_categories ?? [],
        target_devices: row.target_devices?.length
          ? row.target_devices
          : ["desktop", "tablet", "mobile"],
      })),
    );
    setEvents((eventRows ?? []) as unknown as CampaignEventRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const metrics = useMemo(() => summariseEvents(events), [events]);
  const byPlacement = useMemo(() => breakdownBy(events, "placement"), [events]);
  const byTool = useMemo(() => breakdownBy(events, "tool_key"), [events]);
  const byDevice = useMemo(() => breakdownBy(events, "device"), [events]);
  const byMarket = useMemo(() => breakdownBy(events, "market_code"), [events]);

  const perCampaign = useMemo(() => {
    const map = new Map<string, CampaignEventRow[]>();
    for (const event of events) {
      map.set(event.campaign_id, [
        ...(map.get(event.campaign_id) ?? []),
        event,
      ]);
    }
    return map;
  }, [events]);

  const save = async () => {
    if (!draft) return;
    const errors = validateCampaign(draft);
    if (errors.length) {
      setNotice(errors.join(" "));
      return;
    }
    setBusy(true);
    const payload = {
      ...draft,
      description: draft.description || null,
      image_url: draft.image_url || null,
      image_alt: draft.image_alt || null,
      advertiser_name: draft.advertiser_name || null,
      is_external: /^https?:\/\//i.test(draft.destination_url),
      starts_at: draft.starts_at || null,
      ends_at: draft.ends_at || null,
    };
    const result = editingId
      ? await supabase.from("ad_campaigns").update(payload).eq("id", editingId)
      : await supabase.from("ad_campaigns").insert(payload);
    setBusy(false);
    if (result.error) {
      setNotice(`Not saved: ${result.error.message}`);
      return;
    }
    invalidateCampaignCache();
    setNotice(editingId ? "Campaign updated." : "Campaign created.");
    setDraft(null);
    setEditingId(null);
    await load();
  };

  const setStatus = async (campaign: Campaign, status: Campaign["status"]) => {
    if (!campaign.id) return;
    setBusy(true);
    const { error: updateError } = await supabase
      .from("ad_campaigns")
      .update({ status })
      .eq("id", campaign.id);
    setBusy(false);
    if (updateError) {
      setNotice(`Not changed: ${updateError.message}`);
      return;
    }
    invalidateCampaignCache();
    setNotice(`${campaign.name} is now ${status}.`);
    await load();
  };

  const remove = async (campaign: Campaign) => {
    if (!campaign.id) return;
    setBusy(true);
    const { error: deleteError } = await supabase
      .from("ad_campaigns")
      .delete()
      .eq("id", campaign.id);
    setBusy(false);
    if (deleteError) {
      setNotice(`Not deleted: ${deleteError.message}`);
      return;
    }
    invalidateCampaignCache();
    setNotice(`${campaign.name} deleted. Its audit trail stays on record.`);
    await load();
  };

  const toggle = (
    field: "placements" | "target_tools" | "target_devices" | "target_markets",
    value: string,
  ) => {
    setDraft((current) => {
      if (!current) return current;
      const list = current[field] as string[];
      const next = list.includes(value)
        ? list.filter((entry) => entry !== value)
        : [...list, value];
      return { ...current, [field]: next } as CampaignDraft;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2
          className="h-6 w-6 animate-spin text-muted-foreground"
          aria-label="Loading campaigns"
        />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-muted-foreground" />
        <h1 className="mt-3 text-lg font-semibold">Ad Manager is restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user
            ? "This dashboard is limited to FRELUX administrators."
            : "Sign in with an administrator account."}
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link to={user ? "/dashboard" : "/login"}>
            {user ? "Back to my dashboard" : "Sign in"}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            FRELUX Ad Manager
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Internal promotions today, sponsored placements when you sell them.
            Every change is audited, and a paused campaign stops serving and
            stops counting immediately.
          </p>
        </div>
        <Button
          onClick={() => {
            setDraft({ ...EMPTY_DRAFT });
            setEditingId(null);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> New campaign
        </Button>
      </header>

      {notice ? (
        <p className="mt-4 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Impressions"
          value={metrics.impressions.toLocaleString()}
          hint="Visible units only, once per session"
        />
        <Stat label="Clicks" value={metrics.clicks.toLocaleString()} />
        <Stat
          label="Click-through rate"
          value={`${metrics.ctr}%`}
          hint="Clicks per hundred impressions"
        />
        <Stat
          label="Conversions"
          value={metrics.conversions.toLocaleString()}
          hint={
            metrics.conversionValue > 0
              ? `${metrics.conversionValue.toLocaleString()} recorded value`
              : "Only recorded by a flow that confirms the action"
          }
        />
      </div>

      {draft ? (
        <section className="mt-6 rounded-xl border p-4">
          <h2 className="text-sm font-semibold">
            {editingId ? "Edit campaign" : "New campaign"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Campaign name">
              <input
                className={inputClass}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </Field>
            <Field label="Slug" hint="used in links and reports">
              <input
                className={inputClass}
                value={draft.slug}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    slug: event.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-"),
                  })
                }
              />
            </Field>
            <Field label="Headline">
              <input
                className={inputClass}
                value={draft.headline}
                onChange={(event) =>
                  setDraft({ ...draft, headline: event.target.value })
                }
              />
            </Field>
            <Field label="Button label">
              <input
                className={inputClass}
                value={draft.cta_label}
                onChange={(event) =>
                  setDraft({ ...draft, cta_label: event.target.value })
                }
              />
            </Field>
            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-[70px]`}
                value={draft.description ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, description: event.target.value })
                }
              />
            </Field>
            <Field
              label="Destination"
              hint="a path like /pricing or an https:// address"
            >
              <input
                className={inputClass}
                value={draft.destination_url}
                onChange={(event) =>
                  setDraft({ ...draft, destination_url: event.target.value })
                }
              />
            </Field>
            <Field label="Banner image URL" hint="optional">
              <input
                className={inputClass}
                value={draft.image_url ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, image_url: event.target.value })
                }
              />
            </Field>
            <Field label="Image alt text" hint="required for a banner">
              <input
                className={inputClass}
                value={draft.image_alt ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, image_alt: event.target.value })
                }
              />
            </Field>
            <Field label="Format">
              <select
                className={inputClass}
                value={draft.format}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    format: event.target.value as CampaignFormat,
                  })
                }
              >
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={draft.status}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    status: event.target.value as CampaignDraft["status"],
                  })
                }
              >
                {["draft", "active", "paused", "ended", "archived"].map(
                  (status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label="Advertiser" hint="shown with the sponsored label">
              <input
                className={inputClass}
                value={draft.advertiser_name ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, advertiser_name: event.target.value })
                }
              />
            </Field>
            <Field label="Priority" hint="0 to 100, higher wins">
              <input
                type="number"
                min={0}
                max={100}
                className={inputClass}
                value={draft.priority}
                onChange={(event) =>
                  setDraft({ ...draft, priority: Number(event.target.value) })
                }
              />
            </Field>
            <Field label="Starts">
              <input
                type="date"
                className={inputClass}
                value={draft.starts_at?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, starts_at: event.target.value || null })
                }
              />
            </Field>
            <Field label="Ends">
              <input
                type="date"
                className={inputClass}
                value={draft.ends_at?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, ends_at: event.target.value || null })
                }
              />
            </Field>
          </div>

          <label className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span>
              Sponsored (paid) placement
              <span className="block text-xs text-muted-foreground">
                Prints the Sponsored label and adds rel="sponsored" to external
                links.
              </span>
            </span>
            <Switch
              checked={draft.is_sponsored}
              onCheckedChange={(checked) =>
                setDraft({
                  ...draft,
                  is_sponsored: checked,
                  campaign_type: checked ? "sponsored" : "internal",
                })
              }
            />
          </label>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Placements</p>
              <div className="mt-1 space-y-1.5">
                {Object.entries(PLACEMENT_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={draft.placements.includes(value)}
                      onChange={() => toggle("placements", value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Calculators</p>
              <div className="mt-1 space-y-1.5">
                {Object.values(CALCULATOR_TOOL_KEYS).map((value) => (
                  <label
                    key={value}
                    className="flex items-center gap-2 text-xs capitalize"
                  >
                    <input
                      type="checkbox"
                      checked={draft.target_tools.includes(value)}
                      onChange={() => toggle("target_tools", value)}
                    />
                    {value}
                  </label>
                ))}
                <p className="text-[11px] text-muted-foreground">
                  Leave all unticked to run the campaign across every
                  calculator.
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Devices</p>
              <div className="mt-1 space-y-1.5">
                {(["desktop", "tablet", "mobile"] as DeviceKind[]).map(
                  (value) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 text-xs capitalize"
                    >
                      <input
                        type="checkbox"
                        checked={draft.target_devices.includes(value)}
                        onChange={() => toggle("target_devices", value)}
                      />
                      {value}
                    </label>
                  ),
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">Markets</p>
              <div className="mt-1 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {[
                  "ALL",
                  ...(market?.availableMarkets ?? []).map(
                    (entry) => entry.country_code,
                  ),
                ].map((code) => (
                  <label key={code} className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={draft.target_markets.includes(code)}
                      onChange={() => toggle("target_markets", code)}
                    />
                    {code === "ALL" ? "All markets" : code}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Targeting follows the market the visitor selected, never their
                IP address alone.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-dashed p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> Preview
            </p>
            <div className="rounded-xl border bg-card p-4">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {draft.is_sponsored
                  ? `Sponsored · ${draft.advertiser_name || "Advertiser"}`
                  : "Promoted"}
              </p>
              <p className="mt-0.5 text-sm font-semibold">
                {draft.headline || "Your headline appears here"}
              </p>
              {draft.description ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {draft.description}
                </p>
              ) : null}
              <span className="mt-2 inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                {draft.cta_label || "Learn more"}
              </span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : null}
              {editingId ? "Save changes" : "Create campaign"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(null);
                setEditingId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mt-8">
        <h2 className="text-base font-semibold">Campaigns</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Campaign</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Placements</th>
                <th className="px-3 py-2 text-right">Impr.</th>
                <th className="px-3 py-2 text-right">Clicks</th>
                <th className="px-3 py-2 text-right">CTR</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {campaigns.map((campaign) => {
                const stats = summariseEvents(
                  campaign.id ? (perCampaign.get(campaign.id) ?? []) : [],
                );
                return (
                  <tr key={campaign.id ?? campaign.slug} className="border-t">
                    <td className="px-3 py-2">
                      <span className="font-medium">{campaign.name}</span>
                      {campaign.is_sponsored ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                          sponsored
                        </span>
                      ) : null}
                      <span className="block text-xs text-muted-foreground">
                        {campaign.headline}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                      {campaign.status}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {campaign.placements.length} ·{" "}
                      {campaign.target_tools.length
                        ? campaign.target_tools.join(", ")
                        : "all calculators"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {stats.impressions}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {stats.clicks}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {stats.ctr}%
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDraft(toDraft(campaign));
                            setEditingId(campaign.id);
                          }}
                        >
                          Edit
                        </Button>
                        {campaign.status === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void setStatus(campaign, "paused")}
                            disabled={busy}
                          >
                            <Pause className="mr-1 h-3 w-3" /> Pause
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void setStatus(campaign, "active")}
                            disabled={busy}
                          >
                            <Play className="mr-1 h-3 w-3" /> Activate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void remove(campaign)}
                          disabled={busy}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!campaigns.length ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-xs text-muted-foreground"
                  >
                    No campaigns yet. Create one and it starts serving as soon
                    as it is active and in date.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Best performing placements</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {byPlacement.slice(0, 6).map((row) => (
              <li key={row.key} className="flex justify-between gap-2">
                <span className="text-muted-foreground">
                  {PLACEMENT_LABELS[row.key] ?? row.key}
                </span>
                <span className="tabular-nums">
                  {row.impressions} / {row.clicks} · {row.ctr}%
                </span>
              </li>
            ))}
            {!byPlacement.length ? (
              <li className="text-xs text-muted-foreground">
                No impressions recorded yet.
              </li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Calculator placements</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {byTool.slice(0, 8).map((row) => (
              <li
                key={row.key}
                className="flex justify-between gap-2 capitalize"
              >
                <span className="text-muted-foreground">{row.key}</span>
                <span className="tabular-nums">
                  {row.impressions} / {row.clicks} · {row.ctr}%
                </span>
              </li>
            ))}
            {!byTool.length ? (
              <li className="text-xs text-muted-foreground">
                No calculator impressions yet.
              </li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Devices</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {byDevice.map((row) => (
              <li
                key={row.key}
                className="flex justify-between gap-2 capitalize"
              >
                <span className="text-muted-foreground">{row.key}</span>
                <span className="tabular-nums">
                  {row.impressions} / {row.clicks} · {row.ctr}%
                </span>
              </li>
            ))}
            {!byDevice.length ? (
              <li className="text-xs text-muted-foreground">
                No device data yet.
              </li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-lg border p-4">
          <h2 className="text-sm font-semibold">Markets</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {byMarket.slice(0, 8).map((row) => (
              <li key={row.key} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{row.key}</span>
                <span className="tabular-nums">
                  {row.impressions} / {row.clicks} · {row.ctr}%
                </span>
              </li>
            ))}
            {!byMarket.length ? (
              <li className="text-xs text-muted-foreground">
                No market data yet.
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-lg border p-4">
        <h2 className="text-sm font-semibold">Preview as a visitor</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          This is the live component with your market and device, not a mock: a
          campaign that is paused, expired or outside its market will not appear
          here either.
        </p>
        <SponsoredBanner placement="calculator_results" toolKey="paint" />
      </section>

      <footer className="mt-8 border-t pt-4 text-xs text-muted-foreground">
        <p>
          Campaign changes are recorded in the audit log with the administrator
          who made them. Impressions count once per campaign, slot and session
          per day; conversions are never inferred from a click.
        </p>
        <Link
          to="/admin/ads"
          className="mt-2 inline-block font-medium text-primary hover:underline"
        >
          Network and provider settings
        </Link>
      </footer>
    </div>
  );
}
