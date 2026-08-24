/**
 * FRELUX SHARED MEASUREMENT INPUT COMPONENT
 *
 * The shared UI component that all calculators use to collect measurements.
 * Dynamically exposes only the fields relevant to the selected calculator context.
 *
 * Supports:
 * - Single Room input
 * - House / Building (multi-room with space types)
 * - Exterior surfaces
 * - Fence with partitions
 * - Tiled surfaces with tile config
 * - Custom sections
 *
 * Uses the shared measurement model — no duplicate conversion logic.
 */

import { useState, type ReactNode } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, Home, Building2, Fence, Layers, Square } from 'lucide-react';
import {
  type MeasurementProject,
  type MeasurementEntry,
  type SpaceType,
  type ProjectMode,
  type LengthUnit,
  type CalculatorContext,
  type ValidationResult,
  SPACE_TYPE_LABELS,
  DEFAULT_SPACE_TYPES,
  PROJECT_MODE_LABELS,
  lengthUnitLabel,
  lengthUnitShort,
  getAllowedUnits,
} from '@/lib/measurement';

// =========================================================
// Sub-components
// =========================================================

function UnitSelect({
  value,
  onChange,
  context,
}: {
  value: LengthUnit;
  onChange: (unit: LengthUnit) => void;
  context: CalculatorContext;
}) {
  const allowed = getAllowedUnits(context);
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LengthUnit)}
      className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
    >
      {allowed.map((u) => (
        <option key={u} value={u}>{lengthUnitLabel(u)}</option>
      ))}
    </select>
  );
}

function DimensionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type="number"
        value={value || ''}
        min={0}
        step="any"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
        placeholder="0"
      />
    </div>
  );
}

function EntryCard({
  entry,
  context,
  errors,
  onUpdate,
  onRemove,
  index,
}: {
  entry: MeasurementEntry;
  context: CalculatorContext;
  errors?: string[];
  onUpdate: (updates: Partial<MeasurementEntry>) => void;
  onRemove?: () => void;
  index: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isFence = entry.partitionCount !== undefined && entry.partitionCount > 0;
  const isTiling = context === 'tiling';
  const needsHeight = entry.surfaceType === 'wall' || entry.surfaceType === 'exterior' || entry.surfaceType === 'fence';
  const needsWidth = entry.surfaceType === 'floor' || entry.surfaceType === 'ceiling' || entry.surfaceType === 'wall' || isTiling;
  const unitShort = lengthUnitShort(entry.unit);

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Measurement {index + 1}
          {entry.description ? ` — ${entry.description}` : ''}
        </button>
        {onRemove && (
          <button
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove measurement"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {expanded && (
        <>
          {/* Space type (house/building mode) */}
          {entry.spaceType !== undefined && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Space Type</label>
              <select
                value={entry.spaceType}
                onChange={(e) => onUpdate({ spaceType: e.target.value as SpaceType })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              >
                {DEFAULT_SPACE_TYPES.map((st) => (
                  <option key={st} value={st}>{SPACE_TYPE_LABELS[st]}</option>
                ))}
              </select>
            </div>
          )}

          {/* Dimensions grid */}
          <div className="grid grid-cols-2 gap-3">
            <DimensionInput
              label={`Length (${unitShort})`}
              value={entry.length}
              onChange={(v) => onUpdate({ length: v })}
            />
            {needsWidth && (
              <DimensionInput
                label={`Width (${unitShort})`}
                value={entry.width ?? 0}
                onChange={(v) => onUpdate({ width: v })}
              />
            )}
            {needsHeight && (
              <DimensionInput
                label={`Height (${unitShort})`}
                value={entry.height ?? 0}
                onChange={(v) => onUpdate({ height: v })}
              />
            )}
          </div>

          {/* Unit selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Measurement Unit</label>
            <UnitSelect
              value={entry.unit}
              onChange={(unit) => onUpdate({ unit })}
              context={context}
            />
          </div>

          {/* Fence: partition count */}
          {(context === 'fence_screeding' || context === 'fence_painting' || isFence) && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Number of Partitions</label>
              <input
                type="number"
                value={entry.partitionCount ?? 1}
                min={1}
                onChange={(e) => onUpdate({ partitionCount: parseInt(e.target.value) || 1 })}
                className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Quantity (identical units)
            </label>
            <input
              type="number"
              value={entry.quantity}
              min={1}
              onChange={(e) => onUpdate({ quantity: parseInt(e.target.value) || 1 })}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>

          {/* Tile config (tiling context only) */}
          {isTiling && (
            <TileConfigFields
              entry={entry}
              onUpdate={onUpdate}
            />
          )}

          {/* Doors/windows (for wall surfaces) */}
          {(entry.surfaceType === 'wall' || needsHeight) && !isFence && !isTiling && (
            <div className="grid grid-cols-2 gap-3">
              <DimensionInput
                label="Doors"
                value={entry.doors ?? 0}
                onChange={(v) => onUpdate({ doors: Math.floor(v) })}
              />
              <DimensionInput
                label="Windows"
                value={entry.windows ?? 0}
                onChange={(v) => onUpdate({ windows: Math.floor(v) })}
              />
            </div>
          )}

          {/* Waste margin */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Waste Allowance (%)</label>
            <input
              type="number"
              value={entry.wasteMarginPercent ?? 0}
              min={0}
              max={100}
              step="0.5"
              onChange={(e) => onUpdate({ wasteMarginPercent: parseFloat(e.target.value) || 0 })}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="0"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optional)</label>
            <input
              type="text"
              value={entry.description ?? ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              placeholder="e.g., Master bedroom, Front wall, etc."
            />
          </div>

          {/* Validation errors */}
          {errors && errors.length > 0 && (
            <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive space-y-1">
              {errors.map((err, i) => (
                <p key={i}>⚠ {err}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =========================================================
// Tile Configuration Fields
// =========================================================

function TileConfigFields({
  entry,
  onUpdate,
}: {
  entry: MeasurementEntry;
  onUpdate: (updates: Partial<MeasurementEntry>) => void;
}) {
  const tc = entry.tileConfig;
  if (!tc) {
    return (
      <button
        onClick={() => onUpdate({
          tileConfig: {
            tileLength: 600,
            tileWidth: 600,
            tileUnit: 'mm',
            packagingMethod: 'tiles_per_carton' as const,
            tilesPerCarton: 1,
          },
        })}
        className="text-sm text-primary hover:underline"
      >
        + Configure tile size & packaging
      </button>
    );
  }

  return (
    <div className="rounded-md border border-border p-3 space-y-3 bg-muted/30">
      <p className="text-xs font-medium text-muted-foreground">Tile Configuration</p>

      {/* Tile size */}
      <div className="grid grid-cols-3 gap-2">
        <DimensionInput
          label="Tile Length"
          value={tc.tileLength}
          onChange={(v) => onUpdate({
            tileConfig: { ...tc, tileLength: v },
          })}
        />
        <DimensionInput
          label="Tile Width"
          value={tc.tileWidth}
          onChange={(v) => onUpdate({
            tileConfig: { ...tc, tileWidth: v },
          })}
        />
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Unit</label>
          <select
            value={tc.tileUnit}
            onChange={(e) => onUpdate({
              tileConfig: { ...tc, tileUnit: e.target.value as 'mm' | 'cm' | 'm' },
            })}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
          </select>
        </div>
      </div>

      {/* Packaging method */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Packaging Method</label>
        <select
          value={tc.packagingMethod}
          onChange={(e) => onUpdate({
            tileConfig: { ...tc, packagingMethod: e.target.value as 'tiles_per_carton' | 'carton_coverage' },
          })}
          className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground"
        >
          <option value="tiles_per_carton">Tiles per carton</option>
          <option value="carton_coverage">Carton coverage (m²)</option>
        </select>
      </div>

      {/* Packaging value */}
      {tc.packagingMethod === 'tiles_per_carton' ? (
        <DimensionInput
          label="Tiles per carton"
          value={tc.tilesPerCarton ?? 1}
          onChange={(v) => onUpdate({
            tileConfig: { ...tc, tilesPerCarton: v },
          })}
        />
      ) : (
        <DimensionInput
          label="Carton coverage (m²)"
          value={tc.cartonCoverageM2 ?? 0}
          onChange={(v) => onUpdate({
            tileConfig: { ...tc, cartonCoverageM2: v },
          })}
        />
      )}
    </div>
  );
}

// =========================================================
// Project Mode Selector
// =========================================================

const MODE_ICONS: Record<ProjectMode, ReactNode> = {
  single_room: <Home size={18} />,
  house_building: <Building2 size={18} />,
  exterior: <Square size={18} />,
  fence: <Fence size={18} />,
  custom_section: <Layers size={18} />,
};

const MODE_ORDER: ProjectMode[] = ['single_room', 'house_building', 'exterior', 'fence', 'custom_section'];

export function ProjectModeSelector({
  value,
  onChange,
  context,
}: {
  value: ProjectMode;
  onChange: (mode: ProjectMode) => void;
  context: CalculatorContext;
}) {
  // For fence contexts, only show fence mode
  const availableModes: ProjectMode[] =
    context === 'fence_screeding' || context === 'fence_painting'
      ? ['fence']
      : context === 'grafitex'
        ? ['exterior', 'custom_section']
        : MODE_ORDER;

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">What are you calculating?</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {availableModes.map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
              value === mode
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {MODE_ICONS[mode]}
            <span>{PROJECT_MODE_LABELS[mode]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// =========================================================
// Calculation Breakdown Display
// =========================================================

export function CalculationBreakdown({
  steps,
}: {
  steps: { label: string; formula: string; value: string }[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-sm font-medium text-foreground"
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        How this was calculated
      </button>
      {expanded && (
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex flex-col gap-0.5 text-sm">
              <span className="font-medium text-foreground">{step.label}</span>
              {step.formula && (
                <span className="text-xs text-muted-foreground font-mono">{step.formula}</span>
              )}
              <span className="text-sm text-primary font-medium">{step.value}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// =========================================================
// Validation Errors Display
// =========================================================

export function ValidationErrors({ validation }: { validation: ValidationResult }) {
  if (validation.valid || validation.errors.length === 0) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-1">
      {validation.errors.map((err, i) => (
        <p key={i} className="text-sm text-destructive">⚠ {err}</p>
      ))}
    </div>
  );
}

// =========================================================
// Main Export: MeasurementInput
// =========================================================

export interface MeasurementInputProps {
  project: MeasurementProject;
  context: CalculatorContext;
  validation: ValidationResult;
  onProjectModeChange: (mode: ProjectMode) => void;
  onAddMeasurement: (label: string, entry: Partial<MeasurementEntry>) => void;
  onUpdateMeasurement: (groupId: string, updates: Partial<MeasurementEntry>) => void;
  onRemoveMeasurement: (groupId: string) => void;
  children?: ReactNode;
}

export function MeasurementInput({
  project,
  context,
  validation,
  onProjectModeChange,
  onAddMeasurement,
  onUpdateMeasurement,
  onRemoveMeasurement,
  children,
}: MeasurementInputProps) {
  // Use the first section (auto-created by the hook)
  const activeSection = project.sections[0];

  // Default entry based on mode
  function getDefaultEntry(): Partial<MeasurementEntry> {
    const base: Partial<MeasurementEntry> = {
      unit: project.preferredUnit,
      quantity: 1,
    };

    if (project.projectMode === 'fence') {
      return { ...base, surfaceType: 'fence', partitionCount: 1, length: 0, height: 0 };
    }
    if (project.projectMode === 'exterior') {
      return { ...base, surfaceType: 'exterior', length: 0, height: 0 };
    }
    if (project.projectMode === 'house_building') {
      return { ...base, surfaceType: 'wall', spaceType: 'bedroom', length: 0, width: 0, height: 0 };
    }
    if (context === 'tiling') {
      return { ...base, surfaceType: 'floor', length: 0, width: 0 };
    }
    return { ...base, surfaceType: 'wall', length: 0, width: 0, height: 0 };
  }

  const addButtonLabel =
    project.projectMode === 'fence'
      ? 'Add Fence Dimension'
      : project.projectMode === 'house_building'
        ? 'Add Space'
        : project.projectMode === 'exterior'
          ? 'Add Surface'
          : 'Add Measurement';

  return (
    <div className="space-y-4">
      <ProjectModeSelector
        value={project.projectMode}
        onChange={onProjectModeChange}
        context={context}
      />

      <ValidationErrors validation={validation} />

      {children}

      {/* Entries */}
      {activeSection && (
        <div className="space-y-3">
          {activeSection.groups.map((group, idx) => (
            <EntryCard
              key={group.id}
              entry={group.entry}
              context={context}
              index={idx}
              onUpdate={(updates) => onUpdateMeasurement(group.id, updates)}
              onRemove={() => onRemoveMeasurement(group.id)}
              errors={validation.valid ? undefined : validation.errors.filter((e) => e.includes(group.label))}
            />
          ))}

          {activeSection.groups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No measurements added yet. Click below to start.
            </p>
          )}
        </div>
      )}

      {/* Add button */}
      <button
        onClick={() => {
          const count = activeSection?.groups.length ?? 0;
          const label =
            project.projectMode === 'fence'
              ? `Fence Dimension ${count + 1}`
              : project.projectMode === 'house_building'
                ? `Space ${count + 1}`
                : `Measurement ${count + 1}`;
          onAddMeasurement(label, getDefaultEntry());
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary transition-colors"
      >
        <Plus size={18} />
        {addButtonLabel}
      </button>
    </div>
  );
}
