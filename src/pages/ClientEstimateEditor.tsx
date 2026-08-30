import { useState, useEffect, useCallback } from "react";
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
  fetchClientEstimates,
  shareClientEstimate,
  type CreateClientEstimateInput,
} from "@/lib/project-intelligence";
import type { DbClientEstimate } from "@/types/database";

const fmt = (v: number) => "₦" + (v || 0).toLocaleString();

export default function ClientEstimateEditor() {
  const { id: projectId, estimateId } = useParams<{
    id: string;
    estimateId?: string;
  }>();
  const { toast } = useToast();
  const navigate = useNavigate();

  useSeo({
    title: "Create Client Estimate",
    description: "Create a professional estimate to share with your client.",
    noIndex: true,
  });

  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [existing, setExisting] = useState<DbClientEstimate[]>([]);

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

  const loadExisting = useCallback(async () => {
    if (!projectId) return;
    try {
      const ests = await fetchClientEstimates(projectId);
      setExisting(ests);
    } catch {
      // ignore — not critical
    }
  }, [projectId]);

  useEffect(() => {
    loadExisting();
  }, [loadExisting]);

  const subtotal =
    Number(materialsCost) +
    Number(labourCost) +
    Number(transportCost) +
    Number(miscCost);
  const markupAmount = (subtotal * Number(markupPct)) / 100;
  const grandTotal = subtotal + markupAmount;

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
        title: title.trim(),
        description: description.trim() || undefined,
        materials_cost: Number(materialsCost),
        labour_cost: Number(labourCost),
        transport_cost: Number(transportCost),
        misc_cost: Number(miscCost),
        markup_percentage: Number(markupPct),
        materials_summary: materialsSummary.map((m) => ({
          name: m.name,
          quantity: Number(m.quantity),
          unit: m.unit,
          unit_cost: Number(m.unitCost),
          line_total: Number(m.quantity) * Number(m.unitCost),
        })),
        validity_days: Number(validityDays),
        notes: notes.trim() || undefined,
        terms_conditions: terms.trim() || undefined,
        client_name: clientName.trim() || undefined,
        client_email: clientEmail.trim() || undefined,
        client_phone: clientPhone.trim() || undefined,
      };

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

      navigate(`/project-workspace/${projectId}`);
    } catch (e) {
      toast({ title: (e as Error).message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Create Client Estimate"
        subtitle="Build a professional estimate and share it securely with your client for approval."
      />

      <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
        <Link
          to={`/project-workspace/${projectId}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project
        </Link>

        {existing.length > 0 && (
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
                      {est.estimate_number} · {fmt(est.grand_total)} ·{" "}
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
                      to={`/estimate/${est.share_token}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estimate form */}
        <div className="space-y-6">
          {/* Title & Description */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Estimate Details</h3>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Interior Painting — 3 Bedroom Apartment"
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Scope of work, special requirements, etc."
                rows={3}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Cost Breakdown</h3>
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
              <label className="mb-1.5 block text-sm font-medium">
                Markup Percentage (%)
              </label>
              <input
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
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Markup ({markupPct}%)
                </span>
                <span className="font-medium">{fmt(markupAmount)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 text-base font-bold">
                <span>Grand Total</span>
                <span className="text-primary">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Materials summary */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Materials Summary</h3>
              <button
                onClick={addMaterialRow}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
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
                      type="text"
                      value={m.name}
                      onChange={(e) =>
                        updateMaterialRow(idx, "name", e.target.value)
                      }
                      placeholder="Material name"
                      className="col-span-4 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      value={m.quantity}
                      onChange={(e) =>
                        updateMaterialRow(
                          idx,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                      placeholder="Qty"
                      min={0}
                      className="col-span-2 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <input
                      type="text"
                      value={m.unit}
                      onChange={(e) =>
                        updateMaterialRow(idx, "unit", e.target.value)
                      }
                      placeholder="unit"
                      className="col-span-2 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <input
                      type="number"
                      value={m.unitCost}
                      onChange={(e) =>
                        updateMaterialRow(
                          idx,
                          "unitCost",
                          Number(e.target.value),
                        )
                      }
                      placeholder="Unit cost"
                      min={0}
                      className="col-span-3 rounded-lg border bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                    <button
                      onClick={() => removeMaterialRow(idx)}
                      className="col-span-1 flex items-center justify-center rounded-lg p-2 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client info */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Client Information</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Client Name
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Client Email
                </label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Client Phone
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+234 800 000 0000"
                  className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Validity (days)
                </label>
                <input
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
              <h3 className="font-semibold">Notes & Terms</h3>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes for the client..."
                rows={2}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Terms & Conditions
              </label>
              <textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms, warranty, etc."
                rows={3}
                className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
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
            </button>
            <button
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
            </button>
          </div>
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
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={0}
        className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
      />
    </div>
  );
}
