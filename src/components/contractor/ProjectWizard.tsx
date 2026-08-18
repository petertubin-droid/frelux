/**
 * Smart Project Wizard — multi-step project setup for the Contractor experience.
 *
 * Guides the user through 4 steps:
 *  1. Project Type      (painting | screeding | pop_ceiling | tiling | multi_trade)
 *  2. Project Details   (building_type, surface_location, construction_type, finish_quality)
 *  3. Budget & Materials (budget_level, material_quality)
 *  4. Project Name & Client Info (name, client_name, client_phone, client_email,
 *     client_address, description, notes)
 *
 * On completion it calls `createContractorProject(input)` and navigates to the
 * project detail page. A live recommendation from `getWizardRecommendation` is
 * shown once the first two steps are filled.
 */
import { useState, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PaintRoller,
  Paintbrush2,
  Layers,
  Grid3x3,
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  MapPin,
  Hammer,

  Crown,
  Award,
  DollarSign,
  User,
  Phone,
  Mail,
  FileText,
} from 'lucide-react';
import {
  createContractorProject,
  getWizardRecommendation,
  type CreateProjectInput,
} from '@/lib/contractor';
import type {
  BuildingType,
  SurfaceLocation,
  ConstructionType,
  ProjectType,
  FinishQuality,
} from '@/types/database';
import { classNames } from '@/lib/utils';

// NOTE: lucide-react@0.344.0 does not export `Trowel`, so `Paintbrush2` is used
// as the icon for the screeding project type instead.

// ============================================================
// Types
// ============================================================

/** The full wizard state, mirrors CreateProjectInput plus transient UI fields. */
interface WizardState {
  project_type: ProjectType | '';
  building_type: BuildingType | '';
  surface_location: SurfaceLocation | '';
  construction_type: ConstructionType | '';
  finish_quality: FinishQuality | '';
  budget_level: FinishQuality | '';
  material_quality: FinishQuality | '';
  name: string;
  description: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  client_address: string;
  notes: string;
}

const STEPS = ['Project Type', 'Project Details', 'Budget & Materials', 'Client Info'] as const;
const TOTAL_STEPS = STEPS.length;

const initialState: WizardState = {
  project_type: '',
  building_type: '',
  surface_location: '',
  construction_type: '',
  finish_quality: '',
  budget_level: '',
  material_quality: '',
  name: '',
  description: '',
  client_name: '',
  client_phone: '',
  client_email: '',
  client_address: '',
  notes: '',
};

// ============================================================
// Option metadata
// ============================================================

const PROJECT_TYPES: Array<{
  value: ProjectType;
  label: string;
  description: string;
  icon: typeof PaintRoller;
}> = [
  { value: 'painting', label: 'Painting', description: 'Interior or exterior painting', icon: PaintRoller },
  { value: 'screeding', label: 'Screeding', description: 'Wall screeding & surface finishing', icon: Paintbrush2 },
  { value: 'pop_ceiling', label: 'POP Ceiling', description: 'POP ceiling installation & finishing', icon: Layers },
  { value: 'tiling', label: 'Tiling', description: 'Floor & wall tile installation', icon: Grid3x3 },
  { value: 'multi_trade', label: 'Multi-Trade', description: 'Combined renovation project', icon: Building2 },
];

const BUILDING_TYPES: Array<{ value: BuildingType; label: string }> = [
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'renovation', label: 'Renovation' },
];

const SURFACE_LOCATIONS: Array<{ value: SurfaceLocation; label: string }> = [
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'both', label: 'Both' },
];

const CONSTRUCTION_TYPES: Array<{ value: ConstructionType; label: string }> = [
  { value: 'new_construction', label: 'New Construction' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'touch_up', label: 'Touch-up' },
];

const QUALITY_OPTIONS: Array<{
  value: FinishQuality;
  label: string;
  icon: typeof DollarSign;
}> = [
  { value: 'economy', label: 'Economy', icon: DollarSign },
  { value: 'standard', label: 'Standard', icon: Hammer },
  { value: 'premium', label: 'Premium', icon: Award },
  { value: 'luxury', label: 'Luxury', icon: Crown },
];

// ============================================================
// WizardStep — reusable step layout (exported helper)
// ============================================================

export interface WizardStepProps {
  /** Zero-based index of the current step. */
  step: number;
  /** Human-readable title for this step. */
  title: string;
  /** Optional short subtitle / helper text. */
  subtitle?: string;
  /** Step body. */
  children: ReactNode;
}

/**
 * Reusable layout wrapper for a single wizard step. Renders the step indicator
 * (dots + connecting lines), title, and the body content.
 */
export function WizardStep({ step, title, subtitle, children }: WizardStepProps) {
  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center justify-center">
        <div className="flex items-center">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center">
              <div
                className={classNames(
                  'flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors',
                  idx < step && 'border-purple-700 bg-purple-700 text-white',
                  idx === step && 'border-purple-700 bg-purple-50 text-purple-700',
                  idx > step && 'border-gray-300 bg-white text-gray-400',
                )}
                aria-current={idx === step ? 'step' : undefined}
              >
                {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              {idx < TOTAL_STEPS - 1 && (
                <div
                  className={classNames(
                    'h-0.5 w-10 transition-colors sm:w-16',
                    idx < step ? 'bg-purple-700' : 'bg-gray-300',
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <h2 className="text-center text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2>
      {subtitle && <p className="mt-1 text-center text-sm text-gray-500">{subtitle}</p>}

      <div className="mt-6">{children}</div>
    </div>
  );
}

// ============================================================
// Reusable option button
// ============================================================

interface OptionButtonProps<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: typeof PaintRoller;
  selected: boolean;
  onSelect: (value: T) => void;
}

function OptionButton<T extends string>({
  value,
  label,
  description,
  icon: Icon,
  selected,
  onSelect,
}: OptionButtonProps<T>) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={classNames(
        'group flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all duration-200',
        selected
          ? 'border-2 border-purple-700 bg-purple-50 shadow-sm'
          : 'border border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/50',
      )}
    >
      {Icon && (
        <span
          className={classNames(
            'mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
            selected ? 'bg-purple-700 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-purple-100',
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <span className="flex-1">
        <span className="block font-semibold text-gray-900">{label}</span>
        {description && <span className="mt-0.5 block text-sm text-gray-500">{description}</span>}
      </span>
      {selected && (
        <Check className="mt-1 h-5 w-5 flex-shrink-0 text-purple-700" />
      )}
    </button>
  );
}

// ============================================================
// Main component
// ============================================================

export default function ProjectWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- helpers ----
  const update = <K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  /** Recommendation is available once project type + details are chosen. */
  const recommendation = useMemo(() => {
    if (
      !state.project_type ||
      !state.surface_location ||
      !state.construction_type ||
      !state.finish_quality
    ) {
      return null;
    }
    return getWizardRecommendation(
      state.project_type,
      state.surface_location,
      state.construction_type,
      state.finish_quality,
    );
  }, [state.project_type, state.surface_location, state.construction_type, state.finish_quality]);

  // ---- validation ----
  const isStepValid = (currentStep: number): boolean => {
    switch (currentStep) {
      case 0:
        return Boolean(state.project_type);
      case 1:
        return (
          Boolean(state.building_type) &&
          Boolean(state.surface_location) &&
          Boolean(state.construction_type) &&
          Boolean(state.finish_quality)
        );
      case 2:
        return Boolean(state.budget_level) && Boolean(state.material_quality);
      case 3:
        return state.name.trim().length > 0;
      default:
        return false;
    }
  };

  const canAdvance = isStepValid(step);

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1 && canAdvance) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!isStepValid(3)) return;
    setSubmitting(true);
    setError(null);
    try {
      const input: CreateProjectInput = {
        name: state.name.trim(),
        description: state.description.trim() || undefined,
        project_type: state.project_type as ProjectType,
        building_type: state.building_type || 'residential',
        surface_location: state.surface_location || 'interior',
        construction_type: state.construction_type || 'renovation',
        finish_quality: state.finish_quality || 'standard',
        budget_level: state.budget_level || 'standard',
        material_quality: state.material_quality || 'standard',
        client_name: state.client_name.trim() || undefined,
        client_phone: state.client_phone.trim() || undefined,
        client_email: state.client_email.trim() || undefined,
        client_address: state.client_address.trim() || undefined,
        notes: state.notes.trim() || undefined,
      };
      const project = await createContractorProject(input);
      navigate(`/contractor/projects/${project.id}`);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Failed to create project. Please try again.');
    }
  };

  // ============================================================
  // Step renderers
  // ============================================================

  const renderProjectTypeStep = () => (
    <WizardStep step={0} title="Select Project Type" subtitle="What kind of project are you estimating?">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PROJECT_TYPES.map((opt) => (
          <OptionButton
            key={opt.value}
            value={opt.value}
            label={opt.label}
            description={opt.description}
            icon={opt.icon}
            selected={state.project_type === opt.value}
            onSelect={(v) => update('project_type', v)}
          />
        ))}
      </div>
    </WizardStep>
  );

  const renderDetailsStep = () => (
    <WizardStep step={1} title="Project Details" subtitle="Tell us about the building and surface">
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">Building Type</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BUILDING_TYPES.map((opt) => (
              <OptionButton
                key={opt.value}
                value={opt.value}
                label={opt.label}
                selected={state.building_type === opt.value}
                onSelect={(v) => update('building_type', v)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">Surface Location</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SURFACE_LOCATIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                value={opt.value}
                label={opt.label}
                selected={state.surface_location === opt.value}
                onSelect={(v) => update('surface_location', v)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">Construction Type</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CONSTRUCTION_TYPES.map((opt) => (
              <OptionButton
                key={opt.value}
                value={opt.value}
                label={opt.label}
                selected={state.construction_type === opt.value}
                onSelect={(v) => update('construction_type', v)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">Finish Quality</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUALITY_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                value={opt.value}
                label={opt.label}
                icon={opt.icon}
                selected={state.finish_quality === opt.value}
                onSelect={(v) => update('finish_quality', v)}
              />
            ))}
          </div>
        </fieldset>

        {recommendation && (
          <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
            <div className="flex items-center gap-2 text-purple-700">
              <Award className="h-4 w-4" />
              <span className="text-sm font-semibold">Smart Recommendation</span>
            </div>
            <p className="mt-1 text-sm text-gray-600">{recommendation.reason}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {recommendation.workflow.map((phase, idx) => (
                <span
                  key={phase}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-purple-700 ring-1 ring-purple-200"
                >
                  {idx + 1}. {phase}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </WizardStep>
  );

  const renderBudgetStep = () => (
    <WizardStep step={2} title="Budget & Materials" subtitle="Choose your budget and material quality levels">
      <div className="space-y-6">
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">Budget Level</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUALITY_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                value={opt.value}
                label={opt.label}
                icon={opt.icon}
                selected={state.budget_level === opt.value}
                onSelect={(v) => update('budget_level', v)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-gray-700">Material Quality</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QUALITY_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                value={opt.value}
                label={opt.label}
                icon={opt.icon}
                selected={state.material_quality === opt.value}
                onSelect={(v) => update('material_quality', v)}
              />
            ))}
          </div>
        </fieldset>
      </div>
    </WizardStep>
  );

  const renderClientInfoStep = () => (
    <WizardStep step={3} title="Project Name & Client Info" subtitle="Final details to create your project">
      <div className="space-y-4">
        {/* Project name */}
        <div>
          <label htmlFor="pw-name" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Project Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FileText className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              id="pw-name"
              type="text"
              value={state.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Lekki Phase 1 Duplex Painting"
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 transition-colors focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="pw-desc" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Description
          </label>
          <textarea
            id="pw-desc"
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            rows={2}
            placeholder="Short project description (optional)"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Client name */}
          <div>
            <label htmlFor="pw-client-name" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Client Name
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="pw-client-name"
                type="text"
                value={state.client_name}
                onChange={(e) => update('client_name', e.target.value)}
                placeholder="Client full name"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 transition-colors focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          {/* Client phone */}
          <div>
            <label htmlFor="pw-phone" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Client Phone
            </label>
            <div className="relative">
              <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="pw-phone"
                type="tel"
                value={state.client_phone}
                onChange={(e) => update('client_phone', e.target.value)}
                placeholder="+234 800 000 0000"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 transition-colors focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          {/* Client email */}
          <div>
            <label htmlFor="pw-email" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Client Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="pw-email"
                type="email"
                value={state.client_email}
                onChange={(e) => update('client_email', e.target.value)}
                placeholder="client@example.com"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 transition-colors focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>

          {/* Client address */}
          <div>
            <label htmlFor="pw-address" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Client Address
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                id="pw-address"
                type="text"
                value={state.client_address}
                onChange={(e) => update('client_address', e.target.value)}
                placeholder="Project site address"
                className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 transition-colors focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="pw-notes" className="mb-1.5 block text-sm font-semibold text-gray-700">
            Notes
          </label>
          <textarea
            id="pw-notes"
            value={state.notes}
            onChange={(e) => update('notes', e.target.value)}
            rows={3}
            placeholder="Any additional notes or special instructions (optional)"
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-purple-700 focus:outline-none focus:ring-1 focus:ring-purple-700"
          />
        </div>
      </div>
    </WizardStep>
  );

  const stepContent = [renderProjectTypeStep, renderDetailsStep, renderBudgetStep, renderClientInfoStep][step]();

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-gray-100 sm:p-8">
        {stepContent}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || submitting}
            className={classNames(
              'inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
              step === 0 || submitting
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300',
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {step < TOTAL_STEPS - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canAdvance}
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
                canAdvance
                  ? 'bg-purple-700 text-white hover:bg-purple-800'
                  : 'cursor-not-allowed bg-purple-300 text-white',
              )}
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !state.name.trim()}
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors',
                submitting || !state.name.trim()
                  ? 'cursor-not-allowed bg-green-400 text-white'
                  : 'bg-green-600 text-white hover:bg-green-700',
              )}
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Create Project
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
