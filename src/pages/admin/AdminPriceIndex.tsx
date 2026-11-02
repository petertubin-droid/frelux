/**
 * Admin: Live Material Price Index.
 *
 * The moderation and quality surface for the index. Material definitions are
 * edited in the existing catalogue screens, which this page links to rather
 * than duplicating. Everything that changes a published price goes through the
 * price-index-review edge function so validation, permission checks and the
 * append-only audit trail happen server-side.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ExternalLink, Flag, History, ShieldCheck } from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminHeader,
  AdminIconButton,
  AdminSelect,
  StateMessage,
  StatusBadge,
} from "@/components/admin/AdminUi";
import { supabase } from "@/lib/supabase";
import {
  categoryLabel,
  fetchAuditTrail,
  fetchCities,
  fetchListings,
  fetchPendingSubmissions,
} from "@/lib/price-index/queries";
import { computeStats } from "@/lib/price-index/stats";
import { groupByMaterial, toSamples } from "@/lib/price-index/resolver";
import { PRICE_KIND_LABELS } from "@/lib/price-index/types";
import type {
  AuditRow,
  IndexListing,
  MarketCity,
  SubmissionRow,
} from "@/lib/price-index/types";

type Busy = { id: string; action: string } | null;

export default function AdminPriceIndex() {
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [cities, setCities] = useState<MarketCity[]>([]);
  const [listings, setListings] = useState<IndexListing[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [compareMaterial, setCompareMaterial] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [submissionResult, cityResult, listingResult, auditResult] = await Promise.all([
      fetchPendingSubmissions(),
      fetchCities(),
      fetchListings({ limit: 800 }),
      fetchAuditTrail(60),
    ]);
    setSubmissions(submissionResult.rows);
    setCities(cityResult.cities);
    setListings(listingResult.listings);
    setAudit(auditResult.rows);
    setLoadError(
      submissionResult.error ??
        cityResult.error ??
        listingResult.error ??
        auditResult.error ??
        null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => groupByMaterial(listings), [listings]);

  const materialOptions = useMemo(
    () =>
      Array.from(grouped.entries())
        .map(([id, group]) => ({
          id,
          name: group[0].name,
          category: group[0].category,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [grouped],
  );

  const compareRows = useMemo(() => {
    if (!compareMaterial) return [];
    const group = grouped.get(compareMaterial) ?? [];
    return cities
      .map((city) => {
        const cityListings = group.filter((listing) => listing.city_slug === city.slug);
        const stats = computeStats(toSamples(cityListings));
        return {
          city: city.name,
          slug: city.slug,
          status: stats.status,
          median: stats.status === "ok" ? stats.median : null,
          samples: stats.status === "ok" ? stats.counted : stats.count,
        };
      })
      .sort((a, b) => (b.median ?? -1) - (a.median ?? -1));
  }, [compareMaterial, grouped, cities]);

  const visibleSubmissions = submissions.filter((row) =>
    statusFilter === "all" ? true : row.status === statusFilter,
  );

  const counts = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const row of submissions) byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    return byStatus;
  }, [submissions]);

  const review = async (
    submission: SubmissionRow,
    action: "approve" | "reject" | "flag",
  ) => {
    setBusy({ id: submission.id, action });
    setActionError(null);

    let note: string | null = null;
    if (action === "reject" || action === "flag") {
      note =
        window.prompt(
          action === "reject"
            ? "Reason for rejecting this price (shown in the audit trail)?"
            : "Why is this price suspicious?",
        ) ?? null;
      if (note === null) {
        setBusy(null);
        return;
      }
    }

    const { data, error } = await supabase.functions.invoke("price-index-review", {
      body: { action, submission_id: submission.id, note },
    });
    setBusy(null);

    const result = data as { ok?: boolean; error?: string } | null;
    if (error || result?.ok === false) {
      setActionError(
        result?.error ?? "The review action failed. The submission was not changed.",
      );
      return;
    }
    await load();
  };

  const toggleCity = async (city: MarketCity) => {
    setBusy({ id: city.slug, action: "city" });
    setActionError(null);
    const { data, error } = await supabase.functions.invoke("price-index-review", {
      body: { action: "toggle_city", city_slug: city.slug, is_active: !city.is_active },
    });
    setBusy(null);
    const result = data as { ok?: boolean; error?: string } | null;
    if (error || result?.ok === false) {
      setActionError(result?.error ?? "The city could not be updated.");
      return;
    }
    await load();
  };

  const exportCsv = () => {
    const header = [
      "material",
      "category",
      "city",
      "price_ngn",
      "sale_unit",
      "price_kind",
      "supplier",
      "source",
      "effective_date",
      "verification",
      "supporting_submissions",
    ];
    const lines = listings.map((listing) =>
      [
        listing.name,
        categoryLabel(listing.category),
        listing.city_slug ?? "national",
        listing.price,
        listing.sale_unit ?? "",
        listing.price_kind ?? "",
        listing.supplier_name ?? "",
        (listing.price_source ?? listing.source_url ?? "").replace(/"/g, "'"),
        listing.effective_date ?? "",
        listing.verification_status ?? "unverified",
        listing.supporting_submissions,
      ]
        .map((value) => `"${String(value)}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `frelux-price-index-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Material Price Index"
        subtitle="Review submitted prices, manage supported cities, compare markets and read the audit trail. Approved prices flow to every calculator through the price resolver."
      />

      {loadError ? (
        <StateMessage
          type="error"
          title="Price index data unavailable"
          message={`${loadError} — no figures are shown rather than guessed.`}
        />
      ) : null}

      {actionError ? (
        <StateMessage type="error" title="Action failed" message={actionError} />
      ) : null}

      <AdminCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-2 py-1">
              {counts.pending ?? 0} pending
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              {counts.approved ?? 0} approved
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              {counts.rejected ?? 0} rejected
            </span>
            <span className="rounded-full bg-muted px-2 py-1">
              {counts.flagged ?? 0} flagged
            </span>
          </div>
          <div className="flex gap-2">
            <AdminButton onClick={exportCsv} disabled={listings.length === 0}>
              <Download aria-hidden="true" className="mr-2 h-4 w-4" />
              Export CSV
            </AdminButton>
            <Link
              to="/admin/estimation-materials"
              className="inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm hover:bg-muted"
            >
              Edit materials
              <ExternalLink aria-hidden="true" className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">Submission review</h2>
          <AdminField label="Status">
            <AdminSelect
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="flagged">Flagged</option>
              <option value="all">All</option>
            </AdminSelect>
          </AdminField>
        </div>

        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading submissions…</p>
        ) : visibleSubmissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing in this state. Submitted prices appear here for review before they
            can change any published figure.
          </p>
        ) : (
          <div className="mt-3 overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Material</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Basis</th>
                  <th className="px-3 py-2">Supplier</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Received</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleSubmissions.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-3 py-2">
                      <span className="font-medium text-foreground">{row.item_name}</span>
                      {row.unit ? (
                        <span className="block text-muted-foreground">per {row.unit}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {cities.find((city) => city.slug === row.city_slug)?.name ??
                        row.city_slug ??
                        "—"}
                    </td>
                    <td className="px-3 py-2 font-semibold text-foreground">
                      ₦{Number(row.price).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.price_kind ? PRICE_KIND_LABELS[row.price_kind] : "not stated"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.vendor ?? "—"}</td>
                    <td className="max-w-[14rem] truncate px-3 py-2 text-muted-foreground">
                      {row.source_url ? (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-primary hover:underline"
                        >
                          {row.source_url}
                        </a>
                      ) : (
                        "no link supplied"
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <AdminIconButton
                          title="Approve" aria-label="Approve"
                          onClick={() => review(row, "approve")}
                          disabled={busy?.id === row.id || row.status === "approved"}
                        >
                          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                        </AdminIconButton>
                        <AdminIconButton
                          title="Reject" aria-label="Reject"
                          onClick={() => review(row, "reject")}
                          disabled={busy?.id === row.id || row.status === "rejected"}
                        >
                          ✕
                        </AdminIconButton>
                        <AdminIconButton
                          title="Flag as suspicious" aria-label="Flag as suspicious"
                          onClick={() => review(row, "flag")}
                          disabled={busy?.id === row.id}
                        >
                          <Flag aria-hidden="true" className="h-3.5 w-3.5" />
                        </AdminIconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminCard>
          <h2 className="text-sm font-bold text-foreground">Compare markets</h2>
          <AdminField label="Material">
            <AdminSelect
              value={compareMaterial}
              onChange={(event) => setCompareMaterial(event.target.value)}
            >
              <option value="">Choose a material</option>
              {materialOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          {compareMaterial ? (
            <div className="mt-3 overflow-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">City</th>
                    <th className="px-3 py-2">Median</th>
                    <th className="px-3 py-2">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row) => (
                    <tr key={row.slug} className="border-t">
                      <td className="px-3 py-2 text-foreground">{row.city}</td>
                      <td className="px-3 py-2">
                        {row.median !== null ? (
                          `₦${row.median.toLocaleString()}`
                        ) : (
                          <span className="text-muted-foreground">
                            below the sample gate ({row.samples})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{row.samples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Pick a material to see which cities can publish a figure and which cannot.
            </p>
          )}
        </AdminCard>

        <AdminCard>
          <h2 className="text-sm font-bold text-foreground">Supported cities</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Disabling a city hides it from the public index and from calculator city
            selection.
          </p>
          <ul className="mt-3 max-h-72 space-y-1 overflow-auto">
            {cities.map((city) => (
              <li
                key={city.slug}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs"
              >
                <span>
                  <span className="font-medium text-foreground">{city.name}</span>
                  {city.state ? (
                    <span className="text-muted-foreground"> · {city.state}</span>
                  ) : null}
                </span>
                <button
                  onClick={() => toggleCity(city)}
                  disabled={busy?.id === city.slug}
                  className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                >
                  {busy?.id === city.slug ? "Saving…" : "Disable"}
                </button>
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>

      <AdminCard>
        <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <History aria-hidden="true" className="h-4 w-4 text-primary" />
          Audit trail
        </h2>
        {audit.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No price-index changes recorded yet. Every approval, rejection, flag and
            price write appends a row here and cannot be edited afterwards.
          </p>
        ) : (
          <div className="mt-3 overflow-auto rounded-lg border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Entity</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.action} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.entity}
                      {row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ""}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{row.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
