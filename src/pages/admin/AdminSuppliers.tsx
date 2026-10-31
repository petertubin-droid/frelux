/**
 * Administrator: supplier network console.
 *
 * The four things only an administrator may do here - approve verification,
 * moderate listings, resolve complaints, and sell placement - all call the
 * supplier-ops function, which re-checks the caller's role server-side and
 * writes the audit trail. This page never writes a verification level directly.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  ShieldCheck,
  Package,
  Flag,
  Star,
  Store,
  Check,
  X,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Badge } from "@/components/ui/shadcn/badge";
import { supabase } from "@/lib/supabase";
import { formatByCode } from "@/lib/international/currency-format";
import { useSeo } from "@/lib/seo";
import {
  verificationDefinition,
  verificationLabels,
} from "@/lib/suppliers/verification";
import type {
  SupplierListing,
  SupplierPlan,
  SupplierProfile,
} from "@/lib/suppliers/types";

type VerificationEvent = {
  id: string;
  supplier_id: string;
  requested_level: string;
  action: string;
  evidence_ref: string | null;
  note: string | null;
  created_at: string;
};

type Report = {
  id: string;
  report_type: string;
  reason: string | null;
  description: string | null;
  status: string;
  supplier_id: string | null;
  created_at: string;
};

async function ops(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("supplier-ops", {
    body,
  });
  if (error) return { ok: false, error: error.message };
  const payload = data as { ok?: boolean; error?: string };
  return { ok: payload?.ok === true, error: payload?.error ?? null };
}

export default function AdminSuppliers() {
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [listings, setListings] = useState<SupplierListing[]>([]);
  const [events, setEvents] = useState<VerificationEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [plans, setPlans] = useState<SupplierPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useSeo({
    title: "Supplier network administration",
    description:
      "Verification review, listing moderation, complaints, placement and marketplace analytics.",
    canonicalPath: "/admin/suppliers",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [
      supplierResult,
      listingResult,
      eventResult,
      reportResult,
      planResult,
    ] = await Promise.all([
      supabase
        .from("supplier_profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("supplier_inventory_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300),
      supabase
        .from("supplier_verification_events")
        .select("*")
        .eq("action", "submitted")
        .order("created_at", { ascending: true })
        .limit(100),
      supabase
        .from("marketplace_reports")
        .select("*")
        .not("supplier_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("supplier_plans").select("*").order("monthly_price"),
    ]);
    setSuppliers((supplierResult.data ?? []) as SupplierProfile[]);
    setListings((listingResult.data ?? []) as SupplierListing[]);
    setEvents((eventResult.data ?? []) as VerificationEvent[]);
    setReports((reportResult.data ?? []) as Report[]);
    setPlans((planResult.data ?? []) as SupplierPlan[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (
    key: string,
    body: Record<string, unknown>,
    success: string,
  ) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    const result = await ops(body);
    setBusy(null);
    if (!result.ok) {
      setError(result.error ?? "The action could not be completed.");
      return;
    }
    setNotice(success);
    load();
  };

  const pendingListings = listings.filter(
    (listing) => listing.listing_status === "pending",
  );
  const openReports = reports.filter(
    (report) => report.status === "open" || report.status === "investigating",
  );
  const verifiedCount = suppliers.filter(
    (supplier) => supplier.verification_level !== "unverified",
  ).length;
  const featuredCount = suppliers.filter(
    (supplier) => supplier.is_featured,
  ).length;
  const paidPlans = suppliers.filter(
    (supplier) => supplier.subscription_plan !== "free",
  ).length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the supplier
        console…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Supplier network
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Verification decisions, moderation and complaints. Every action is
            written to the supplier audit log.
          </p>
        </div>
        <Link to="/suppliers" className="text-sm text-sky-700 hover:underline">
          View public directory
        </Link>
      </header>

      {notice ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Suppliers",
            value: suppliers.length,
            hint: `${verifiedCount} above unverified`,
          },
          {
            label: "Listings",
            value: listings.length,
            hint: `${pendingListings.length} awaiting moderation`,
          },
          {
            label: "Open reports",
            value: openReports.length,
            hint: "Complaints and disputes",
          },
          {
            label: "Paid plans",
            value: paidPlans,
            hint: `${featuredCount} featured placements`,
          },
        ].map((tile) => (
          <div
            key={tile.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {tile.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {tile.value}
            </p>
            <p className="text-[11px] text-slate-500">{tile.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ShieldCheck className="h-4 w-4" /> Verification queue (
          {events.length})
        </h2>
        {events.length === 0 ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No verification requests waiting.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {events.map((event) => {
              const supplier = suppliers.find(
                (s) => s.id === event.supplier_id,
              );
              return (
                <li
                  key={event.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {supplier?.company_name ?? event.supplier_id}
                        <span className="ml-2 text-xs font-normal text-slate-500">
                          requesting{" "}
                          {verificationDefinition(event.requested_level).label}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Current:{" "}
                        {
                          verificationDefinition(supplier?.verification_level)
                            .label
                        }{" "}
                        · evidence: {event.evidence_ref ?? "none supplied"} ·{" "}
                        {new Date(event.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy === event.id}
                        onClick={() =>
                          act(
                            event.id,
                            {
                              action: "review_verification",
                              event_id: event.id,
                              decision: "approve",
                            },
                            "Verification approved.",
                          )
                        }
                      >
                        <Check className="mr-1 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === event.id}
                        onClick={() =>
                          act(
                            event.id,
                            {
                              action: "review_verification",
                              event_id: event.id,
                              decision: "reject",
                            },
                            "Verification rejected.",
                          )
                        }
                      >
                        <X className="mr-1 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Package className="h-4 w-4" /> Listing moderation (
          {pendingListings.length})
        </h2>
        {pendingListings.length === 0 ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            No listings waiting for review.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {pendingListings.map((listing) => {
              const supplier = suppliers.find(
                (s) => s.id === listing.supplier_id,
              );
              return (
                <li
                  key={listing.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {listing.product_name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {supplier?.company_name} ·{" "}
                        {formatByCode(
                          Number(listing.unit_price),
                          listing.currency,
                        )}
                        /{listing.unit} ·{" "}
                        {listing.specification ?? "no specification"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busy === listing.id}
                        onClick={() =>
                          act(
                            listing.id,
                            {
                              action: "moderate_listing",
                              listing_id: listing.id,
                              decision: "approve",
                            },
                            "Listing published.",
                          )
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === listing.id}
                        onClick={() =>
                          act(
                            listing.id,
                            {
                              action: "moderate_listing",
                              listing_id: listing.id,
                              decision: "reject",
                            },
                            "Listing rejected.",
                          )
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Flag className="h-4 w-4" /> Complaints and disputes (
          {openReports.length})
        </h2>
        {openReports.length === 0 ? (
          <p className="mt-2 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
            Nothing open.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {openReports.map((report) => {
              const supplier = suppliers.find(
                (s) => s.id === report.supplier_id,
              );
              return (
                <li
                  key={report.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {report.reason ?? report.report_type}
                        {supplier ? (
                          <span className="ml-2 text-xs font-normal text-slate-500">
                            {supplier.company_name}
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {report.description}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {report.status} ·{" "}
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === report.id}
                        onClick={() =>
                          act(
                            report.id,
                            {
                              action: "resolve_report",
                              report_id: report.id,
                              status: "investigating",
                            },
                            "Marked as investigating.",
                          )
                        }
                      >
                        Investigating
                      </Button>
                      <Button
                        size="sm"
                        disabled={busy === report.id}
                        onClick={() =>
                          act(
                            report.id,
                            {
                              action: "resolve_report",
                              report_id: report.id,
                              status: "resolved",
                            },
                            "Report resolved.",
                          )
                        }
                      >
                        Resolve
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Store className="h-4 w-4" /> Suppliers
        </h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Market</th>
                <th className="px-3 py-2 font-medium">Level</th>
                <th className="px-3 py-2 font-medium">Plan</th>
                <th className="px-3 py-2 font-medium">Placement</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <Link
                      to={
                        supplier.public_slug
                          ? `/suppliers/${supplier.public_slug}`
                          : `/suppliers?supplier=${supplier.id}`
                      }
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {supplier.company_name}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {supplier.city ?? "no city"}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {supplier.market_code}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        supplier.verification_level === "unverified"
                          ? "outline"
                          : "secondary"
                      }
                      className="text-[10px]"
                    >
                      {
                        verificationDefinition(supplier.verification_level)
                          .shortLabel
                      }
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={supplier.subscription_plan}
                      onChange={(e) =>
                        act(
                          `plan-${supplier.id}`,
                          {
                            action: "set_plan",
                            supplier_id: supplier.id,
                            plan: e.target.value,
                          },
                          "Plan updated.",
                        )
                      }
                      className="h-8 rounded-md border border-slate-200 px-1 text-xs"
                    >
                      {plans.map((plan) => (
                        <option key={plan.code} value={plan.code}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    {plans.find(
                      (plan) => plan.code === supplier.subscription_plan,
                    )?.monthly_price ? (
                      <p className="text-[11px] text-slate-500">
                        {formatByCode(
                          plans.find(
                            (plan) => plan.code === supplier.subscription_plan,
                          )!.monthly_price,
                          plans.find(
                            (plan) => plan.code === supplier.subscription_plan,
                          )!.currency,
                        )}
                        /mo
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {supplier.is_featured ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
                        <Star className="h-3.5 w-3.5" /> Paid placement
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">
                        Organic only
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy === `featured-${supplier.id}`}
                      onClick={() =>
                        act(
                          `featured-${supplier.id}`,
                          {
                            action: "set_featured",
                            supplier_id: supplier.id,
                            enabled: !supplier.is_featured,
                            days: 30,
                          },
                          supplier.is_featured
                            ? "Placement ended."
                            : "Placement started for 30 days.",
                        )
                      }
                    >
                      <Crown className="mr-1 h-3.5 w-3.5" />
                      {supplier.is_featured ? "End placement" : "Feature"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          Plans:{" "}
          {plans
            .map(
              (plan) =>
                `${plan.name} (${formatByCode(plan.monthly_price, plan.currency)}/mo)`,
            )
            .join(" · ")}
          . Featured placement is paid promotion and never feeds the organic
          ranking score.
        </p>
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Verification levels explained to buyers
        </h2>
        <ul className="mt-2 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
          {verificationLabels().map((level) => (
            <li key={level.level}>
              <span className="font-medium text-slate-800">{level.label}:</span>{" "}
              {level.meaning}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
