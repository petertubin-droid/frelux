/**
 * Admin Price Scan — browse retail websites for prices, review
 * the scanned candidates, and promote APPROVED scans into the
 * estimation price book.
 *
 * Honest by construction:
 *  - "Scan" fetches the retailer's product page server-side and
 *    extracts its real price (JSON-LD → meta → regex, confidence
 *    reported). Nothing is invented.
 *  - Every scan lands as a PENDING candidate. Prices only reach
 *    estimation_prices (the book every engine prices from) via
 *    an explicit admin approval here, with the retailer recorded
 *    in price_source.
 *  - Rejected/failed scans stay in the table for the audit trail.
 */

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Plus,
  RefreshCw,
  ScanLine,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { createOrUpdatePrice } from "@/lib/estimation/queries";
import { AdminHeader as AdminPageHeader } from "@/components/admin/AdminUi";
import { Button } from "@/components/ui/shadcn/button";

interface ScanSource {
  id: string;
  market: string;
  material_slug: string;
  retailer: string;
  label: string;
  product_url: string;
  expected_unit: string;
  currency: string;
  is_active: boolean;
  last_scanned_at: string | null;
}

interface ScanCandidate {
  id: string;
  source_id: string | null;
  market: string;
  material_slug: string;
  retailer: string;
  product_url: string;
  product_name: string | null;
  scraped_price: number | null;
  currency: string;
  unit: string | null;
  extraction: string | null;
  confidence: "low" | "medium" | "high";
  scrape_error: string | null;
  status: "pending" | "approved" | "rejected" | "failed";
  reviewed_at: string | null;
  created_at: string;
}

export default function AdminPriceScan() {
  const [sources, setSources] = useState<ScanSource[]>([]);
  const [candidates, setCandidates] = useState<ScanCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busySource, setBusySource] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSource, setNewSource] = useState({
    market: "US",
    material_slug: "",
    retailer: "",
    label: "",
    product_url: "",
    expected_unit: "unit",
    currency: "USD",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [srcRes, candRes] = await Promise.all([
        supabase
          .from("price_scan_sources")
          .select("*")
          .order("market")
          .order("label"),
        supabase
          .from("price_scan_candidates")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (srcRes.error) throw srcRes.error;
      if (candRes.error) throw candRes.error;
      setSources((srcRes.data ?? []) as ScanSource[]);
      setCandidates((candRes.data ?? []) as ScanCandidate[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const scanSource = useCallback(
    async (source: ScanSource) => {
      setBusySource(source.id);
      setNotice(null);
      setError(null);
      try {
        const { error: fnError } = await supabase.functions.invoke(
          "price-scan",
          { body: { source_id: source.id } },
        );
        if (fnError) throw fnError;
        setNotice(
          `Scanned ${source.label || source.product_url} — result saved for review below.`,
        );
        await load();
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Scan failed (the site may block automated fetches)";
        setError(msg);
      } finally {
        setBusySource(null);
      }
    },
    [load],
  );

  const addSource = useCallback(async () => {
    setError(null);
    try {
      if (
        !newSource.material_slug ||
        !newSource.product_url ||
        !newSource.retailer
      ) {
        throw new Error("Material slug, retailer and product URL are required");
      }
      const { error: insertError } = await supabase
        .from("price_scan_sources")
        .insert({ ...newSource, is_active: true });
      if (insertError) throw insertError;
      setShowAdd(false);
      setNewSource({
        market: "US",
        material_slug: "",
        retailer: "",
        label: "",
        product_url: "",
        expected_unit: "unit",
        currency: "USD",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the source");
    }
  }, [newSource, load]);

  const reviewCandidate = useCallback(
    async (candidate: ScanCandidate, approve: boolean) => {
      setError(null);
      setNotice(null);
      try {
        if (approve) {
          // Resolve the material by slug, then write the price into the
          // market's book with full provenance.
          const { data: material } = await supabase
            .from("estimation_materials")
            .select("id")
            .eq("slug", candidate.material_slug)
            .maybeSingle();
          if (!material) {
            throw new Error(
              `No shared material record for slug "${candidate.material_slug}" — add it first.`,
            );
          }
          const today = new Date().toISOString().slice(0, 10);
          const { data: applied, error: writeError } =
            await createOrUpdatePrice({
              price_type: "material",
              ref_id: material.id,
              price: candidate.scraped_price ?? 0,
              currency: candidate.currency,
              market: candidate.market,
              effective_date: today,
              price_source: candidate.retailer,
              scan_source: candidate.product_url,
              scan_confidence: candidate.confidence,
              last_scanned_at: candidate.created_at,
              notes: `Approved retail scan (${candidate.retailer}, ${candidate.extraction ?? "page"} extraction). Unit: ${candidate.unit ?? "unit"}.`,
              is_active: true,
            });
          if (writeError || !applied)
            throw writeError ?? new Error("Price write failed");
          const { error: candError } = await supabase
            .from("price_scan_candidates")
            .update({
              status: "approved",
              reviewed_at: new Date().toISOString(),
              applied_price_id: applied.id,
            })
            .eq("id", candidate.id);
          if (candError) throw candError;
          setNotice(
            `Approved: ${candidate.retailer} price for ${candidate.material_slug} is live in the ${candidate.market} book.`,
          );
        } else {
          const { error: candError } = await supabase
            .from("price_scan_candidates")
            .update({
              status: "rejected",
              reviewed_at: new Date().toISOString(),
            })
            .eq("id", candidate.id);
          if (candError) throw candError;
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Review failed");
      }
    },
    [load],
  );

  const pending = candidates.filter((c) => c.status === "pending");
  const reviewed = candidates
    .filter((c) => c.status !== "pending")
    .slice(0, 20);

  return (
    <div className="min-h-screen bg-muted/50">
      <AdminPageHeader
        title="Price Scan"
        subtitle="Scan retailer product pages, review the extracted prices, and promote approved scans into the price book every calculator prices from."
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            role="alert"
          >
            <div className="flex items-center gap-2">
              <AlertCircle aria-hidden="true" className="w-5 h-5" />
              {error}
            </div>
          </div>
        )}
        {notice && (
          <div
            className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700"
            data-testid="scan-notice"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 aria-hidden="true" className="w-5 h-5" />
              {notice}
            </div>
          </div>
        )}

        {/* Sources */}
        <section
          className="rounded-lg border bg-card p-6"
          data-testid="scan-sources"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Globe aria-hidden="true" className="w-5 h-5" />
              Scan sources
            </h2>
            <Button
              onClick={() => setShowAdd((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-blue-700"
            >
              <Plus aria-hidden="true" className="w-4 h-4" />
              Add source
            </Button>
          </div>

          {showAdd && (
            <div
              className="mb-4 grid gap-3 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-4"
              data-testid="add-source-form"
            >
              <input
                aria-label="Market"
                placeholder="Market (US)"
                value={newSource.market}
                onChange={(e) =>
                  setNewSource((s) => ({ ...s, market: e.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                aria-label="Material slug"
                placeholder="Material slug (us-quikrete-concrete-80lb)"
                value={newSource.material_slug}
                onChange={(e) =>
                  setNewSource((s) => ({ ...s, material_slug: e.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                aria-label="Retailer"
                placeholder="Retailer (Home Depot)"
                value={newSource.retailer}
                onChange={(e) =>
                  setNewSource((s) => ({ ...s, retailer: e.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                aria-label="Product URL"
                placeholder="Product page URL"
                value={newSource.product_url}
                onChange={(e) =>
                  setNewSource((s) => ({ ...s, product_url: e.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm lg:col-span-2"
              />
              <input
                aria-label="Label"
                placeholder="Label (optional)"
                value={newSource.label}
                onChange={(e) =>
                  setNewSource((s) => ({ ...s, label: e.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                aria-label="Unit"
                placeholder="Unit (gallon, bag...)"
                value={newSource.expected_unit}
                onChange={(e) =>
                  setNewSource((s) => ({ ...s, expected_unit: e.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                aria-label="Currency"
                placeholder="Currency (USD)"
                value={newSource.currency}
                onChange={(e) =>
                  setNewSource((s) => ({ ...s, currency: e.target.value }))
                }
                className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <Button
                onClick={addSource}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-green-700"
              >
                Save source
              </Button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading sources…</p>
          ) : sources.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scan sources yet — add a retailer product page to start
              scanning.
            </p>
          ) : (
            <ul className="divide-y">
              {sources.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.label || s.product_url}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.retailer} · {s.market} · {s.material_slug} ·{" "}
                      {s.currency}/{s.expected_unit}
                      {s.last_scanned_at
                        ? ` · last scan ${new Date(s.last_scanned_at).toLocaleString()}`
                        : " · never scanned"}
                    </p>
                  </div>
                  <a
                    href={s.product_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-xs text-blue-600 underline inline-flex items-center gap-1"
                  >
                    <ExternalLink aria-hidden="true" className="w-3 h-3" />
                    Open
                  </a>
                  <Button
                    onClick={() => scanSource(s)}
                    disabled={busySource === s.id}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-50"
                  >
                    {busySource === s.id ? (
                      <RefreshCw
                        aria-hidden="true"
                        className="w-4 h-4 animate-spin"
                      />
                    ) : (
                      <ScanLine aria-hidden="true" className="w-4 h-4" />
                    )}
                    {busySource === s.id ? "Scanning…" : "Scan"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Pending candidates */}
        <section
          className="rounded-lg border bg-card p-6"
          data-testid="pending-candidates"
        >
          <h2 className="mb-4 text-lg font-semibold">
            Pending review
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {pending.length}
            </span>
          </h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No scans awaiting review. Scan a source above — results land here
              for approval.
            </p>
          ) : (
            <ul className="divide-y">
              {pending.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center gap-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {c.product_name || c.material_slug} — {c.scraped_price}{" "}
                      {c.currency}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {c.retailer} · {c.market} · via {c.extraction ?? "?"} (
                        {c.confidence})
                      </span>
                    </p>
                    <a
                      href={c.product_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="truncate text-xs text-blue-600 underline"
                    >
                      {c.product_url}
                    </a>
                  </div>
                  <Button
                    onClick={() => reviewCandidate(c, true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-green-700"
                  >
                    <CheckCircle2 aria-hidden="true" className="w-4 h-4" />
                    Approve & apply
                  </Button>
                  <Button
                    onClick={() => reviewCandidate(c, false)}
                    className="inline-flex items-center gap-1 rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    <XCircle aria-hidden="true" className="w-4 h-4" />
                    Reject
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Reviewed history */}
        {reviewed.length > 0 && (
          <section
            className="rounded-lg border bg-card p-6"
            data-testid="reviewed-candidates"
          >
            <h2 className="mb-4 text-lg font-semibold">Recent history</h2>
            <ul className="divide-y text-sm">
              {reviewed.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-2 py-2 text-muted-foreground"
                >
                  <span
                    className={
                      c.status === "approved"
                        ? "text-green-600"
                        : c.status === "rejected"
                          ? "text-red-600"
                          : "text-yellow-600"
                    }
                  >
                    {c.status}
                  </span>
                  <span className="truncate">
                    {c.material_slug} · {c.scraped_price ?? "—"} {c.currency} ·{" "}
                    {c.retailer}
                    {c.scrape_error ? ` · ${c.scrape_error}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
