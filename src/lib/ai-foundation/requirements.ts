// =========================================================
// FRELUX AI FOUNDATION — Requirements Resolution
//
// "It must not ask unnecessary questions when reliable
//  information already exists."
//
// For each task, required information is resolved in a strict
// priority order — the FIRST source that yields a usable value wins:
//
//   1. Facts the user stated in this request (user_input)
//   2. Values the user confirmed (user_confirmed / corrected)
//   3. Existing project data / saved calculations (project_data,
//      saved_calculation, location_data, market_data)
//   4. Existing FRELUX smart defaults — surfaced as ASSUMPTIONS,
//      never silently hidden
//
// Only when no source yields a value does the field become
// "missing" and the Copilot asks the user.
// =========================================================

import type { AiFact, CopilotTaskType, FreluxContext, RequirementFieldLite } from './types';
import { canUseInCalculation, createFact } from './trust';
import { defaultBuildToRoofInput, getEngineDescriptor } from './engines-registry';

/** Priority order — lower number wins. */
const ORIGIN_PRIORITY: Record<AiFact['origin'], number> = {
  user_input: 0,
  user_confirmed: 1,
  project_data: 2,
  saved_calculation: 2,
  location_data: 3,
  market_data: 3,
  document_extraction: 4,
  image_extraction: 4,
  ai_interpretation: 5,
  smart_default: 9,
  engine_calculation: 2,
  unknown: 10,
};

/** Required fields per task. Keys match the registered engine input. */
export interface RequirementField extends RequirementFieldLite {
  /** Assumption text shown to the user when a smart default is used. */
  assumption?: string;
}

export const TASK_REQUIREMENTS: Record<Exclude<CopilotTaskType, 'unsupported'>, {
  engineId: string;
  fields: RequirementField[];
}> = {
  building_estimate: {
    engineId: 'build_to_roof',
    fields: [
      { key: 'building_length', label: 'Building length', unit: 'm' },
      { key: 'building_width', label: 'Building width', unit: 'm' },
      { key: 'number_of_floors', label: 'Number of floors', unit: 'count' },
      { key: 'building_type', label: 'Building type' },
      { key: 'location', label: 'Location (town/city)' },
    ],
  },
  roof_estimate: {
    engineId: 'roof_geometry',
    fields: [
      { key: 'building_length', label: 'Building length', unit: 'm' },
      { key: 'building_width', label: 'Building width', unit: 'm' },
      { key: 'roof_type', label: 'Roof type' },
      { key: 'roof_pitch_degrees', label: 'Roof pitch', unit: 'degrees' },
      { key: 'roof_overhang', label: 'Roof overhang', unit: 'm' },
    ],
  },
  painting_estimate: {
    engineId: 'painting_wall_area',
    fields: [
      { key: 'length', label: 'Room length', unit: 'm' },
      { key: 'width', label: 'Room width', unit: 'm' },
      { key: 'height', label: 'Wall height', unit: 'm' },
    ],
  },
  tyrolene_estimate: {
    engineId: 'tyrolene_partition_area',
    fields: [
      { key: 'width', label: 'Partition width', unit: 'm' },
      { key: 'height', label: 'Partition height', unit: 'm' },
    ],
  },
  finish_compare: { engineId: 'finish_compare', fields: [] }, // config-backed, future phase
  scenario_compare: { engineId: 'build_to_roof', fields: [] }, // resolved per scenario
  project_question: { engineId: '', fields: [] }, // answered from context, no engine
};

export interface RequirementResolution {
  /** Values keyed by engine input field — only from usable facts. */
  resolved: Record<string, AiFact>;
  /** Fields with NO usable value from any source — the only things to ask. */
  missing: RequirementField[];
  /** Smart-default assumptions in effect, shown to the user. */
  assumptions: AiFact[];
  /** Facts awaiting explicit user confirmation before engine use. */
  needsConfirmation: AiFact[];
  engineId: string;
}

function usableFact(fact: AiFact | undefined): AiFact | undefined {
  return fact && canUseInCalculation(fact) ? fact : undefined;
}

/**
 * Resolve the required fields for a task from (in order):
 * user-stated facts → context (project/location/calculations) →
 * smart defaults (assumptions).
 */
export function resolveRequirements(
  taskType: Exclude<CopilotTaskType, 'unsupported'>,
  context: FreluxContext,
  facts: AiFact[],
): RequirementResolution {
  const spec = TASK_REQUIREMENTS[taskType];
  const byKey = new Map<string, AiFact>();
  for (const fact of facts) {
    const usable = usableFact(fact);
    if (!usable) continue;
    const existing = byKey.get(fact.key);
    if (!existing || ORIGIN_PRIORITY[usable.origin] < ORIGIN_PRIORITY[existing.origin]) {
      byKey.set(fact.key, usable);
    }
  }

  // Context-provided values (location intelligence, project data)
  if (context.location?.region || context.location?.city) {
    const locText = [context.location.city, context.location.region, context.location.country]
      .filter(Boolean)
      .join(', ');
    if (locText) {
      byKey.set(
        'location',
        createFact({
          key: 'location',
          label: 'Location',
          value: context.location.city || context.location.region || locText,
          origin: 'location_data',
          source: 'FRELUX-location-intelligence',
          confidence: 1,
          evidence: 'From your project location (Location Intelligence)',
        }),
      );
    }
  }

  const resolved: Record<string, AiFact> = {};
  const missing: RequirementField[] = [];
  const assumptions: AiFact[] = [];
  const needsConfirmation: AiFact[] = [];

  const defaults = defaultBuildToRoofInput() as Record<string, unknown>;

  for (const field of spec.fields) {
    const fact = usableFact(byKey.get(field.key));
    if (fact) {
      resolved[field.key] = fact;
      if (fact.trust === 'needs_confirmation') needsConfirmation.push(fact);
      continue;
    }
    // Smart default → assumption, clearly labelled, never hidden.
    const defaultValue = defaults[field.key];
    if (defaultValue !== undefined && spec.engineId === 'build_to_roof') {
      const assumptionFact = createFact({
        key: field.key,
        label: field.label,
        value: defaultValue as AiFact['value'],
        unit: field.unit,
        origin: 'smart_default',
        source: 'FRELUX-smart-defaults',
        confidence: 0.6,
        evidence: `FRELUX standard assumption (editable)`,
      });
      resolved[field.key] = assumptionFact;
      assumptions.push(assumptionFact);
      continue;
    }
    // Roof/painting/tyrolene tasks have no blanket defaults — ask.
    missing.push(field);
  }

  return { resolved, missing, assumptions, needsConfirmation, engineId: spec.engineId };
}

/** Convert resolved facts into the engine input object (deterministic). */
export function buildEngineInput(resolution: RequirementResolution, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  for (const [key, fact] of Object.entries(resolution.resolved)) {
    input[key] = fact.value;
  }
  return { ...input, ...extra };
}

/** Does the engine descriptor for this task actually exist? */
export function engineExistsForTask(taskType: Exclude<CopilotTaskType, 'unsupported'>): boolean {
  const engineId = TASK_REQUIREMENTS[taskType].engineId;
  if (!engineId) return taskType === 'project_question'; // no engine needed
  return getEngineDescriptor(engineId) !== null;
}
