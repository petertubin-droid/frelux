/**
 * Shared window & door openings editor.
 *
 * One component behind every estimator that deducts openings: ICF, EIFS,
 * DEFS (drywall) and screeding. Rows are metres internally and display the
 * active unit system, so a page never re-implements the conversion.
 *
 * Two modes:
 *  - "full"   (ICF/EIFS/DEFS): label, width, height and count are editable.
 *  - "locked" (screeding): the engine measures openings with fixed default
 *    dimensions, so the size cells are read-only reference and only the
 *    count is editable. Results therefore stay identical to the count-based
 *    inputs they replace.
 */

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/shadcn/button";
import { Input } from "@/components/ui/shadcn/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/shadcn/card";

export interface OpeningRow {
  id: string;
  label: string;
  widthM: number;
  heightM: number;
  count: number;
}

export type OpeningsMode = "full" | "locked";

export interface OpeningsEditorProps {
  openings: readonly OpeningRow[];
  onChange: (rows: OpeningRow[]) => void;
  mode?: OpeningsMode;
  unitSystem?: "metric" | "imperial";
  title?: string;
  description?: string;
  addLabel?: string;
  emptyHint?: string;
  /** Hide the label cell (DEFS never had one). */
  showLabels?: boolean;
  /** New-row factory; defaults to Opening N at 1.2 m x 1.2 m. */
  createRow?: (existing: readonly OpeningRow[]) => OpeningRow;
  /** "card" (default) renders its own Card; "bare" embeds inside a host
   *  Card that keeps its own header/footer (EIFS summary). */
  variant?: "card" | "bare";
  /** Set false when the host engine accepts only its fixed opening kinds
   *  (screeding: one door kind, one window kind), so adding a row would be
   *  silently ignored. Defaults to true. */
  allowAdd?: boolean;
}

const FT = 0.3048;

function toDisplay(valueM: number, unitSystem: "metric" | "imperial"): string {
  if (unitSystem === "imperial") return (valueM / FT).toFixed(1);
  return String(valueM);
}

function fromDisplay(raw: string, unitSystem: "metric" | "imperial"): number {
  const v = Number(raw) || 0;
  return unitSystem === "imperial" ? v * FT : v;
}

export function createDefaultOpening(existing: readonly OpeningRow[]): OpeningRow {
  return {
    id: `opening-${Date.now()}-${existing.length}`,
    label: `Opening ${existing.length + 1}`,
    widthM: 1.2,
    heightM: 1.2,
    count: 1,
  };
}

export default function OpeningsEditor({
  openings,
  onChange,
  mode = "full",
  unitSystem = "metric",
  title = "Window & Door Openings",
  description,
  addLabel = "Add Opening",
  emptyHint = "No openings added. Wall is calculated as solid perimeter.",
  showLabels = true,
  createRow = createDefaultOpening,
  variant = "card",
  allowAdd = true,
}: OpeningsEditorProps) {
  const update = (id: string, patch: Partial<OpeningRow>) =>
    onChange(openings.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const invalid = openings.filter(
    (row) => !(row.widthM > 0) || !(row.heightM > 0) || !(row.count >= 1),
  );

  const header = (
    <div className="pb-3 flex flex-row items-center justify-between">
      <div>
        <p className="text-base font-semibold leading-none tracking-tight">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        ) : null}
      </div>
      {allowAdd ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...openings, createRow(openings)])}
          className="h-7 text-xs flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          {addLabel}
        </Button>
      ) : null}
    </div>
  );

  const body = (
    <div className="space-y-3">
        {openings.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            {emptyHint}
          </p>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {openings.map((op) => (
              <div
                key={op.id}
                className="flex items-center gap-2 bg-muted/40 p-2 rounded-md border border-border/40 text-xs"
              >
                {showLabels ? (
                  <Input
                    value={op.label}
                    onChange={(e) => update(op.id, { label: e.target.value })}
                    className="h-7 text-xs flex-1 min-w-[90px]"
                    placeholder="Label"
                    aria-label={`Opening label ${op.label}`}
                  />
                ) : null}
                {mode === "full" ? (
                  <>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">W:</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={toDisplay(op.widthM, unitSystem)}
                        onChange={(e) =>
                          update(op.id, { widthM: fromDisplay(e.target.value, unitSystem) })
                        }
                        className="h-7 w-14 text-xs"
                        aria-label="Opening width"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">H:</span>
                      <Input
                        type="number"
                        step="0.1"
                        value={toDisplay(op.heightM, unitSystem)}
                        onChange={(e) =>
                          update(op.id, { heightM: fromDisplay(e.target.value, unitSystem) })
                        }
                        className="h-7 w-14 text-xs"
                        aria-label="Opening height"
                      />
                    </div>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {toDisplay(op.widthM, unitSystem)} x {toDisplay(op.heightM, unitSystem)}{" "}
                    {unitSystem === "imperial" ? "ft" : "m"} fixed
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Qty:</span>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={op.count}
                    onChange={(e) =>
                      update(op.id, { count: Math.max(1, Math.floor(Number(e.target.value) || 1)) })
                    }
                    className="h-7 w-12 text-xs"
                    aria-label="Opening count"
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(openings.filter((row) => row.id !== op.id))}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${op.label || "opening"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {invalid.length > 0 ? (
          <p className="text-[11px] text-amber-600 dark:text-amber-400">
            {invalid.length} opening{invalid.length > 1 ? "s" : ""} need a width, height and quantity above zero; they are excluded from the deduction until fixed.
          </p>
        ) : null}
    </div>
  );

  if (variant === "bare") {
    return (
      <>
        {header}
        {body}
      </>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">{header}</CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
