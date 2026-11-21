/**
 * Admin pane: Engine Studio
 *
 * The audit result, made usable. Every registered engine is listed with the
 * page that runs it, or with an explicit statement that no page does. Engines
 * that declare an input contract can be run here against the real engine, so a
 * registered calculation is never unreachable from the product.
 *
 * Nothing here invents a result: the output is whatever executeEngine returns,
 * including its refusals.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Play,
  Code,
  ListFilter,
} from "lucide-react";
import {
  AdminButton,
  AdminField,
  AdminHeader,
  AdminInput,
  StateMessage,
} from "@/components/admin/AdminUi";
import { listEngines } from "@/lib/ai-foundation/engines-registry";
import { executeEngine } from "@/lib/ai-foundation/engines-registry";
import { TASK_REQUIREMENTS } from "@/lib/ai-foundation/requirements";
import type { EngineResult } from "@/lib/ai-foundation/types";
import {
  ENGINE_SURFACES,
  SURFACE_STATUS_LABELS,
  surfaceFor,
  type EngineSurfaceStatus,
} from "@/config/engine-surfaces";
import { classNames } from "@/lib/utils";

const STATUS_STYLE: Record<EngineSurfaceStatus, string> = {
  live: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  shared: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  divergent:
    "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  none: "border-destructive/25 bg-destructive/10 text-destructive",
};

const ADDITIONAL_ENGINE_FIELDS: Record<
  string,
  { key: string; label: string; unit?: string }[]
> = {
  structural_calculator: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "span_m", label: "Beam / Slab Clear Span", unit: "m" },
    { key: "dead_load_kn_m2", label: "Dead Load", unit: "kN/m²" },
    { key: "live_load_kn_m2", label: "Live Load", unit: "kN/m²" },
  ],
  foundation_calculator: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "footing_width_m", label: "Footing Width", unit: "m" },
    { key: "footing_length_m", label: "Footing Length", unit: "m" },
    { key: "depth_m", label: "Depth", unit: "m" },
  ],
  sequence_planner: [
    { key: "project_type", label: "Project Type (e.g. residential)" },
    { key: "total_area_m2", label: "Total Area", unit: "m²" },
  ],
  timeline_estimator: [
    { key: "project_type", label: "Project Type" },
    { key: "total_area_sqm", label: "Total Area", unit: "m²" },
    { key: "complexity", label: "Complexity (low, standard, high)" },
  ],
  electrical: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "building_area_sqm", label: "Building Area", unit: "m²" },
  ],
  plumbing: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "bathrooms", label: "Bathrooms", unit: "count" },
    { key: "kitchens", label: "Kitchens", unit: "count" },
  ],
  regional_cost: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "base_amount", label: "Base Amount" },
    { key: "target_region", label: "Target Region Slug / State" },
  ],
  margin_calculator: [
    { key: "direct_cost", label: "Direct Project Cost" },
    { key: "markup_percent", label: "Markup Percentage", unit: "%" },
    { key: "overhead_percent", label: "Overhead Percentage", unit: "%" },
  ],
  window_blinds: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "width_m", label: "Window Width", unit: "m" },
    { key: "drop_m", label: "Window Drop", unit: "m" },
  ],
  quote_check: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "total_quoted_amount", label: "Total Quoted Amount" },
  ],
  tyrolene_system: [
    { key: "marketCode", label: "Market ISO Code (e.g. NG, US, GB)" },
    { key: "wall_area_m2", label: "Wall Surface Area", unit: "m²" },
  ],
};
/** Requirement fields declared for an engine, in declaration order. */
function fieldsFor(engineId: string) {
  for (const definition of Object.values(TASK_REQUIREMENTS)) {
    if (definition.engineId === engineId) return definition.fields;
  }
  return ADDITIONAL_ENGINE_FIELDS[engineId] ?? [];
}

function coerce(value: string, unit?: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const looksNumeric = unit && unit !== "count" ? true : true;
  if (looksNumeric) {
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
      return asNumber;
    }
  }
  return trimmed;
}

export default function AdminEngineStudio() {
  const engines = useMemo(() => listEngines(), []);

  // Coverage is reported from the build itself. Engine Studio can only run
  // engines with a registered adapter, and until now nothing said how many
  // engine modules exist beyond those: an operator could reasonably assume
  // the list was complete. public/studio/project-map.json is regenerated from
  // the working tree on every build, so this count cannot go stale.
  const [engineModules, setEngineModules] = useState<
    Array<{ path: string; name: string }>
  >([]);
  useEffect(() => {
    let cancelled = false;
    fetch("/studio/project-map.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setEngineModules(Array.isArray(data.engines) ? data.engines : []);
      })
      .catch(() => {
        /* the coverage card simply stays hidden */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  const [selected, setSelected] = useState<string>(engines[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rawJsonMode, setRawJsonMode] = useState(false);
  const [rawJson, setRawJson] = useState('{\n  "marketCode": "NG"\n}');

  const surface = selected ? surfaceFor(selected) : null;
  const fields = selected ? fieldsFor(selected) : [];
  const counts = useMemo(
    () => ({
      live: ENGINE_SURFACES.filter((s) => s.status === "live").length,
      shared: ENGINE_SURFACES.filter((s) => s.status === "shared").length,
      divergent: ENGINE_SURFACES.filter((s) => s.status === "divergent").length,
      none: ENGINE_SURFACES.filter((s) => s.status === "none").length,
    }),
    [],
  );

  async function run() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      let input: Record<string, unknown> = {};
      if (rawJsonMode || fields.length === 0) {
        try {
          input = JSON.parse(rawJson);
        } catch {
          throw new Error(
            "Invalid JSON input payload. Please check your syntax.",
          );
        }
      } else {
        for (const field of fields) {
          const fieldKey = field.key ?? (field as { name?: string }).name;
          if (!fieldKey) continue;
          const value = coerce(values[fieldKey] ?? "", field.unit);
          if (value !== undefined) input[fieldKey] = value;
        }
      }
      const output = await executeEngine(selected, input);
      setResult(output);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <AdminHeader
        title="Engine Studio"
        subtitle="Every registered engine, the page that runs it, and a runner for the ones that have no page yet."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            ["live", counts.live, "Wired to a page"],
            ["shared", counts.shared, "Page calls the same function"],
            ["divergent", counts.divergent, "Different model, same trade"],
            ["none", counts.none, "No UI"],
          ] as const
        ).map(([status, count, label]) => (
          <div
            key={status}
            className="rounded-xl border border-border bg-card p-4"
          >
            <p className="text-2xl font-semibold tabular-nums text-foreground">
              {count}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {engineModules.length > 0 && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Adapter coverage
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {engines.length} of {engineModules.length} engine modules in this
            build have a run adapter here. The other{" "}
            {(engineModules.length - engines.length).toLocaleString()} are
            calculated through their own calculator pages and cannot be driven
            from this console yet. Adding one means writing an adapter that maps
            raw input to the engine's own signature, so a number produced here
            is the number the site would produce.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-brand-purple">
              Show modules without an adapter
            </summary>
            <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-muted-foreground">
              {engineModules
                .filter((m) => !engines.some((e) => m.name.includes(e.id)))
                .slice(0, 60)
                .map((m) => (
                  <li key={m.path} className="font-mono">
                    {m.path}
                  </li>
                ))}
            </ul>
          </details>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="rounded-xl border border-border bg-card">
          <p className="border-b border-border px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {engines.length} registered engines
          </p>
          <ul className="max-h-[520px] divide-y divide-border overflow-y-auto">
            {engines.map((engine) => {
              const entry = surfaceFor(engine.id);
              const status = entry?.status ?? "none";
              return (
                <li key={engine.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(engine.id);
                      setValues({});
                      setResult(null);
                      setError(null);
                    }}
                    className={classNames(
                      "flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                      selected === engine.id && "bg-muted/50",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {engine.title}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {engine.id} · {engine.domain}
                      </span>
                    </span>
                    <span
                      className={classNames(
                        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
                        STATUS_STYLE[status],
                      )}
                    >
                      {SURFACE_STATUS_LABELS[status]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground">
              {surface?.label ?? selected}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {surface?.note ??
                "This engine has no entry in the surface manifest."}
            </p>
            {surface?.route && (
              <Link
                to={surface.route}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-purple"
              >
                Open the page
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between border-b border-border pb-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Engine Runner (
                {fields.length > 0 && !rawJsonMode
                  ? "Form Mode"
                  : "JSON Payload Mode"}
                )
              </span>
              {fields.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRawJsonMode((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-purple hover:underline"
                >
                  {rawJsonMode ? (
                    <>
                      <ListFilter className="h-3.5 w-3.5" aria-hidden="true" />
                      Switch to Form
                    </>
                  ) : (
                    <>
                      <Code className="h-3.5 w-3.5" aria-hidden="true" />
                      Switch to JSON
                    </>
                  )}
                </button>
              )}
            </div>

            {fields.length === 0 || rawJsonMode ? (
              <div className="space-y-3">
                {fields.length === 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                      aria-hidden="true"
                    />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      No static form contract is declared for this engine. You
                      can execute it directly with a test JSON payload:
                    </p>
                  </div>
                )}
                <AdminField label="Test Payload (JSON)">
                  <textarea
                    rows={4}
                    className="w-full rounded-md border border-border bg-background p-2.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    value={rawJson}
                    onChange={(e) => setRawJson(e.target.value)}
                  />
                </AdminField>
                <div className="mt-4">
                  <AdminButton onClick={run} disabled={busy}>
                    <span className="inline-flex items-center gap-2">
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      {busy ? "Running" : "Run with JSON payload"}
                    </span>
                  </AdminButton>
                </div>
              </div>
            ) : (
              <div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {fields.map((field, idx) => {
                    const fieldKey =
                      field.key ??
                      (field as { name?: string }).name ??
                      String(idx);
                    return (
                      <AdminField
                        key={fieldKey}
                        label={
                          field.unit
                            ? `${field.label} (${field.unit})`
                            : field.label
                        }
                      >
                        <AdminInput
                          value={values[fieldKey] ?? ""}
                          onChange={(e) =>
                            setValues((prev) => ({
                              ...prev,
                              [fieldKey]: e.target.value,
                            }))
                          }
                        />
                      </AdminField>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <AdminButton onClick={run} disabled={busy}>
                    <span className="inline-flex items-center gap-2">
                      <Play className="h-3.5 w-3.5" aria-hidden="true" />
                      {busy ? "Running" : "Run this engine"}
                    </span>
                  </AdminButton>
                </div>
              </div>
            )}
          </div>

          {error && (
            <StateMessage
              type="error"
              title="The engine refused"
              message={error}
            />
          )}

          {result && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {result.ok ? "Result" : "Refused"}
              </p>
              {result.error && (
                <p className="mt-2 text-xs text-destructive">{result.error}</p>
              )}
              {result.quantities.length > 0 && (
                <div className="mt-3 divide-y divide-border">
                  {result.quantities.map((line, index) => (
                    <div
                      key={`${line.label}-${index}`}
                      className="flex items-baseline justify-between gap-3 py-1.5"
                    >
                      <span className="text-xs text-muted-foreground">
                        {line.label}
                      </span>
                      <span className="tabular-nums text-xs font-semibold text-foreground">
                        {line.quantity} {line.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {result.costs && (
                <div className="mt-3 border-t border-border pt-2">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="tabular-nums text-sm font-semibold text-foreground">
                      {result.costs.currency ?? ""} {result.costs.total}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
