import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/Toast";
import { getRegions } from "@/lib/international/regions";
import { supabase } from "@/lib/supabase";
import { useMarket } from "@/lib/international/market-context";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

import {
  COUNTRY_OPTIONS,
  getCountryCurrency,
} from "@/lib/international/countries";

type Market = string;

type MySubmission = {
  id: string;
  item_name: string;
  region: string;
  market: string;
  price: number;
  unit: string;
  status: string;
  created_at: string;
  applied_price: number | null;
};

type CatalogItem = { slug: string; name: string; category: string | null };

type GroupProgress = {
  reporters: number;
  median_price: number | null;
  verified: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "In review",
  community_verified: "Community verified",
  approved: "Added to price book",
  rejected: "Not accepted",
};

/**
 * Community price reporting, run by the people who actually buy materials.
 * The admin cannot keep every market current alone, so a signed-in visitor
 * reports what a material costs where they live.
 *
 * A report never enters an estimate on its own. Reports are grouped by
 * market + catalog material, and the group is written into the price book
 * (estimation_prices) only once the market's own auto-apply rule is met:
 * enough independent reporters, agreeing within its tolerance. Until then the
 * reports sit in review and the reporter sees how many more are needed.
 */
export default function PriceSubmissionForm() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const { marketCode, isLoading: marketLoading } = useMarket();
  const [market, setMarket] = useState<Market>("NG");
  const [marketTouched, setMarketTouched] = useState(false);
  const [region, setRegion] = useState("");
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [vendor, setVendor] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [materialSlug, setMaterialSlug] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [progress, setProgress] = useState<GroupProgress | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<MySubmission[]>([]);

  const regions = getRegions(market);
  const currency = getCountryCurrency(market);

  // The reporter's own market is the one they can actually price.
  useEffect(() => {
    if (marketLoading || marketTouched) return;
    setMarket(marketCode);
    setRegion("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketCode, marketLoading]);

  // Catalog items let a report attach itself to a price-book material, which is
  // what makes automatic promotion possible.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("estimation_materials")
        .select("slug, name, category")
        .eq("is_active", true)
        .order("name")
        .limit(600);
      if (!cancelled) setCatalog((data as CatalogItem[]) ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // How close this market + material is to a verified price.
  useEffect(() => {
    const rpc = (supabase as unknown as { rpc?: unknown }).rpc;
    if (!materialSlug || typeof rpc !== "function") {
      setProgress(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await (
          supabase as unknown as {
            rpc: (
              fn: string,
              args: Record<string, unknown>,
            ) => Promise<{ data: GroupProgress[] | null }>;
          }
        ).rpc("price_group_progress", {
          p_market: market,
          p_material_slug: materialSlug,
        });
        if (!cancelled) setProgress(data?.[0] ?? null);
      } catch {
        if (!cancelled) setProgress(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [market, materialSlug]);

  const loadMine = async () => {
    if (!user) return;
    const { data } = await supabaseFetch(user.id);
    setMine((data as MySubmission[]) ?? []);
  };

  useEffect(() => {
    if (user) void loadMine();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!region.trim() || !itemName.trim() || !price) {
      toast({
        title: "Please fill market, region, item and price.",
        variant: "error",
      });
      return;
    }
    setSubmitting(true);
    const { error } = await submitPrice({
      userId: user!.id,
      market,
      region: region.trim(),
      itemName: itemName.trim(),
      unit: unit.trim() || "unit",
      price: Number(price),
      currency,
      vendor: vendor.trim() || null,
      materialSlug: materialSlug || null,
      sourceUrl: sourceUrl.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({
        title: "Could not submit right now. Please try again.",
        variant: "error",
      });
      return;
    }
    toast({
      title: "Thank you! Submitted for community review.",
      variant: "success",
    });
    setItemName("");
    setUnit("");
    setPrice("");
    setVendor("");
    setSourceUrl("");
    setMaterialSlug("");
    void loadMine();
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-medium text-card-foreground">
          {t("Report what materials cost in your area")}
        </p>
        <p className="mt-1">
          Signed-in users can report local prices for any market. Reports are
          reviewed by the team; agreeing reports from different people build the
          community price book.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/login">{t("Sign in to report prices")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-card-foreground">
        {t("Report what this costs in your area")}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Prices are reviewed before entering the price book. Three agreeing
        reports from different people are flagged automatically.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor="price-submission-market"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("Market")}
          </label>
          <select
            id="price-submission-market"
            value={market}
            onChange={(e) => {
              setMarket(e.target.value as Market);
              setMarketTouched(true);
              setRegion("");
            }}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          >
            {COUNTRY_OPTIONS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.currency})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="price-submission-region"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("Region")}
          </label>
          {regions ? (
            <select
              id="price-submission-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            >
              <option value="">{t("Select region")}</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="price-submission-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={t("Region")}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            />
          )}
        </div>
        <div>
          <label
            htmlFor="price-submission-item"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("Item")}
          </label>
          <input
            id="price-submission-item"
            value={itemName}
            list="price-submission-catalog"
            onChange={(e) => {
              const value = e.target.value;
              setItemName(value);
              const hit = catalog.find(
                (c) => c.name.toLowerCase() === value.toLowerCase(),
              );
              setMaterialSlug(hit ? hit.slug : "");
            }}
            placeholder={t("e.g. Bag of cement")}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
          <datalist id="price-submission-catalog">
            {catalog.map((c) => (
              <option key={c.slug} value={c.name} />
            ))}
          </datalist>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {materialSlug
              ? t(
                  "Matched to the price book. Agreeing reports here update the published price automatically.",
                )
              : t(
                  "Pick a price-book item from the list so your report can update the published price. A free-text item is kept for review only.",
                )}
          </p>
        </div>
        <div>
          <label
            htmlFor="price-submission-unit"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("Unit")}
          </label>
          <input
            id="price-submission-unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="bag, m², kg…"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <div>
          <label
            htmlFor="price-submission-price"
            className="text-xs font-medium text-muted-foreground"
          >
            Price ({currency})
          </label>
          <input
            id="price-submission-price"
            type="number"
            min="0"
            step="any"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <div>
          <label
            htmlFor="price-submission-vendor"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("Vendor")} <span className="opacity-70">(optional)</span>
          </label>
          <input
            id="price-submission-vendor"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder={t("Where you saw this price")}
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <div>
          <label
            htmlFor="price-submission-source"
            className="text-xs font-medium text-muted-foreground"
          >
            {t("Link to the price")}{" "}
            <span className="opacity-70">(optional)</span>
          </label>
          <input
            id="price-submission-source"
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        {materialSlug && progress && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground sm:col-span-2">
            {progress.verified
              ? t(
                  "This market already has a verified price from community reports. Yours will keep it current.",
                )
              : progress.reporters > 0
                ? `${progress.reporters} ${t("independent reports so far in this market. One more agreeing report is enough to update the price.")}`
                : t(
                    "No reports yet for this market. Two independent people reporting a similar price updates the published price.",
                  )}
          </div>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit price report"}
          </Button>
        </div>
      </form>

      {mine.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Your recent reports")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {mine.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="truncate text-muted-foreground">
                  {m.item_name} · {m.region} ({m.market}) ·{" "}
                  {Number(m.price).toLocaleString()}
                  {m.applied_price != null && m.status === "approved"
                    ? ` · ${t("book price")} ${Number(m.applied_price).toLocaleString()}`
                    : ""}
                </span>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                    (m.status === "approved" ||
                    m.status === "community_verified"
                      ? "bg-primary/10 text-primary"
                      : m.status === "rejected"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground")
                  }
                >
                  {STATUS_LABEL[m.status] ?? m.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Kept outside the component so tests can mock the lib seam.

export async function submitPrice(input: {
  userId: string;
  market: Market;
  region: string;
  itemName: string;
  unit: string;
  price: number;
  currency: string;
  vendor: string | null;
  materialSlug?: string | null;
  sourceUrl?: string | null;
}) {
  return supabase.from("price_submissions").insert({
    submitted_by: input.userId,
    market: input.market,
    region: input.region,
    item_name: input.itemName,
    unit: input.unit,
    price: input.price,
    currency: input.currency,
    vendor: input.vendor,
    material_slug: input.materialSlug ?? null,
    source_url: input.sourceUrl ?? null,
  });
}

export async function supabaseFetch(userId: string) {
  return supabase
    .from("price_submissions")
    .select(
      "id, item_name, region, market, price, unit, status, created_at, applied_price",
    )
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false })
    .limit(5);
}
