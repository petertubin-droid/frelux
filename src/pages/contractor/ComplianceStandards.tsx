/**
 * Regulatory compliance & standards — FRELUX engine #5 UI.
 * Contractor workspace page at /contractor/compliance.
 *
 * From the LIVE construction_standards registry (every row
 * web-verified with citation):
 *  - M1: deterministic checklist per market + selected engines,
 *    citing exact refs/titles/authorities/verified dates.
 *  - M2: engines in scope are cite-and-flag; the page NEVER
 *    certifies compliance — the disclaimer is always visible.
 *  - M3: expert-review gate status per item (approved items show
 *    the reviewer; pending/unreviewed items are disclosed as such,
 *    never as expert-confirmed). Engines with no standard on file
 *    are disclosed as honest unknowns — nothing is invented.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, ScrollText, ShieldCheck } from "lucide-react";
import {
  generateComplianceChecklist,
  type ComplianceChecklist,
} from "@/lib/regulatory/compliance-checklist";
import { ALL_20_MARKETS } from "@/lib/international/engine-inventory-types";
import { useLanguage } from "@/lib/i18n";

/** Engine scopes the registry tracks (applies_to->engines union, stable order). */
const ENGINE_SCOPES = [
  "structural",
  "block",
  "plumbing",
  "electrical",
  "screeding",
  "painting",
  "wall_finishing",
  "tile",
  "flooring",
  "pop_ceiling",
  "build_to_roof",
] as const;

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-600",
  medium: "bg-amber-500/10 text-amber-600",
  low: "bg-amber-500/10 text-amber-600",
};

export default function ComplianceStandards() {
  const { t } = useLanguage();
  const [marketCode, setMarketCode] = useState("NG");
  const [engines, setEngines] = useState<string[]>([
    "structural",
    "plumbing",
    "electrical",
  ]);
  const [checklist, setChecklist] = useState<ComplianceChecklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const cl = await generateComplianceChecklist(marketCode, engines);
      setChecklist(cl);
    } catch {
      setLoadError(
        "The standards registry could not be reached. No checklist is shown rather than a guessed one.",
      );
      setChecklist(null);
    }
    setLoading(false);
  }, [marketCode, engines]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleEngine = (e: string) =>
    setEngines((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );

  const domains = useMemo(() => {
    if (!checklist) return [];
    const groups = new Map<string, ComplianceChecklist["items"]>();
    for (const item of checklist.items) {
      const list = groups.get(item.domain) ?? [];
      list.push(item);
      groups.set(item.domain, list);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }, [checklist]);

  return (
    <div className="space-y-5">
      {/* ── Premium hero ── */}
      <div className="relative overflow-hidden rounded-xl border border-border dark:border-white/5">
        <img
          src="https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1600"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
        <div className="relative p-5">
          <div className="flex items-center gap-2">
            <ScrollText aria-hidden="true" className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Regulatory compliance &amp; standards
            </h2>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-snug text-muted-foreground">
            A cited checklist from the live standards registry: every entry
            names its exact reference, authority and verified date. The
            checklist cites — it never certifies; expert review gates pending
            items, and engines with no standard on file are disclosed as
            unknowns.
          </p>
          {checklist && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs">
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
                {checklist.items.length} cited standards
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
                {checklist.unknowns.length} unknown scope
                {checklist.unknowns.length === 1 ? "" : "s"} disclosed
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Scope controls ── */}
      <div className="rounded-xl border border-border bg-card p-4 dark:border-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="cl-market"
          >
            {t("Market")}
          </label>
          <select
            id="cl-market"
            value={marketCode}
            onChange={(e) => setMarketCode(e.target.value)}
            className="rounded border border-input bg-background px-2 py-1 text-xs"
          >
            {ALL_20_MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Project scope")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ENGINE_SCOPES.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => toggleEngine(e)}
                aria-pressed={engines.includes(e)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  engines.includes(e)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {e.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2
            aria-hidden="true"
            className="h-6 w-6 animate-spin text-primary"
          />
        </div>
      )}
      {loadError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {loadError}
        </p>
      )}

      {checklist && !loading && (
        <>
          {checklist.noStandardsOnFile && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400">
              No standard is on file in the registry for {checklist.marketCode}.
              Nothing is invented: confirm the governing requirements with the
              relevant authority before construction.
            </div>
          )}

          {/* ── Checklist, grouped by domain ── */}
          {domains.map(([domain, items]) => (
            <div
              key={domain}
              className="rounded-xl border border-border bg-card p-4 dark:border-white/5"
            >
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {domain.replace(/_/g, " ")}
              </h3>
              <ul className="mt-2 space-y-3">
                {items.map((item) => (
                  <li key={item.key} data-testid="cl-item">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.citation}
                    </p>
                    {item.coverageSpec ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Coverage: {item.coverageSpec}
                      </p>
                    ) : null}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span
                        className={`rounded px-1.5 py-0.5 font-medium ${
                          CONFIDENCE_BADGE[item.confidence ?? "low"] ??
                          "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {item.confidence === "high"
                          ? "verified"
                          : "pending verification"}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 font-medium ${
                          item.review.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : "bg-secondary text-secondary-foreground"
                        }`}
                        data-testid="cl-review"
                      >
                        {item.review.status === "approved"
                          ? `expert-reviewed by ${item.review.reviewerName}`
                          : item.review.status === "pending"
                            ? "expert review pending"
                            : "not yet submitted for expert review"}
                      </span>
                      {item.appliesToEngines.map((e) => (
                        <span
                          key={e}
                          className="rounded bg-primary/10 px-1.5 py-0.5 text-primary"
                        >
                          {e}
                        </span>
                      ))}
                      {item.evidenceUrl ? (
                        <a
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2"
                        >
                          evidence
                        </a>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* ── Unknowns disclosure (M3) ── */}
          {checklist.unknowns.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-xs dark:border-white/5">
              <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                <ShieldCheck
                  aria-hidden="true"
                  className="h-3.5 w-3.5 text-primary"
                />
                {t("Disclosed unknowns")}
              </h3>
              <p className="mt-1 text-muted-foreground">
                No standard is on file for: {checklist.unknowns.join(", ")}.{" "}
                These scopes are disclosed rather than guessed — confirm
                requirements with the relevant authority.
              </p>
            </div>
          )}

          {/* ── Never-certify disclaimer ── */}
          <p className="text-xs text-muted-foreground">
            {checklist.disclaimer}
          </p>
        </>
      )}
    </div>
  );
}
