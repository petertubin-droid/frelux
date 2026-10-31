/**
 * Supplier comparison.
 *
 * Compares like with like: offers sharing a brand, specification and unit are
 * ranked, and offers that differ are shown apart with no cheapest claim. The
 * quantity control spreads delivery over the order so "landed" means the same
 * thing for every supplier.
 */

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Scale, Info, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { Input } from "@/components/ui/shadcn/input";
import { useSeo } from "@/lib/seo";
import { formatByCode } from "@/lib/international/currency-format";
import { fetchSupplierById } from "@/lib/suppliers/queries";
import { buildComparison } from "@/lib/suppliers/comparison";
import { publicBadge } from "@/lib/suppliers/verification";
import type { SupplierListing, SupplierProfile } from "@/lib/suppliers/types";

interface Row {
  listing: SupplierListing;
  supplier: Pick<
    SupplierProfile,
    | "id"
    | "company_name"
    | "city"
    | "neighbourhood"
    | "verification_level"
    | "public_slug"
  >;
}

export default function SupplierCompare() {
  const [params, setParams] = useSearchParams();
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const [quantity, setQuantity] = useState(Number(params.get("qty") ?? 1) || 1);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSeo({
    title: "Compare material suppliers, specifications and landed prices",
    description:
      "Compare supplier prices, specifications, delivery charges and verification levels. Offers with different specifications are shown separately, never ranked as if identical.",
    canonicalPath: "/suppliers/compare",
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const results = await Promise.all(ids.map((id) => fetchSupplierById(id)));
      if (cancelled) return;
      const collected: Row[] = [];
      for (const result of results) {
        if (!result.supplier) continue;
        for (const listing of result.listings) {
          collected.push({
            listing,
            supplier: {
              id: result.supplier.id,
              company_name: result.supplier.company_name,
              city: result.supplier.city,
              neighbourhood: result.supplier.neighbourhood,
              verification_level: result.supplier.verification_level,
              public_slug: result.supplier.public_slug,
            },
          });
        }
      }
      setRows(collected);
      setError(
        results.some((r) => r.error)
          ? "Some suppliers could not be loaded."
          : null,
      );
      setLoading(false);
    };
    if (ids.length > 0) run();
    else {
      setRows([]);
      setLoading(false);
    }
    // ids is derived from the query string; join keeps the dependency stable.
  }, [ids.join(",")]);

  const groups = useMemo(
    () => buildComparison(rows, quantity),
    [rows, quantity],
  );

  const setQty = (value: number) => {
    const next = Math.max(1, value || 1);
    setQuantity(next);
    const updated = new URLSearchParams(params);
    updated.set("qty", String(next));
    setParams(updated, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        to="/suppliers"
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the directory
      </Link>
      <header className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900">
            <Scale className="h-5 w-5" /> Compare suppliers
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Landed price includes each supplier's delivery charge spread over
            the quantity you enter.
          </p>
        </div>
        <label className="text-sm">
          <span className="mr-2 text-slate-600">Quantity</span>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQty(Number(e.target.value))}
            className="inline-block w-28"
          />
        </label>
      </header>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Building the comparison…
        </div>
      ) : ids.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Pick suppliers from the directory using the compare button, then come
          back here.
          <Link to="/suppliers" className="mt-3 block">
            <Button size="sm">Browse suppliers</Button>
          </Link>
        </div>
      ) : groups.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          These suppliers have no published products to compare yet. {error}
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {error ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {error}
            </p>
          ) : null}
          {groups.map((group) => (
            <section
              key={group.key}
              className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  {group.label}
                </h2>
                <span
                  className={
                    group.comparable
                      ? "rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                      : "rounded bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
                  }
                >
                  {group.comparable ? "Like for like" : "Not like for like"}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{group.note}</p>

              <div className="mt-3 space-y-4">
                {group.specGroups.map((spec) => (
                  <div
                    key={spec.signature}
                    className="rounded-md border border-slate-100"
                  >
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-800">
                        {[spec.brand, spec.specification]
                          .filter(Boolean)
                          .join(" · ") || "Specification not stated"}
                      </span>
                      <span className="ml-2">unit: {spec.unit}</span>
                    </div>
                    <ul>
                      {spec.listings.map((entry) => {
                        const badge = publicBadge(
                          entry.supplier.verification_level,
                        );
                        const cheapest =
                          spec.cheapestSupplierId === entry.supplier.id;
                        return (
                          <li
                            key={entry.listing.id}
                            className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0"
                          >
                            <div className="min-w-0">
                              <Link
                                to={
                                  entry.supplier.public_slug
                                    ? `/suppliers/${entry.supplier.public_slug}`
                                    : `/suppliers?supplier=${entry.supplier.id}`
                                }
                                className="font-medium text-slate-900 hover:underline"
                              >
                                {entry.supplier.company_name}
                              </Link>
                              <span className="ml-2 text-xs text-slate-500">
                                {[
                                  entry.supplier.neighbourhood,
                                  entry.supplier.city,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                              </span>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {badge.label}
                                </Badge>
                                <span>
                                  {entry.listing.in_stock
                                    ? "In stock"
                                    : "Out of stock"}
                                  {entry.daysSincePriceUpdate !== null
                                    ? ` · updated ${entry.daysSincePriceUpdate}d ago`
                                    : ""}
                                </span>
                                {cheapest ? (
                                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-700">
                                    Lowest landed price
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">
                                {formatByCode(
                                  Number(entry.listing.unit_price),
                                  entry.listing.currency,
                                )}
                                <span className="text-xs font-normal text-slate-500">
                                  /{entry.listing.unit}
                                </span>
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {entry.landedUnitPrice !== null
                                  ? `landed ${formatByCode(entry.landedUnitPrice, entry.listing.currency)}/unit`
                                  : "delivery quoted: landed price unknown"}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
          <p className="flex gap-1.5 text-xs text-slate-500">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Prices are supplier-declared. Where delivery is quoted per order,
            the landed price stays unknown rather than assumed, and offers with
            a different brand, specification or unit are never ranked against
            each other.
          </p>
        </div>
      )}
    </div>
  );
}
