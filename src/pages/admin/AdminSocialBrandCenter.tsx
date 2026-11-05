// =========================================================
// FRELUX ARCHIE EXTENSION, ADMIN: SOCIAL INTELLIGENCE &
// BRAND CENTER (/admin/social-brand-center)
//
// Owner-only surface to connect and manage the Owner's own
// authorized brand/social accounts using each platform's
// OFFICIAL OAuth / official Sign-In mechanism. FRELUX stores
// NO social-media, Google or platform passwords, only the
// authorization tokens the platform issues, held server-side
// in an encrypted vault (service-role only).
//
// Lifecycle: CONNECT → VIEW PERMISSIONS → SYNC → DISCONNECT
// → REVOKE ACCESS. ARCHIE may access ONLY the accounts the
// Owner explicitly connected and authorized here.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Link2,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Unlink,
  Eye,
  Trash2,
  Info,
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminUi";
import { useToast } from "@/components/ui/Toast";
import {
  listSocialAccounts,
  completeSocialConnection,
  getSocialAuthorizeUrl,
  syncSocialAccount,
  disconnectSocialAccount,
  revokeSocialAccess,
  listSocialAnalyses,
  type SocialAccountRow,
  type SocialAnalysisRow,
} from "@/lib/social/social-client";
import {
  CREDENTIAL_PLATFORMS,
  listPlatformCredentials,
  savePlatformCredentials,
  removePlatformCredentials,
  type CredentialPlatform,
  type PlatformCredentialRow,
} from "@/lib/social/platform-credentials";
import {
  listSocialPlatforms,
  TOKEN_GOVERNANCE,
  type SocialPlatformDescriptor,
} from "@/lib/social/social-connections";

export default function AdminSocialBrandCenter() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccountRow[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatformDescriptor[]>([]);
  const [analyses, setAnalyses] = useState<SocialAnalysisRow[]>([]);
  const [permissionsFor, setPermissionsFor] = useState<SocialAccountRow | null>(
    null,
  );
  const [credentials, setCredentials] = useState<
    Record<string, PlatformCredentialRow>
  >({});
  const [credentialForm, setCredentialForm] = useState<{
    platform: string;
    clientId: string;
    clientSecret: string;
  } | null>(null);

  const refreshCredentials = useCallback(async () => {
    setCredentials(await listPlatformCredentials());
  }, []);

  useEffect(() => {
    void refreshCredentials();
  }, [refreshCredentials]);

  const saveCredentials = async (p: CredentialPlatform) => {
    if (!credentialForm || credentialForm.platform !== p.platform) return;
    setBusy(`cred:${p.platform}`);
    const res = await savePlatformCredentials({
      platform: p.platform,
      clientId: credentialForm.clientId,
      clientSecret: credentialForm.clientSecret,
      label: p.label,
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Credentials not saved", res.error ?? "Check the values.");
      return;
    }
    setCredentialForm(null);
    toast.success(
      "Credentials saved",
      `${p.label} can now start an authorization.`,
    );
    await refreshCredentials();
  };

  const dropCredentials = async (p: CredentialPlatform) => {
    setBusy(`cred:${p.platform}`);
    const res = await removePlatformCredentials(p.platform);
    setBusy(null);
    if (!res.ok) {
      toast.error("Credentials not removed", res.error ?? "Try again.");
      return;
    }
    toast.success(
      "Credentials removed",
      `${p.label} authorizations will now be refused.`,
    );
    await refreshCredentials();
  };

  const verifyCredentials = async (p: CredentialPlatform) => {
    setBusy(`verify:${p.platform}`);
    const res = await getSocialAuthorizeUrl(p.platform);
    setBusy(null);
    if (!res.ok) {
      toast.error(
        "Connector refused the authorization",
        res.error ?? "The platform is not configured.",
      );
      return;
    }
    toast.success(
      "Connector accepted the credentials",
      `${p.label} authorization URL built.`,
    );
  };

  const load = useCallback(async () => {
    setLoading(true);
    const [acc, an] = await Promise.all([
      listSocialAccounts(),
      listSocialAnalyses(),
    ]);
    setAccounts(acc);
    setAnalyses(an);
    setPlatforms([...listSocialPlatforms()]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // OAuth callback support: the platform redirects back with
  // ?platform=&code=&state= (handled per-platform by the Owner).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get("platform");
    const code = params.get("code");
    if (!platform || !code) return;
    void (async () => {
      const res = await completeSocialConnection({
        platform,
        code,
        account_handle: `connected:${platform}`,
        scopes: [],
        state: params.get("state") ?? undefined,
      });
      if (!res.ok) {
        toast.error(
          "Code exchange failed",
          res.error ?? "Re-authorize the account.",
        );
      } else {
        toast.success(
          "Connected",
          `${platform} connected. Tokens are stored encrypted server-side.`,
        );
        window.history.replaceState({}, "", "/admin/social-brand-center");
        await load();
      }
    })();
  }, [toast, load]);

  const connect = useCallback(
    async (platform: string) => {
      setBusy(platform);
      const res = await getSocialAuthorizeUrl(platform);
      setBusy(null);
      if (!res.ok) {
        toast.error(
          "Connect failed",
          res.error ?? "Connection is unavailable for this platform.",
        );
        return;
      }
      if (res.authorize_url) window.location.href = res.authorize_url;
    },
    [toast],
  );

  const act = useCallback(
    async (
      label: string,
      fn: () => Promise<{ ok: boolean; error?: string }>,
    ) => {
      setBusy(label);
      const res = await fn();
      setBusy(null);
      if (!res.ok) {
        toast.error("Action failed", res.error ?? "The action failed.");
        return;
      }
      toast.success("Done", "The action completed.");
      await load();
    },
    [toast, load],
  );

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Social Intelligence & Brand Center"
        subtitle="Owner-only: connect your authorized brand accounts using each platform's official OAuth flow."
      />

      <div className="rounded-lg border border-input bg-card p-4 text-sm text-muted-foreground">
        <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
          <ShieldCheck className="h-4 w-4" /> Token governance
        </div>
        FRELUX never stores your platform passwords. Only OAuth tokens live in
        the server-side encrypted vault ({TOKEN_GOVERNANCE.storage}). Rotation:
        {TOKEN_GOVERNANCE.rotation}. Revocation: {TOKEN_GOVERNANCE.revocation}.
        ARCHIE may access only the accounts you explicitly connect and authorize
        here.
      </div>

      <section className="rounded-lg border border-input bg-card">
        <div className="border-b border-input p-4">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <KeyRound className="h-4 w-4" /> Platform credentials
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The app credentials each platform issues. A platform without them
            cannot start an authorization, so the connector refuses rather than
            guessing. The secret is stored server side and never shown again.
          </p>
        </div>
        <div className="divide-y divide-input">
          {CREDENTIAL_PLATFORMS.map((p) => {
            const row = credentials[p.platform];
            const ready = row?.status === "active";
            const editing = credentialForm?.platform === p.platform;
            return (
              <div key={p.platform} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {p.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {ready
                        ? `Secret ending ${row?.keyLast4 ?? "----"}${
                            row?.updatedAt
                              ? `, updated ${new Date(row.updatedAt).toLocaleDateString()}`
                              : ""
                          }`
                        : "No credentials saved"}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        ready
                          ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                          : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      }
                    >
                      {ready ? "Configured" : "Not configured"}
                    </span>
                    <button
                      onClick={() =>
                        setCredentialForm(
                          editing
                            ? null
                            : {
                                platform: p.platform,
                                clientId: "",
                                clientSecret: "",
                              },
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm"
                    >
                      {editing ? "Cancel" : ready ? "Replace keys" : "Add keys"}
                    </button>
                    {ready && (
                      <button
                        onClick={() => void dropCredentials(p)}
                        disabled={busy === `cred:${p.platform}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    )}
                  </div>
                </div>

                {editing && credentialForm && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">{p.idLabel}</span>
                      <input
                        value={credentialForm.clientId}
                        onChange={(e) =>
                          setCredentialForm({
                            ...credentialForm,
                            clientId: e.target.value,
                          })
                        }
                        autoComplete="off"
                        spellCheck={false}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="text-muted-foreground">
                        {p.secretLabel}
                      </span>
                      <input
                        type="password"
                        value={credentialForm.clientSecret}
                        onChange={(e) =>
                          setCredentialForm({
                            ...credentialForm,
                            clientSecret: e.target.value,
                          })
                        }
                        autoComplete="new-password"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                      <button
                        onClick={() => void saveCredentials(p)}
                        disabled={busy === `cred:${p.platform}`}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                      >
                        {busy === `cred:${p.platform}` ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Save keys
                      </button>
                      <button
                        onClick={() => void verifyCredentials(p)}
                        disabled={busy === `verify:${p.platform}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        Test connection
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {p.where}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the Brand Center…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platforms.map((p) => {
            const account = accounts.find((a) => a.platform === p.platform);
            const connected =
              account &&
              (account.status === "CONNECTED" || account.status === "SYNCED");
            return (
              <div
                key={p.platform}
                className="rounded-lg border border-input bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-foreground">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.auth_mechanism === "oauth2"
                        ? "Official OAuth"
                        : "Official sign-in flow"}
                    </div>
                  </div>
                  <span
                    className={
                      connected
                        ? "rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                        : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    }
                  >
                    {connected ? "Connected" : "Not connected"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{p.note}</p>
                {account && (
                  <p className="text-xs text-muted-foreground">
                    {account.account_handle} · scopes:{" "}
                    {account.scopes.join(", ") || "none"} · synced{" "}
                    {account.synced_at
                      ? new Date(account.synced_at).toLocaleString()
                      : "never"}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {!connected && (
                    <button
                      onClick={() => void connect(p.platform)}
                      disabled={busy === p.platform}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                    >
                      {busy === p.platform ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Link2 className="h-3.5 w-3.5" />
                      )}
                      Connect
                    </button>
                  )}
                  {connected && (
                    <>
                      <button
                        onClick={() => setPermissionsFor(account)}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm"
                      >
                        <Eye className="h-3.5 w-3.5" /> Permissions
                      </button>
                      <button
                        onClick={() =>
                          void act(`sync:${account.id}`, () =>
                            syncSocialAccount(account.id),
                          )
                        }
                        disabled={busy === `sync:${account.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Sync
                      </button>
                      <button
                        onClick={() =>
                          void act(`disc:${account.id}`, () =>
                            disconnectSocialAccount(account.id),
                          )
                        }
                        disabled={busy === `disc:${account.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        <Unlink className="h-3.5 w-3.5" /> Disconnect
                      </button>
                      <button
                        onClick={() =>
                          void act(`rev:${account.id}`, () =>
                            revokeSocialAccess(account.id),
                          )
                        }
                        disabled={busy === `rev:${account.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm text-destructive disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Revoke access
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {permissionsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-input bg-card p-5 space-y-3">
            <div className="font-medium text-foreground">
              Permissions · {permissionsFor.platform} (
              {permissionsFor.account_handle})
            </div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {permissionsFor.scopes.length > 0 ? (
                permissionsFor.scopes.map((s) => <li key={s}>{s}</li>)
              ) : (
                <li>No scopes recorded for this connection.</li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground">
              ARCHIE can analyze only the information these permissions grant,
              within the platform's terms and privacy requirements.
            </p>
            <button
              onClick={() => setPermissionsFor(null)}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-input bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Info className="h-4 w-4" /> ARCHIE insight reports
        </div>
        <p className="text-xs text-muted-foreground">
          Observed platform data, ARCHIE recommendations and ARCHIE assumptions
          are stored as clearly distinct, labeled kinds and never merged.
          Private account information stays isolated and never automatically
          becomes global FRELUX knowledge.
        </p>
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No insight reports yet. Reports appear after authorized accounts are
            synced and analyzed.
          </p>
        ) : (
          <div className="space-y-2">
            {analyses.map((a) => (
              <div
                key={a.id}
                className="rounded-md border border-input p-3 text-xs space-y-1"
              >
                <div className="font-medium">
                  {a.platform} · {new Date(a.created_date).toLocaleString()}
                </div>
                {a.observed_platform_data.length > 0 && (
                  <div>
                    <span className="font-medium">Observed:</span>{" "}
                    {a.observed_platform_data.join(" · ")}
                  </div>
                )}
                {a.archie_recommendations.length > 0 && (
                  <div>
                    <span className="font-medium">Recommendations:</span>{" "}
                    {a.archie_recommendations.join(" · ")}
                  </div>
                )}
                {a.archie_assumptions.length > 0 && (
                  <div>
                    <span className="font-medium">Assumptions:</span>{" "}
                    {a.archie_assumptions.join(" · ")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
