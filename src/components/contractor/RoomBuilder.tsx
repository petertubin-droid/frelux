/**
 * FRELUX RoomBuilder
 * ------------------
 * Room-by-room management for contractor projects. Supports add / edit /
 * delete (with confirm), inline expandable forms, surface assessment with
 * prep recommendations, waste-factor display, and a per-room calculator
 * modal trigger.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Calculator,
  AlertTriangle,
  Info,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import {
  fetchProjectRooms,
  createProjectRoom,
  updateProjectRoom,
  deleteProjectRoom,
  calculateWasteFactor,
  assessSurface,
} from '@/lib/contractor';
import type {
  DbProjectRoom,
  RoomType,
  RoomCalcType,
  SurfaceCondition,
  SurfaceType,
  WallSmoothness,
  Porosity,
  SurfacePrepStep,
} from '@/types/database';
import {
  SkeletonList,
  EmptyState,
  Badge,
  SectionCard,
  ProgressTracker,
} from '@/components/contractor/PremiumUI';

// ============================================================
// Constants & label maps
// ============================================================
const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living_room: 'Living Room',
  bedroom: 'Bedroom',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  balcony: 'Balcony',
  hallway: 'Hallway',
  staircase: 'Staircase',
  office: 'Office',
  dining: 'Dining',
  custom: 'Custom',
};

const ROOM_TYPE_ICONS: Record<RoomType, LucideIcon> = {
  living_room: Calculator,
  bedroom: Calculator,
  kitchen: Calculator,
  bathroom: Calculator,
  balcony: Calculator,
  hallway: Calculator,
  staircase: Calculator,
  office: Calculator,
  dining: Calculator,
  custom: Calculator,
};

const CALC_TYPE_LABELS: Record<RoomCalcType, string> = {
  paint: 'Paint',
  screeding: 'Screeding',
  pop_ceiling: 'POP Ceiling',
  tiling: 'Tiling',
};

const SURFACE_CONDITION_LABELS: Record<SurfaceCondition, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
  damaged: 'Damaged',
};

const SURFACE_TYPE_LABELS: Record<SurfaceType, string> = {
  fresh_plaster: 'Fresh Plaster',
  old_paint: 'Old Paint',
  peeling_paint: 'Peeling Paint',
  moisture: 'Moisture',
  cracks: 'Cracks',
  mould: 'Mould',
  concrete: 'Concrete',
  wood: 'Wood',
  metal: 'Metal',
};

const SMOOTHNESS_LABELS: Record<WallSmoothness, string> = {
  smooth: 'Smooth',
  slightly_rough: 'Slightly Rough',
  rough: 'Rough',
  very_rough: 'Very Rough',
};

const POROSITY_LABELS: Record<Porosity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  very_high: 'Very High',
};

const PRIORITY_BADGE_VARIANT: Record<
  'required' | 'recommended' | 'optional',
  'error' | 'warning' | 'default'
> = {
  required: 'error',
  recommended: 'warning',
  optional: 'default',
};

// ============================================================
// Types
// ============================================================
interface RoomFormState {
  name: string;
  room_type: RoomType;
  calculation_type: RoomCalcType;
  length_m: string;
  width_m: string;
  height_m: string;
  unit: 'meters' | 'feet';
  surface_condition: SurfaceCondition;
  surface_type: SurfaceType;
  wall_smoothness: WallSmoothness;
  porosity: Porosity;
}

const emptyFormState: RoomFormState = {
  name: '',
  room_type: 'living_room',
  calculation_type: 'paint',
  length_m: '',
  width_m: '',
  height_m: '',
  unit: 'meters',
  surface_condition: 'good',
  surface_type: 'fresh_plaster',
  wall_smoothness: 'smooth',
  porosity: 'medium',
};

export interface RoomBuilderProps {
  projectId: string;
  /** Notify parent when rooms change (e.g. for totals recalculation). */
  onRoomsChange?: (rooms: DbProjectRoom[]) => void;
  /** Called when the user clicks "Run Calculation" — parent controls the calculator modal. */
  onRunCalculation?: (room: DbProjectRoom) => void;
  /** Optional render-prop for the calculator modal. If not provided, clicking "Run Calculation" will call onRunCalculation. */
  calculatorModal?: (room: DbProjectRoom | null, onClose: () => void) => ReactNode;
}

// ============================================================
// Select helper
// ============================================================
function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="input-field"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const SURFACE_CONDITION_OPTIONS = Object.entries(SURFACE_CONDITION_LABELS).map(
  ([value, label]) => ({ value: value as SurfaceCondition, label }),
);
const SURFACE_TYPE_OPTIONS = Object.entries(SURFACE_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as SurfaceType, label }),
);
const SMOOTHNESS_OPTIONS = Object.entries(SMOOTHNESS_LABELS).map(
  ([value, label]) => ({ value: value as WallSmoothness, label }),
);
const POROSITY_OPTIONS = Object.entries(POROSITY_LABELS).map(
  ([value, label]) => ({ value: value as Porosity, label }),
);
const ROOM_TYPE_OPTIONS = Object.entries(ROOM_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as RoomType, label }),
);
const CALC_TYPE_OPTIONS = Object.entries(CALC_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as RoomCalcType, label }),
);

// ============================================================
// Room form (used for add and edit)
// ============================================================
function RoomForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  initial: RoomFormState;
  onSubmit: (state: RoomFormState) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<RoomFormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  const wasteFactor = useMemo(
    () =>
      calculateWasteFactor(
        form.surface_condition,
        form.surface_type,
        form.wall_smoothness,
        form.porosity,
      ),
    [form.surface_condition, form.surface_type, form.wall_smoothness, form.porosity],
  );

  const surfacePrep = useMemo(
    () => assessSurface(form.surface_type, form.surface_condition),
    [form.surface_type, form.surface_condition],
  );

  const update = <K extends keyof RoomFormState>(key: K, val: RoomFormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Basic info */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            Room Name
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. Master Bedroom"
            className="input-field"
          />
        </div>
        <Select
          label="Room Type"
          value={form.room_type}
          options={ROOM_TYPE_OPTIONS}
          onChange={(v) => update('room_type', v)}
        />
        <Select
          label="Calculation Type"
          value={form.calculation_type}
          options={CALC_TYPE_OPTIONS}
          onChange={(v) => update('calculation_type', v)}
        />
      </div>

      {/* Dimensions */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            Length ({form.unit === 'meters' ? 'm' : 'ft'})
          </label>
          <input
            type="number"
            step="0.01"
            value={form.length_m}
            onChange={(e) => update('length_m', e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            Width ({form.unit === 'meters' ? 'm' : 'ft'})
          </label>
          <input
            type="number"
            step="0.01"
            value={form.width_m}
            onChange={(e) => update('width_m', e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            Height ({form.unit === 'meters' ? 'm' : 'ft'})
          </label>
          <input
            type="number"
            step="0.01"
            value={form.height_m}
            onChange={(e) => update('height_m', e.target.value)}
            placeholder="0.00"
            className="input-field"
          />
        </div>
        <Select
          label="Unit"
          value={form.unit}
          options={[
            { value: 'meters', label: 'Meters' },
            { value: 'feet', label: 'Feet' },
          ]}
          onChange={(v) => update('unit', v)}
        />
      </div>

      {/* Surface assessment */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-purple">
          Surface Assessment
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Surface Condition"
            value={form.surface_condition}
            options={SURFACE_CONDITION_OPTIONS}
            onChange={(v) => update('surface_condition', v)}
          />
          <Select
            label="Surface Type"
            value={form.surface_type}
            options={SURFACE_TYPE_OPTIONS}
            onChange={(v) => update('surface_type', v)}
          />
          <Select
            label="Wall Smoothness"
            value={form.wall_smoothness}
            options={SMOOTHNESS_OPTIONS}
            onChange={(v) => update('wall_smoothness', v)}
          />
          <Select
            label="Porosity"
            value={form.porosity}
            options={POROSITY_OPTIONS}
            onChange={(v) => update('porosity', v)}
          />
        </div>
      </div>

      {/* Waste factor + prep preview */}
      <div className="rounded-lg border border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-brand-purple" />
          <span className="text-sm font-semibold text-brand-navy dark:text-white">
            Waste Factor: {wasteFactor}%
          </span>
          <Badge
            variant={wasteFactor <= 10 ? 'success' : wasteFactor <= 20 ? 'warning' : 'error'}
          >
            {wasteFactor <= 10 ? 'Low' : wasteFactor <= 20 ? 'Moderate' : 'High'}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
          Auto-calculated from surface condition, surface type, wall smoothness,
          and porosity. Higher waste factors mean more material will be needed
          to complete the job.
        </p>

        {surfacePrep.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Surface Prep Recommendations:
            </p>
            {surfacePrep.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <Badge variant={PRIORITY_BADGE_VARIANT[step.priority]}>
                  {step.priority}
                </Badge>
                <span className="text-xs text-neutral-600 dark:text-neutral-300">
                  {step.action}
                  {step.product && (
                    <span className="text-neutral-400 dark:text-neutral-500"> — {step.product}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!form.name.trim() || submitting}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Room card
// ============================================================
function RoomCard({
  room,
  index,
  total: _total,
  onEdit,
  onDelete,
  onRunCalc,
}: {
  room: DbProjectRoom;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onRunCalc: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const RoomIcon = ROOM_TYPE_ICONS[room.room_type] ?? Calculator;

  const dimensions = [room.length_m, room.width_m, room.height_m]
    .filter((v) => v != null)
    .map((v) => `${v}${room.unit === 'meters' ? 'm' : 'ft'}`)
    .join(' × ');

  const hasCalculation =
    room.calculation_result && Object.keys(room.calculation_result).length > 0;

  const wasteFactor = room.waste_factor_percentage;

  return (
    <div className="card card-hover overflow-hidden transition-all duration-300 animate-fade-in-up">
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        {/* Drag handle (visual only) */}
        <div className="flex flex-col items-center gap-0.5 pt-1">
          <GripVertical className="h-5 w-5 cursor-grab text-neutral-300" />
          <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500">
            {index + 1}
          </span>
        </div>

        {/* Room icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-purple/10">
          <RoomIcon className="h-5 w-5 text-brand-purple" />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-bold text-brand-navy dark:text-white">
              {room.name}
            </h4>
            <Badge variant="purple">{ROOM_TYPE_LABELS[room.room_type]}</Badge>
            <Badge variant="info">{CALC_TYPE_LABELS[room.calculation_type]}</Badge>
            {hasCalculation && (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" /> Calculated
              </Badge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            {dimensions && <span>{dimensions}</span>}
            <span>Waste: {wasteFactor}%</span>
            {room.material_cost > 0 && (
              <span className="font-semibold text-brand-navy dark:text-white">
                Material: ₦{room.material_cost.toLocaleString()}
              </span>
            )}
            {room.labour_cost > 0 && (
              <span className="font-semibold text-brand-navy dark:text-white">
                Labour: ₦{room.labour_cost.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="rounded-lg p-2 text-neutral-400 dark:text-neutral-500 transition-all duration-300 hover:bg-neutral-100 hover:text-brand-navy dark:text-white"
            aria-label={expanded ? 'Collapse room details' : 'Expand room details'}
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg p-2 text-neutral-400 dark:text-neutral-500 transition-all duration-300 hover:bg-brand-purple/10 hover:text-brand-purple"
            aria-label="Edit room"
          >
            <Edit3 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-lg p-2 text-neutral-400 dark:text-neutral-500 transition-all duration-300 hover:bg-red-500/10 hover:text-red-600"
            aria-label="Delete room"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="animate-slide-down border-t border-neutral-200 dark:border-white/5 bg-neutral-50 dark:bg-white/5">
          {/* Surface assessment */}
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-brand-purple" />
              <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-purple">
                Surface Assessment
              </h5>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                  Condition
                </p>
                <p className="text-sm font-medium text-brand-navy dark:text-white">
                  {SURFACE_CONDITION_LABELS[room.surface_condition]}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                  Surface Type
                </p>
                <p className="text-sm font-medium text-brand-navy dark:text-white">
                  {SURFACE_TYPE_LABELS[room.surface_type]}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                  Smoothness
                </p>
                <p className="text-sm font-medium text-brand-navy dark:text-white">
                  {SMOOTHNESS_LABELS[room.wall_smoothness]}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                  Porosity
                </p>
                <p className="text-sm font-medium text-brand-navy dark:text-white">
                  {POROSITY_LABELS[room.porosity]}
                </p>
              </div>
            </div>

            {/* Waste factor explanation */}
            <div className="mt-4 rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-brand-navy dark:text-white">
                  Waste Factor: {wasteFactor}%
                </span>
                <Badge
                  variant={
                    wasteFactor <= 10
                      ? 'success'
                      : wasteFactor <= 20
                        ? 'warning'
                        : 'error'
                  }
                >
                  {wasteFactor <= 10
                    ? 'Low Waste'
                    : wasteFactor <= 20
                      ? 'Moderate Waste'
                      : 'High Waste'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
                Calculated from the surface assessment above. Surface condition,
                type, smoothness, and porosity each contribute, rougher or more
                porous surfaces with damage require extra material to account for
                absorption, spillage, and touch-ups.
              </p>
            </div>

            {/* Surface prep recommendations */}
            {room.surface_prep.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-accent-orange" />
                  <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-purple">
                    Surface Prep Recommendations
                  </h5>
                </div>
                <ul className="mt-2 space-y-2">
                  {room.surface_prep.map((step: SurfacePrepStep, i: number) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid p-2.5"
                    >
                      <Badge variant={PRIORITY_BADGE_VARIANT[step.priority]}>
                        {step.priority}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-brand-navy dark:text-white">
                          {step.action}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{step.reason}</p>
                        {step.product && (
                          <p className="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                            <span className="font-semibold">Product:</span>{' '}
                            {step.product}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Calculation result summary */}
            {hasCalculation && (
              <div className="mt-4">
                <h5 className="text-xs font-semibold uppercase tracking-wider text-brand-purple">
                  Calculation Result
                </h5>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid p-3">
                    <p className="text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                      Material Cost
                    </p>
                    <p className="text-lg font-bold text-brand-navy dark:text-white">
                      ₦{room.material_cost.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid p-3">
                    <p className="text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                      Labour Cost
                    </p>
                    <p className="text-lg font-bold text-brand-navy dark:text-white">
                      ₦{room.labour_cost.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 dark:border-white/5 bg-white dark:bg-brand-navy-mid p-3">
                    <p className="text-[11px] font-semibold uppercase text-neutral-400 dark:text-neutral-500">
                      Room Total
                    </p>
                    <p className="text-lg font-bold text-brand-purple">
                      ₦{room.room_total_cost.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Run calculation button */}
            <div className="mt-4">
              <button
                type="button"
                onClick={onRunCalc}
                className="btn-primary w-full sm:w-auto"
              >
                <Calculator className="h-4 w-4" />
                {hasCalculation ? 'Re-run Calculation' : 'Run Calculation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="animate-slide-down border-t border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">
                Delete "{room.name}"?
              </p>
              <p className="text-xs text-red-600">
                This action cannot be undone. All calculation data for this
                room will be permanently removed.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-red-700 active:scale-95"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Calculator modal wrapper
// ============================================================
function CalculatorModal({
  room,
  onClose,
  children,
}: {
  room: DbProjectRoom | null;
  onClose: () => void;
  children?: ReactNode;
}) {
  if (!room) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Calculator for ${room.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-all duration-300"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl animate-fade-in-up">
        <div className="card max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-neutral-200 dark:border-white/5 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-purple/10">
                <Calculator className="h-4.5 w-4.5 text-brand-purple" />
              </div>
              <h3 className="text-base font-bold text-brand-navy dark:text-white">
                Calculator, {room.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-neutral-400 dark:text-neutral-500 transition-all duration-300 hover:bg-neutral-100 hover:text-brand-navy dark:text-white"
              aria-label="Close calculator"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main component
// ============================================================
export function RoomBuilder({
  projectId,
  onRoomsChange,
  onRunCalculation,
  calculatorModal,
}: RoomBuilderProps) {
  const [rooms, setRooms] = useState<DbProjectRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [calcRoomId, setCalcRoomId] = useState<string | null>(null);

  // -- Load rooms
  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProjectRooms(projectId);
      setRooms(data);
      onRoomsChange?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [projectId, onRoomsChange]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // -- Add room
  const handleAdd = async (form: RoomFormState) => {
    try {
      const newRoom = await createProjectRoom({
        project_id: projectId,
        name: form.name.trim(),
        room_type: form.room_type,
        calculation_type: form.calculation_type,
        unit: form.unit,
        length_m: form.length_m ? parseFloat(form.length_m) : undefined,
        width_m: form.width_m ? parseFloat(form.width_m) : undefined,
        height_m: form.height_m ? parseFloat(form.height_m) : undefined,
        surface_condition: form.surface_condition,
        surface_type: form.surface_type,
        wall_smoothness: form.wall_smoothness,
        porosity: form.porosity,
      });
      setRooms((prev) => [...prev, newRoom]);
      onRoomsChange?.([...rooms, newRoom]);
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add room');
    }
  };

  // -- Edit room
  const handleEdit = async (id: string, form: RoomFormState) => {
    try {
      const updated = await updateProjectRoom(id, {
        name: form.name.trim(),
        room_type: form.room_type,
        calculation_type: form.calculation_type,
        unit: form.unit,
        length_m: form.length_m ? parseFloat(form.length_m) : null,
        width_m: form.width_m ? parseFloat(form.width_m) : null,
        height_m: form.height_m ? parseFloat(form.height_m) : null,
        surface_condition: form.surface_condition,
        surface_type: form.surface_type,
        wall_smoothness: form.wall_smoothness,
        porosity: form.porosity,
      });
      setRooms((prev) => {
        const next = prev.map((r) => (r.id === id ? updated : r));
        onRoomsChange?.(next);
        return next;
      });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update room');
    }
  };

  // -- Delete room
  const handleDelete = async (id: string) => {
    try {
      await deleteProjectRoom(id);
      setRooms((prev) => {
        const next = prev.filter((r) => r.id !== id);
        onRoomsChange?.(next);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  // -- Run calculation
  const handleRunCalc = (room: DbProjectRoom) => {
    if (calculatorModal) {
      setCalcRoomId(room.id);
    } else {
      onRunCalculation?.(room);
    }
  };

  const calcRoom = useMemo(
    () => rooms.find((r) => r.id === calcRoomId) ?? null,
    [rooms, calcRoomId],
  );

  const editingRoom = useMemo(
    () => rooms.find((r) => r.id === editingId) ?? null,
    [rooms, editingId],
  );

  const editingInitial: RoomFormState = useMemo(() => {
    if (!editingRoom) return emptyFormState;
    return {
      name: editingRoom.name,
      room_type: editingRoom.room_type,
      calculation_type: editingRoom.calculation_type,
      length_m: editingRoom.length_m?.toString() ?? '',
      width_m: editingRoom.width_m?.toString() ?? '',
      height_m: editingRoom.height_m?.toString() ?? '',
      unit: editingRoom.unit,
      surface_condition: editingRoom.surface_condition,
      surface_type: editingRoom.surface_type,
      wall_smoothness: editingRoom.wall_smoothness,
      porosity: editingRoom.porosity,
    };
  }, [editingRoom]);

  // Overall progress (how many rooms have calculations)
  const calculatedCount = rooms.filter(
    (r) =>
      r.calculation_result && Object.keys(r.calculation_result).length > 0,
  ).length;
  const progress =
    rooms.length === 0 ? 0 : Math.round((calculatedCount / rooms.length) * 100);

  // -- Render
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-brand-navy dark:text-white">Rooms</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''} in this project
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm((p) => !p)}
          className="btn-primary"
          aria-expanded={showAddForm}
        >
          <Plus className="h-4 w-4" />
          Add Room
        </button>
      </div>

      {/* Progress */}
      {rooms.length > 0 && (
        <div className="card p-4">
          <ProgressTracker
            percentage={progress}
            label="Rooms Calculated"
          />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
          <p className="flex-1 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-xs font-semibold text-red-600 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <SectionCard title="Add New Room" icon={Plus}>
          <RoomForm
            initial={emptyFormState}
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
            submitLabel="Add Room"
          />
        </SectionCard>
      )}

      {/* Rooms list */}
      {loading ? (
        <SkeletonList count={4} />
      ) : rooms.length === 0 && !showAddForm ? (
        <div className="card">
          <EmptyState
            icon={Plus}
            title="No Rooms Yet"
            description="Add your first room to start building the estimate. Each room can have its own surface assessment and calculation."
            actionLabel="Add Room"
            onAction={() => setShowAddForm(true)}
            accent="purple"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room, i) => (
            <div key={room.id}>
              {/* Edit form replaces the card when editing */}
              {editingId === room.id ? (
                <SectionCard
                  title={`Edit: ${room.name}`}
                  icon={Edit3}
                  action={
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-lg p-1.5 text-neutral-400 dark:text-neutral-500 transition-all duration-300 hover:bg-neutral-100 hover:text-brand-navy dark:text-white"
                      aria-label="Close edit form"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  }
                >
                  <RoomForm
                    initial={editingInitial}
                    onSubmit={(form) => handleEdit(room.id, form)}
                    onCancel={() => setEditingId(null)}
                    submitLabel="Save Changes"
                  />
                </SectionCard>
              ) : (
                <RoomCard
                  room={room}
                  index={i}
                  total={rooms.length}
                  onEdit={() => setEditingId(room.id)}
                  onDelete={() => handleDelete(room.id)}
                  onRunCalc={() => handleRunCalc(room)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Calculator modal */}
      {calculatorModal && (
        <CalculatorModal
          room={calcRoom}
          onClose={() => setCalcRoomId(null)}
        >
          {calcRoom ? calculatorModal(calcRoom, () => setCalcRoomId(null)) : null}
        </CalculatorModal>
      )}
    </div>
  );
}

export default RoomBuilder;
