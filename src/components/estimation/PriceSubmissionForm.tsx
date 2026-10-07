import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/Toast";
import { getRegions } from "@/lib/international/regions";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/shadcn/button";

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
};

const STATUS_LABEL: Record<string, string> = {
  pending: "In review",
  community_verified: "Community verified",
  approved: "Added to price book",
  rejected: "Not accepted",
};

/**
 * Community price reporting. Prices submitted here never enter the
 * engines directly - they go to a review queue; 3 independent
 * agreeing entries get flagged community_verified, and only the
 * admin promotes an entry into the authoritative price book.
 */
export default function PriceSubmissionForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [market, setMarket] = useState<Market>("NG");
  const [region, setRegion] = useState("");
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("");
  const [price, setPrice] = useState("");
  const [vendor, setVendor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mine, setMine] = useState<MySubmission[]>([]);

  const regions = getRegions(market);
  const currency = getCountryCurrency(market);

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
    void loadMine();
  };

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
        <p className="font-medium text-card-foreground">
          Report what materials cost in your area
        </p>
        <p className="mt-1">
          Signed-in users can report local prices for any market. Reports are
          reviewed by the team; agreeing reports from different people build the
          community price book.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/login">Sign in to report prices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-sm font-semibold text-card-foreground">
        Report what this costs in your area
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Prices are reviewed before entering the price book. Three agreeing
        reports from different people are flagged automatically.
      </p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Market
          </label>
          <select
            value={market}
            onChange={(e) => {
              setMarket(e.target.value as Market);
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
          <label className="text-xs font-medium text-muted-foreground">
            Region
          </label>
          {regions ? (
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            >
              <option value="">Select region</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Region"
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
            />
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Item
          </label>
          <input
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="e.g. Bag of cement"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Unit
          </label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="bag, m², kg…"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Price ({currency})
          </label>
          <input
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
          <label className="text-xs font-medium text-muted-foreground">
            Vendor <span className="opacity-70">(optional)</span>
          </label>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Where you saw this price"
            className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm dark:border-white/10 dark:bg-background dark:text-primary-foreground"
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit price report"}
          </Button>
        </div>
      </form>

      {mine.length > 0 && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Your recent reports
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
  });
}

export async function supabaseFetch(userId: string) {
  return supabase
    .from("price_submissions")
    .select("id, item_name, region, market, price, unit, status, created_at")
    .eq("submitted_by", userId)
    .order("created_at", { ascending: false })
    .limit(5);
}
