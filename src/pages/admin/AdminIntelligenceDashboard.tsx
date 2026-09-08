import { useEffect, useState, useCallback } from "react";
import { Activity } from "lucide-react";
import { AdminHeader, AdminButton } from "@/components/admin/AdminUi";
import {
  listSources,
  listCrawlRuns,
  listPriceObservations,
  listExtractedProducts,
} from "@/lib/learning/web-intelligence/intel-client";
import {
  computePriceStats,
  regionalPriceComparison,
} from "@/lib/learning/web-intelligence/price-stats";

interface Obs {
  product_name: string;
  price: number;
  currency: string;
  country: string;
  region: string | null;
  retrieved_at: string;
  source_reliability: string;
}

export default function AdminIntelligenceDashboard() {
  const [sources, setSources] = useState<
    Array<{
      enabled: boolean;
      reliability: string;
      last_crawl: string | null;
      next_crawl: string | null;
    }>
  >([]);
  const [runs, setRuns] = useState<Array<Record<string, unknown>>>([]);
  const [obs, setObs] = useState<Obs[]>([]);
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSources((await listSources()) as unknown as typeof sources);
      setRuns(
        (await listCrawlRuns()) as unknown as Array<Record<string, unknown>>,
      );
      setObs((await listPriceObservations()) as unknown as Obs[]);
      setProducts(await listExtractedProducts());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const active = sources.filter((s) => s.enabled).length;
  const disabled = sources.length - active;
  const lastRun = runs[0];
  const newInfo = runs.reduce((a, r) => a + (Number(r.new_facts) || 0), 0);
  const changed = runs.reduce((a, r) => a + (Number(r.changed_facts) || 0), 0);
  const pagesScanned = runs.reduce(
    (a, r) => a + (Number(r.pages_processed) || 0),
    0,
  );
  const errors = runs.reduce(
    (a, r) =>
      a + (Array.isArray(r.errors) ? (r.errors as unknown[]).length : 0),
    0,
  );
  const candidates = runs.reduce(
    (a, r) => a + (Number(r.candidates_generated) || 0),
    0,
  );
  const promoted = runs.reduce(
    (a, r) => a + (Number(r.knowledge_promoted) || 0),
    0,
  );

  const stats = computePriceStats(obs);
  const byRegion = regionalPriceComparison(obs);

  const tile = (label: string, value: string | number) => (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );

  return (
    <div>
      <AdminHeader
        title="Intelligence Dashboard"
        subtitle="Crawling and learning activity for approved external sources. External prices are OBSERVED MARKET PRICES, they never automatically change FRELUX configured calculator prices."
      />
      <div className="space-y-6">
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
        <div className="flex justify-end">
          <AdminButton onClick={load}>Refresh</AdminButton>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tile("Registered sources", sources.length)}
          {tile("Active", active)}
          {tile("Disabled", disabled)}
          {tile(
            "Last crawl",
            lastRun
              ? String(lastRun.started_at).slice(0, 16).replace("T", " ")
              : "never",
          )}
          {tile(
            "Next crawl",
            sources
              .find((s) => s.enabled && s.next_crawl)
              ?.next_crawl?.slice(0, 16)
              .replace("T", " ") ?? "-",
          )}
          {tile("Crawl errors", errors)}
        </div>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {tile("Pages scanned", pagesScanned)}
          {tile("New information", newInfo)}
          {tile("Changed information", changed)}
          {tile("Extracted products", products.length)}
          {tile("Price observations", obs.length)}
          {tile("Learning candidates", candidates)}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {tile("Pending verification", obs.filter((o) => true).length)}
          {tile("Knowledge promoted (via review)", promoted)}
          {tile(
            "Reliability mix",
            [...new Set(sources.map((s) => s.reliability))].join(", ") || "-",
          )}
        </div>

        {/* Price intelligence */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4" /> Observed market price intelligence
            (append-only history)
          </h2>
          <p className="text-xs text-muted-foreground">
            OBSERVED MARKET PRICE ({stats.count} observations, currency{" "}
            {stats.currency ?? "mixed"}), median {stats.median ?? "-"}, typical{" "}
            {stats.typical?.toFixed(0) ?? "-"}, range {stats.min ?? "-"}–
            {stats.max ?? "-"}, newest {stats.priceAgeDays ?? "-"} days old
            {stats.trendPerDay != null
              ? `, trend ${stats.trendPerDay}/day`
              : ""}
            . This is distinct from FRELUX CONFIGURED PRICES and VERIFIED ACTUAL
            PROJECT PRICES.
          </p>
          {byRegion.length > 0 && (
            <div className="grid gap-2 md:grid-cols-3">
              {byRegion.map(({ region, stats: rs }) => (
                <div key={region} className="rounded-md border p-2 text-xs">
                  <p className="font-medium">{region}</p>
                  <p className="text-muted-foreground">
                    median {rs.median ?? "-"} {rs.currency ?? ""} · {rs.count}{" "}
                    obs · age {rs.priceAgeDays ?? "-"}d
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Crawl history */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">Crawl history</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="p-2">Run</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Started</th>
                  <th className="p-2">Pages</th>
                  <th className="p-2">New</th>
                  <th className="p-2">Changed</th>
                  <th className="p-2">Candidates</th>
                  <th className="p-2">Failure reason</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-mono">
                      {String(r.id).slice(0, 8)}
                    </td>
                    <td className="p-2">{String(r.status)}</td>
                    <td className="p-2">
                      {String(r.started_at).slice(0, 16).replace("T", " ")}
                    </td>
                    <td className="p-2">
                      {Number(r.pages_processed)}/{Number(r.pages_attempted)} (
                      {Number(r.pages_rejected)} rejected,{" "}
                      {Number(r.pages_unchanged)} unchanged)
                    </td>
                    <td className="p-2">{Number(r.new_facts)}</td>
                    <td className="p-2">{Number(r.changed_facts)}</td>
                    <td className="p-2">{Number(r.candidates_generated)}</td>
                    <td className="p-2">
                      {String(
                        r.failure_reason ??
                          (Array.isArray(r.errors) &&
                          (r.errors as unknown[]).length > 0
                            ? JSON.stringify(r.errors).slice(0, 120)
                            : "-"),
                      )}
                    </td>
                  </tr>
                ))}
                {runs.length === 0 && (
                  <tr>
                    <td className="p-2 text-muted-foreground" colSpan={8}>
                      No crawls recorded yet. No source has been claimed
                      crawled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Extracted products */}
        <section className="rounded-lg border bg-card p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            Extracted products ({products.length})
          </h2>
          <div className="space-y-2">
            {products.slice(0, 20).map((p, i) => (
              <div key={i} className="rounded-md border p-2 text-xs">
                <p className="font-medium">
                  {String(p.product_name ?? "unidentified product")} :{" "}
                  {p.price ? `${p.price} ${p.currency ?? "?"}` : "no price"}
                </p>
                <p className="text-muted-foreground break-all">
                  {String(p.url)}
                </p>
                <p className="text-muted-foreground">
                  uncertain:{" "}
                  {Array.isArray(p.uncertain_fields)
                    ? (p.uncertain_fields as string[]).join(", ") || "none"
                    : "-"}{" "}
                  · confidence {String(p.confidence ?? "-")} · verification{" "}
                  {String(p.verification_status)}
                </p>
              </div>
            ))}
            {products.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No products extracted yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
