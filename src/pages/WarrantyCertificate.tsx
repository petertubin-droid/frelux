/**
 * FRELUX Warranty Certificate (Future Engine 14)
 *
 * Snapshots the exact configuration behind your estimate so
 * any later claim or dispute can be replayed deterministically.
 *
 * - Certificates are produced ONLY by issueWarrantyCertificate.
 *   This page renders; it never certifies anything itself.
 * - The frozen configuration is hash-verified: the same stored
 *   estimate always hashes the same, so tampering is detectable.
 * - Stored line math is replayed; a mismatch becomes a dispute
 *   flag — it is never silently repaired.
 */

import { useEffect, useState, useCallback } from "react";
import { useSeo } from "@/lib/seo";
import { track } from "@/lib/analytics";
import { getSafeError } from "@/lib/safeError";
import { useAuth } from "@/lib/auth";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import {
  fetchEstimates,
  fetchEstimateItems,
  fetchCalcRules,
  fetchWarrantyRecords,
  createWarrantyRecord,
} from "@/lib/estimation/queries";
import {
  issueWarrantyCertificate,
  type WarrantyResult,
} from "@/lib/estimation/warranty-dispute-engine";
import type {
  EstimationEstimate,
  EstimationEstimateItem,
  EstimationCalcRule,
} from "@/types/estimation";
import AdSlot from "@/components/ui/AdSlot";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function WarrantyCertificate() {
  useSeo({
    title: "Warranty Certificate & Dispute Verification | FRELUX",
    description:
      "Issue a hash-verified warranty certificate for your saved estimate. Claims and disputes replay the exact frozen configuration — mismatches are flagged, never guessed.",
  });

  const { user } = useAuth();
  const [estimates, setEstimates] = useState<EstimationEstimate[]>([]);
  const [certificates, setCertificates] = useState<
    {
      certificate_ref: string;
      estimate_id: string;
      issued_at: string;
      expires_at: string;
      status: string;
    }[]
  >([]);
  const [selectedId, setSelectedId] = useState("");
  const [rules, setRules] = useState<EstimationCalcRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<WarrantyResult | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const est = await fetchEstimates(user.id);
    if (est.error)
      setLoadError(getSafeError(est.error, "Failed to load your estimates."));
    else setEstimates((est.data ?? []).filter((e) => e.status === "completed"));
    const wr = await fetchWarrantyRecords(user.id);
    if (!wr.error) setCertificates(wr.data);
    const rl = await fetchCalcRules("warranty");
    setRules(rl.data);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = estimates.find((e) => e.id === selectedId) ?? null;

  const issue = async () => {
    if (!selected) return;
    setBusy(true);
    setResult(null);
    try {
      const items = await fetchEstimateItems(selected.id);
      if (items.error) {
        setLoadError(
          getSafeError(items.error, "Failed to load the estimate's items."),
        );
        return;
      }

      const r = issueWarrantyCertificate({
        estimate_ref: selected.estimate_ref,
        estimate_id: selected.id,
        calculator_type: selected.calculator_type,
        currency: selected.currency || "NGN",
        quoted_at: selected.created_at,
        total_material_cost: Number(selected.total_material_cost) || 0,
        inputs: (selected.inputs ?? {}) as Record<string, unknown>,
        calculated_quantities: (selected.calculated_quantities ?? {}) as Record<
          string,
          unknown
        >,
        items: items.data.map((it: EstimationEstimateItem) => ({
          item_id: it.id,
          item_name: it.item_name,
          quantity: Number(it.quantity_required),
          unit: it.unit,
          unit_price: Number(it.unit_price),
          stored_total: Number(it.total_price),
        })),
        rules,
        now: new Date().toISOString(),
      });

      setResult(r);
      if (r.ok && r.certificate_ref) {
        const saved = await createWarrantyRecord({
          user_id: user?.id ?? null,
          estimate_id: selected.id,
          certificate_ref: r.certificate_ref,
          currency: selected.currency || "NGN",
          estimate_snapshot: r.estimate_snapshot ?? undefined,
          config_hash: r.config_hash ?? undefined,
          warranty_months: r.warranty_months ?? 0,
          issued_at: r.issued_at ?? undefined,
          expires_at: r.expires_at ?? r.issued_at ?? undefined,
          status: r.status as string,
          dispute_flags: r.dispute_flags,
        });
        if (saved.error) {
          setLoadError(
            getSafeError(
              saved.error,
              "The certificate was computed but not saved.",
            ),
          );
        } else {
          track("warranty_certificate_issued");
          const wr = await fetchWarrantyRecords(user?.id);
          if (!wr.error) setCertificates(wr.data);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container>
      <div className="space-y-6">
        <PageHeader
          title="Warranty Certificate & Dispute Verification"
          subtitle="Issue a hash-verified warranty certificate for a saved estimate. The exact configuration behind your quote is frozen and replayable — if a claim or dispute ever arises, both sides verify against the same frozen record, never a reconstruction."
        />

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </div>
        )}

        {!user ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sign in to issue warranty certificates for your saved estimates.
            Only your own estimates are ever listed, and the frozen record
            stores only what your estimate already stored — nothing new is
            invented.
          </div>
        ) : estimates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            You have no completed estimates yet. Run any calculator and save the
            estimate, then come back to certify it.
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-card p-4 dark:border-white/5">
            <label className="grid gap-1 text-sm font-medium">
              Saved estimate
              <select
                className="rounded-lg border border-border bg-background px-3 py-2 font-normal"
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Select an estimate</option>
                {estimates.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.estimate_ref} — {e.calculator_type} (
                    {new Date(e.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={issue}
              disabled={!selected || busy}
              className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Issuing…" : "Issue warranty certificate"}
            </button>
          </div>
        )}

        {result && !result.ok && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
            {result.warnings.map((w, i) => (
              <p key={i} className="text-sm text-muted-foreground">
                {w}
              </p>
            ))}
          </div>
        )}

        {result?.ok && (
          <div className="space-y-4">
            {/* Certificate card */}
            <div className="rounded-lg border border-border bg-card p-6 dark:border-white/5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Certificate
                  </p>
                  <p className="mt-1 font-mono text-lg font-semibold">
                    {result.certificate_ref}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    result.status === "active"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : result.status === "expired"
                        ? "bg-muted text-muted-foreground"
                        : "bg-amber-500/15 text-amber-500"
                  }`}
                >
                  {result.status === "disputed"
                    ? "Disputed — review flagged lines"
                    : result.status === "expired"
                      ? "Expired"
                      : "Active"}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Config hash</p>
                  <p className="font-mono text-sm">{result.config_hash}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Issued</p>
                  <p className="text-sm font-medium">
                    {fmtDate(result.issued_at)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Warranty period
                  </p>
                  <p className="text-sm font-medium">
                    {result.warranty_months !== null
                      ? `${result.warranty_months} months`
                      : "Not configured"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="text-sm font-medium">
                    {result.expires_at
                      ? fmtDate(result.expires_at)
                      : "No expiry (no rule configured)"}
                  </p>
                </div>
              </div>
            </div>

            {result.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {w}
                  </p>
                ))}
              </div>
            )}

            {result.dispute_flags.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                <p className="mb-2 text-sm font-semibold text-destructive">
                  Dispute flags
                </p>
                {result.dispute_flags.map((f, i) => (
                  <p key={i} className="text-sm text-muted-foreground">
                    {f}
                  </p>
                ))}
              </div>
            )}

            {/* Replay table */}
            <div className="overflow-x-auto rounded-lg border border-border dark:border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Line</th>
                    <th className="p-3 text-right">Qty × price</th>
                    <th className="p-3 text-right">Replayed total</th>
                    <th className="p-3 text-right">Stored total</th>
                    <th className="p-3">Replay</th>
                  </tr>
                </thead>
                <tbody>
                  {result.replay_checks.map((c) => (
                    <tr
                      key={c.item_id}
                      className="border-t border-border dark:border-white/5"
                    >
                      <td className="p-3 font-medium">{c.item_name}</td>
                      <td className="p-3 text-right font-mono text-xs">
                        {c.quantity} × {c.unit_price}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {Number.isFinite(c.replayed_total)
                          ? c.replayed_total
                          : "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {Number.isFinite(c.stored_total) ? c.stored_total : "—"}
                      </td>
                      <td
                        className={`p-3 text-xs ${c.matches ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                      >
                        {c.matches
                          ? "Replays exactly"
                          : "Mismatch flagged — never repaired"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details className="rounded-lg border border-border bg-card p-4 text-sm dark:border-white/5">
              <summary className="cursor-pointer font-medium">
                How this certificate was produced
              </summary>
              <ul className="mt-2 space-y-1">
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

        {certificates.length > 0 && (
          <div>
            <h2 className="mb-2 text-lg font-semibold">
              Your issued certificates
            </h2>
            <div className="overflow-x-auto rounded-lg border border-border dark:border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Certificate</th>
                    <th className="p-3">Issued</th>
                    <th className="p-3">Expires</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((c) => (
                    <tr
                      key={c.certificate_ref}
                      className="border-t border-border dark:border-white/5"
                    >
                      <td className="p-3 font-mono text-xs">
                        {c.certificate_ref}
                      </td>
                      <td className="p-3">{fmtDate(c.issued_at)}</td>
                      <td className="p-3">{fmtDate(c.expires_at)}</td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {c.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <AdSlot slotKey="calculator_mid" className="mt-8" />
      <AdSlot slotKey="calculator_native" className="mt-8" />
      <AdSlot slotKey="calculator_bottom" className="mt-8" />
    </Container>
  );
}
