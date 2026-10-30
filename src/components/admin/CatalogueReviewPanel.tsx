import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/utils";
import {
  coverageSentence,
  groupReasons,
  summariseCoverage,
  type CoverageRow,
  type ReasonRow,
} from "@/lib/pricing/catalogue-coverage";

// Supplier catalogues, staged and waiting for a name they can be trusted with.
//
// A catalogue row becomes a Frelux price only when it is tied to a material of
// the same market and the same package size. Everything else waits here so a
// human decides, and the decision survives every future scan.

type CatalogueRow = {
  id: string;
  market: string;
  supplier: string | null;
  title: string;
  price: number | null;
  currency: string | null;
  material_slug: string | null;
  match_status: string;
  observations: number;
  last_seen: string;
};

type MaterialOption = { slug: string; name: string };

const STATUS_TONE: Record<string, string> = {
  unmapped: "text-muted-foreground border-white/15 bg-white/5",
  suggested: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  auto_mapped: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  approved: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  no_counterpart: "text-muted-foreground border-white/15 bg-white/5",
  bulk_listing: "text-muted-foreground border-white/15 bg-white/5",
  supplier_no_price: "text-rose-500 border-rose-500/30 bg-rose-500/10",
};

export default function CatalogueReviewPanel({ market }: { market?: string }) {
  const [rows, setRows] = useState<CatalogueRow[]>([]);
  const [materials, setMaterials] = useState<MaterialOption[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [reasons, setReasons] = useState<ReasonRow[]>([]);
  const [classifying, setClassifying] = useState(false);

  const load = useCallback(async () => {
    let q = supabase
      .from("catalogue_products")
      .select(
        "id, market, supplier, title, price, currency, material_slug, match_status, observations, last_seen",
      )
      .in("match_status", ["unmapped", "suggested"])
      .order("price", { ascending: false })
      .limit(200);
    if (market) q = q.eq("market", market);
    const { data } = await q;
    setRows((data ?? []) as CatalogueRow[]);

    const { data: coverageRows } = await supabase
      .from("catalogue_coverage_by_market")
      .select(
        "market, staged, mapped, awaiting_review, no_counterpart, bulk_listing, supplier_no_price, supplies_prices, last_seen",
      );
    setCoverage((coverageRows ?? []) as CoverageRow[]);

    let setAside = supabase
      .from("catalogue_products")
      .select("match_status, rejection_reason")
      .in("match_status", [
        "no_counterpart",
        "bulk_listing",
        "supplier_no_price",
      ])
      .limit(500);
    if (market) setAside = setAside.eq("market", market);
    const { data: setAsideRows } = await setAside;
    setReasons((setAsideRows ?? []) as ReasonRow[]);

    setLoading(false);
  }, [market]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("estimation_materials")
        .select("slug, name")
        .eq("is_active", true)
        .order("name")
        .limit(2000);
      setMaterials((data ?? []) as MaterialOption[]);
    })();
    load();
  }, [load]);

  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? materials.filter(
          (m) =>
            m.name.toLowerCase().includes(needle) || m.slug.includes(needle),
        )
      : materials.filter((m) =>
          rows[0] ? m.slug.startsWith(rows[0].market.toLowerCase()) : true,
        );
    return filtered.slice(0, 60);
  }, [materials, query, rows]);

  const reasonGroups = useMemo(() => groupReasons(reasons), [reasons]);

  const approve = async (row: CatalogueRow, slug: string) => {
    setBusy(row.id);
    await supabase
      .from("catalogue_products")
      .update({ material_slug: slug, match_status: "approved", match_score: 1 })
      .eq("id", row.id);
    setBusy(null);
    load();
  };

  return (
    <section className="admin-surface mt-6 rounded-2xl border border-white/10 p-6 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Supplier catalogue review
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Every product a supplier publishes is kept here. Tie a product to
            the matching Frelux material once and every later scan refreshes
            that price automatically. Untied products stay as staged data, never
            as prices.
          </p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-muted-foreground">
          {rows.length} waiting
        </span>
      </div>

      {coverage.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              What each catalogue yields
            </p>
            <button
              type="button"
              onClick={async () => {
                setClassifying(true);
                await supabase.rpc("classify_catalogue_backlog");
                setClassifying(false);
                load();
              }}
              disabled={classifying}
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground disabled:opacity-50"
            >
              {classifying ? "Deciding" : "Decide set-aside rows"}
            </button>
          </div>
          {summariseCoverage(coverage).markets.map((row) => (
            <div
              key={row.market}
              className="admin-inset flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <span className="text-sm font-medium text-foreground">
                {row.market}
              </span>
              <span className="text-xs text-muted-foreground">
                {coverageSentence(row)}
              </span>
              <span
                className={classNames(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  row.supplies_prices
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-500",
                )}
              >
                {row.supplies_prices ? "supplies prices" : "no prices adopted"}
              </span>
            </div>
          ))}
          {reasonGroups.length > 0 && (
            <div className="admin-inset rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="text-xs text-muted-foreground">
                Set aside, and why
              </p>
              <ul className="mt-1 space-y-1">
                {reasonGroups.slice(0, 4).map((group) => (
                  <li
                    key={group.status + group.reason}
                    className="text-xs text-muted-foreground"
                  >
                    {group.count} · {group.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter materials by name"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="mt-4 space-y-2">
        {loading && (
          <p className="py-4 text-sm text-muted-foreground">
            Reading staged catalogue
          </p>
        )}
        {!loading && rows.length === 0 && (
          <p className="py-4 text-sm text-muted-foreground">
            Nothing waiting. Supplier catalogues arrive on the six-hourly sync,
            or add a catalogue in Data sources.
          </p>
        )}
        {rows.slice(0, 40).map((row) => (
          <div
            key={row.id}
            className="admin-inset rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">
                  {row.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {row.market} · {row.supplier ?? "unknown supplier"} ·{" "}
                  {row.currency ?? ""} {row.price ?? "no price"}
                  {row.observations > 0 ? ` · ${row.observations} applied` : ""}
                </div>
              </div>
              <span
                className={classNames(
                  "rounded-full border px-2 py-0.5 text-[11px]",
                  STATUS_TONE[row.match_status] ?? STATUS_TONE.unmapped,
                )}
              >
                {row.match_status.split("_").join(" ")}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                defaultValue={row.material_slug ?? ""}
                onChange={(e) => e.target.value && approve(row, e.target.value)}
                disabled={busy === row.id}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-foreground"
              >
                <option value="">Choose the matching material</option>
                {row.material_slug && (
                  <option value={row.material_slug}>{row.material_slug}</option>
                )}
                {options
                  .filter((m) => m.slug !== row.material_slug)
                  .map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name}
                    </option>
                  ))}
              </select>
              {busy === row.id && (
                <span className="text-xs text-muted-foreground">saving</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
