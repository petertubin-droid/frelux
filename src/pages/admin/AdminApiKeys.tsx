// =========================================================
// FRELUX PHASE 7 — ADMIN: API KEYS MANAGEMENT (/admin/api-keys)
//
// Operator view of every FRELUX API key (masked — key_hash is
// never selected), with quota/plan/status controls. Raw keys are
// NEVER visible here: they are only ever shown once, to the
// owner, at create/rotate time (Developer Portal or /v1/keys).
//
// Data access relies on the admin RLS policies:
//   frelux_api_keys_admin_metadata / _admin_status
//   frelux_api_usage_admin_read
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  Ban,
  CheckCircle2,
  RefreshCw,
  Search,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminUi";
import { useToast } from "@/components/ui/Toast";
import {
  updateApiKeyLimits,
  restoreApiKey,
  getPlans,
  type ApiKeyRow,
  type ApiKeyPlan,
} from "@/lib/frelix-api/portal-client";
import { supabase } from "@/lib/supabase";

interface AdminKeyRow extends ApiKeyRow {
  created_by: string | null;
}

export default function AdminApiKeys() {
  const { success, error } = useToast();
  const [keys, setKeys] = useState<AdminKeyRow[]>([]);
  const [plans, setPlans] = useState<ApiKeyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, p] = await Promise.all([
        supabase
          .from("frelux_api_keys")
          .select(
            "id,name,key_prefix,status,permissions,plan_key,rate_limit_per_minute,daily_quota,monthly_quota,expires_at,last_used_at,created_at,updated_at,created_by",
          )
          .order("created_at", { ascending: false }),
        getPlans(),
      ]);
      if (k.error) throw new Error(k.error.message);
      setKeys(
        (k.data ?? []).map((r) => ({
          ...r,
          permissions: Array.isArray(r.permissions) ? r.permissions : [],
        })),
      );
      setPlans(p);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setLimit = async (
    id: string,
    patch: Record<string, unknown>,
    label: string,
  ) => {
    setBusy(id);
    try {
      await updateApiKeyLimits(id, patch as never);
      success(`${label} updated.`);
      await load();
    } catch (e) {
      error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (id: string, status: "active" | "revoked") => {
    setBusy(id);
    try {
      if (status === "active") await restoreApiKey(id);
      else {
        const { error } = await supabase
          .from("frelux_api_keys")
          .update({ status: "revoked" })
          .eq("id", id);
        if (error) throw new Error(error.message);
      }
      success(`Key ${status === "active" ? "restored" : "revoked"}.`);
      await load();
    } catch (e) {
      error(e instanceof Error ? e.message : "Status change failed.");
    } finally {
      setBusy(null);
    }
  };

  const filtered = keys.filter((k) =>
    query.trim() === ""
      ? true
      : `${k.name} ${k.key_prefix} ${k.plan_key} ${k.status} ${k.created_by ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
  );

  return (
    <div className="p-6">
      <AdminHeader
        title="API Keys"
        subtitle="Manage FRELUX AI API keys, plans, quotas and revocation. Raw keys are never visible here."
      />

      {notice && (
        <p className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {notice}
        </p>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Search aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, prefix, plan, status or owner…"
          className="w-full max-w-sm rounded-lg border bg-background px-3 py-2 text-sm"
          aria-label="Search API keys"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2
            aria-hidden="true"
            className="h-6 w-6 animate-spin text-brand-purple"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
          <KeyRound aria-hidden="true" className="h-8 w-8" />
          No API keys match.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs">
              <tr>
                <th className="px-3 py-2">Key</th>
                <th className="px-3 py-2">Plan</th>
                <th className="px-3 py-2">Limits</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Last used</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => (
                <tr key={k.id} className="border-t">
                  <td className="px-3 py-2">
                    <p className="font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {k.key_prefix}…
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={k.plan_key}
                      disabled={busy === k.id}
                      onChange={(e) =>
                        void setLimit(
                          k.id,
                          { plan_key: e.target.value },
                          "Plan",
                        )
                      }
                      className="rounded border bg-background px-2 py-1 text-xs"
                      aria-label={`Plan for ${k.name}`}
                    >
                      {plans.map((p) => (
                        <option key={p.key} value={p.key}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1 text-xs">
                      <label className="flex items-center gap-1">
                        /min
                        <input
                          type="number"
                          min={1}
                          max={600}
                          defaultValue={k.rate_limit_per_minute}
                          onBlur={(e) =>
                            Number(e.target.value) !==
                              k.rate_limit_per_minute &&
                            void setLimit(
                              k.id,
                              { rate_limit_per_minute: Number(e.target.value) },
                              "Rate limit",
                            )
                          }
                          className="w-16 rounded border bg-background px-1 py-0.5"
                          aria-label={`Rate limit for ${k.name}`}
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        /day
                        <input
                          type="number"
                          min={1}
                          defaultValue={k.daily_quota}
                          onBlur={(e) =>
                            Number(e.target.value) !== k.daily_quota &&
                            void setLimit(
                              k.id,
                              { daily_quota: Number(e.target.value) },
                              "Daily quota",
                            )
                          }
                          className="w-16 rounded border bg-background px-1 py-0.5"
                          aria-label={`Daily quota for ${k.name}`}
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        /month
                        <input
                          type="number"
                          min={1}
                          defaultValue={k.monthly_quota}
                          onBlur={(e) =>
                            Number(e.target.value) !== k.monthly_quota &&
                            void setLimit(
                              k.id,
                              { monthly_quota: Number(e.target.value) },
                              "Monthly quota",
                            )
                          }
                          className="w-20 rounded border bg-background px-1 py-0.5"
                          aria-label={`Monthly quota for ${k.name}`}
                        />
                      </label>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {k.created_by ? `${k.created_by.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {k.last_used_at
                      ? new Date(k.last_used_at).toLocaleString()
                      : "never"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        k.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {k.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {k.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => void setStatus(k.id, "revoked")}
                        disabled={busy === k.id}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-red-600 disabled:opacity-50"
                      >
                        <Ban aria-hidden="true" className="h-3 w-3" />
                        Revoke
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void setStatus(k.id, "active")}
                        disabled={busy === k.id}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                      >
                        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
