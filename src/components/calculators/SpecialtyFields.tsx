import { useId, type ReactNode } from "react";

/**
 * Marks a field as one the calculation cannot run without.
 *
 * `required` alone would hand validation to the browser and show its own bubble
 * in its own language, and these fields are not inside a submitted form. The
 * data attributes let the page's own audit name the field a reader recognises
 * ("Span length"), the same wording as the visible label.
 */
function requiredAttributes(label: string, required?: boolean) {
  if (!required) return {};
  return {
    "aria-required": "true" as const,
    "data-required": "true" as const,
    "data-field-label": label,
  };
}

export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  min = 0,
  step = "any",
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit?: string;
  hint?: string;
  min?: number;
  step?: number | "any";
  placeholder?: string;
  /** The calculation cannot run without this figure. */
  required?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
        {unit ? (
          <span className="ml-1 font-normal text-muted-foreground">
            ({unit})
          </span>
        ) : null}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-describedby={hintId}
        {...requiredAttributes(label, required)}
        className="w-full rounded-lg border bg-background px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  required,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
  required?: boolean;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-describedby={hintId}
        {...requiredAttributes(label, required)}
        className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output
          htmlFor={id}
          className="text-sm tabular-nums text-muted-foreground"
        >
          {value.toLocaleString()}
          {unit ? ` ${unit}` : ""}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={hintId}
        aria-valuetext={`${value}${unit ? ` ${unit}` : ""}`}
        className="w-full accent-primary"
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FieldGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}
