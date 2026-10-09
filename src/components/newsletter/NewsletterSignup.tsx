import { useState, type FormEvent } from "react";
import { Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";
import { supabase } from "@/lib/supabase";
import { getFunctionErrorMessage } from "@/lib/supabase";

type SignupState = "idle" | "submitting" | "done" | "error";

/**
 * Newsletter signup (Phase 12 retention). Posts to the
 * subscribe-newsletter edge function; the welcome email and
 * weekly Monday price digest are handled server side.
 */
export default function NewsletterSignup({
  source = "footer",
  className = "",
}: {
  source?: string;
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SignupState>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (state === "submitting") return;
    setState("submitting");
    setMessage("");
    try {
      const { data, error: fnError } = await supabase.functions.invoke<{
        subscribed?: boolean;
        error?: string;
      }>("subscribe-newsletter", {
        body: { email: email.trim().toLowerCase(), source },
      });
      if (fnError) throw new Error(await getFunctionErrorMessage(fnError));
      if (!data?.subscribed) throw new Error("Subscription failed");
      setState("done");
      setMessage("Subscribed. Check your inbox for a welcome email.");
    } catch (err) {
      setState("error");
      setMessage(
        err instanceof Error && err.message === "Too many requests"
          ? "Too many attempts. Please wait a minute and try again."
          : err instanceof Error && err.message === "Valid email required"
            ? "Please enter a valid email address."
            : "Could not subscribe right now. Please try again later.",
      );
    }
  }

  if (state === "done") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`flex items-start gap-2 text-sm text-accent-green dark:text-accent-green-light ${className}`}
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={onSubmit} className="space-y-2" noValidate>
        <label
          htmlFor={`newsletter-email-${source}`}
          className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground dark:text-muted-foreground"
        >
          Weekly price updates
        </label>
        <div className="flex gap-2">
          <input
            id={`newsletter-email-${source}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-label="Email address for weekly price updates"
            disabled={state === "submitting"}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border/60 bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 dark:border-white/10"
          />
          <Button
            type="submit"
            size="sm"
            disabled={state === "submitting" || email.trim().length === 0}
            className="h-9 shrink-0 px-3"
          >
            {state === "submitting" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Mail className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {state === "submitting" ? "Subscribing" : "Subscribe"}
            </span>
          </Button>
        </div>
      </form>
      {state === "error" && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {message}
        </p>
      )}
      <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
        One email every Monday: tracked material prices and what they mean for
        your estimates. Unsubscribe any time.
      </p>
    </div>
  );
}
