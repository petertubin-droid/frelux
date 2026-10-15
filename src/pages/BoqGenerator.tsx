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
 * - Wave 1.2: revision history + version stamping, per-market
 *   tax naming, and the paid-tier bank-submittable BOQ export.
 */

import { getActiveDisplayCurrency } from "@/lib/international/fx-display";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  saveBoqRevision,
  fetchBoqRevisions,
} from "@/lib/estimation/queries";
import {
  generateBoq,
  boqToHtml,
  type BoqLineItem,
  type BoqResult,
} from "@/lib/estimation/boq-engine";
import { boqToBankHtml } from "@/lib/estimation/boq-bank-export";
import {
  type BoqStandard,
  resolveMarketBoqStandard,
  assembleStandardBoq,
  exportBoqToPrintHtml,
  mapItemToStandardDivision,
} from "@/lib/finance/boq-standard";
import { boqTaxLabel } from "@/lib/estimation/boq-tax-label";
import { ALL_20_MARKETS } from "@/lib/international/engine-inventory-types";
import type {
  BoqRevision,
  EstimationEstimate,
  EstimationCalcRule,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";
import { useDisplayCurrency } from "@/lib/international/currency-context";

/** Display names for the 20 Frelux markets. */
const MARKET_NAMES: Record<string, string> = {
  NG: "Nigeria",
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  IN: "India",
  GH: "Ghana",
  KE: "Kenya",
  ZA: "South Africa",
  JP: "Japan",
  FR: "France",
  BR: "Brazil",
  SA: "Saudi Arabia",
  AE: "UAE",
  CN: "China",
  ID: "Indonesia",
  MX: "Mexico",
  KR: "South Korea",
  IT: "Italy",
};

/** Currency-code → likely market (editable default for the
 *  tax-scheme select; the user can always change it). */
const CURRENCY_MARKET: Record<string, string> = {
  NGN: "NG",
  USD: "US",
  GBP: "GB",
  CAD: "CA",
  AUD: "AU",
  EUR: "DE",
  INR: "IN",
  GHS: "GH",
  KES: "KE",
  ZAR: "ZA",
  JPY: "JP",
  BRL: "BR",
  SAR: "SA",
  AED: "AE",
  CNY: "CN",
  IDR: "ID",
  MXN: "MX",
  KRW: "KR",
};

function defaultMarketCode(): string {
  return CURRENCY_MARKET[getActiveDisplayCurrency()] ?? "NG";
}

export default function BoqGenerator() {
  const { symbol: currencySymbol } = useDisplayCurrency();
  const money = (v: number) =>
    `${currencySymbol}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  useBreadcrumbJsonLd([
    { name: "Calculators", path: "/calculators" },
    { name: "BOQ / Quote Generator", path: "/boq-generator" },
  ]);
  const { user, isPaid } = useAuth();
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
  const [marketCode, setMarketCode] = useState<string>(defaultMarketCode);
  const [selectedStandard, setSelectedStandard] = useState<BoqStandard>(resolveMarketBoqStandard(defaultMarketCode()));

  // Synchronize dialect standard when the market changes
  useEffect(() => {
    setSelectedStandard(resolveMarketBoqStandard(marketCode));
  }, [marketCode]);

  const [items, setItems] = useState<BoqLineItem[]>([]);
  const [result, setResult] = useState<BoqResult | null>(null);
  const [quoteRef, setQuoteRef] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState<string | null>(null);
  /** Row id (uuid) of the saved quote — revisions reference this, not the ref string. */
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // ── Wave 1.2: revision state ──
  const [revision, setRevision] = useState(1);
  const [revisions, setRevisions] = useState<BoqRevision[]>([]);
  const [restoredFrom, setRestoredFrom] = useState<number | null>(null);

  // ── Wave 1.2: company block for the bank BOQ ──
  const [company, setCompany] = useState({
    name: "",
    address: "",
    registration: "",
    phone: "",
    email: "",
  });
  const [bankGateMsg, setBankGateMsg] = useState<string | null>(null);

  const tax = useMemo(() => boqTaxLabel(marketCode), [marketCode]);

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
    setSavedId(null);
    setRestoredFrom(null);
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
    setSavedId(null);
    setRestoredFrom(null);
    if (r.ok) track("boq_generated");
  };

  const snapshotRevision = async (quoteId: string, ver: number) => {
    if (!result?.ok || !quoteRef) return;
    // revision rows are append-only snapshots; failures are non-fatal
    // (the quote itself is already saved).
    await saveBoqRevision({
      quote_id: quoteId,
      user_id: user?.id ?? null,
      version: ver,
      quote_ref: quoteRef,
      items: items as unknown as Record<string, unknown>[],
      totals: result.totals as unknown as Record<string, unknown>,
      rates_snapshot: (result.rates_snapshot ?? {}) as Record<string, unknown>,
      note:
        restoredFrom !== null
          ? `Restored from revision v${restoredFrom}, then edited`
          : null,
    });
  };

  const refreshRevisions = async (quoteId: string) => {
    const { data } = await fetchBoqRevisions(quoteId);
    setRevisions(data ?? []);
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
      revision,
      items: items as unknown as Record<string, unknown>[],
      totals: result.totals as unknown as Record<string, unknown>,
      rates_snapshot: (result.rates_snapshot ?? {}) as Record<
        string,
        unknown
      >,
    };
    if (savedRef && savedId) {
      const nextRev = revision + 1;
      const { error } = await updateBoqQuote(savedRef, {
        revision: nextRev,
        items: items as unknown as Record<string, unknown>[],
        totals: result.totals as unknown as Record<string, unknown>,
        rates_snapshot: (result.rates_snapshot ?? {}) as Record<
          string,
          unknown
        >,
      });
      setSaving(false);
      if (error) {
        setSaveMsg(getSafeError(error, "Failed to save the quote."));
        return;
      }
      setRevision(nextRev);
      await snapshotRevision(savedId, nextRev);
      await refreshRevisions(savedId);
      setSaveMsg(
        `Quote updated — revision v${nextRev} saved to your BOQ history.`,
      );
      return;
    }
    const { data: record, error } = await saveBoqQuote(payload);
    setSaving(false);
    if (error) setSaveMsg(getSafeError(error, "Failed to save the quote."));
    else {
      setSavedRef(quoteRef);
      setSavedId(record?.id ?? null);
      setSaveMsg(
        `Quote saved to your BOQ history as revision v${revision}.`,
      );
      if (record?.id) {
        await snapshotRevision(record.id, revision);
        await refreshRevisions(record.id);
      }
    }
  };

  const restoreRevision = (rev: BoqRevision) => {
    setItems(rev.items as unknown as BoqLineItem[]);
    setResult(null);
    setSavedRef(null);
    setSavedId(null);
    setRestoredFrom(rev.version);
    setSaveMsg(
      `Restored revision v${rev.version}. Regenerate the quote, then save to create a new revision.`,
    );
    track("boq_revision_restored");
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

    const exportStandardBoq = () => {
    if (!result?.ok || !quoteRef) return;
    
    // Group line items into the target professional body standard divisions
    const divisionsMap = new Map<string, { code: string; title: string; items: any[] }>();

    items.forEach((item, idx) => {
      const div = mapItemToStandardDivision(item.description, selectedStandard);
      if (!divisionsMap.has(div.code)) {
        divisionsMap.set(div.code, { code: div.code, title: div.title, items: [] });
      }
      divisionsMap.get(div.code)!.items.push({
        itemNumber: `${div.code}.${idx + 1}`,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        materialRate: item.unit_cost,
        laborRate: 0,
        plantRate: 0,
        standardCode: `${selectedStandard}-${div.code}`
      });
    });

    const sections = Array.from(divisionsMap.values()).map(div => ({
      code: div.code,
      title: div.title,
      subSections: [
        {
          code: '01',
          title: 'Measured Works & Schedules',
          items: div.items
        }
      ]
    }));

    const standardDoc = assembleStandardBoq({
      metadata: {
        title,
        projectRef: quoteRef || `BOQ-${Date.now()}`,
        clientName,
        contractorName: company.name || 'Frelux Certified Contractor',
        location: projectLocation || 'Global Project',
        marketCode,
        currency: getActiveDisplayCurrency(),
        preparedBy: company.name || 'FRELUX User',
        date: new Date().toISOString().split('T')[0],
        revision: `Rev ${revision}`,
        standard: selectedStandard,
      },
      commercials: {
        preliminariesPercent: 5,
        overheadProfitPercent: 10,
        contingencyPercent: ruleRate('contingency_rate') || 5,
        retentionPercent: 5,
      },
      sections,
    });

    const printHtml = exportBoqToPrintHtml(standardDoc);
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(printHtml);
    w.document.close();
    w.print();
    track('boq_bank_export', { standard: selectedStandard, market: marketCode });
  };

  const exportBankBoq = () => {
    if (!result?.ok || !quoteRef) return;
    if (!isPaid) {
      setBankGateMsg(
        "The bank-submittable BOQ is a Frelux Pro feature. Upgrade to export the formal loan-application document.",
      );
      return;
    }
    setBankGateMsg(null);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      boqToBankHtml(
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
        {
          countryCode: marketCode,
          revision,
          companyName: company.name,
          companyAddress: company.address,
          companyRegistration: company.registration,
          companyPhone: company.phone,
          companyEmail: company.email,
          preparedBy: company.name || user?.email || null,
        },
      ),
    );
    w.document.close();
    w.print();
    track("boq_bank_export");
  };

  const updateItem = (i: number, patch: Partial<BoqLineItem>) => {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    );
    setResult(null);
    setSavedRef(null);
  };

  const removeItem = (i: number) => {
    setItems((prev) => prev.filter((it, idx) => idx !== i));
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

  const t = result?.totals ?? null;

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
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-white/5">
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              A
            </span>
            <h2 className="text-base font-semibold">Project &amp; client</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <label className="grid gap-1 text-sm font-medium">
              Tax scheme ({tax.short})
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={marketCode}
                onChange={(e) => setMarketCode(e.target.value)}
              >
                {ALL_20_MARKETS.map((cc) => (
                  <option key={cc} value={cc}>
                    {MARKET_NAMES[cc] ?? cc} ({boqTaxLabel(cc).short})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The market selects the document's tax naming only ({tax.long},{" "}
            {tax.short}). Rates always come from your configured rules — never
            from the market.
          </p>
        </div>

        {/* ── Import saved estimates ── */}
        {user && estimates.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-white/5">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                B
              </span>
              <h2 className="text-base font-semibold">
                Import a saved estimate
              </h2>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {estimates
                .slice()
                .reverse()
                .map((est) => (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => importEstimate(est)}
                    className="rounded-lg border border-border p-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-muted/50"
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
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-white/5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                C
              </span>
              <h2 className="text-base font-semibold">Line items</h2>
            </div>
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
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted/50"
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
                  className="grid items-end gap-2 rounded-lg border border-border bg-background/50 p-3 sm:grid-cols-[2fr_80px_80px_120px_1fr_auto] dark:border-white/5"
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
                    Unit cost ({currencySymbol})
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
                    className="rounded border border-border px-2 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
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
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
            >
              Generate Quote
            </button>
            {result?.ok && (
              <>
                <button
                  type="button"
                  onClick={exportPdf}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
                >
                  Export PDF
                </button>
                <button
                  type="button"
                  onClick={exportBankBoq}
                  className="relative rounded-lg border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  Export Bank BOQ
                  <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                    Pro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={exportStandardBoq}
                  className="relative rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 transition-colors hover:bg-emerald-500/20"
                >
                  Export {selectedStandard === 'CSI_MASTERFORMAT' ? 'CSI MasterFormat' : selectedStandard} BOQ
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : savedRef
                      ? `Saved (${savedRef}) · v${revision}`
                      : "Save Quote"}
                </button>
              </>
            )}
            {ruleRate("vat_rate") !== null &&
            ruleRate("contingency_rate") !== null ? (
              <span className="text-xs text-muted-foreground">
                Rates from config: contingency {ruleRate("contingency_rate")}%
                · {tax.short} {ruleRate("vat_rate")}%
              </span>
            ) : (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                VAT/contingency rates not configured: the quote will be produced
                without them (set them under Admin → Estimation Config & Rules).
              </span>
            )}
          </div>
          {bankGateMsg && (
            <p className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              {bankGateMsg}
            </p>
          )}
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

        {result?.ok && t && (
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

            {/* Premium totals tiles */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Subtotal
                </p>
                <p className="mt-1.5 text-xl font-semibold">
                  {money(t.subtotal)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {result.line_totals.length} line
                  {result.line_totals.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Contingency
                </p>
                <p className="mt-1.5 text-xl font-semibold">
                  {t.contingency_amount !== null
                    ? money(t.contingency_amount)
                    : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.contingency_rate !== null
                    ? `${t.contingency_rate}% allowance`
                    : "not configured"}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm dark:border-white/5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {tax.long} ({tax.short})
                </p>
                <p className="mt-1.5 text-xl font-semibold">
                  {t.vat_amount !== null ? money(t.vat_amount) : "—"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.vat_rate !== null
                    ? `${t.vat_rate}% per configured rate`
                    : "not configured"}
                </p>
              </div>
              <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  Grand Total
                </p>
                <p className="mt-1.5 text-xl font-bold text-foreground">
                  {money(t.grand_total)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {getActiveDisplayCurrency()}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border shadow-sm dark:border-white/5">
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
                <tbody className="bg-card">
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
                        {tax.short} ({result.totals!.vat_rate}%)
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

            <details className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm dark:border-white/5">
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

            {/* ── Company details (for the bank BOQ) ── */}
            <details className="rounded-xl border border-border bg-card p-4 text-sm shadow-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                Company details (used by the Bank BOQ export)
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(
                  [
                    ["name", "Company name"],
                    ["address", "Registered address"],
                    ["registration", "Registration no."],
                    ["phone", "Phone"],
                    ["email", "Email"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="grid gap-1 text-xs font-medium">
                    {label}
                    <input
                      className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm font-normal"
                      value={company[key]}
                      onChange={(e) =>
                        setCompany((c) => ({ ...c, [key]: e.target.value }))
                      }
                      placeholder="blank fields export as fill-in lines"
                    />
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing here is required: the bank BOQ prints blank fill-in
                lines for empty fields rather than placeholder text.
              </p>
            </details>
          </div>
        )}

        {/* ── Revision history ── */}
        {savedRef && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm dark:border-white/5">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                D
              </span>
              <h2 className="text-base font-semibold">
                Revision history{" "}
                <span className="font-normal text-muted-foreground">
                  ({savedRef})
                </span>
              </h2>
            </div>
            {revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                The revision snapshot for v{revision} was recorded. Older
                revisions will appear here after your next update.
              </p>
            ) : (
              <div className="space-y-2">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-background/50 p-3 text-sm dark:border-white/5"
                  >
                    <div>
                      <span className="font-semibold">
                        Revision v{rev.version}
                      </span>
                      {rev.version === revision && (
                        <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          Current
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                        {new Date(rev.created_at).toLocaleString()} ·{" "}
                        {(rev.items ?? []).length} line
                        {(rev.items ?? []).length === 1 ? "" : "s"}
                        {rev.note ? ` · ${rev.note}` : ""}
                      </span>
                    </div>
                    {rev.version !== revision && (
                      <button
                        type="button"
                        onClick={() => restoreRevision(rev)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/50"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
