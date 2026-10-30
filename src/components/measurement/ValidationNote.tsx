import { AlertCircle, Info } from "lucide-react";
import { classNames } from "@/lib/utils";

/**
 * Guidance shown while a measurement project is incomplete.
 *
 * The previous treatment shouted at the user with a red box and a warning
 * glyph for what is simply "you have not added a measurement yet". This is
 * a premium hint panel: a soft glass surface, an icon chip, a short
 * headline and the specific detail underneath. Hard errors (bad values)
 * keep a rose tone, missing input uses the neutral amber tone.
 */
export function ValidationNote({
  errors,
  className,
}: {
  errors: string[];
  className?: string;
}) {
  if (!errors || errors.length === 0) return null;

  // "No measurements yet" is a next step, not a failure. Only complaint
  // about numbers the user actually typed deserves the error tone.
  const isHardError = errors.some(
    (e) => !/has no measurements|Add at least one/i.test(e),
  );
  const Icon = isHardError ? AlertCircle : Info;

  const tone = isHardError
    ? {
        shell:
          "border-rose-500/25 bg-gradient-to-br from-rose-500/[0.07] via-rose-500/[0.03] to-transparent",
        chip: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
        title: "text-foreground",
        detail: "text-muted-foreground",
      }
    : {
        shell:
          "border-amber-500/25 bg-gradient-to-br from-amber-500/[0.09] via-amber-500/[0.03] to-transparent",
        chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        title: "text-foreground",
        detail: "text-muted-foreground",
      };

  const headline = isHardError
    ? "Check the measurements below"
    : "Add a measurement to continue";

  return (
    <div
      role="status"
      aria-live="polite"
      className={classNames(
        "rounded-2xl border p-3.5 backdrop-blur-sm",
        tone.shell,
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={classNames(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            tone.chip,
          )}
          aria-hidden="true"
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={classNames("text-sm font-semibold", tone.title)}>
            {headline}
          </p>
          <ul className="mt-1 space-y-0.5">
            {errors.map((err, i) => (
              <li
                key={i}
                className={classNames("text-xs leading-relaxed", tone.detail)}
              >
                {err}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
