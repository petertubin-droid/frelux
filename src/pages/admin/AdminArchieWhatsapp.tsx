// =========================================================
// ADMIN: ARCHIE WHATSAPP ASSISTANT CONTROL CENTER
//
// © 2026 FRENZY. All rights reserved.
//
// Real controls for the official WhatsApp Business Platform
// integration — the communication layer into the ONE ARCHIE
// core. Every control on this page is backed by a real
// backend operation (archie-whatsapp edge function); nothing
// is decorative.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  StateMessage,
  Toggle,
} from "@/components/admin/AdminUi";
import {
  fetchWaMessages,
  fetchWaStatus,
  addWaAccount,
  deleteWaAccount,
  disconnectWa,
  saveWaSettings,
  testWaConnection,
  revokeWaAccount,
  updateWaAccount,
  type WaAccount,
  type WaMessageLog,
  type WaStatus,
  type WaTestResult,
} from "@/lib/archie/whatsapp-client";

type ConfigItem = {
  label: string;
  configured: boolean;
  hint: string;
};

function ConfigPill({ item }: { item: ConfigItem }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        item.configured
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-red-500/15 text-red-600 dark:text-red-400"
      }`}
      title={item.hint}
    >
      {item.configured ? (
        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      ) : (
        <XCircle className="h-3 w-3" aria-hidden="true" />
      )}
      {item.label}
    </span>
  );
}

export default function AdminArchieWhatsapp() {
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<WaTestResult | null>(null);
  const [messages, setMessages] = useState<WaMessageLog[]>([]);

  // Add-account form
  const [newWaId, setNewWaId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<WaAccount["role"]>("family");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchWaStatus();
    if (res.ok) setStatus(res.data);
    else setError(res.error);
    const msgs = await fetchWaMessages(50);
    if (msgs.ok) setMessages(msgs.data.messages);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(
    label: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fn();
    if (!res.ok) setError(res.error ?? "Operation failed");
    else {
      setNotice(label);
      await load();
    }
    setBusy(false);
  }

  async function onTest() {
    setBusy(true);
    setTest(null);
    const res = await testWaConnection();
    if (res.ok) setTest(res.data);
    else setError(res.error);
    setBusy(false);
  }

  async function onAdd() {
    const waId = newWaId.replace(/[^0-9]/g, "");
    if (!waId) {
      setError("Enter the WhatsApp number (E.164 digits, no '+').");
      return;
    }
    await run("Account linked.", async () => {
      const res = await addWaAccount(waId, newName, newRole);
      return res.ok ? { ok: true } : res;
    });
    setNewWaId("");
    setNewName("");
  }

  const settings = status?.settings;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <MessageCircle
              className="h-6 w-6 text-primary"
              aria-hidden="true"
            />
            WhatsApp Assistant
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The official WhatsApp Business Platform integration — a
            communication interface into the ONE ARCHIE core. Every reply on
            WhatsApp comes from the same intelligence, memory and authority
            gates as the ARCHIE app.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <AdminButton variant="secondary" onClick={load} disabled={busy}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Refresh
          </AdminButton>
          <AdminButton onClick={onTest} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Test
            connection
          </AdminButton>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400"
        >
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400">
          {notice}
        </div>
      )}

      {loading && !status ? (
        <StateMessage
          type="loading"
          title="Loading…"
          message="Fetching WhatsApp integration status."
        />
      ) : !status ? (
        <StateMessage
          type="error"
          title="Integration status unavailable"
          message="The archie-whatsapp function could not be reached. The console never shows fake status."
        />
      ) : (
        <>
          {/* ---- Connection & security ---- */}
          <AdminCard className="space-y-4 p-5">
            <h2 className="text-base font-bold">Connection &amp; security</h2>
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  settings?.enabled
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {settings?.enabled ? "Channel ENABLED" : "Channel disabled"}
              </span>
              {[
                {
                  label: "Verify token",
                  configured: status.config.verifyTokenConfigured,
                  hint: "WHATSAPP_VERIFY_TOKEN (webhook handshake)",
                },
                {
                  label: "App secret",
                  configured: status.config.appSecretConfigured,
                  hint: "WHATSAPP_APP_SECRET (X-Hub-Signature-256 verification)",
                },
                {
                  label: "Access token",
                  configured: status.config.accessTokenConfigured,
                  hint: "WHATSAPP_ACCESS_TOKEN (system-user token, sending)",
                },
                {
                  label: "Phone number ID",
                  configured: status.config.phoneNumberIdConfigured,
                  hint: "WHATSAPP_PHONE_NUMBER_ID (Cloud API sender)",
                },
                {
                  label: "Internal core key",
                  configured: status.config.internalKeyConfigured,
                  hint: "ARCHIE_INTERNAL_KEY (shared secret to the one cognitive core)",
                },
              ].map((c) => (
                <ConfigPill key={c.label} item={c} />
              ))}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                Graph API {status.config.graphVersion}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">Messages (7d)</p>
                <p className="mt-1 text-lg font-bold">{status.messages7d}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">
                  Send failures (7d)
                </p>
                <p
                  className={`mt-1 text-lg font-bold ${
                    status.sendErrors7d > 0
                      ? "text-red-600 dark:text-red-400"
                      : ""
                  }`}
                >
                  {status.sendErrors7d}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-xs text-muted-foreground">
                  Last webhook event
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {status.lastWebhookEventAt
                    ? new Date(status.lastWebhookEventAt).toLocaleString()
                    : "none received yet"}
                </p>
              </div>
            </div>
            {test && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  test.connected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {test.connected ? (
                  <>
                    Live: {test.verifiedName ?? "WhatsApp Business"} —{" "}
                    {test.displayPhoneNumber} · quality{" "}
                    {test.qualityRating ?? "unknown"}
                  </>
                ) : (
                  <>Not connected: {test.reason}</>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Toggle
                  checked={Boolean(settings?.enabled)}
                  onChange={(v) =>
                    run(v ? "Channel enabled." : "Channel disabled.", () =>
                      saveWaSettings(
                        v,
                        Boolean(settings?.owner_learning_mode),
                        settings?.retention_days ?? 365,
                      ),
                    )
                  }
                  label="Enable channel (webhook processes messages)"
                />
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  checked={Boolean(settings?.owner_learning_mode)}
                  onChange={(v) =>
                    run("Owner Learning Mode updated.", () =>
                      saveWaSettings(
                        Boolean(settings?.enabled),
                        v,
                        settings?.retention_days ?? 365,
                      ),
                    )
                  }
                  label="Owner Learning Mode (conversations may feed the learning pipeline — still gated by the memory governance & consent)"
                />
              </div>
              <AdminButton
                variant="secondary"
                onClick={() =>
                  run("Disconnected — mappings revoked, channel off.", () =>
                    disconnectWa(),
                  )
                }
                disabled={busy}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                Disconnect / revoke all
              </AdminButton>
            </div>
            <p className="text-xs text-muted-foreground">
              Retention: conversation log rows are governed by the retention
              setting (currently {settings?.retention_days ?? "—"} days) and the
              Memory &amp; Data Rights Policy. WhatsApp conversation content is
              never auto-memorized — knowledge only persists through the
              validated teaching pipeline.
            </p>
          </AdminCard>

          {/* ---- Account mappings ---- */}
          <AdminCard className="space-y-4 p-5">
            <h2 className="text-base font-bold">Identity mappings</h2>
            <p className="text-sm text-muted-foreground">
              A WhatsApp number authorizes nothing by itself. Only accounts
              listed here — with an <strong>active</strong> status — are
              recognized. Owner mappings must link the admin user id. Numbers
              are masked everywhere except this Owner console.
            </p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_150px_auto]">
              <AdminInput
                placeholder="WhatsApp number (digits only)"
                value={newWaId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewWaId(e.target.value)
                }
              />
              <AdminInput
                placeholder="Display name (optional)"
                value={newName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewName(e.target.value)
                }
              />
              <AdminSelect
                value={newRole}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setNewRole(e.target.value as WaAccount["role"])
                }
              >
                <option value="owner">Owner</option>
                <option value="authorized">Authorized</option>
                <option value="family">Family</option>
                <option value="customer">Customer</option>
              </AdminSelect>
              <AdminButton onClick={onAdd} disabled={busy}>
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Link
              </AdminButton>
            </div>
            <div className="space-y-2">
              {status.accounts.length === 0 ? (
                <StateMessage
                  type="empty"
                  title="No linked numbers"
                  message="Link the Owner's WhatsApp number above (role: Owner)."
                />
              ) : (
                status.accounts.map((a: WaAccount) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {a.display_name ?? "Unnamed"} · ***{a.wa_id.slice(-4)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        role {a.role} · status {a.status}
                        {a.last_message_at
                          ? ` · last message ${new Date(a.last_message_at).toLocaleString()}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-3">
                      <Toggle
                        checked={a.learning_mode}
                        onChange={(v) =>
                          run("Learning toggle updated.", () =>
                            updateWaAccount(a.id, { learningMode: v }),
                          )
                        }
                        label="Learning"
                      />
                      <Toggle
                        checked={a.memory_permission}
                        onChange={(v) =>
                          run("Memory permission updated.", () =>
                            updateWaAccount(a.id, { memoryPermission: v }),
                          )
                        }
                        label="Log content"
                      />
                      {a.status === "active" ? (
                        <AdminButton
                          variant="secondary"
                          onClick={() =>
                            run("Account revoked.", () => revokeWaAccount(a.id))
                          }
                          disabled={busy}
                        >
                          Revoke
                        </AdminButton>
                      ) : (
                        <>
                          <AdminButton
                            variant="secondary"
                            onClick={() =>
                              run("Account re-activated.", () =>
                                updateWaAccount(a.id, { status: "active" }),
                              )
                            }
                            disabled={busy}
                          >
                            Activate
                          </AdminButton>
                          <AdminButton
                            variant="secondary"
                            onClick={() =>
                              run("Account deleted.", () =>
                                deleteWaAccount(a.id),
                              )
                            }
                            disabled={busy}
                          >
                            <Trash2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </AdminButton>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </AdminCard>

          {/* ---- Message log (audit) ---- */}
          <AdminCard className="space-y-3 p-5">
            <h2 className="text-base font-bold">Recent messages (audit)</h2>
            <p className="text-sm text-muted-foreground">
              Operational delivery log — not memory. Failed sends and processing
              errors surface here honestly.
            </p>
            {messages.length === 0 ? (
              <StateMessage
                type="empty"
                title="No messages yet"
                message="When the webhook is live and enabled, inbound and outbound messages appear here."
              />
            ) : (
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-1.5"
                  >
                    <div className="min-w-0">
                      <span
                        className={`mr-2 text-[11px] font-bold ${
                          m.direction === "in"
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      >
                        {m.direction === "in" ? "IN" : "OUT"}
                      </span>
                      <span className="break-words text-xs">
                        {m.body ?? (
                          <em className="text-muted-foreground">
                            [no content stored]
                          </em>
                        )}
                      </span>
                      {m.error && (
                        <span className="ml-2 text-[11px] text-red-600 dark:text-red-400">
                          {m.error}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {m.status} · {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </>
      )}
    </div>
  );
}
