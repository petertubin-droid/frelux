// =========================================================
// FRELUX ADMIN: EXTERNAL PROVIDER API KEY SLOTS
//
// Rendered at the top of Admin → Integration Center. Each
// card is one provider from PROVIDER_REGISTRY: paste a key,
// it activates that provider (stored in integration_secrets,
// admin-only RLS — see the migration and provider-keys lib).
//
// Security UX:
//   * Raw keys are write-only here: the masked list query
//     (listIntegrationSecrets) never selects key_value, so a
//     saved key can never be read back by the browser.
//   * Server-side providers (Resend) show a "Server-side only"
//     badge; client-safe providers (OpenWeather) show exactly
//     why their key is public by design.
//   * Slot-ready providers are labelled honestly: the key is
//     stored, but no consuming code path uses it yet.
// =========================================================

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Cloud,
  ExternalLink,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { Card } from "@/components/ui/shadcn/card";
import { useToast } from "@/components/ui/Toast";
import {
  PROVIDER_REGISTRY,
  listIntegrationSecrets,
  saveIntegrationSecret,
  setIntegrationSecretStatus,
  type IntegrationSecretMeta,
} from "@/lib/integrations/provider-keys";

const ICONS = {
  mail: Mail,
  cloud: Cloud,
  exchange: ArrowLeftRight,
} as const;

type SecretMap = Record<string, IntegrationSecretMeta>;

export function ProviderKeyCards() {
  const { success, error: toastError } = useToast();
  const [secrets, setSecrets] = useState<SecretMap>({});
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const rows = await listIntegrationSecrets();
      const map: SecretMap = {};
      for (const r of rows) map[r.provider_id] = r;
      setSecrets(map);
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Failed to load provider keys.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(providerId: string) {
    const value = (drafts[providerId] ?? "").trim();
    if (!value) {
      toastError("Paste a key first.");
      return;
    }
    setBusy(providerId);
    try {
      const meta = await saveIntegrationSecret(providerId, value);
      setSecrets((s) => ({ ...s, [providerId]: meta }));
      setDrafts((d) => ({ ...d, [providerId]: "" }));
      setJustSaved(providerId);
      window.setTimeout(
        () => setJustSaved((j) => (j === providerId ? null : j)),
        2500,
      );
      success("Key saved — provider activated.");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to save key.");
    } finally {
      setBusy(null);
    }
  }

  async function handleToggle(providerId: string, next: boolean) {
    setBusy(providerId);
    try {
      await setIntegrationSecretStatus(
        providerId,
        next ? "active" : "disabled",
      );
      await load();
      success(next ? "Key enabled." : "Key disabled (kept for later).");
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Failed to update key.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-label="External provider API keys" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <KeyRound className="h-5 w-5 text-brand-purple" aria-hidden />
            Provider API Keys
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste a key to activate a provider — no redeploy needed. Keys are
            stored server-side with admin-only access; saved values can never be
            read back from this page.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-purple" />
        </div>
      ) : notice ? (
        <Card className="border-destructive/40 p-4 text-sm text-destructive">
          {notice}
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {PROVIDER_REGISTRY.map((provider) => {
            const secret = secrets[provider.id];
            const Icon = ICONS[provider.icon];
            const hasKey = Boolean(secret);
            const isActive = hasKey && secret.status === "active";
            const draft = drafts[provider.id] ?? "";
            const savingThis = busy === provider.id;

            return (
              <Card key={provider.id} className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-muted p-2">
                      <Icon className="h-5 w-5 text-foreground" aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {provider.label}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span
                          className={
                            isActive
                              ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                              : hasKey
                                ? "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                                : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {isActive ? "Active" : hasKey ? "Disabled" : "No key"}
                        </span>
                        <span
                          className={
                            provider.consumption === "live"
                              ? "rounded-full bg-brand-purple/10 px-2 py-0.5 text-xs font-medium text-brand-purple"
                              : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          }
                        >
                          {provider.consumption === "live"
                            ? "Live"
                            : "Slot ready"}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                          title={
                            provider.exposure === "server"
                              ? "Stored server-side; only edge functions read it"
                              : "Public by design (same exposure as the build-time env key)"
                          }
                        >
                          {provider.exposure === "server" ? (
                            <>
                              <EyeOff className="h-3 w-3" aria-hidden />
                              Server-side only
                            </>
                          ) : (
                            <>
                              <Cloud className="h-3 w-3" aria-hidden />
                              Client-safe key
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-brand-purple hover:underline"
                  >
                    Get a key
                    <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden />
                  </a>
                </div>

                <p className="text-sm text-muted-foreground">
                  {provider.description}
                </p>

                {hasKey ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" aria-hidden />
                    <span className="font-mono">••••{secret.key_last4}</span>
                    <span>
                      updated{" "}
                      {new Date(secret.updated_at).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 px-2 text-xs"
                      onClick={() =>
                        handleToggle(provider.id, secret.status === "disabled")
                      }
                      disabled={savingThis}
                    >
                      {isActive ? "Disable" : "Enable"}
                    </Button>
                  </div>
                ) : null}

                <div className="mt-auto space-y-2">
                  <Input
                    type="password"
                    autoComplete="off"
                    placeholder={
                      hasKey
                        ? `Paste a new key to rotate ••••${secret.key_last4}`
                        : `Paste your ${provider.label} key`
                    }
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({
                        ...d,
                        [provider.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSave(provider.id);
                    }}
                    aria-label={`${provider.label} API key`}
                  />
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => handleSave(provider.id)}
                    disabled={savingThis || !draft}
                  >
                    {savingThis ? (
                      <Loader2
                        className="mr-2 h-4 w-4 animate-spin"
                        aria-hidden
                      />
                    ) : justSaved === provider.id ? (
                      <Check className="mr-2 h-4 w-4" aria-hidden />
                    ) : (
                      <Save className="mr-2 h-4 w-4" aria-hidden />
                    )}
                    {justSaved === provider.id
                      ? "Saved"
                      : hasKey
                        ? "Rotate key"
                        : "Save & activate"}
                  </Button>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    {provider.consumptionNote}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
