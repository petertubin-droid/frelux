// ============================================================
// ADMIN CAPABILITY AVAILABILITY (P3.17)
//
// The admin config-center surface for the engine capability
// registry that the Phase 3.15 deterministic routing and the
// calculator config seeds depend on.
//
// Honesty rules (mirrored from the registry):
//   * "Verified" is EVIDENCE, not a claim — every engine
//     row carries its registry citation, and unverified
//     markets show the registry's unverified reason, never
//     a made-up excuse
//   * A DB availability row can never manufacture capability
//     (resolveCapability enforces that server-side); this
//     view only DISCLOSES the registry, it cannot change it
// ============================================================

import { useMemo, useState } from "react";
import {
  ALL_MARKET_CODES,
  ENGINE_CAPABILITIES,
  type EngineCapability,
} from "@/lib/international/capability-registry";
import { Search, ShieldCheck, ShieldAlert, Cpu, FileText } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

type Category = EngineCapability["category"] | "all";

const CATEGORY_LABELS: Record<EngineCapability["category"], string> = {
  finishing: "Finishing",
  structure: "Structure",
  mep: "MEP",
  costing: "Costing",
  ai: "AI",
};

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}

function PortabilityBadge({ engine }: { engine: EngineCapability }) {
  const { t } = useLanguage();
  if (engine.deterministic) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
        <Cpu className="h-3 w-3" /> deterministic
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
      {t("AI-mediated")}
    </span>
  );
}

export function AdminCapabilityAvailability() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(ENGINE_CAPABILITIES.map((e) => e.category))),
    [],
  );

  const engines = useMemo(
    () =>
      ENGINE_CAPABILITIES.filter((e) => {
        const q = search.trim().toLowerCase();
        const matches =
          !q ||
          e.name.toLowerCase().includes(q) ||
          e.id.toLowerCase().includes(q) ||
          e.evidence.toLowerCase().includes(q);
        return matches && (category === "all" || e.category === category);
      }),
    [search, category],
  );

  const verifiedPairs = useMemo(
    () => ENGINE_CAPABILITIES.reduce((n, e) => n + e.verifiedMarkets.length, 0),
    [],
  );
  const totalPairs = ENGINE_CAPABILITIES.length * ALL_MARKET_CODES.length;
  const fullyVerified = ENGINE_CAPABILITIES.filter(
    (e) => e.verifiedMarkets.length === ALL_MARKET_CODES.length,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric
          label="Engines in registry"
          value={ENGINE_CAPABILITIES.length}
          detail="Canonical capability registry (reconciled)"
        />
        <Metric
          label="Markets evaluated"
          value={`${ALL_MARKET_CODES.length} / ${ALL_MARKET_CODES.length}`}
          detail="20-market mandate set"
        />
        <Metric
          label="Verified engine-market pairs"
          value={`${verifiedPairs} / ${totalPairs}`}
          detail="Evidence-backed coverage; the rest is disclosed, not hidden"
        />
        <Metric
          label="Engines verified everywhere"
          value={fullyVerified}
          detail="Verified in every mandate market"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search engines, ids, evidence…")}
            aria-label={t("Search capability registry")}
            className="rounded-md border bg-background py-2 pl-8 pr-3 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={
            category === "all"
              ? "rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
              : "rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          }
        >
          {t("All")}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={
              category === c
                ? "rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground"
                : "rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent"
            }
          >
            {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {engines.map((e) => {
          const expanded = expandedId === e.id;
          const unverified = ALL_MARKET_CODES.filter(
            (m) => !e.verifiedMarkets.includes(m),
          );
          return (
            <li
              key={e.id}
              className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{e.name}</span>
                    <PortabilityBadge engine={e} />
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {CATEGORY_LABELS[e.category]}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    {e.id}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {e.verifiedMarkets.length} verified
                  </span>
                  {unverified.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      {unverified.length} unverified
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : e.id)}
                    aria-expanded={expanded}
                    className="rounded-lg border px-2.5 py-1.5 hover:bg-accent"
                  >
                    {expanded ? "Hide evidence" : "Show evidence"}
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1">
                {ALL_MARKET_CODES.map((m) => {
                  const ok = e.verifiedMarkets.includes(m);
                  return (
                    <span
                      key={m}
                      title={
                        ok
                          ? `${m}: verified — ${e.evidence}`
                          : `${m}: not verified — ${e.unverifiedReason}`
                      }
                      className={
                        ok
                          ? "rounded bg-emerald-600/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
                          : "rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground line-through"
                      }
                    >
                      {m}
                    </span>
                  );
                })}
              </div>

              {expanded && (
                <div className="mt-3 space-y-2 border-t pt-3 text-xs">
                  <p className="flex items-start gap-1.5">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      <span className="font-semibold">Evidence: </span>
                      {e.evidence}
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>
                      <span className="font-semibold">When not verified: </span>
                      {e.unverifiedReason}
                    </span>
                  </p>
                </div>
              )}
            </li>
          );
        })}
        {engines.length === 0 && (
          <li className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            {t("No engines match this filter.")}
          </li>
        )}
      </ul>

      <p className="text-[11px] text-muted-foreground">
        Verified means evidence-cited coverage in the canonical registry
        (assemblies + material role mappings + pricebooks). A database
        availability row can disclose or disable an engine, but it can never
        manufacture capability — unverified pairs stay unverified until the
        registry is extended.
      </p>
    </div>
  );
}

export default AdminCapabilityAvailability;
