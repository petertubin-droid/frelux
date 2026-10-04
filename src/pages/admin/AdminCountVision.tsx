/**
 * Admin pane: Counter-Vision (Engine 2)
 *
 * The counting runs in the count-vision edge function via Google
 * Gemini — gated by ai_enabled in site settings (edited in
 * Admin → AI Settings); the Gemini key is the project-level edge
 * secret (GEMINI_API_KEY / GOOGLE_AI_API_KEY). The behaviour rules
 * (image size limit, count clamping bound, confidence floor)
 * live in estimation_calc_rules and are edited in the generic
 * Calc Rules tab (calculator_type 'count_vision'). This pane:
 *
 *  - shows the CURRENT rules (read-only, with where to edit them)
 *  - lists recent count requests with their honest verdicts,
 *    confidence and latency — so admins can see whether the
 *    counting is actually working for users
 */

import { useEffect, useState } from "react";
import { ScanLine } from "lucide-react";
import {
  fetchCountVisionRules,
  fetchCountVisionLog,
  type CountVisionLogRow,
} from "@/lib/estimation/queries";
import {
  parseCountVisionRules,
  DEFAULT_COUNT_VISION_RULES,
  type CountVisionRules,
} from "@/lib/estimation/count-vision-engine";
import { getSafeError } from "@/lib/safeError";
import { AdminHeader, StateMessage } from "@/components/admin/AdminUi";

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
  const [rules, setRules] = useState<CountVisionRules>(
    DEFAULT_COUNT_VISION_RULES,
  );
  const [logs, setLogs] = useState<CountVisionLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      const [rulesRes, logsRes] = await Promise.all([
        fetchCountVisionRules(),
        fetchCountVisionLog(100),
      ]);
      if (!alive) return;
      if (rulesRes.error || logsRes.error) {
        setError(getSafeError(rulesRes.error ?? logsRes.error));
      } else {
        if (rulesRes.data)
          setRules(parseCountVisionRules(rulesRes.data as never));
        setLogs(logsRes.data ?? []);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

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
        title="Counter-Vision"
        subtitle="Photo counting via Google Gemini (count-vision edge function). The admin switches the feature and holds the Gemini key in AI Settings; behaviour rules live in Calc Rules."
      />

      {loading && (
        <StateMessage
          type="loading"
          title="Loading"
          message="Loading count vision data…"
        />
      )}
      {error && <StateMessage type="error" title="Error" message={error} />}
      {!loading && !error && (
        <>
          {/* Current behaviour rules — editable in Calc Rules */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-2 font-semibold">Current counting rules</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Max photo size</p>
                <p className="font-medium">{rules.max_image_mb} MB</p>
              </div>
              <div>
                <p className="text-muted-foreground">Reliable count bound</p>
                <p className="font-medium">
                  {rules.max_count.toLocaleString()} units
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Confidence floor</p>
                <p className="font-medium">
                  {(rules.min_confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Edit these in Estimation Config → Calc Rules, calculator type{" "}
              <code className="rounded bg-muted px-1">count_vision</code>. The
              AI switch lives in AI Settings (site_settings:{" "}
              <code className="rounded bg-muted px-1">ai_enabled</code>); the
              Gemini key is the project edge secret{" "}
              <code className="rounded bg-muted px-1">GOOGLE_AI_API_KEY</code>.
            </p>
          </div>

          {/* Summary */}
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Recent requests</p>
              <p className="text-2xl font-semibold">{logs.length}</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Counted</p>
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">
                {counted}
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Honest refusals</p>
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">
                {refused}
              </p>
              {refused > 0 && (
                <p className="text-xs text-muted-foreground">
                  unclear or nothing to count — by design, not failures
                </p>
              )}
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Service errors</p>
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
              title="No count requests yet"
              message="They appear here the moment someone photographs materials for counting. Photos are never stored — only these request records."
            />
          ) : (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table
                className="w-full text-sm"
                aria-label="Recent count requests"
              >
                <thead className="border-b bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Requested</th>
                    <th className="p-3">Item hint</th>
                    <th className="p-3">Verdict</th>
                    <th className="p-3">Count</th>
                    <th className="p-3">Confidence</th>
                    <th className="p-3">Latency</th>
                    <th className="p-3">What the engine said</th>
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
                          : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {l.confidence !== null
                          ? `${(Number(l.confidence) * 100).toFixed(0)}%`
                          : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {l.latency_ms !== null ? `${l.latency_ms} ms` : "—"}
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

          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-4 text-xs text-muted-foreground">
            <ScanLine className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Privacy: photos are sent to the counting service and never stored
              — not in the database, not on the device. Only what was asked, the
              verdict and diagnostics reach count_vision_log.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
