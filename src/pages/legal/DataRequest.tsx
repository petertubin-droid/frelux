import { useState } from "react";
import { useSeo } from "@/lib/seo";
import { getSupabase } from "@/lib/supabase-lazy";

/**
 * GDPR/CCPA data subject request intake. Requests land in the
 * data_subject_requests table (anon insert; admin reads/resolves).
 * Works without an account - the identity is verified by email
 * before any data is accessed, changed, or deleted.
 */
const REQUEST_TYPES = [
  "Access: send me a copy of my personal data",
  "Deletion: delete my personal data",
  "Correction: fix inaccurate personal data",
  "Portability: export my data in a machine-readable format",
  "Advertising opt-out (CCPA 'sharing' opt-out)",
  "Other",
] as const;

export default function DataRequest() {
  useSeo({
    title: "Data Subject Request",
    description:
      "Submit a GDPR or CCPA data subject request: access, deletion, correction, portability, or advertising opt-out.",
    canonicalPath: "/data-request",
  });
  const [email, setEmail] = useState("");
  const [type, setType] = useState<(typeof REQUEST_TYPES)[number]>(
    REQUEST_TYPES[0],
  );
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">(
    "idle",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      const supabase = await getSupabase();
      const { error } = await supabase
        .from("data_subject_requests")
        .insert({ email, request_type: type, details: details || null });
      if (error) throw error;
      setState("done");
    } catch {
      // Table not deployed or network issue: fall back to contact.
      setState("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold">Data subject request</h1>
      <p className="mt-3 text-muted-foreground">
        Under the GDPR (EU/EEA) and CCPA/CPRA (California), you can request
        access to, deletion of, correction of, or a copy of your personal data,
        and opt out of advertising sharing. We respond within 30 days.
      </p>

      {state === "done" ? (
        <div className="mt-8 rounded-2xl border bg-card p-6" role="status">
          <h2 className="text-lg font-semibold">Request received</h2>
          <p className="mt-2 text-muted-foreground">
            We&apos;ve logged your request and will verify your identity by
            email before processing. You&apos;ll hear from us within 30 days.
          </p>
        </div>
      ) : (
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <div>
            <label htmlFor="dsr-email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="dsr-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="dsr-type" className="block text-sm font-medium">
              Request type
            </label>
            <select
              id="dsr-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="dsr-details" className="block text-sm font-medium">
              Details (optional)
            </label>
            <textarea
              id="dsr-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-card px-3 py-2"
              rows={4}
              placeholder="Anything that helps us locate your data (account email if different, approximate signup date...)"
            />
          </div>
          {state === "error" && (
            <p className="text-sm text-destructive" role="alert">
              We couldn&apos;t log the request automatically. Please use the
              contact page and we&apos;ll process it manually.
            </p>
          )}
          <button
            type="submit"
            disabled={state === "sending"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {state === "sending" ? "Sending..." : "Submit request"}
          </button>
        </form>
      )}
    </div>
  );
}
