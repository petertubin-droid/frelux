import { useEffect, useState, useCallback } from "react";
import { Save, Loader2, Radio, RefreshCw, Activity } from "lucide-react";
import {
  AdminCard,
  AdminButton,
  AdminField,
  Toggle,
  AdminInput,
} from "@/components/admin/AdminUi";
import { supabase } from "@/lib/supabase";
import { clearAdConfigCache } from "@/lib/ad-config";
import { classNames } from "@/lib/utils";
import type { DbAdProvider, DbAdPlacement } from "@/types/database";
import type { ExternalPromo } from "@/lib/house-promo";

/**
 * NETWORK HUB — the complete Heartsyncx ad-network settings surface,
 * ported to Frelux's database-driven ad system.
 *
 * Heartsyncx manages its networks through a settings pane with one tab
 * per network (AdSense, Monetag, Adsterra) plus a placements tab with
 * live slot-to-provider connectivity checks. This component reproduces
 * that entire settings surface 1:1 — but instead of a settings blob it
 * writes into Frelux's real `ad_providers` rows (credentials, settings,
 * is_active), `ad_placements` rows (per-slot ad unit IDs + on/off) and
 * `site_settings` (publisher id), so the existing AdSlot renderer and
 * Layout site-wide injector serve everything configured here.
 *
 * Slot mapping: Heartsyncx's six slot families map onto the Frelux
 * placements that serve the same role (see SLOT_MAP). Each label shows
 * the real Frelux placement key it writes to.
 */

type SubTab = "adsense" | "monetag" | "adsterra" | "placements" | "house_promo";

/** Heartsyncx slot family → Frelux placement key. */
export const SLOT_MAP = [
  {
    family: "header",
    label: "Header (top of page)",
    placementKey: "home_top",
  },
  {
    family: "homepage",
    label: "Homepage (feed unit)",
    placementKey: "home_native",
  },
  { family: "sidebar", label: "Sidebar", placementKey: "home_sidebar" },
  {
    family: "in_article",
    label: "In-article",
    placementKey: "learn_in_article",
  },
  {
    family: "article_bottom",
    label: "Article bottom",
    placementKey: "learn_article_bottom",
  },
  {
    family: "footer",
    label: "Site-wide footer",
    placementKey: "global_footer",
  },
] as const;

export type SlotFamily = (typeof SLOT_MAP)[number]["family"];

interface HubState {
  adsense: {
    active: boolean;
    publisherId: string;
    autoAds: boolean;
    anchorAds: boolean;
    vignetteAds: boolean;
    interstitialAds: boolean;
    rewardedAds: boolean;
    slotIds: Record<SlotFamily, string>;
  };
  monetag: {
    active: boolean;
    zoneId: string;
    nativeZoneId: string;
    rewardedZoneId: string;
    interstitialZoneId: string;
    popunderZoneId: string;
    vignetteZoneId: string;
    sdkUrl: string;
    slotZones: Record<SlotFamily, string>;
  };
  adsterra: {
    active: boolean;
    serveDomain: string;
    popunder: string;
    socialBar: string;
    interstitial: string;
    inPagePush: string;
    skim: string;
    directLinkUrl: string;
    directLinkLabel: string;
    slotKeys: Record<SlotFamily, string>;
  };
  slots: Record<SlotFamily, boolean>;
  housePromo: {
    active: boolean;
    format: string;
    baseUrl: string;
    externalPromos: ExternalPromo[];
  };
}

const emptySlotRecord = (): Record<SlotFamily, string> => ({
  header: "",
  homepage: "",
  sidebar: "",
  in_article: "",
  article_bottom: "",
  footer: "",
});

const emptySlotToggles = (): Record<SlotFamily, boolean> => ({
  header: true,
  homepage: true,
  sidebar: true,
  in_article: true,
  article_bottom: true,
  footer: true,
});

export function emptyHubState(): HubState {
  return {
    adsense: {
      active: true,
      publisherId: "",
      autoAds: false,
      anchorAds: false,
      vignetteAds: false,
      interstitialAds: false,
      rewardedAds: false,
      slotIds: emptySlotRecord(),
    },
    monetag: {
      active: false,
      zoneId: "",
      nativeZoneId: "",
      rewardedZoneId: "",
      interstitialZoneId: "",
      popunderZoneId: "",
      vignetteZoneId: "",
      sdkUrl: "",
      slotZones: emptySlotRecord(),
    },
    adsterra: {
      active: false,
      serveDomain: "",
      popunder: "",
      socialBar: "",
      interstitial: "",
      inPagePush: "",
      skim: "",
      directLinkUrl: "",
      directLinkLabel: "",
      slotKeys: emptySlotRecord(),
    },
    slots: emptySlotToggles(),
    housePromo: {
      active: false,
      format: "card",
      baseUrl: "",
      externalPromos: [],
    },
  };
}

type ProviderRows = {
  adsense: DbAdProvider | null;
  monetag: DbAdProvider | null;
  adsterra: DbAdProvider | null;
  housePromo: DbAdProvider | null;
};

/** Build the editable hub state from the live DB rows. */
export function hubStateFromDb(
  providers: DbAdProvider[],
  placements: DbAdPlacement[],
): HubState {
  const state = emptyHubState();
  const bySlug = (slug: string) =>
    providers.find((p) => p.slug === slug) ?? null;
  const adsense = bySlug("google_adsense");
  const monetag = bySlug("monetag");
  const adsterra = bySlug("adsterra");

  const cred = (p: DbAdProvider | null) =>
    (p?.credentials ?? {}) as Record<string, unknown>;
  const setg = (p: DbAdProvider | null) =>
    (p?.settings ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const bool = (v: unknown) => v === true;

  const housePromo = bySlug("house_cross_promo");

  state.housePromo.active = housePromo ? housePromo.is_active : false;
  const promoFormat = setg(housePromo).format;
  state.housePromo.format =
    typeof promoFormat === "string" && promoFormat ? promoFormat : "card";
  state.housePromo.baseUrl = str(setg(housePromo).base_url);
  state.housePromo.externalPromos = Array.isArray(
    setg(housePromo).external_promos,
  )
    ? (setg(housePromo).external_promos as ExternalPromo[]).map((r, i) => ({
        id: r?.id || `ext-${Date.now()}-${i}`,
        enabled: r?.enabled !== false,
        label: r?.label || "",
        url: r?.url || "",
        blurb: r?.blurb || "",
        owner_name: r?.owner_name || "",
      }))
    : [];

  state.adsense.active = adsense ? adsense.is_active : true;
  state.adsense.publisherId = str(cred(adsense).publisher_id);
  state.adsense.autoAds = bool(setg(adsense).auto_ads);
  state.adsense.anchorAds = bool(setg(adsense).anchor_ads);
  state.adsense.vignetteAds = bool(setg(adsense).vignette_ads);
  state.adsense.interstitialAds = bool(setg(adsense).interstitial_ads);
  state.adsense.rewardedAds = bool(setg(adsense).rewarded_ads);

  state.monetag.active = monetag ? monetag.is_active : false;
  state.monetag.zoneId = str(cred(monetag).zone_id);
  state.monetag.nativeZoneId = str(cred(monetag).native_banner_zone_id);
  state.monetag.rewardedZoneId = str(cred(monetag).rewarded_zone_id);
  state.monetag.interstitialZoneId = str(cred(monetag).interstitial_zone_id);
  state.monetag.popunderZoneId = str(cred(monetag).popunder_zone_id);
  state.monetag.vignetteZoneId = str(cred(monetag).vignette_zone_id);
  state.monetag.sdkUrl = str(cred(monetag).sdk_url);

  state.adsterra.active = adsterra ? adsterra.is_active : false;
  state.adsterra.serveDomain = str(cred(adsterra).serve_domain);
  state.adsterra.popunder = str(cred(adsterra).popunder_key);
  state.adsterra.socialBar = str(cred(adsterra).social_bar_key);
  state.adsterra.interstitial = str(cred(adsterra).interstitial_key);
  state.adsterra.inPagePush = str(cred(adsterra).inpage_push_key);
  state.adsterra.skim = str(cred(adsterra).skim_key);
  state.adsterra.directLinkUrl = str(cred(adsterra).direct_link_url);
  state.adsterra.directLinkLabel = str(cred(adsterra).direct_link_label);

  for (const { family, placementKey } of SLOT_MAP) {
    const placement = placements.find((p) => p.placement_key === placementKey);
    const units = (placement?.ad_unit_ids ?? {}) as Record<string, string>;
    state.slots[family] = placement ? placement.is_active : true;
    if (adsense) state.adsense.slotIds[family] = units[adsense.id] ?? "";
    if (monetag) state.monetag.slotZones[family] = units[monetag.id] ?? "";
    if (adsterra) state.adsterra.slotKeys[family] = units[adsterra.id] ?? "";
  }
  return state;
}

/** The monetag display-tag snippet derived from the Zone ID (preview only —
 *  Layout derives the real loader automatically; this mirrors the
 *  Heartsyncx "script tag code" field with its Reset button). */
export function monetagTagPreview(zoneId: string): string {
  const zone = zoneId.trim();
  if (!zone) return "";
  return `<script src="https://quge5.com/88/tag.min.js" data-zone="${zone}" async data-cfasync="false"></script>`;
}

const COMPLIANCE_WARNING =
  "AdSense approval pending — the other networks keep serving. Once AdSense is approved and serves ads, Google Program policies require the intrusive site-wide formats (popunder, social bar, interstitial, in-page push, vignette) to be turned off here: pop-ups, pop-unders and interstitials are prohibited on pages carrying AdSense code. Compliant display banners may stay if clearly labelled.";

/** Adapts frelux's AdminInput (raw event) to a (value) => void handler. */
function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <AdminInput
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** AdminCard with a title + subtitle header (Heartsyncx panel shape). */
function HubCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </AdminCard>
  );
}

export default function NetworkHub() {
  const [tab, setTab] = useState<SubTab>("adsense");
  const [state, setState] = useState<HubState>(emptyHubState);
  const [rows, setRows] = useState<ProviderRows>({
    adsense: null,
    monetag: null,
    adsterra: null,
    housePromo: null,
  });
  const [placements, setPlacements] = useState<DbAdPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [provRes, placeRes] = await Promise.all([
      supabase.from("ad_providers").select("*").order("priority"),
      supabase.from("ad_placements").select("*").order("sort_order"),
    ]);
    if (provRes.error) setError(provRes.error.message);
    else if (placeRes.error) setError(placeRes.error.message);
    const providers = (provRes.data as DbAdProvider[]) ?? [];
    const places = (placeRes.data as DbAdPlacement[]) ?? [];
    setRows({
      adsense: providers.find((p) => p.slug === "google_adsense") ?? null,
      monetag: providers.find((p) => p.slug === "monetag") ?? null,
      adsterra: providers.find((p) => p.slug === "adsterra") ?? null,
      housePromo: providers.find((p) => p.slug === "house_cross_promo") ?? null,
    });
    setPlacements(places);
    setState(hubStateFromDb(providers, places));
    setDirty(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const patch = (fn: (draft: HubState) => void) => {
    setState((prev) => {
      const draft = JSON.parse(JSON.stringify(prev)) as HubState;
      fn(draft);
      return draft;
    });
    setDirty(true);
    setMessage(null);
  };

  /** Persist everything: provider rows, per-slot unit IDs, slot toggles,
   *  site_settings mirror. One master sync, like Heartsyncx's pane. */
  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      // ── Provider rows (upsert on slug; credentials merge over existing) ──
      const providerUpserts: Array<{
        name: string;
        slug: string;
        provider_type: string;
        priority: number;
        is_active: boolean;
        credentials: Record<string, string>;
        settings: Record<string, unknown>;
        is_system: boolean;
      }> = [
        {
          name: rows.adsense?.name ?? "Google AdSense",
          slug: "google_adsense",
          provider_type: rows.adsense?.provider_type ?? "display",
          priority: rows.adsense?.priority ?? 1,
          is_active: state.adsense.active,
          credentials: {
            ...(rows.adsense?.credentials ?? {}),
            publisher_id: state.adsense.publisherId.trim(),
          },
          settings: {
            ...(rows.adsense?.settings ?? {}),
            auto_ads: state.adsense.autoAds,
            anchor_ads: state.adsense.anchorAds,
            vignette_ads: state.adsense.vignetteAds,
            interstitial_ads: state.adsense.interstitialAds,
            rewarded_ads: state.adsense.rewardedAds,
          },
          is_system: rows.adsense?.is_system ?? true,
        },
        {
          name: rows.monetag?.name ?? "Monetag",
          slug: "monetag",
          provider_type: rows.monetag?.provider_type ?? "mixed",
          priority: rows.monetag?.priority ?? 2,
          is_active: state.monetag.active,
          credentials: {
            ...(rows.monetag?.credentials ?? {}),
            zone_id: state.monetag.zoneId.trim(),
            native_banner_zone_id: state.monetag.nativeZoneId.trim(),
            rewarded_zone_id: state.monetag.rewardedZoneId.trim(),
            interstitial_zone_id: state.monetag.interstitialZoneId.trim(),
            popunder_zone_id: state.monetag.popunderZoneId.trim(),
            vignette_zone_id: state.monetag.vignetteZoneId.trim(),
            sdk_url: state.monetag.sdkUrl.trim(),
          },
          settings: rows.monetag?.settings ?? {},
          is_system: rows.monetag?.is_system ?? true,
        },
        {
          name: rows.adsterra?.name ?? "Adsterra",
          slug: "adsterra",
          provider_type: rows.adsterra?.provider_type ?? "display",
          priority: rows.adsterra?.priority ?? 3,
          is_active: state.adsterra.active,
          credentials: {
            ...(rows.adsterra?.credentials ?? {}),
            serve_domain: state.adsterra.serveDomain.trim(),
            popunder_key: state.adsterra.popunder.trim(),
            social_bar_key: state.adsterra.socialBar.trim(),
            interstitial_key: state.adsterra.interstitial.trim(),
            inpage_push_key: state.adsterra.inPagePush.trim(),
            skim_key: state.adsterra.skim.trim(),
            direct_link_url: state.adsterra.directLinkUrl.trim(),
            direct_link_label: state.adsterra.directLinkLabel.trim(),
          },
          settings: rows.adsterra?.settings ?? {},
          is_system: rows.adsterra?.is_system ?? true,
        },
      ];
      // House cross-promo provider row (Network Hub → House Promos):
      // settings carry format, base_url and the external partner list.
      providerUpserts.push({
        name: "House Cross-Promo",
        slug: "house_cross_promo",
        provider_type: rows.housePromo?.provider_type ?? "native",
        priority: rows.housePromo?.priority ?? 99,
        is_active: state.housePromo.active,
        credentials: {},
        settings: {
          ...(rows.housePromo?.settings ?? {}),
          format: state.housePromo.format,
          base_url: state.housePromo.baseUrl.trim(),
          external_promos: state.housePromo.externalPromos.filter(
            (r) => r.label.trim() || r.url.trim(),
          ),
        },
        is_system: rows.housePromo?.is_system ?? true,
      });
      const upRes = await supabase
        .from("ad_providers")
        .upsert(providerUpserts, { onConflict: "slug" });
      if (upRes.error) throw new Error(upRes.error.message);

      // Re-read the upserted rows so per-slot unit IDs map to real ids
      // (fresh inserts get server-generated ids).
      const { data: fresh, error: freshErr } = await supabase
        .from("ad_providers")
        .select("*")
        .in("slug", [
          "google_adsense",
          "monetag",
          "adsterra",
          "house_cross_promo",
        ]);
      if (freshErr) throw new Error(freshErr.message);
      const freshRows: ProviderRows = {
        adsense: fresh?.find((p) => p.slug === "google_adsense") ?? null,
        monetag: fresh?.find((p) => p.slug === "monetag") ?? null,
        adsterra: fresh?.find((p) => p.slug === "adsterra") ?? null,
        housePromo: fresh?.find((p) => p.slug === "house_cross_promo") ?? null,
      };

      // ── Per-slot unit IDs + slot toggles on the mapped placements ──
      for (const { family, placementKey } of SLOT_MAP) {
        const placement = placements.find(
          (p) => p.placement_key === placementKey,
        );
        if (!placement) continue;
        const units = { ...(placement.ad_unit_ids ?? {}) };
        const assign = (provider: DbAdProvider | null, value: string) => {
          if (!provider) return;
          const v = value.trim();
          if (v) units[provider.id] = v;
          else delete units[provider.id];
        };
        assign(freshRows.adsense, state.adsense.slotIds[family]);
        assign(freshRows.monetag, state.monetag.slotZones[family]);
        assign(freshRows.adsterra, state.adsterra.slotKeys[family]);
        const { error: plErr } = await supabase
          .from("ad_placements")
          .update({ ad_unit_ids: units, is_active: state.slots[family] })
          .eq("id", placement.id);
        if (plErr) throw new Error(plErr.message);
      }

      // ── site_settings mirror (legacy AdSense fallback path reads this) ──
      const settingsUpdate: Record<string, unknown> = {
        ads_enabled: true,
        adsense_publisher_id: state.adsense.publisherId.trim(),
      };
      const { error: setErr } = await supabase
        .from("site_settings")
        .update(settingsUpdate)
        .neq("id", "");
      if (setErr) {
        // Non-fatal: the provider row above is the primary source of truth.
        console.warn(
          "[NetworkHub] site_settings mirror failed:",
          setErr.message,
        );
      }

      clearAdConfigCache();
      await load();
      setMessage("Saved — all network settings synced to the database.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const statusDot = (on: boolean) =>
    classNames(
      "inline-block w-2 h-2 rounded-full",
      on ? "bg-emerald-500" : "bg-muted-foreground/40",
    );

  const TABS: Array<{ key: SubTab; label: string; on: boolean }> = [
    { key: "adsense", label: "Google AdSense", on: state.adsense.active },
    { key: "monetag", label: "Monetag", on: state.monetag.active },
    { key: "adsterra", label: "Adsterra", on: state.adsterra.active },
    { key: "placements", label: "Placement Slots", on: true },
    { key: "house_promo", label: "House Promos", on: state.housePromo.active },
  ];

  if (loading) {
    return (
      <HubCard title="Network Hub" subtitle="Loading ad network settings…">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </HubCard>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top Networks Hub bar (Heartsyncx layout) */}
      <HubCard
        title="Ad Network Hub"
        subtitle="Complete Heartsyncx-style ad settings: configure Google AdSense, Monetag and Adsterra, manage placement slots, and verify live slot-to-provider connectivity. Everything saves to the ad providers, placements and site settings in the database."
      >
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border bg-card">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={classNames(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-all",
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={statusDot(t.on)} />
              {t.label}
            </button>
          ))}
        </div>
        {error && (
          <div
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"
          >
            {error}
          </div>
        )}
        {message && (
          <div
            role="status"
            className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
          >
            {message}
          </div>
        )}
      </HubCard>

      {tab === "adsense" && (
        <HubCard
          title="Google AdSense — Primary Provider"
          subtitle="First claim on every placement slot. Monetag and Adsterra coexist until AdSense approves the site; per-slot AdSense units serve once your publisher ID and slot IDs are configured."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminField
              label="Publisher ID (ca-pub-XXXX)"
              hint="AdSense > Account > Settings > Publisher ID. Serves non-personalized ads until advertising consent is granted."
            >
              <TextInput
                value={state.adsense.publisherId}
                onChange={(v) =>
                  patch((d) => {
                    d.adsense.publisherId = v;
                  })
                }
                placeholder="ca-pub-XXXXXXXXXXXXXXXX"
              />
            </AdminField>
            <AdminField label="AdSense active">
              <Toggle
                checked={state.adsense.active}
                onChange={(v) =>
                  patch((d) => {
                    d.adsense.active = v;
                  })
                }
                label={state.adsense.active ? "Active" : "Deactivated"}
              />
            </AdminField>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
            {(
              [
                ["autoAds", "Auto Ads", "adsense.autoAds"],
                ["anchorAds", "Anchor Ads", "adsense.anchorAds"],
                ["vignetteAds", "Vignette Ads", "adsense.vignetteAds"],
                [
                  "interstitialAds",
                  "Interstitial Ads",
                  "adsense.interstitialAds",
                ],
                ["rewardedAds", "Rewarded Ads", "adsense.rewardedAds"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm font-medium"
              >
                {label}
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={state.adsense[key]}
                  onChange={(e) =>
                    patch((d) => {
                      d.adsense[key] = e.target.checked;
                    })
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Per-slot AdSense unit IDs (AdSense &gt; Ads &gt; By ad unit)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SLOT_MAP.map(({ family, label, placementKey }) => (
                <AdminField key={family} label={label} hint={placementKey}>
                  <TextInput
                    value={state.adsense.slotIds[family]}
                    onChange={(v) =>
                      patch((d) => {
                        d.adsense.slotIds[family] = v;
                      })
                    }
                    placeholder="10-digit unit id"
                  />
                </AdminField>
              ))}
            </div>
          </div>
        </HubCard>
      )}

      {tab === "monetag" && (
        <HubCard
          title="Monetag Global Ad Network"
          subtitle="One display tag serves all site-wide formats (popunder, interstitial, vignette). Visible in-content Monetag ads use Native Banner zones per slot."
        >
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            {COMPLIANCE_WARNING}
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminField
              label="Display tag Zone ID"
              hint="Monetag dashboard > Zones. The loader script is derived automatically from this zone."
            >
              <TextInput
                value={state.monetag.zoneId}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.zoneId = v;
                  })
                }
                placeholder="e.g. 1234567"
              />
            </AdminField>
            <AdminField label="Monetag active">
              <Toggle
                checked={state.monetag.active}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.active = v;
                  })
                }
                label={state.monetag.active ? "Active" : "Deactivated"}
              />
            </AdminField>
            <AdminField
              label="Native Banner Zone ID (visible in-content ads)"
              hint="Websites > Add zone > Native Banner. Serves in-page display units in ad slots."
            >
              <TextInput
                value={state.monetag.nativeZoneId}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.nativeZoneId = v;
                  })
                }
                placeholder="zone id"
              />
            </AdminField>
            <AdminField
              label="Rewarded Zone ID (rewarded unlock flow)"
              hint="Zone created for the rewarded SDK (Rewarded/Social Bar zone)."
            >
              <TextInput
                value={state.monetag.rewardedZoneId}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.rewardedZoneId = v;
                  })
                }
                placeholder="zone id"
              />
            </AdminField>
            <AdminField label="Interstitial Zone ID">
              <TextInput
                value={state.monetag.interstitialZoneId}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.interstitialZoneId = v;
                  })
                }
                placeholder="zone id"
              />
            </AdminField>
            <AdminField label="Popunder Zone ID">
              <TextInput
                value={state.monetag.popunderZoneId}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.popunderZoneId = v;
                  })
                }
                placeholder="zone id"
              />
            </AdminField>
            <AdminField label="Vignette Zone ID">
              <TextInput
                value={state.monetag.vignetteZoneId}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.vignetteZoneId = v;
                  })
                }
                placeholder="zone id"
              />
            </AdminField>
            <AdminField
              label="SDK Script URL"
              hint="Monetag dashboard > Get SDK. Primary popunder/on-click revenue path."
            >
              <TextInput
                value={state.monetag.sdkUrl}
                onChange={(v) =>
                  patch((d) => {
                    d.monetag.sdkUrl = v;
                  })
                }
                placeholder="https://<cdn-domain>/sdk.js"
              />
            </AdminField>
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Script tag (derived from the Zone ID)
              </p>
              <AdminButton
                variant="secondary"
                onClick={() =>
                  setMessage(
                    "Tag derives from the Zone ID — clear the zone to remove it.",
                  )
                }
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reset to official tag
              </AdminButton>
            </div>
            <pre className="rounded-lg border border-border bg-muted/40 p-3 text-[11px] font-mono overflow-x-auto">
              {monetagTagPreview(state.monetag.zoneId) ||
                "// Enter a Zone ID above to derive the display tag"}
            </pre>
          </div>
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Per-slot Native Banner zones (paste each slot's zone id)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SLOT_MAP.map(({ family, label, placementKey }) => (
                <AdminField key={family} label={label} hint={placementKey}>
                  <TextInput
                    value={state.monetag.slotZones[family]}
                    onChange={(v) =>
                      patch((d) => {
                        d.monetag.slotZones[family] = v;
                      })
                    }
                    placeholder="zone id"
                  />
                </AdminField>
              ))}
            </div>
          </div>
        </HubCard>
      )}

      {tab === "adsterra" && (
        <HubCard
          title="Adsterra Ad Network"
          subtitle="Per-slot banner/native-banner units plus site-wide formats (Popunder, Social Bar, Interstitial, In-Page Push, Skim) and a Direct Link rendered in the footer."
        >
          <div className="rounded-lg border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            {COMPLIANCE_WARNING}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-semibold">Adsterra active</p>
              <p className="text-xs text-muted-foreground">
                Master switch for every Adsterra unit below. Everything injects
                only after advertising-cookie consent.
              </p>
            </div>
            <Toggle
              checked={state.adsterra.active}
              onChange={(v) =>
                patch((d) => {
                  d.adsterra.active = v;
                })
              }
              label={state.adsterra.active ? "Active" : "Deactivated"}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <AdminField
              label="Serve domain"
              hint="Optional: the banner serving domain from your snippets (e.g. www.highperformanceformat.com or pl<id>.profitableratecpmnetwork.com)."
            >
              <TextInput
                value={state.adsterra.serveDomain}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.serveDomain = v;
                  })
                }
                placeholder="www.highperformanceformat.com"
              />
            </AdminField>
            <AdminField
              label="Popunder (key or full script URL)"
              hint="Websites > Ad Units > Popunder."
            >
              <TextInput
                value={state.adsterra.popunder}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.popunder = v;
                  })
                }
                placeholder="key or https://pl.../....js"
              />
            </AdminField>
            <AdminField label="Social Bar (key or full script URL)">
              <TextInput
                value={state.adsterra.socialBar}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.socialBar = v;
                  })
                }
                placeholder="key or script URL"
              />
            </AdminField>
            <AdminField label="Interstitial (key or full script URL)">
              <TextInput
                value={state.adsterra.interstitial}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.interstitial = v;
                  })
                }
                placeholder="key or script URL"
              />
            </AdminField>
            <AdminField label="In-Page Push (key or full script URL)">
              <TextInput
                value={state.adsterra.inPagePush}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.inPagePush = v;
                  })
                }
                placeholder="key or script URL"
              />
            </AdminField>
            <AdminField
              label="Skim (key or full script URL)"
              hint="Monetizes existing outbound links."
            >
              <TextInput
                value={state.adsterra.skim}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.skim = v;
                  })
                }
                placeholder="key or script URL"
              />
            </AdminField>
            <AdminField
              label="Direct Link / Smartlink URL"
              hint="Renders as a labelled sponsored link in the site footer."
            >
              <TextInput
                value={state.adsterra.directLinkUrl}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.directLinkUrl = v;
                  })
                }
                placeholder="https://example.com/..."
              />
            </AdminField>
            <AdminField
              label="Direct Link text"
              hint='Default: "Sponsored: check out this offer"'
            >
              <TextInput
                value={state.adsterra.directLinkLabel}
                onChange={(v) =>
                  patch((d) => {
                    d.adsterra.directLinkLabel = v;
                  })
                }
                placeholder="Sponsored: check out this offer"
              />
            </AdminField>
          </div>
          <div className="mt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Per-slot Banner / Native Banner units (paste the bare key or the
              whole dashboard snippet — the key is auto-extracted at render
              time)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SLOT_MAP.map(({ family, label, placementKey }) => (
                <AdminField key={family} label={label} hint={placementKey}>
                  <TextInput
                    value={state.adsterra.slotKeys[family]}
                    onChange={(v) =>
                      patch((d) => {
                        d.adsterra.slotKeys[family] = v;
                      })
                    }
                    placeholder="unit key or snippet"
                  />
                </AdminField>
              ))}
            </div>
          </div>
        </HubCard>
      )}

      {tab === "placements" && (
        <HubCard
          title="Frontend Ad Placement Slots"
          subtitle="Toggle the physical ad positions and verify which provider fills each slot. These map to the same placement rows the site renders."
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Live frontend ad-slot switches
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {SLOT_MAP.map(({ family, label, placementKey }) => (
              <label
                key={family}
                className="flex items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm font-medium"
              >
                <span>
                  {label}
                  <span className="block text-[10px] font-mono text-muted-foreground">
                    {placementKey}
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={state.slots[family]}
                  onChange={(e) =>
                    patch((d) => {
                      d.slots[family] = e.target.checked;
                    })
                  }
                />
              </label>
            ))}
          </div>
          <div className="mt-5 border-t pt-4">
            <SlotConnectivity providers={rows} placements={placements} />
          </div>
        </HubCard>
      )}

      {tab === "house_promo" && (
        <HubCard
          title="House Promos — Sister Site & External Partners"
          subtitle="First-party promo slots: advertise Heartsyncx across Frelux and sell the same slots to external website owners. Not ad-network units — no consent gate, cannot be blocked by ad blockers. Clicks are tracked as cross_promo_click."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AdminField label="Master switch">
              <Toggle
                checked={state.housePromo.active}
                onChange={(v) =>
                  patch((d) => {
                    d.housePromo.active = v;
                  })
                }
                label={state.housePromo.active ? "Serving" : "Off"}
              />
            </AdminField>
            <AdminField
              label="Display format"
              hint="Applies to every house-promo slot on the site; slots rotate destinations so each advertises different links."
            >
              <select
                value={state.housePromo.format}
                onChange={(e) =>
                  patch((d) => {
                    d.housePromo.format = e.target.value;
                  })
                }
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="card">
                  Card (rich grid of section links — default)
                </option>
                <option value="banner">
                  Banner (slim strip, 3 rotating links)
                </option>
                <option value="native">Native (quiet in-feed text unit)</option>
                <option value="interstitial">
                  Interstitial (full-screen overlay, once per session)
                </option>
              </select>
            </AdminField>
            <AdminField
              label="Heartsyncx site URL"
              hint="Where the sister-site promo links point. Leave empty for the default (heartsyncx.netlify.app). Update this when Heartsyncx moves to its custom domain — every promo link changes instantly."
            >
              <TextInput
                value={state.housePromo.baseUrl}
                onChange={(v) =>
                  patch((d) => {
                    d.housePromo.baseUrl = v;
                  })
                }
                placeholder="https://heartsyncx.netlify.app"
              />
            </AdminField>
          </div>

          <div className="mt-5 border-t pt-4">
            <p className="text-sm font-bold">External Partner Promos</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Let outside website owners advertise in the same promo slots.
              Entries rotate alongside the Heartsyncx links; disabled entries
              are hidden.
            </p>
            {state.housePromo.externalPromos.length === 0 && (
              <p className="mt-3 text-xs italic text-muted-foreground">
                No partner promos yet. Click "Add partner" when an external
                advertiser comes on board.
              </p>
            )}
            <div className="mt-3 space-y-2">
              {state.housePromo.externalPromos.map((r) => (
                <div
                  key={r.id}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-center p-2.5 rounded-lg border border-border bg-muted/30"
                >
                  <label
                    className="lg:col-span-1 flex items-center gap-1.5 cursor-pointer"
                    title="Enabled"
                  >
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) =>
                        patch((d) => {
                          const row = d.housePromo.externalPromos.find(
                            (x) => x.id === r.id,
                          );
                          if (row) row.enabled = e.target.checked;
                        })
                      }
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">
                      On
                    </span>
                  </label>
                  <input
                    value={r.label}
                    onChange={(e) =>
                      patch((d) => {
                        const row = d.housePromo.externalPromos.find(
                          (x) => x.id === r.id,
                        );
                        if (row) row.label = e.target.value;
                      })
                    }
                    placeholder="Headline, e.g. Buy building materials online"
                    className="lg:col-span-3 h-9 rounded-md border border-border bg-background px-3 text-xs"
                  />
                  <input
                    value={r.url}
                    onChange={(e) =>
                      patch((d) => {
                        const row = d.housePromo.externalPromos.find(
                          (x) => x.id === r.id,
                        );
                        if (row) row.url = e.target.value;
                      })
                    }
                    placeholder="https://partner-site.com"
                    className="lg:col-span-3 h-9 rounded-md border border-border bg-background px-3 font-mono text-xs"
                  />
                  <input
                    value={r.blurb}
                    onChange={(e) =>
                      patch((d) => {
                        const row = d.housePromo.externalPromos.find(
                          (x) => x.id === r.id,
                        );
                        if (row) row.blurb = e.target.value;
                      })
                    }
                    placeholder="Short description shown under the headline"
                    className="lg:col-span-3 h-9 rounded-md border border-border bg-background px-3 text-xs"
                  />
                  <div className="lg:col-span-2 flex gap-1.5">
                    <input
                      value={r.owner_name ?? ""}
                      onChange={(e) =>
                        patch((d) => {
                          const row = d.housePromo.externalPromos.find(
                            (x) => x.id === r.id,
                          );
                          if (row) row.owner_name = e.target.value;
                        })
                      }
                      placeholder="Ads by (name)"
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patch((d) => {
                          d.housePromo.externalPromos =
                            d.housePromo.externalPromos.filter(
                              (x) => x.id !== r.id,
                            );
                        })
                      }
                      className="shrink-0 h-9 px-2.5 rounded-md border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                      title="Remove this partner promo"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <AdminButton
                variant="secondary"
                onClick={() =>
                  patch((d) => {
                    d.housePromo.externalPromos.push({
                      id: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                      enabled: true,
                      label: "",
                      url: "",
                      blurb: "",
                      owner_name: "",
                    });
                  })
                }
              >
                + Add partner
              </AdminButton>
            </div>
          </div>
        </HubCard>
      )}

      {/* Master sync (Heartsyncx "Database Synchronization & Live Deployment") */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <p className="text-sm font-bold">
            Database Synchronization &amp; Live Deployment
          </p>
          <p className="text-xs text-muted-foreground">
            Persists all AdSense, Monetag and Adsterra credentials, per-slot
            units and placement switches directly to the database and clears the
            ad-config cache.
          </p>
        </div>
        <AdminButton onClick={save} disabled={saving || !dirty}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Syncing…" : dirty ? "Save & Sync to Database" : "Saved"}
        </AdminButton>
      </div>
    </div>
  );
}

/**
 * Slot-to-provider connectivity checker — port of Heartsyncx's
 * AdSlotConnectivity. Resolves the provider chain for each mapped slot
 * (AdSense unit id → Adsterra unit key → Monetag native zone) from the
 * same DB rows AdSlot uses, then live-probes Adsterra invoke.js and
 * Monetag tag.min.js reachability.
 */
type CheckStatus =
  | "idle"
  | "checking"
  | "ok"
  | "refused"
  | "missing"
  | "unreachable"
  | "unconfigured";

function SlotConnectivity({
  providers,
  placements,
}: {
  providers: ProviderRows;
  placements: DbAdPlacement[];
}) {
  const [checks, setChecks] = useState<
    Partial<Record<SlotFamily, { status: CheckStatus; detail: string }>>
  >({});
  const [running, setRunning] = useState(false);

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const cred = (p: DbAdProvider | null) =>
    (p?.credentials ?? {}) as Record<string, unknown>;

  function resolveSlot(family: SlotFamily): {
    provider: "adsense" | "adsterra" | "monetag" | "none";
    label: string;
    probeUrl: string | null;
  } {
    const placementKey = SLOT_MAP.find(
      (s) => s.family === family,
    )!.placementKey;
    const placement = placements.find((p) => p.placement_key === placementKey);
    const units = (placement?.ad_unit_ids ?? {}) as Record<string, string>;

    const adsense = providers.adsense;
    if (adsense?.is_active && str(cred(adsense).publisher_id)) {
      const unit = units[adsense.id]?.trim() ?? "";
      if (/^\d{9,16}$/.test(unit.replace(/\D/g, "")) || unit) {
        return {
          provider: "adsense",
          label: `AdSense unit ${unit || "(not set)"}`,
          probeUrl: null,
        };
      }
    }

    const adsterra = providers.adsterra;
    if (adsterra?.is_active) {
      const raw = units[adsterra.id] ?? "";
      const keyMatch =
        raw.match(/['"]key['"]\s*:\s*['"]([a-f0-9]{20,})['"]/i) ??
        raw.match(/([a-f0-9]{20,})\/invoke\.js/i);
      const key = (
        keyMatch?.[1] ?? (/^[a-f0-9]{20,}$/i.test(raw.trim()) ? raw.trim() : "")
      ).toLowerCase();
      if (key) {
        const domMatch = raw.match(
          /https?:\/\/([a-z0-9.-]+\.[a-z]+)\/[a-f0-9]{20,}\/invoke\.js/i,
        );
        const domain = (
          domMatch?.[1] ??
          str(cred(adsterra).serve_domain) ??
          "www.highperformanceformat.com"
        ).toLowerCase();
        return {
          provider: "adsterra",
          label: `Adsterra unit ${key}`,
          probeUrl: `https://${domain}/${key}/invoke.js`,
        };
      }
    }

    const monetag = providers.monetag;
    if (monetag?.is_active) {
      const zone = (
        units[monetag.id] ?? str(cred(monetag).native_banner_zone_id)
      ).match(/\d{3,12}/)?.[0];
      if (zone) {
        return {
          provider: "monetag",
          label: `Monetag native banner zone ${zone}`,
          probeUrl: `https://quge5.com/88/tag.min.js`,
        };
      }
    }

    return {
      provider: "none",
      label: "No provider configured",
      probeUrl: null,
    };
  }

  async function runChecks() {
    setRunning(true);
    const next: Partial<
      Record<SlotFamily, { status: CheckStatus; detail: string }>
    > = {};
    for (const { family } of SLOT_MAP) {
      const r = resolveSlot(family);
      if (r.provider === "adsterra" && r.probeUrl) {
        try {
          const res = await fetch(r.probeUrl, {
            method: "GET",
            cache: "no-store",
          });
          if (res.ok)
            next[family] = {
              status: "ok",
              detail: "Unit reachable and serving (HTTP 200)",
            };
          else if (res.status === 403)
            next[family] = {
              status: "refused",
              detail:
                "HTTP 403 — Adsterra refuses this unit. Check the dashboard: unit active and this site approved.",
            };
          else
            next[family] = {
              status: "unreachable",
              detail: `HTTP ${res.status} from the unit endpoint.`,
            };
        } catch {
          next[family] = {
            status: "unreachable",
            detail: "Serving domain unreachable.",
          };
        }
      } else if (r.provider === "monetag") {
        try {
          await fetch("https://quge5.com/88/tag.min.js", {
            method: "GET",
            mode: "no-cors",
            cache: "no-store",
          });
          next[family] = {
            status: "ok",
            detail: "Zone tag reachable (opaque check passed)",
          };
        } catch {
          next[family] = {
            status: "unreachable",
            detail: "Zone tag unreachable.",
          };
        }
      } else if (r.provider === "adsense") {
        next[family] = {
          status: "ok",
          detail:
            "Configured — AdSense serves only after Google approves the site and the unit id is valid.",
        };
      } else {
        next[family] = {
          status: "unconfigured",
          detail:
            "Empty slot — configure AdSense, an Adsterra unit or a Monetag native banner zone.",
        };
      }
      setChecks({ ...next });
    }
    setRunning(false);
  }

  const badge = (c?: { status: CheckStatus; detail: string }) => {
    if (!c) return <span className="text-muted-foreground">—</span>;
    const map: Record<CheckStatus, string> = {
      idle: "bg-muted text-muted-foreground",
      checking: "bg-blue-100 text-blue-700",
      ok: "bg-emerald-100 text-emerald-700",
      refused: "bg-red-100 text-red-700",
      missing: "bg-amber-100 text-amber-700",
      unreachable: "bg-red-100 text-red-700",
      unconfigured: "bg-muted text-muted-foreground",
    };
    return (
      <span
        className={classNames(
          "rounded-full px-2 py-0.5 text-[10px] font-bold font-mono whitespace-nowrap",
          map[c.status],
        )}
      >
        {c.status === "ok"
          ? "OK"
          : c.status === "refused"
            ? "403 refused"
            : c.status === "unconfigured"
              ? "unconfigured"
              : c.status === "unreachable"
                ? "unreachable"
                : c.status}
      </span>
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Slot-to-provider connectivity (chain: AdSense → Adsterra → Monetag →
          reserved)
        </p>
        <AdminButton variant="secondary" onClick={runChecks} disabled={running}>
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Activity className="h-3.5 w-3.5" />
          )}
          {running ? "Checking…" : "Run live checks"}
        </AdminButton>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/50 text-muted-foreground text-left">
              <th className="p-2 font-bold uppercase tracking-wider text-[10px]">
                Slot
              </th>
              <th className="p-2 font-bold uppercase tracking-wider text-[10px]">
                Placement key
              </th>
              <th className="p-2 font-bold uppercase tracking-wider text-[10px]">
                Serving provider
              </th>
              <th className="p-2 font-bold uppercase tracking-wider text-[10px]">
                Reachability
              </th>
              <th className="p-2 font-bold uppercase tracking-wider text-[10px]">
                Detail
              </th>
            </tr>
          </thead>
          <tbody>
            {SLOT_MAP.map(({ family, label, placementKey }) => {
              const r = resolveSlot(family);
              const c = checks[family];
              return (
                <tr key={family} className="border-t border-border">
                  <td className="p-2 font-semibold whitespace-nowrap">
                    {label}
                  </td>
                  <td className="p-2 font-mono text-muted-foreground">
                    {placementKey}
                  </td>
                  <td className="p-2 font-mono whitespace-nowrap">
                    {r.provider === "adsense" && (
                      <span className="text-blue-600">AdSense</span>
                    )}
                    {r.provider === "adsterra" && (
                      <span className="text-amber-600">Adsterra</span>
                    )}
                    {r.provider === "monetag" && (
                      <span className="text-sky-600">Monetag</span>
                    )}
                    {r.provider === "none" && (
                      <span className="text-muted-foreground">none</span>
                    )}
                  </td>
                  <td className="p-2">{badge(c)}</td>
                  <td className="p-2 text-muted-foreground">
                    {r.label}
                    {c ? ` — ${c.detail}` : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Radio className="h-3 w-3" /> Live checks run from your browser:
        Adsterra invoke.js is fetched directly (200 = serving, 403 = unit
        refused), Monetag's tag is probed opaquely. AdSense approval status
        cannot be queried from the browser — configuration only.
      </p>
    </div>
  );
}
