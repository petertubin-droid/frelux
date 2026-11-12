import { useEffect, useState } from "react";
import { BadgeCheck, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  fetchIdentityStatus,
  identityOutcomeMessage,
  submitIdentity,
  NG_BANKS,
  type IdentityRecord,
  type IdentitySubmission,
} from "@/lib/client-identity";
import { classNames } from "@/lib/utils";

interface Props {
  className?: string;
}

/**
 * One ID, one funding account, checked immediately. The client sees the exact
 * verdict, including the score, so a mismatch is not a mystery.
 */
export default function ClientIdentityCard({ className }: Props) {
  const [record, setRecord] = useState<IdentityRecord>({ status: "none" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [form, setForm] = useState<IdentitySubmission>({
    legal_name: "",
    id_type: "nin",
    id_last4: "",
    bank_code: NG_BANKS[0].code,
    account_number: "",
    funding_account_name: "",
  });

  useEffect(() => {
    let cancelled = false;
    fetchIdentityStatus()
      .then((result) => {
        if (!cancelled) setRecord(result);
      })
      .catch(() => {
        if (!cancelled) setRecord({ status: "none" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let documentPath: string | undefined;
      if (docFile) {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth.user?.id;
        if (!userId) throw new Error("Sign in again to upload your document");
        const extension = docFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${Date.now()}-id.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("client-ids")
          .upload(path, docFile, { upsert: false, contentType: docFile.type });
        if (uploadError) throw uploadError;
        documentPath = path;
      }
      setRecord(await submitIdentity({ ...form, document_path: documentPath }));
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not run the check",
      );
    } finally {
      setSaving(false);
    }
  };

  const verified = record.status === "verified";

  if (loading) {
    return (
      <div
        className={classNames(
          "rounded-xl border border-border bg-card p-4 dark:border-white/10",
          className,
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Checking your identity status
        </div>
      </div>
    );
  }

  return (
    <section
      className={classNames(
        "rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-card",
        className,
      )}
      aria-labelledby="client-identity-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="client-identity-heading"
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-card-foreground dark:text-primary-foreground"
        >
          {verified ? (
            <BadgeCheck
              className="h-4 w-4 text-emerald-600"
              aria-hidden="true"
            />
          ) : (
            <ShieldAlert
              className="h-4 w-4 text-amber-600"
              aria-hidden="true"
            />
          )}
          Client identity
        </h2>
        <span
          className={classNames(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize",
            verified
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
          )}
        >
          {record.status}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {identityOutcomeMessage(record)}
      </p>

      {typeof record.score === "number" && record.status !== "none" && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          Name match score {record.score.toFixed(3)}
          {record.matched_name ? ` against "${record.matched_name}"` : ""}
          {record.method === "bank_resolve" ? " (confirmed by your bank)" : ""}
        </p>
      )}

      {!verified && (
        <form className="mt-3 space-y-2" onSubmit={handleSubmit}>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-[11px] font-medium text-muted-foreground">
              Full name on your ID
              <input
                required
                minLength={2}
                maxLength={120}
                value={form.legal_name}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    legal_name: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                placeholder="As printed on the document"
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              Document
              <select
                value={form.id_type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    id_type: event.target
                      .value as IdentitySubmission["id_type"],
                  }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              >
                <option value="nin">NIN slip</option>
                <option value="voters_card">Voter's card</option>
                <option value="drivers_license">Driver's licence</option>
                <option value="intl_passport">International passport</option>
              </select>
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              Last four characters of the ID
              <input
                required
                maxLength={4}
                minLength={4}
                value={form.id_last4}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, id_last4: event.target.value }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                placeholder="1234"
              />
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              Bank you will pay from
              <select
                value={form.bank_code}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    bank_code: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              >
                {NG_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[11px] font-medium text-muted-foreground">
              Account number
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{10}"
                value={form.account_number}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    account_number: event.target.value.replace(/\D/g, ""),
                  }))
                }
                className="mt-1 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
                placeholder="0123456789"
              />
            </label>
          </div>

          <label className="block text-[11px] font-medium text-muted-foreground">
            Photo of the document (private, only you and an admin can open it)
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) => setDocFile(event.target.files?.[0] ?? null)}
              className="mt-1 block w-full text-[11px] text-muted-foreground"
            />
          </label>

          <p className="text-[11px] text-muted-foreground">
            We ask your bank for the name on that account and compare it to your
            ID. Only the last four digits and the account name are kept.
          </p>

          {error && (
            <p className="rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-brand-purple px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            {saving ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Run the check
          </button>
        </form>
      )}
    </section>
  );
}
