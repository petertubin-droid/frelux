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
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Play } from "lucide-react";
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

/** Requirement fields declared for an engine, in declaration order. */
function fieldsFor(engineId: string) {
  for (const definition of Object.values(TASK_REQUIREMENTS)) {
    if (definition.engineId === engineId) return definition.fields;
  }
  return [];
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
  const [selected, setSelected] = useState<string>(engines[0]?.id ?? "");
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<EngineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const input: Record<string, unknown> = {};
      for (const field of fields) {
        const value = coerce(values[field.key] ?? "", field.unit);
        if (value !== undefined) input[field.key] = value;
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

          {fields.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  No input contract is declared for this engine, so it cannot be
                  run here without inventing its inputs. It is still listed so
                  the gap is visible rather than silent.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                  <AdminField
                    key={field.key}
                    label={
                      field.unit
                        ? `${field.label} (${field.unit})`
                        : field.label
                    }
                  >
                    <AdminInput
                      value={values[field.key] ?? ""}
                      onChange={(e) =>
                        setValues((prev) => ({
                          ...prev,
                          [field.key]: e.target.value,
                        }))
                      }
                    />
                  </AdminField>
                ))}
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
