/**
 * NumericInput - a number field you can actually clear.
 *
 * A controlled `type="number"` bound straight to a number prop cannot be
 * emptied: deleting the last digit parses to nothing, the setter is called
 * with a fallback (usually 0), and the field paints "0" back at the user. The
 * only way to enter 1200 then is to fight the leading zero.
 *
 * This keeps a draft string while the field is focused, so an empty box stays
 * empty. A valid number commits immediately and the calculation keeps up; an
 * empty or half-typed value leaves the last committed number in place, and on
 * blur the box returns to that number rather than inventing a zero.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/shadcn/input";
import { cn } from "@/lib/cn";

export interface NumericInputProps {
  /** Accepts a string too: some forms hold a draft as text. */
  value: number | string;
  onValueChange: (value: number) => void;
  id?: string;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  /** Render a numeric zero as an empty prompt for unset dimensions. */
  emptyWhenZero?: boolean;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  name?: string;
  onBlur?: () => void;
  /** Lets a form mark the field missing while it is deliberately empty. */
  onBlankChange?: (blank: boolean) => void;
  "aria-label"?: string;
  inputMode?: "decimal" | "numeric" | "text";
  "aria-describedby"?: string;
}

/** Trim the noise a number input emits (trailing ".", "-", exponent). */
function toNumber(value: number | string): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(value);
}

function parseDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (
    trimmed === "" ||
    trimmed === "-" ||
    trimmed === "." ||
    trimmed === "-."
  ) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function NumericInput({
  value,
  onValueChange,
  id,
  min,
  max,
  step = "any",
  placeholder,
  emptyWhenZero = false,
  className,
  disabled,
  inputMode = "decimal",
  required,
  autoFocus,
  name,
  onBlur,
  onBlankChange,
  "aria-label": ariaLabel,
  ...aria
}: NumericInputProps) {
  const displayValue = useCallback(
    (input: number | string) => {
      const number = toNumber(input);
      return emptyWhenZero && number === 0 ? "" : formatNumber(number);
    },
    [emptyWhenZero],
  );
  const [draft, setDraft] = useState(() => displayValue(value));
  const [editing, setEditing] = useState(false);
  const lastCommitted = useRef(toNumber(value));

  // Follow external changes (presets, resets, unit conversions) unless the
  // user is mid-edit, where overwriting the box would fight their keystrokes.
  useEffect(() => {
    const next = displayValue(value);
    const parsedDraft = parseDraft(draft);
    if (parsedDraft !== null && parsedDraft !== toNumber(value)) {
      // The form clamped or rounded what we committed (a negative cost floored
      // at 0, say). Show the stored number instead of leaving a value on screen
      // that the calculation never accepted. A blank or half-typed box is left
      // alone so clearing a field still clears it.
      setDraft(next);
      return;
    }
    if (editing) return;
    lastCommitted.current = toNumber(value);
    setDraft(next);
  }, [value, draft, editing, displayValue]);

  return (
    <Input
      {...aria}
      id={id}
      type="number"
      inputMode={inputMode}
      required={required}
      autoFocus={autoFocus}
      name={name}
      aria-label={ariaLabel}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={cn(className)}
      disabled={disabled}
      value={draft}
      onFocus={() => setEditing(true)}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        onBlankChange?.(raw.trim() === "");
        const parsed = parseDraft(raw);
        if (parsed === null) return; // keep what was already calculated
        // Commit as typed: bounds are the browser's business (min/max) and the
        // calculation's own validation, not something to fight mid-keystroke.
        lastCommitted.current = parsed;
        onValueChange(parsed);
      }}
      onBlur={() => {
        onBlur?.();
        if (draft.trim() !== "") onBlankChange?.(false);
        setEditing(false);
        const parsed = parseDraft(draft);
        // An emptied or invalid box goes back to the last real number instead
        // of silently becoming zero.
        const next = parsed === null ? lastCommitted.current : parsed;
        setDraft(displayValue(next));
        if (next !== toNumber(value)) onValueChange(next);
      }}
    />
  );
}

export default NumericInput;
