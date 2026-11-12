import { ShieldCheck, MessageCircle, AlertTriangle } from "lucide-react";
import {
  SAFETY_RULES,
  SAFETY_SUMMARY,
  NO_ESCROW_NO_MOVEMENT,
  safetyWhatsAppLink,
} from "@/lib/worker-safety";
import { classNames } from "@/lib/utils";

interface Props {
  variant?: "banner" | "full";
  className?: string;
}

/**
 * The rule that stops most of it, said plainly and shown before any job.
 * Copy only: the refusals live in the database and the escrow functions.
 */
export default function WorkerSafetyNotice({
  variant = "banner",
  className,
}: Props) {
  if (variant === "banner") {
    return (
      <div
        className={classNames(
          "flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200",
          className,
        )}
        role="note"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="text-xs font-medium leading-relaxed">
          {NO_ESCROW_NO_MOVEMENT}{" "}
          <span className="font-normal">
            Contact details unlock only after the client funds escrow.
          </span>
        </p>
      </div>
    );
  }

  return (
    <section
      className={classNames(
        "rounded-xl border border-border bg-card p-4 dark:border-white/10 dark:bg-card",
        className,
      )}
      aria-labelledby="worker-safety-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck
            className="h-5 w-5 text-brand-purple"
            aria-hidden="true"
          />
          <h2
            id="worker-safety-heading"
            className="text-sm font-bold uppercase tracking-wider text-card-foreground dark:text-primary-foreground"
          >
            Worker safety rules
          </h2>
        </div>
        <a
          href={safetyWhatsAppLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Share rules
        </a>
      </div>

      <ol className="mt-3 space-y-3">
        {SAFETY_RULES.map((rule, index) => (
          <li key={rule.id} className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-purple/10 text-[11px] font-bold text-brand-purple dark:bg-brand-purple/20">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-card-foreground dark:text-primary-foreground">
                {rule.title}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground dark:text-muted-foreground">
                {rule.how}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground/80 dark:text-muted-foreground/70">
                {rule.why}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-3 rounded-md bg-muted/60 p-2 text-[11px] leading-relaxed text-muted-foreground dark:bg-white/5 dark:text-muted-foreground">
        {SAFETY_SUMMARY}
      </p>
    </section>
  );
}
