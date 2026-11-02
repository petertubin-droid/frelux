import { useState, useEffect, useCallback, useId } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Send,
  Loader2,
  FileText,
  DollarSign,
  User,
  Calendar,
  Plus,
  Trash2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useSeo } from "@/lib/seo";
import {
  createClientEstimate,
  fetchClientEstimateById,
  fetchClientEstimates,
  shareClientEstimate,
  updateClientEstimate,
  type CreateClientEstimateInput,
} from "@/lib/project-intelligence";
import {
  computeTotals,
  editBlockedReason,
  requiresResend,
} from "@/lib/estimates/totals";
import { getSupabase } from "@/lib/supabase-lazy";
import type { DbClientEstimate } from "@/types/database";
import { Button } from "@/components/ui/shadcn/button";
import { useLanguage } from "@/lib/i18n";

const fmt = (v: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(v || 0);

export default function ClientEstimateEditor() {
  const { t } = useLanguage();
  const { id: projectId, estimateId } = useParams<{
    id: string;
    estimateId?: string;
  }>();
  const isEditing = Boolean(estimateId);
  const { toast } = useToast();
  const navigate = useNavigate();

  useSeo({
    title: isEditing ? "Edit Client Estimate" : "Create Client Estimate",
    description: "Create a professional estimate to share with your client.",
    noIndex: true,
  });

  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [existing, setExisting] = useState<DbClientEstimate[]>([]);
  const [editing, setEditing] = useState<DbClientEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(isEditing);
  const [lockedReason, setLockedReason] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [materialsCost, setMaterialsCost] = useState(0);
  const [labourCost, setLabourCost] = useState(0);
  const [transportCost, setTransportCost] = useState(0);
  const [miscCost, setMiscCost] = useState(0);
  const [markupPct, setMarkupPct] = useState(15);
  const [validityDays, setValidityDays] = useState(30);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [materialsSummary, setMaterialsSummary] = useState<
    { name: string; quantity: number; unit: string; unitCost: number }[]
  >([]);

  const [projectCurrency, setProjectCurrency] = useState<string>("NGN");

  const loadExisting = useCallback(async () => {
    if (!projectId) return;
    try {
      const ests = await fetchClientEstimates(projectId);
      setExisting(ests);
    } catch {
      // ignore, not critical
    }
    try {
      // Regional data flow: the project's saved location syncs its currency
      // from the active market profile; estimates inherit that currency.
      const sb = await getSupabase();
      const { data: proj } = await sb
        .from("contractor_projects")
        .select("currency")
        .eq("id", projectId)
        .maybeSingle();
      if (proj?.currency) setProjectCurrency(proj.currency);
    } catch {
      // fall back to NGN, honest default for legacy projects
    }
  }, [projectId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  // Editing loads the stored quote into the same form the create path uses, so
  // there is one editor rather than two that can drift apart.
  useEffect(() => {
    if (!estimateId) return;
    let cancelled = false;
    (async () => {
      setLoadingEstimate(true);
      try {
        const quote = await fetchClientEstimateById(estimateId);
        if (cancelled) return;
        if (!quote) {
          setLockedReason("This quote no longer exists.");
          return;
        }
        const blocked = editBlockedReason(quote.status);
        if (blocked === "approved") {
          setEditing(quote);
          setLockedReason(
            "This quote has been approved by the client. It stays as the agreed record, so it cannot be edited. Create a new quote for further work.",
          );
          return;
        }
        setEditing(quote);
        setTitle(quote.title);
        setDescription(quote.description ?? "");
        setMaterialsCost(quote.materials_cost);
        setLabourCost(quote.labour_cost);
        setTransportCost(quote.transport_cost);
        setMiscCost(quote.misc_cost);
        setMarkupPct(quote.markup_percentage);
        setValidityDays(quote.validity_days);
        setNotes(quote.notes ?? "");
        setTerms(quote.terms_conditions ?? "");
        setClientName(quote.client_name ?? "");
        setClientEmail(quote.client_email ?? "");
        setClientPhone(quote.client_phone ?? "");
        setProjectCurrency(quote.currency || "NGN");
        setMaterialsSummary(
          (quote.materials_summary ?? []).map((row) => ({
            name: row.name,
            quantity: row.quantity,
            unit: row.unit,
            unitCost: row.unit_price,
          })),
        );
      } catch (e) {
        if (!cancelled) setLockedReason((e as Error).message);
      } finally {
        if (!cancelled) setLoadingEstimate(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [estimateId]);

  const { subtotal, markupAmount, grandTotal } = computeTotals({
    materials: Number(materialsCost),
    labour: Number(labourCost),
    transport: Number(transportCost),
    misc: Number(miscCost),
    markupPercentage: Number(markupPct),
  });

  function addMaterialRow() {
    setMaterialsSummary((prev) => [
      ...prev,
      { name: "", quantity: 1, unit: "unit", unitCost: 0 },
    ]);
  }

  function updateMaterialRow(
    idx: number,
    field: keyof (typeof materialsSummary)[0],
    value: string | number,
  ) {
    setMaterialsSummary((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    );
  }

  function removeMaterialRow(idx: number) {
    setMaterialsSummary((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave(draft: boolean) {
    if (!projectId) return;
    if (!title.trim()) {
      toast({ title: "Please enter a title", variant: "error" });
      return;
    }
    setSaving(true);
    try {
      const input: CreateClientEstimateInput = {
        project_id: projectId,
        currency: projectCurrency,
        title: title.trim(),
        description: description.trim() || undefined,
        materials_cost: Number(materialsCost),
        labour_cost: Number(labourCost),
        transport_cost: Number(transportCost),
        misc_cost: Number(miscCost),
        markup_percentage: Number(markupPct),
        materials_summary: materialsSummary.map((m) => ({
          name: m.name,
          category: "Material",
          quantity: Number(m.quantity),
          unit: m.unit,
          unit_price: Number(m.unitCost),
          total: Number(m.quantity) * Number(m.unitCost),
        })),
        validity_days: Number(validityDays),
        notes: notes.trim() || undefined,
        terms_conditions: terms.trim() || undefined,
        client_name: clientName.trim() || undefined,
        client_email: clientEmail.trim() || undefined,
        client_phone: clientPhone.trim() || undefined,
      };

      if (estimateId && editing) {
        await updateClientEstimate(estimateId, { ...input });
        toast({
          title: requiresResend(editing.status)
            ? "Saved. Send the quote again so the client sees the new figures."
            : "Quote updated",
          variant: "success",
        });
        navigate("/quotes");
        return;
      }

      const created = await createClientEstimate(input);
      toast({
        title: draft ? "Estimate saved as draft" : "Estimate created",
        variant: "success",
      });

      if (!draft) {
        // Auto-share
        setSharing(true);
        try {
          const token = await shareClientEstimate(created.id);
          const shareUrl = `${window.location.origin}/estimate/${token}`;
          await navigator.clipboard.writeText(shareUrl);
          toast({
            title: "Share link copied to clipboard!",
            variant: "success",
          });
        } catch {
          toast({ title: "Created, but sharing failed", variant: "error" });
        } finally {
          setSharing(false);
        }
      }

      navigate(`/project-workspace/${projectId}/`);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title={
          isEditing ? t("Edit Client Estimate") : t("Create Client Estimate")
        }
        subtitle={
          isEditing
            ? "Change the figures and terms on this quote. Totals are recalculated from the cost lines you enter."
            : "Build a professional estimate and share it securely with your client for approval."
        }
      />

      <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
        <Link
          to={`/project-workspace/${projectId}/`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("Back to Project")}
        </Link>

        {loadingEstimate ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading this quote
          </div>
        ) : null}

        {lockedReason ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
          >
            <p className="text-sm font-medium text-foreground">
              {lockedReason}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {editing?.share_token ? (
                <Link
                  to={`/estimate/${editing.share_token}`}
                  className="font-medium text-primary hover:underline"
                >
                  Open the agreed quote
                </Link>
              ) : null}
              <Link
                to={`/project-workspace/${projectId}/client-estimate/new`}
                className="font-medium text-primary hover:underline"
              >
                Create a new quote
              </Link>
              <Link
                to="/quotes"
                className="font-medium text-primary hover:underline"
              >
                Back to quotes
              </Link>
            </div>
          </div>
        ) : null}

        {!isEditing && existing.length > 0 && (
          <div className="mb-6 rounded-xl border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">
              Existing Estimates ({existing.length})
            </h3>
            <div className="space-y-2">
              {existing.map((est) => (
                <div
                  key={est.id}
                  className="flex items-center justify-between rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{est.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {est.estimate_number} ·{" "}
                      {fmt(est.grand_total, est.currency)} ·{" "}
                      <span
                        className={
                          est.status === "approved"
                            ? "text-emerald-600"
                            : est.status === "sent" || est.status === "viewed"
                              ? "text-blue-600"
                              : "text-muted-foreground"
                        }
                      >
                        {est.status.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                  {est.share_token && (
                    <Link
                      to={`/estimate/${est.share_token}/`}
                      className="text-xs text-primary hover:underline"
                    >
                      {t("View")}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {editing && requiresResend(editing.status) ? (
          <div className="mb-6 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            The client has already received this quote. Saving your changes
            returns it to draft, so you can send the updated figures rather than
            leaving them looking at the old ones.
          </div>
        ) : null}

        {/* Estimate form */}
        <div className="space-y-6">
          {/* Title & Description */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t("Estimate Details")}</h3>
            </div>
            <div>
              <label
                htmlFor="ce-title"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("Title")} <span className="text-destructive">*</span>
              </label>
              <input
                id="ce-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Interior Painting, 3 Bedroom Apartment"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="ce-description"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("Description")}
              </label>
              <textarea
                id="ce-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("Scope of work, special requirements, etc.")}
                rows={3}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t("Cost Breakdown")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <CostInput
                label="Materials Cost"
                value={materialsCost}
                onChange={setMaterialsCost}
              />
              <CostInput
                label="Labour Cost"
                value={labourCost}
                onChange={setLabourCost}
              />
              <CostInput
                label="Transport Cost"
                value={transportCost}
                onChange={setTransportCost}
              />
              <CostInput
                label="Miscellaneous"
                value={miscCost}
                onChange={setMiscCost}
              />
            </div>

            {/* Markup */}
            <div>
              <label
                htmlFor="ce-markup"
                className="mb-1.5 block text-sm font-medium"
              >
                Markup Percentage (%)
              </label>
              <input
                id="ce-markup"
                type="number"
                value={markupPct}
                onChange={(e) => setMarkupPct(Number(e.target.value))}
                min={0}
                step={0.5}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-muted p-4 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("Subtotal")}</span>
                <span className="font-medium">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Markup ({markupPct}%)
                </span>
                <span className="font-medium">{fmt(markupAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                <span>{t("Grand Total")}</span>
                <span className="text-primary">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Materials summary */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t("Materials Summary")}</h3>
              <Button
                variant="default"
                onClick={addMaterialRow}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-primary hover:transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> {t("Add Item")}
              </Button>
            </div>
            {materialsSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No materials added. Click "Add Item" to include a materials
                breakdown.
              </p>
            ) : (
              <div className="space-y-2">
                {materialsSummary.map((m, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <input
                      aria-label={"Material " + (idx + 1) + " name"}
                      type="text"
                      value={m.name}
                      onChange={(e) =>
                        updateMaterialRow(idx, "name", e.target.value)
                      }
                      placeholder={t("Material name")}
                      className="col-span-4 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <input
                      aria-label={"Material quantity, row " + (idx + 1)}
                      type="number"
                      value={m.quantity}
                      onChange={(e) =>
                        updateMaterialRow(
                          idx,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                      placeholder={t("Qty")}
                      min={0}
                      className="col-span-2 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <input
                      aria-label={"Material unit, row " + (idx + 1)}
                      type="text"
                      value={m.unit}
                      onChange={(e) =>
                        updateMaterialRow(idx, "unit", e.target.value)
                      }
                      placeholder="unit"
                      className="col-span-2 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <input
                      aria-label={"Material unit cost, row " + (idx + 1)}
                      type="number"
                      value={m.unitCost}
                      onChange={(e) =>
                        updateMaterialRow(
                          idx,
                          "unitCost",
                          Number(e.target.value),
                        )
                      }
                      placeholder={t("Unit cost")}
                      min={0}
                      className="col-span-3 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => removeMaterialRow(idx)}
                      className="col-span-1 flex items-center justify-center rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client info */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t("Client Information")}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="ce-client-name"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("Client Name")}
                </label>
                <input
                  id="ce-client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t("John Doe")}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="ce-client-email"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("Client Email")}
                </label>
                <input
                  id="ce-client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="ce-client-phone"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("Client Phone")}
                </label>
                <input
                  id="ce-client-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder={t(
                    "Include country code, e.g. +234 800 000 0000",
                  )}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="ce-validity"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("Validity (days)")}
                </label>
                <input
                  id="ce-validity"
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(Number(e.target.value))}
                  min={1}
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes & Terms */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">{t("Notes & Terms")}</h3>
            </div>
            <div>
              <label
                htmlFor="ce-notes"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("Notes")}
              </label>
              <textarea
                id="ce-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("Additional notes for the client...")}
                rows={2}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <label
                htmlFor="ce-terms"
                className="mb-1.5 block text-sm font-medium"
              >
                {t("Terms & Conditions")}
              </label>
              <textarea
                id="ce-terms"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder={t("Payment terms, warranty, etc.")}
                rows={3}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          {lockedReason ? null : (
            <div className="flex flex-wrap items-center gap-3">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => handleSave(true)}
                    disabled={saving || loadingEstimate}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save changes
                  </Button>
                  <Link
                    to="/quotes"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Link>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => handleSave(true)}
                    disabled={saving || sharing}
                    className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save as Draft
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleSave(false)}
                    disabled={saving || sharing}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {sharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Create & Share
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function CostInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const fieldId = useId();
  return (
    <div>
      <label htmlFor={fieldId} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <input
        id={fieldId}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={0}
        className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
      />
    </div>
  );
}
