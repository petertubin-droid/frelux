/**
 * FRELUX BOQ / Quote Generator (Future Engine 2)
 *
 * Assembles saved FRELUX estimates into a professional,
 * client-ready Bill of Quantities with VAT and contingency
 * from database-configured rates.
 *
 * - Every line item is traceable to its source estimate ref
 *   (or an explicit manual entry) - quotes are replayable.
 * - Totals are produced ONLY by generateBoq. This page renders,
 *   saves and exports; it never computes amounts itself.
 * - Missing configured rates produce warnings, never guesses.
 */

import { getActiveDisplayCurrency } from "@/lib/international/fx-display";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSeo, useBreadcrumbJsonLd } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchEstimates,
  fetchCalcRules,
  saveBoqQuote,
  updateBoqQuote,
} from "@/lib/estimation/queries";
import {
  generateBoq,
  boqToHtml,
  type BoqLineItem,
  type BoqResult,
} from "@/lib/estimation/boq-engine";
import type {
  EstimationEstimate,
  EstimationCalcRule,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

const money = (v: number) =>
  `₦${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function BoqGenerator() {
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "BOQ / Quote Generator", path: "/boq-generator" },
  ]);
  const { user } = useAuth();
  useSeo({
    title: "BOQ / Quote Generator: FRELUX",
    description:
      "Turn saved FRELUX estimates into a professional, client-ready Bill of Quantities with database-configured VAT and contingency rates.",
  });

  const [estimates, setEstimates] = useState<EstimationEstimate[]>([]);
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientContact, setClientContact] = useState("");
  const [projectLocation, setProjectLocation] = useState("");

  const [items, setItems] = useState<BoqLineItem[]>([]);
  const [result, setResult] = useState<BoqResult | null>(null);
  const [quoteRef, setQuoteRef] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const est = await fetchEstimates(user.id);
    if (est.error)
      setLoadError(getSafeError(est.error, "Failed to load your estimates."));
    else {
      setEstimates(
        (est.data ?? []).filter((e) => e.status === "completed").slice(-50),
      );
    }
    const rl = await fetchCalcRules("boq");
    if (rl.error) setRules([]);
    else setRules(rl.data);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = (it: BoqLineItem) => {
    setItems((prev) => [...prev, it]);
    setResult(null);
    setSavedRef(null);
  };

  const importEstimate = (est: EstimationEstimate) => {
    addItem({
      description:
        est.project_description ||
        `${est.calculator_type} estimate ${est.estimate_ref}`,
      quantity: 1,
      unit: "job",
      unit_cost: Number(est.total_material_cost) || 0,
      source_estimate_ref: est.estimate_ref,
      source_calculator_type: est.calculator_type,
    });
  };

  const generate = () => {
    const r = generateBoq({
      title,
      client_name: clientName,
      client_contact: clientContact || null,
      project_location: projectLocation || null,
      currency: getActiveDisplayCurrency(),
      items,
      rules,
    });
    setResult(r);
    setQuoteRef(`BOQ-${Date.now().toString(36).toUpperCase()}`);
    setSavedRef(null);
    if (r.ok) track("boq_generated");
  };

  const save = async () => {
    if (!result?.ok || !quoteRef) return;
    setSaving(true);
    const payload = {
      quote_ref: quoteRef,
      title,
      client_name: clientName,
      client_contact: clientContact || null,
      project_location: projectLocation || null,
      currency: getActiveDisplayCurrency(),
      status: "draft" as const,
      items: items as unknown as Record<string, unknown>[],
      totals: result.totals as unknown as Record<string, unknown>,
      rates_snapshot: (result.rates_snapshot ?? {}) as Record<string, unknown>,
    };
    const { error } = savedRef
      ? await updateBoqQuote(savedRef, {
          items: items as unknown as Record<string, unknown>[],
          totals: result.totals as unknown as Record<string, unknown>,
          rates_snapshot: (result.rates_snapshot ?? {}) as Record<
            string,
            unknown
          >,
        })
      : await saveBoqQuote(payload);
    setSaving(false);
    if (error) setSaveMsg(getSafeError(error, "Failed to save the quote."));
    else {
      setSavedRef(quoteRef);
      setSaveMsg("Quote saved to your BOQ history.");
    }
  };

  const exportPdf = () => {
    if (!result?.ok || !quoteRef) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      boqToHtml(
        {
          title,
          client_name: clientName,
          client_contact: clientContact || null,
          project_location: projectLocation || null,
          currency: getActiveDisplayCurrency(),
          items,
          rules,
        },
        result,
        quoteRef,
      ),
    );
    w.document.close();
    w.print();
  };

  const updateItem = (i: number, patch: Partial<BoqLineItem>) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
    setResult(null);
    setSavedRef(null);
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setResult(null);
    setSavedRef(null);
  };

  const canGenerate = title.trim() && clientName.trim() && items.length > 0;

  const ruleRate = (key: string): number | null => {
    const r = rules.find((x) => x.rule_key === key && x.is_active !== false);
    const rate = Number(
      (r?.rule_value as Record<string, unknown> | null)?.rate,
    );
    return Number.isFinite(rate) ? rate : null;
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          image="https://images.pexels.com/photos/8470842/pexels-photo-8470842.jpeg?auto=compress&cs=tinysrgb&w=1600"
          breadcrumbs={[
            { label: "Home", path: "/" },
            { label: "Construction Tools", path: "/construction-tools" },
            { label: "BOQ / Quote Generator" },
          ]}
          title="BOQ / Quote Generator"
          subtitle="Assemble your saved FRELUX estimates into one professional, client-ready Bill of Quantities. VAT and contingency come from database-configured rates: every line stays traceable to its source."
        />

        {!user && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
            Sign in to import your saved estimates. You can still build a quote
            from manual line items.
          </div>
        )}
        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {/* ── Project & client details ── */}
        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <h2 className="mb-3 text-base font-semibold">Project & client</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-medium">
              Quote title *
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 3-bedroom repaint"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Client name *
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Mrs Ada Obi"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Client contact
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={clientContact}
                onChange={(e) => setClientContact(e.target.value)}
                placeholder="phone / email (optional)"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Project location
              <input
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={projectLocation}
                onChange={(e) => setProjectLocation(e.target.value)}
                placeholder="e.g. City, Area (optional)"
              />
            </label>
          </div>
        </div>

        {/* ── Import saved estimates ── */}
        {user && estimates.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
            <h2 className="mb-3 text-base font-semibold">
              Import a saved estimate
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {estimates
                .slice()
                .reverse()
                .map((est) => (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => importEstimate(est)}
                    className="rounded-lg border border-border p-3 text-left text-sm hover:bg-muted/50"
                  >
                    <span className="block font-medium">
                      {est.estimate_ref}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {est.calculator_type} ·{" "}
                      {money(Number(est.total_material_cost) || 0)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* ── Line items ── */}
        <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">Line items</h2>
            <button
              type="button"
              onClick={() =>
                addItem({
                  description: "",
                  quantity: 1,
                  unit: "job",
                  unit_cost: 0,
                  source_estimate_ref: "manual entry",
                })
              }
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/50"
            >
              + Add manual line
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No lines yet: import a saved estimate above or add a manual line.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[2fr_80px_80px_120px_1fr_auto] dark:border-white/5"
                >
                  <label className="grid gap-1 text-xs font-medium">
                    Description
                    <input
                      className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal"
                      value={it.description}
                      onChange={(e) =>
                        updateItem(i, { description: e.target.value })
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Qty
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal"
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(i, { quantity: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Unit
                    <input
                      className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal"
                      value={it.unit}
                      onChange={(e) => updateItem(i, { unit: e.target.value })}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Unit cost (₦)
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal"
                      value={it.unit_cost}
                      onChange={(e) =>
                        updateItem(i, { unit_cost: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium">
                    Source ref
                    <input
                      className="rounded border border-border bg-background px-2 py-1.5 text-sm font-normal"
                      value={it.source_estimate_ref}
                      onChange={(e) =>
                        updateItem(i, { source_estimate_ref: e.target.value })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="rounded border border-border px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    aria-label={`Remove line ${i + 1}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={generate}
              disabled={!canGenerate}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Generate Quote
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
                    : savedRef
                      ? `Saved (${savedRef})`
                      : "Save Quote"}
                </button>
              </>
            )}
            {ruleRate("vat_rate") !== null &&
            ruleRate("contingency_rate") !== null ? (
              <span className="text-xs text-muted-foreground">
                Rates from config: contingency {ruleRate("contingency_rate")}% ·
                VAT {ruleRate("vat_rate")}%
              </span>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                VAT/contingency rates not configured: the quote will be produced
                without them (set them under Admin → Estimation Config & Rules).
              </span>
            )}
          </div>
          {saveMsg && (
            <p className="mt-2 text-sm text-muted-foreground">{saveMsg}</p>
          )}
        </div>

        {/* ── Result ── */}
        {result && !result.ok && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            <p className="font-medium text-amber-600 dark:text-amber-400">
              Quote incomplete
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

            <div className="overflow-x-auto rounded-lg border border-border dark:border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Unit cost</th>
                    <th className="p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.line_totals.map((l, i) => (
                    <tr
                      key={i}
                      className="border-t border-border dark:border-white/5"
                    >
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3">
                        {l.item.description}
                        <span className="block text-xs text-muted-foreground">
                          Source: {l.item.source_estimate_ref}
                        </span>
                      </td>
                      <td className="p-3">
                        {l.item.quantity} {l.item.unit}
                      </td>
                      <td className="p-3">{money(l.item.unit_cost)}</td>
                      <td className="p-3 font-medium">{money(l.line_total)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-border bg-muted/30 dark:border-white/5">
                    <td colSpan={4} className="p-3 font-medium">
                      Subtotal
                    </td>
                    <td className="p-3 font-medium">
                      {money(result.totals!.subtotal)}
                    </td>
                  </tr>
                  {result.totals!.contingency_amount !== null && (
                    <tr className="border-t border-border dark:border-white/5">
                      <td colSpan={4} className="p-3">
                        Contingency ({result.totals!.contingency_rate}%)
                      </td>
                      <td className="p-3">
                        {money(result.totals!.contingency_amount)}
                      </td>
                    </tr>
                  )}
                  {result.totals!.vat_amount !== null && (
                    <tr className="border-t border-border dark:border-white/5">
                      <td colSpan={4} className="p-3">
                        VAT ({result.totals!.vat_rate}%)
                      </td>
                      <td className="p-3">
                        {money(result.totals!.vat_amount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t border-border bg-primary text-primary-foreground">
                    <td colSpan={4} className="p-3 font-bold">
                      GRAND TOTAL
                    </td>
                    <td className="p-3 font-bold">
                      {money(result.totals!.grand_total)}
                    </td>
                  </tr>
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
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
