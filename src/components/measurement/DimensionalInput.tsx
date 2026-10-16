import type { ExtendedLengthUnit } from "@/lib/measurement/extended-units";
import { parseDimensionalInput } from "@/lib/globalization/dimensional-parser";
const UNITS: Array<{ value: ExtendedLengthUnit; label: string }> = [
  { value: "millimeters", label: "mm" }, { value: "centimeters", label: "cm" }, { value: "meters", label: "m" }, { value: "inches", label: "in" }, { value: "feet", label: "ft" },
];
export function DimensionalInput({ label, value, onValueChange, unit, onUnitChange, minMm = 0, maxMm }: {
  label: string; value: string; onValueChange: (value: string) => void; unit: ExtendedLengthUnit; onUnitChange: (unit: ExtendedLengthUnit) => void; minMm?: number; maxMm?: number;
}) {
  const parsed = value.trim() ? parseDimensionalInput(value, { defaultUnit: unit, minMm, maxMm }) : null;
  return <div className="grid gap-1 text-sm font-medium">
    <label className="grid gap-1">{label}<div className="flex gap-2">
      <input aria-label={label} aria-invalid={parsed !== null && !parsed.ok} className="input-field min-w-0 flex-1" type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => onValueChange(event.target.value)} placeholder="e.g. 2.5, 2500 mm, 10 ft 5 in" />
      <select aria-label={`${label} default unit`} className="input-field w-20" value={unit} onChange={(event) => onUnitChange(event.target.value as ExtendedLengthUnit)}>{UNITS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    </div></label>
    {parsed?.ok && <p className="text-xs text-muted-foreground" aria-live="polite">{parsed.millimeters.toLocaleString(undefined, { maximumFractionDigits: 3 })} mm normalized</p>}
    {parsed && !parsed.ok && <p className="text-xs text-destructive" role="status">{parsed.errors[0]}</p>}
  </div>;
}
