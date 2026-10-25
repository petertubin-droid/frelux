import { useCallback, useEffect, useState } from "react";
import { FileText, History, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import { credentialStatusLabel } from "@/lib/credential-status";
import type { CredentialVerificationStatus } from "@/types/pro-connect";
import {
  addCredential,
  getCredentialEvents,
  getCredentials,
  resubmitCredential,
  uploadVerificationDocument,
} from "@/lib/pro-connect";
import type {
  DbProCredential,
  DbProCredentialEvent,
} from "@/types/pro-connect";

// =========================================================
// FRELUX Pro Connect — Worker credential manager (Phase 2)
//
// Guided submission and honest status display for the
// worker's own professional credentials. Verification is
// reviewer/source-driven only: this surface never claims a
// credential is more verified than the audit trail says.
// =========================================================

interface ProCredentialManagerProps {
  profileId: string;
}

type FormState = {
  open: boolean;
  body: string;
  registrationNumber: string;
  credentialType: string;
  credentialClass: string;
  countryCode: string;
  subnationalScope: string;
  issuedAt: string;
  expiresAt: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiry: string;
  document: File | null;
};

const EMPTY_FORM: Omit<FormState, "open"> = {
  body: "",
  registrationNumber: "",
  credentialType: "",
  credentialClass: "trade_registration",
  countryCode: "",
  subnationalScope: "",
  issuedAt: "",
  expiresAt: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
  insuranceExpiry: "",
  document: null,
};

const CREDENTIAL_CLASSES = [
  { value: "trade_registration", label: "Trade registration" },
  { value: "professional_license", label: "Professional license" },
  { value: "safety_training", label: "Safety training" },
  { value: "insurance", label: "Insurance" },
];

function statusTone(status: CredentialVerificationStatus): string {
  if (status === "verified_by_source") {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400";
  }
  if (status === "verified_by_reviewer" || status === "verified") {
    return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  }
  if (status === "rejected" || status === "revoked" || status === "suspended") {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }
  if (status === "expired") {
    return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400";
  }
  return "bg-muted text-muted-foreground dark:bg-white/5 dark:text-muted-foreground";
}

export function ProCredentialManager({ profileId }: ProCredentialManagerProps) {
  const [credentials, setCredentials] = useState<DbProCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, open: false });
  const [eventsFor, setEventsFor] = useState<string | null>(null);
  const [events, setEvents] = useState<DbProCredentialEvent[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await getCredentials(profileId);
    setCredentials(rows);
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!eventsFor) return;
    let cancelled = false;
    void getCredentialEvents(eventsFor).then((rows) => {
      if (!cancelled) setEvents(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [eventsFor]);

  const setField = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const validate = (): string | null => {
    if (!form.body.trim()) return "Professional body or authority is required.";
    if (!form.registrationNumber.trim())
      return "Registration or license number is required.";
    if (!form.credentialType.trim()) return "Credential title is required.";
    if (!/^[A-Za-z]{2}$/.test(form.countryCode.trim()))
      return "Country is required (two-letter code).";
    if (
      form.credentialClass === "insurance" &&
      !form.insuranceProvider.trim()
    ) {
      return "Insurance provider is required for insurance evidence.";
    }
    if (form.issuedAt && form.expiresAt && form.expiresAt < form.issuedAt) {
      return "Expiry date cannot be before the issued date.";
    }
    return null;
  };

  const submit = async () => {
    setError("");
    setNotice("");
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      return;
    }
    setSubmitting(true);
    let documentPath: string | null = null;
    if (form.document) {
      documentPath = await uploadVerificationDocument(
        profileId,
        null,
        form.document,
        "credential",
      );
      if (!documentPath) {
        setError("The evidence document could not be uploaded. Please retry.");
        setSubmitting(false);
        return;
      }
    }
    const ok = await addCredential(profileId, {
      professional_body: form.body.trim(),
      registration_number: form.registrationNumber.trim(),
      credential_type: form.credentialType.trim(),
      credential_class: form.credentialClass,
      country_code: form.countryCode.trim().toUpperCase(),
      subnational_scope: form.subnationalScope.trim() || undefined,
      registry_identifier: undefined,
      issued_at: form.issuedAt || undefined,
      expires_at: form.expiresAt || undefined,
      evidence_type: "document_upload",
      document_path: documentPath ?? undefined,
      insurance_provider:
        form.credentialClass === "insurance"
          ? form.insuranceProvider.trim()
          : undefined,
      insurance_policy_number:
        form.credentialClass === "insurance"
          ? form.insurancePolicyNumber.trim()
          : undefined,
      insurance_expiry:
        form.credentialClass === "insurance" && form.insuranceExpiry
          ? form.insuranceExpiry
          : undefined,
    });
    setSubmitting(false);
    if (!ok) {
      setError("The credential could not be submitted. Please retry.");
      return;
    }
    setNotice(
      "Submitted for review. FRELUX reviews the evidence; verification is never automatic.",
    );
    setForm({ ...EMPTY_FORM, open: false });
    await refresh();
  };

  const resubmit = async (credentialId: string) => {
    setError("");
    setNotice("");
    const ok = await resubmitCredential(credentialId, {});
    if (!ok) {
      setError("This credential cannot be resubmitted in its current state.");
      return;
    }
    setNotice("Resubmitted for review.");
    await refresh();
  };

  return (
    <section aria-labelledby="pro-credentials-heading" className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="pro-credentials-heading"
          className="text-lg font-semibold text-foreground"
        >
          Professional Credentials
        </h2>
        {!form.open && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForm({ ...EMPTY_FORM, open: true })}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add credential
          </Button>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Credentials are verified by FRELUX reviewers or the issuing registry.
        Your registration numbers and documents stay private.
      </p>

      {form.open && (
        <form
          aria-label="Credential submission"
          className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                Professional body or authority
              </span>
              <Input
                value={form.body}
                onChange={(e) => setField({ body: e.target.value })}
                placeholder="e.g. COREN"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                Registration or license number
              </span>
              <Input
                value={form.registrationNumber}
                onChange={(e) =>
                  setField({ registrationNumber: e.target.value })
                }
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Credential title</span>
              <Input
                value={form.credentialType}
                onChange={(e) => setField({ credentialType: e.target.value })}
                placeholder="e.g. Registered Builder"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Credential class</span>
              <select
                className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm"
                value={form.credentialClass}
                onChange={(e) => setField({ credentialClass: e.target.value })}
              >
                {CREDENTIAL_CLASSES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                Country (two-letter code)
              </span>
              <Input
                value={form.countryCode}
                onChange={(e) => setField({ countryCode: e.target.value })}
                placeholder="NG"
                maxLength={2}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                State or region (optional)
              </span>
              <Input
                value={form.subnationalScope}
                onChange={(e) => setField({ subnationalScope: e.target.value })}
                placeholder="Lagos"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                Issued date (optional)
              </span>
              <Input
                type="date"
                value={form.issuedAt}
                onChange={(e) => setField({ issuedAt: e.target.value })}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">
                Expiry date (optional)
              </span>
              <Input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setField({ expiresAt: e.target.value })}
              />
            </label>
          </div>

          {form.credentialClass === "insurance" && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">
                  Insurance provider
                </span>
                <Input
                  value={form.insuranceProvider}
                  onChange={(e) =>
                    setField({ insuranceProvider: e.target.value })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Policy number</span>
                <Input
                  value={form.insurancePolicyNumber}
                  onChange={(e) =>
                    setField({ insurancePolicyNumber: e.target.value })
                  }
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-muted-foreground">Insurance expiry</span>
                <Input
                  type="date"
                  value={form.insuranceExpiry}
                  onChange={(e) =>
                    setField({ insuranceExpiry: e.target.value })
                  }
                />
              </label>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <FileText
              aria-hidden="true"
              className="h-4 w-4 text-muted-foreground"
            />
            <input
              type="file"
              className="text-xs text-muted-foreground"
              onChange={(e) =>
                setField({ document: e.target.files?.[0] ?? null })
              }
            />
          </label>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for review"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setForm({ ...EMPTY_FORM, open: false })}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Loading credentials…
        </p>
      ) : credentials.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          No credentials submitted yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {credentials.map((cred) => (
            <li
              key={cred.id}
              className="rounded-xl border border-border bg-card px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {cred.credential_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cred.professional_body}
                    {cred.country_code ? ` · ${cred.country_code}` : ""}
                    {cred.subnational_scope
                      ? ` · ${cred.subnational_scope}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(
                    cred.verification_status,
                  )}`}
                >
                  <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                  {credentialStatusLabel(cred.verification_status)}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {(cred.verification_status === "rejected" ||
                  cred.verification_status === "unable_to_verify") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void resubmit(cred.id)}
                  >
                    <RefreshCw aria-hidden="true" className="h-4 w-4" />
                    Resubmit
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setEventsFor(eventsFor === cred.id ? null : cred.id)
                  }
                >
                  <History aria-hidden="true" className="h-4 w-4" />
                  {eventsFor === cred.id ? "Hide history" : "History"}
                </Button>
              </div>
              {eventsFor === cred.id && (
                <div className="mt-2 rounded-lg bg-muted/50 p-3 dark:bg-white/5">
                  {events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      No recorded events.
                    </p>
                  ) : (
                    <ol className="space-y-1">
                      {events.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"
                        >
                          <span>
                            {ev.event_type.replace(/_/g, " ")}
                            {ev.reason ? ` — ${ev.reason}` : ""}
                          </span>
                          <span>
                            {new Date(ev.occurred_at).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {notice && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
          {notice}
        </p>
      )}
    </section>
  );
}
