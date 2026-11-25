/**
 * Admin pane: Counter-Vision (Engine 2)
 *
 * The counting runs in the count-vision edge function via Google
 * Gemini - gated by ai_enabled in site settings (edited in
 * Admin → AI Settings); the Gemini key is the project-level edge
 * secret (GEMINI_API_KEY / GOOGLE_AI_API_KEY). The behaviour rules
 * (image size limit, count clamping bound, confidence floor)
 * live in estimation_calc_rules and are edited in the generic
 * Calc Rules tab (calculator_type 'count_vision'). This pane:
 *
 *  - shows the CURRENT rules (read-only, with where to edit them)
 *  - lists recent count requests with their honest verdicts,
 *    confidence and latency - so admins can see whether the
 *    counting is actually working for users
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Save, ScanLine } from "lucide-react";
import {
  fetchCountVisionRules,
  fetchCountVisionLog,
  updateCalcRule,
  createCalcRule,
  type CountVisionLogRow,
} from "@/lib/estimation/queries";
import {
  parseCountVisionRules,
  DEFAULT_COUNT_VISION_RULES,
  type CountVisionRules,
} from "@/lib/estimation/count-vision-engine";
import { getSafeError } from "@/lib/safeError";
import { AdminButton, AdminField, AdminHeader, AdminInput, StateMessage } from "@/components/admin/AdminUi";
import type { EstimationCalcRule } from "@/types/estimation";
import AdminPagination from "@/components/admin/AdminPagination";
import { useLanguage } from "@/lib/i18n";

const VERDICT_LABEL: Record<CountVisionLogRow["verdict"], string> = {
  counted: "Counted",
  unclear: "Cannot count honestly",
  not_found: "Nothing to count",
  error: "Service error",
};

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-NG", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminCountVision() {
  const { t } = useLanguage();
  const [rules, setRules] = useState<CountVisionRules>(
    DEFAULT_COUNT_VISION_RULES,
  );
  const [logs, setLogs] = useState<CountVisionLogRow[]>([]);
  const [ruleRows, setRuleRows] = useState<EstimationCalcRule[]>([]);
  const [savingRules, setSavingRules] = useState(false);
  const [savedRules, setSavedRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      const [rulesRes, logsRes] = await Promise.all([
        fetchCountVisionRules(),
        fetchCountVisionLog(page, pageSize),
      ]);
      if (!alive) return;
      if (rulesRes.error || logsRes.error) {
        setError(getSafeError(rulesRes.error ?? logsRes.error));
      } else {
        if (rulesRes.data) {
          setRuleRows(rulesRes.data);
          setRules(parseCountVisionRules(rulesRes.data as never));
        }
        setLogs(logsRes.data ?? []);
        setTotal(logsRes.count ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [page, pageSize]);

  async function saveRules() {
    setSavingRules(true);
    setError(null);
    setSavedRules(false);
    const values: Record<string, number> = {
      max_image_mb: rules.max_image_mb,
      max_count: rules.max_count,
      min_confidence: rules.min_confidence,
    };
    for (const [rule_key, value] of Object.entries(values)) {
      const existing = ruleRows.find((row) => row.rule_key === rule_key);
      const result = existing
        ? await updateCalcRule(existing.id, { rule_value: { ...existing.rule_value, value } })
        : await createCalcRule({ rule_key, calculator_type: "count_vision", rule_value: { value }, rule_status: "admin_configured", is_active: true });
      if (result.error) {
        setError(getSafeError(result.error));
        setSavingRules(false);
        return;
      }
      if (result.data) {
        setRuleRows((rows) => [...rows.filter((row) => row.id !== result.data!.id), result.data!]);
      }
    }
    setSavingRules(false);
    setSavedRules(true);
    window.setTimeout(() => setSavedRules(false), 3000);
  }

  const byVerdict = logs.reduce<Record<string, number>>((acc, l) => {
    acc[l.verdict] = (acc[l.verdict] ?? 0) + 1;
    return acc;
  }, {});
  const counted = byVerdict["counted"] ?? 0;
  const refused = (byVerdict["unclear"] ?? 0) + (byVerdict["not_found"] ?? 0);
  const errors = byVerdict["error"] ?? 0;
  const avgLatency =
    logs.length > 0
      ? Math.round(
          logs.reduce((sum, l) => sum + (l.latency_ms ?? 0), 0) / logs.length,
        )
      : 0;

  return (
    <div className="space-y-4">
      <AdminHeader
        title={t("Counter-Vision")}
        subtitle="Photo counting via Google Gemini (count-vision edge function). The admin switches the feature and holds the Gemini key in AI Settings; behaviour rules live in Calc Rules."
      />

      {loading && (
        <StateMessage
          type="loading"
          title={t("Loading")}
          message="Loading count vision data…"
        />
      )}
      {error && (
        <StateMessage type="error" title={t("Error")} message={error} />
      )}
      {!loading && !error && (
        <>
          {/* Counting rules are editable here and saved to the shared calculation rules table. */}
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">{t("Counting rules")}</h3>
                <p className="text-xs text-muted-foreground">Changes apply to the shared count_vision configuration. Lower confidence floors may increase uncertain results.</p>
              </div>
              <div className="flex items-center gap-2">
                {savedRules && <span className="text-sm text-emerald-600"><CheckCircle2 className="mr-1 inline h-4 w-4" />Saved</span>}
                <AdminButton onClick={saveRules} disabled={savingRules}>
                  <Save className="h-4 w-4" />{savingRules ? "Saving…" : "Save rules"}
                </AdminButton>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <AdminField label="Maximum photo size" hint="1–50 MB">
                <AdminInput type="number" min={1} max={50} step="0.5" value={rules.max_image_mb} onChange={(e) => setRules((r) => ({ ...r, max_image_mb: Math.max(1, Math.min(50, Number(e.target.value) || 1)) }))} />
              </AdminField>
              <AdminField label="Maximum count" hint="Positive whole number">
                <AdminInput type="number" min={1} step={1} value={rules.max_count} onChange={(e) => setRules((r) => ({ ...r, max_count: Math.max(1, Math.floor(Number(e.target.value) || 1)) }))} />
              </AdminField>
              <AdminField label="Minimum confidence" hint="0–100%">
                <AdminInput type="number" min={0} max={100} step={1} value={Math.round(rules.min_confidence * 100)} onChange={(e) => setRules((r) => ({ ...r, min_confidence: Math.max(0, Math.min(100, Number(e.target.value) || 0)) / 100 }))} />
              </AdminField>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">AI counting uses image interpretation and can be uncertain. Keep a suitably conservative confidence threshold and review important quantities manually.</p>
          </div>

          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {t("Recent requests")}
              </p>
              <p className="text-2xl font-semibold">{logs.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("Counted")}</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {counted}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {t("Honest refusals")}
              </p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {refused}
              </p>
              {refused > 0 && (
                <p className="text-xs text-muted-foreground">
                  unclear or nothing to count: by design, not failures
                </p>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">
                {t("Service errors")}
              </p>
              <p className="text-2xl font-semibold text-destructive">
                {errors}
              </p>
              {avgLatency > 0 && (
                <p className="text-xs text-muted-foreground">
                  avg {avgLatency} ms per count
                </p>
              )}
            </div>
          </div>

          {/* The count requests */}
          {logs.length === 0 ? (
            <StateMessage
              type="empty"
              title={t("No count requests yet")}
              message="They appear here the moment someone photographs materials for counting. Photos are never stored: only these request records."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table
                className="w-full text-sm"
                aria-label={t("Recent count requests")}
              >
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">{t("Requested")}</th>
                    <th className="p-3">{t("Item hint")}</th>
                    <th className="p-3">{t("Verdict")}</th>
                    <th className="p-3">{t("Count")}</th>
                    <th className="p-3">{t("Confidence")}</th>
                    <th className="p-3">{t("Latency")}</th>
                    <th className="p-3">{t("What the engine said")}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{fmt(l.requested_at)}</td>
                      <td className="p-3">{l.item_hint}</td>
                      <td className="p-3">{VERDICT_LABEL[l.verdict]}</td>
                      <td className="p-3">
                        {l.verdict === "counted" && l.item_count !== null
                          ? l.item_count.toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {l.confidence !== null
                          ? `${(Number(l.confidence) * 100).toFixed(0)}%`
                          : "N/A"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {l.latency_ms !== null ? `${l.latency_ms} ms` : "N/A"}
                      </td>
                      <td className="max-w-xs truncate p-3 text-muted-foreground">
                        {l.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AdminPagination
            page={page}
            pageSize={pageSize}
            total={total}
            loading={loading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
            <ScanLine className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Privacy: photos are sent to the counting service and never stored
              : not in the database, not on the device. Only what was asked, the
              verdict and diagnostics reach count_vision_log.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
