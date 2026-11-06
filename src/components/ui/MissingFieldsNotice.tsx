import { AlertCircle } from "lucide-react";
import type { MissingField } from "@/lib/forms/missing-fields";
import { focusMissingField } from "@/lib/forms/missing-fields";

/**
 * The notice a calculate button shows when the form is not finished.
 *
 * It names the fields that are empty, in the order they appear, and each one is
 * a button that puts the cursor back in its box. "Fill in all fields" costs the
 * reader the same hunt as no message at all, so the list is the message.
 */
export interface MissingFieldsNoticeProps {
  fields: MissingField[];
  /** Shown above the list. Defaults to wording that names nothing twice. */
  title?: string;
  className?: string;
}

export default function MissingFieldsNotice({
  fields,
  title,
  className,
}: MissingFieldsNoticeProps) {
  if (fields.length === 0) return null;

  const heading =
    title ??
    (fields.length === 1
      ? "One field still needs a figure"
      : `${fields.length} fields still need a figure`);

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="missing-fields-notice"
      className={
        className ??
        "rounded-xl border border-destructive/40 bg-destructive/5 p-4"
      }
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          aria-hidden="true"
          className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
        />
        <div>
          <p className="text-sm font-semibold text-foreground">{heading}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {fields.map((field) => (
              <li key={`${field.id}-${field.label}`}>
                <button
                  type="button"
                  onClick={() => focusMissingField(field)}
                  className="rounded-md border border-destructive/40 bg-background px-2 py-1 text-xs font-medium text-foreground underline-offset-2 hover:underline"
                >
                  {field.label}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Nothing was calculated. The figures already entered are kept.
          </p>
        </div>
      </div>
    </div>
  );
}
