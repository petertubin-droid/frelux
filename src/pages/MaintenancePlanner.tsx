/**
 * FRELUX Maintenance Planner (Future Engine 1)
 *
 * Deterministic maintenance schedules from database-verified profiles:
 * when a finish will need inspection, re-coating and full
 * redecoration, and what it will cost at year 3, 5 and 10.
 *
 * - Every business value (service lives, intervals, cost factors) comes
 *   from maintenance_profiles through the loader. This page never
 *   invents maintenance data.
 * - The schedule is produced ONLY by calculateMaintenanceSchedule.
 *   This page renders and saves the result.
 * - Missing configuration produces an explicit data-requirement
 *   message, never guessed values.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { trackCalculation } from "@/lib/achievements";
import { trackRecentTool } from "@/lib/smart-defaults";
import { formatCurrency } from "@/lib/utils";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchMaintenanceProfiles,
  saveMaintenancePlan,
} from "@/lib/estimation/queries";
import {
  calculateMaintenanceSchedule,
  type MaintenanceResult,
} from "@/lib/estimation/maintenance-engine";
import type { MaintenanceProfile } from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

export default function MaintenancePlanner({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const [searchParams] = useSearchParams();

  const [profiles, setProfiles] = useState<MaintenanceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [surface, setSurface] = useState("");
  const [initialCost, setInitialCost] = useState("");
  const [installDate, setInstallDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [horizon, setHorizon] = useState("10");

  const [result, setResult] = useState<MaintenanceResult | null>(null);
  const [planRef, setPlanRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useSeo({
    title: "Maintenance Planner — FRELUX",
    description:
      "Deterministic maintenance schedules from database-verified data — when your finish needs re-coating and full redecoration, with cost projections at years 3, 5 and 10.",
  });

  useEffect(() => {
    if (searchParams.get("mode") !== "maintenance") return;
    trackRecentTool(
      "/finishing-calculator?mode=maintenance",
      "Maintenance Planner",
      "Calculator",
    );
  }, [searchParams]);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchMaintenanceProfiles();
    if (error)
      setLoadError(
        getSafeError(error, "Failed to load maintenance configuration."),
      );
    else {
      setProfiles(data.filter((p) => p.is_active));
      setLoadError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const categories = useMemo(
    () => [...new Set(profiles.map((p) => p.finish_category))].sort(),
    [profiles],
  );
  const surfaces = useMemo(
    () =>
      [
        ...new Set(
          profiles
            .filter((p) => !category || p.finish_category === category)
            .map((p) => p.surface_type),
        ),
      ].sort(),
    [profiles, category],
  );

  const run = () => {
    setResult(null);
    setPlanRef(null);
    setSaveMsg(null);
    const r = calculateMaintenanceSchedule({
      category,
      surface_type: surface || "any",
      initial_cost: initialCost.trim() === "" ? null : Number(initialCost),
      currency: "NGN",
      install_date: installDate,
      horizon_years: Number(horizon) || 10,
      milestone_years: [3, 5, 10],
      profiles,
    });
    setResult(r);
    if (r.ok) {
      track("maintenance_planned");
      trackCalculation("maintenance");
    }
  };

  const save = async () => {
    if (!result?.ok || !result.profileName) return;
    const usedProfile = profiles.find(
      (p) =>
        p.description === result.profileName ||
        `${p.finish_category} / ${p.surface_type}` === result.profileName,
    );
    setSaving(true);
    const ref = `MNT-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await saveMaintenancePlan({
      estimate_ref: ref,
      finish_category: category,
      surface_type: surface || "any",
      initial_cost: initialCost.trim() === "" ? null : Number(initialCost),
      currency: "NGN",
      install_date: installDate,
      horizon_years: Number(horizon) || 10,
      profile_id: usedProfile?.id ?? null,
      profile_snapshot: (usedProfile ?? {}) as Record<string, unknown>,
      schedule: {
        events: result.events,
        milestones: result.milestones,
        steps: result.steps,
      },
      warnings: result.warnings,
    });
    setSaving(false);
    if (error)
      setSaveMsg(getSafeError(error, "Failed to save the maintenance plan."));
    else {
      setPlanRef(ref);
      setSaveMsg("Maintenance plan saved.");
    }
  };

  const exportPdf = () => {
    if (!result?.ok) return;
    const w = window.open("", "_blank");
    if (!w) return;

    const rows = result.events
      .map(
        (e) =>
          `<tr><td>${e.type.replace(/_/g, " ")}</td><td>${e.year_min === e.year_max ? `year ${e.year_min}` : `years ${e.year_min}–${e.year_max}`}</td><td>${e.date_min} → ${e.date_max}</td><td>${e.cost !== null ? `NGN ${e.cost.toLocaleString()}` : "—"}</td></tr>`,
      )
      .join("");
    const miles = result.milestones
      .map(
        (m) =>
          `<tr><td>Year ${m.year}</td><td>${m.cumulative_cost !== null ? `NGN ${m.cumulative_cost.toLocaleString()}` : "timing only"}</td><td>${m.events_included}</td></tr>`,
      )
      .join("");

    w.document
      .write(`<!DOCTYPE html><html><head><title>FRELUX Maintenance Plan</title><style>
      body{font-family:system-ui,sans-serif;padding:32px;color:#111}
      h1{font-size:18px}h2{font-size:14px;margin-top:20px}
      table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left}
      th{background:#f5f5f5}
    </style></head><body>
      <h1>FRELUX — Maintenance Plan (${category} / ${surface || "any"})</h1>
      <p>Installed: ${installDate} · Horizon: ${horizon} years · Source: ${result.profileName}</p>
      <h2>Schedule</h2><table><tr><th>Event</th><th>Timing</th><th>Dates</th><th>Cost (NGN)</th></tr>${rows}</table>
      <h2>Cost milestones</h2><table><tr><th>Year</th><th>Cumulative cost</th><th>Events</th></tr>${miles}</table>
      <p style="font-size:10px;color:#666">Generated by FRELUX from database-verified maintenance data. Costs use earliest-occurrence budgeting within configured ranges.</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  const body = (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance Planner"
        subtitle="Plan the full life of your finish from database-verified data — inspections, re-coat cycles and full redecoration, with cost projections at years 3, 5 and 10."
      />

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="grid gap-1 text-sm font-medium">
            Finish category
            <select
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">
                {categories.length
                  ? "Select category"
                  : "Nothing configured yet"}
              </option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Surface type
            <select
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
            >
              <option value="">Select surface</option>
              {surfaces.map((sv) => (
                <option key={sv} value={sv}>
                  {sv}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Installed cost (₦, optional)
            <input
              type="number"
              min="0"
              step="any"
              placeholder="e.g. from a calculator result"
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={initialCost}
              onChange={(e) => setInitialCost(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Install / apply date
            <input
              type="date"
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={installDate}
              onChange={(e) => setInstallDate(e.target.value)}
            />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Horizon (years)
            <input
              type="number"
              min="1"
              max="100"
              className="rounded-lg border border-border bg-background px-3 py-2"
              value={horizon}
              onChange={(e) => setHorizon(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={run}
            disabled={loading || !category}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Plan Maintenance
          </button>
          {result?.ok && (
            <>
              <button
                type="button"
                onClick={exportPdf}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium"
              >
                Export PDF
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : planRef
                    ? `Saved (${planRef})`
                    : "Save Plan"}
              </button>
            </>
          )}
        </div>
        {saveMsg && saveMsg !== "Maintenance plan saved." && (
          <p className="mt-2 text-sm text-destructive">{saveMsg}</p>
        )}
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Loading maintenance configuration…
        </p>
      )}

      {!loading && profiles.length === 0 && !loadError && (
        <div className="rounded-lg border border-brand-purple/20 bg-primary/5 p-4 text-sm text-muted-foreground dark:text-muted-foreground/80">
          No maintenance profiles configured yet. The planner uses only verified
          maintenance data from the database — it never guesses service lives.
          An administrator must add at least one profile (category, surface,
          service life, intervals, cost factors with a source reference) under{" "}
          <b>Admin → Maintenance Profiles</b> before schedules can be produced.
        </div>
      )}

      {result && !result.ok && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="font-medium text-amber-600 dark:text-amber-400">
            Configuration needed
          </p>
          {result.warnings.map((w, i) => (
            <p key={i} className="mt-1 text-sm text-muted-foreground">
              {w}
            </p>
          ))}
        </div>
      )}

      {result?.ok && (
        <div className="space-y-4">
          {result.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-sm text-muted-foreground">
                  {w}
                </p>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            {result.milestones.map((m) => (
              <div
                key={m.year}
                className="rounded-lg border border-border bg-card p-4 dark:border-white/5"
              >
                <p className="text-xs font-medium text-muted-foreground">
                  YEAR {m.year}
                </p>
                <p className="mt-1 text-xl font-bold">
                  {m.cumulative_cost !== null
                    ? `₦${m.cumulative_cost.toLocaleString()}`
                    : "timing only"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.events_included} event(s) budgeted
                </p>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-lg border border-border dark:border-white/5">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Event</th>
                  <th className="p-3">Timing</th>
                  <th className="p-3">Dates</th>
                  <th className="p-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {result.events.map((e, i) => (
                  <tr
                    key={i}
                    className="border-t border-border dark:border-white/5"
                  >
                    <td className="p-3 capitalize">
                      {e.type.replace(/_/g, " ")}
                    </td>
                    <td className="p-3">
                      {e.year_min === e.year_max
                        ? `year ${e.year_min}`
                        : `years ${e.year_min}–${e.year_max}`}
                    </td>
                    <td className="p-3">
                      {e.date_min} → {e.date_max}
                    </td>
                    <td className="p-3">
                      {e.cost !== null ? `₦${e.cost.toLocaleString()}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="rounded-lg border border-border p-4 text-sm dark:border-white/5">
            <summary className="cursor-pointer font-medium">
              Calculation breakdown
            </summary>
            <ul className="mt-3 space-y-2">
              {result.steps.map((s, i) => (
                <li key={i}>
                  <span className="font-medium">{s.label}:</span>{" "}
                  <span className="text-muted-foreground">{s.detail}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}
    </div>
  );

  if (embedded) return body;
  return (
    <Container>
      {body}
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
