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
} from "@/lib/archie/social-client";
import {
  listSocialPlatforms,
  TOKEN_GOVERNANCE,
  type SocialPlatformDescriptor,
} from "@/lib/archie/social-connections";

export default function AdminSocialBrandCenter() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SocialAccountRow[]>([]);
  const [platforms, setPlatforms] = useState<SocialPlatformDescriptor[]>([]);
  const [analyses, setAnalyses] = useState<SocialAnalysisRow[]>([]);
  const [permissionsFor, setPermissionsFor] = useState<SocialAccountRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [acc, an] = await Promise.all([listSocialAccounts(), listSocialAnalyses()]);
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
      });
      if (!res.ok) {
        toast.error("Code exchange failed", res.error ?? "Re-authorize the account.");
      } else {
        toast.success("Connected", `${platform} connected. Tokens are stored encrypted server-side.`);
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
        toast.error("Connect failed", res.error ?? "Connection is unavailable for this platform.");
        return;
      }
      if (res.authorize_url) window.location.href = res.authorize_url;
    },
    [toast],
  );

  const act = useCallback(
    async (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
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
        FRELUX never stores your platform passwords. Only OAuth tokens live in the
        server-side encrypted vault ({TOKEN_GOVERNANCE.storage}). Rotation:
        {TOKEN_GOVERNANCE.rotation}. Revocation: {TOKEN_GOVERNANCE.revocation}.
        ARCHIE may access only the accounts you explicitly connect and authorize here.
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the Brand Center…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {platforms.map((p) => {
            const account = accounts.find((a) => a.platform === p.platform);
            const connected = account && (account.status === "CONNECTED" || account.status === "SYNCED");
            return (
              <div key={p.platform} className="rounded-lg border border-input bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-foreground">{p.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.auth_mechanism === "oauth2" ? "Official OAuth" : "Official sign-in flow"}
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
                    {account.account_handle} · scopes: {account.scopes.join(", ") || "none"} ·
                    synced {account.synced_at ? new Date(account.synced_at).toLocaleString() : "never"}
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
                        onClick={() => void act(`sync:${account.id}`, () => syncSocialAccount(account.id))}
                        disabled={busy === `sync:${account.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Sync
                      </button>
                      <button
                        onClick={() =>
                          void act(`disc:${account.id}`, () => disconnectSocialAccount(account.id))
                        }
                        disabled={busy === `disc:${account.id}`}
                        className="inline-flex items-center gap-1 rounded-md border border-input px-3 py-1.5 text-sm disabled:opacity-60"
                      >
                        <Unlink className="h-3.5 w-3.5" /> Disconnect
                      </button>
                      <button
                        onClick={() =>
                          void act(`rev:${account.id}`, () => revokeSocialAccess(account.id))
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
              Permissions · {permissionsFor.platform} ({permissionsFor.account_handle})
            </div>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              {permissionsFor.scopes.length > 0 ? (
                permissionsFor.scopes.map((s) => <li key={s}>{s}</li>)
              ) : (
                <li>No scopes recorded for this connection.</li>
              )}
            </ul>
            <p className="text-xs text-muted-foreground">
              ARCHIE can analyze only the information these permissions grant, within the
              platform's terms and privacy requirements.
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
          Observed platform data, ARCHIE recommendations and ARCHIE assumptions are stored as
          clearly distinct, labeled kinds and never merged. Private account information stays
          isolated and never automatically becomes global FRELUX knowledge.
        </p>
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No insight reports yet. Reports appear after authorized accounts are synced and
            analyzed.
          </p>
        ) : (
          <div className="space-y-2">
            {analyses.map((a) => (
              <div key={a.id} className="rounded-md border border-input p-3 text-xs space-y-1">
                <div className="font-medium">{a.platform} · {new Date(a.created_date).toLocaleString()}</div>
                {a.observed_platform_data.length > 0 && (
                  <div><span className="font-medium">Observed:</span> {a.observed_platform_data.join(" · ")}</div>
                )}
                {a.archie_recommendations.length > 0 && (
                  <div><span className="font-medium">Recommendations:</span> {a.archie_recommendations.join(" · ")}</div>
                )}
                {a.archie_assumptions.length > 0 && (
                  <div><span className="font-medium">Assumptions:</span> {a.archie_assumptions.join(" · ")}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
