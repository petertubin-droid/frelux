import { supabase } from "@/lib/supabase";

/**
 * Client identity front end. The verdict itself is produced by the
 * paystack-verify function, which asks Paystack for the name on the funding
 * account and compares it to the name on the ID.
 */

export type IdentityStatus = "none" | "pending" | "verified" | "rejected";

export interface IdentityRecord {
  status: IdentityStatus;
  score?: number | null;
  matched_name?: string | null;
  method?: string | null;
  detail?: string | null;
  explanation?: string | null;
  needs_bank_confirmation?: boolean;
}

export interface IdentitySubmission {
  legal_name: string;
  id_type: "nin" | "voters_card" | "drivers_license" | "intl_passport";
  id_last4: string;
  bank_code: string;
  account_number: string;
  funding_account_name?: string;
  document_path?: string;
}

/** Banks whose Paystack code is stable enough to offer as a picker. */
export const NG_BANKS: { code: string; name: string }[] = [
  { code: "044", name: "Access Bank" },
  { code: "058", name: "GTBank" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "214", name: "First City Monument Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "032", name: "Union Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC" },
  { code: "050", name: "Ecobank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "50211", name: "Kuda" },
  { code: "50515", name: "Moniepoint" },
  { code: "999991", name: "PalmPay" },
  { code: "999992", name: "OPay" },
];

async function callIdentity(
  body: Record<string, unknown>,
): Promise<IdentityRecord> {
  const { data, error } = (await supabase.functions.invoke("paystack-verify", {
    body,
  })) as { data: IdentityRecord | null; error: unknown };
  if (error) {
    const message =
      typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Could not reach the identity check";
    throw new Error(message);
  }
  return (data ?? { status: "none" }) as IdentityRecord;
}

export const fetchIdentityStatus = () =>
  callIdentity({ action: "client_identity_status" });

export const submitIdentity = (submission: IdentitySubmission) =>
  callIdentity({ action: "client_identity_submit", ...submission });

/** What to tell the client about the verdict they just received. */
export function identityOutcomeMessage(record: IdentityRecord): string {
  if (record.explanation) return record.explanation;
  switch (record.status) {
    case "verified":
      return "Verified. Your ID name and your bank account name agree.";
    case "pending":
      return record.needs_bank_confirmation
        ? "We could not confirm the account name with your bank yet, so a person will check this. Adding your account number speeds it up."
        : "The names are close but need a person to confirm them. This usually takes a few hours.";
    case "rejected":
      return "Those names do not look like the same person. Check the ID name and the bank account you fund escrow from.";
    default:
      return "No identity check on file yet. Verify once and it covers every job you book.";
  }
}

/** True when the client may fund escrow: only a verified identity clears it. */
export function identityAllowsFunding(status: IdentityStatus): boolean {
  return status === "verified";
}
