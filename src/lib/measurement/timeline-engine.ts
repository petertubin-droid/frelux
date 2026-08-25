/**
 * FRELUX TIMELINE / SCHEDULE ESTIMATION ENGINE
 *
 * Feature 21: Construction Timeline Estimation
 *
 * Estimates construction timelines with phases, durations,
 * dependencies, and resource requirements.
 *
 * Architecture:
 *   PROJECT SCOPE (area, volume, trades)
 *     ↓
 *   PHASE DEFINITION (configurable templates)
 *     ↓
 *   DURATION ESTIMATION (scope ÷ productivity rate)
 *     ↓
 *   DEPENDENCY RESOLUTION (critical path)
 *     ↓
 *   TIMELINE (start/end dates, milestones)
 *
 * All productivity rates are configurable — not hardcoded.
 * The engine only does the math and dependency resolution.
 */

// =========================================================
// TIMELINE TYPES
// =========================================================

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'delayed';

export interface TimelinePhase {
  id: string;
  name: string;
  description: string;
  /** Order in the construction sequence (1-based) */
  sequence: number;
  /** Phase duration in days */
  estimatedDays: number;
  /** Actual days (updated during construction) */
  actualDays?: number;
  /** Dependencies — phase IDs that must complete before this one starts */
  dependsOn: string[];
  /** Productivity rate (units per day) */
  productivityRate: number;
  /** Productivity unit (m², m³, bags, etc.) */
  productivityUnit: string;
  /** Total quantity of work in this phase */
  quantity: number;
  /** Required crew size */
  crewSize: number;
  status: PhaseStatus;
  /** Calculated start day (after dependency resolution) */
  startDay: number;
  /** Calculated end day */
  endDay: number;
  explanation: string;
}

export interface TimelineResult {
  phases: TimelinePhase[];
  totalEstimatedDays: number;
  criticalPath: string[];
  milestones: TimelineMilestone[];
  startDate: string | null;
  endDate: string | null;
  explanation: string[];
}

export interface TimelineMilestone {
  name: string;
  day: number;
  phaseId: string;
  description: string;
}

// =========================================================
// PHASE TEMPLATE
// =========================================================

export interface PhaseTemplate {
  name: string;
  description: string;
  trade: string;
  productivityRate: number;
  productivityUnit: string;
  crewSize: number;
  /** Dependency: template name(s) that must complete first */
  dependsOn: string[];
}

/**
 * Default phase templates for a standard construction project.
 * These are starting points — fully customizable via admin config.
 */
export const DEFAULT_PHASE_TEMPLATES: PhaseTemplate[] = [
  { name: 'Site Preparation', description: 'Clearing, setting out, site facilities', trade: 'site_preparation', productivityRate: 200, productivityUnit: 'm²', crewSize: 4, dependsOn: [] },
  { name: 'Foundation', description: 'Excavation, blinding, foundation concrete', trade: 'foundation', productivityRate: 10, productivityUnit: 'm³', crewSize: 6, dependsOn: ['Site Preparation'] },
  { name: 'Block Laying', description: 'Walls and blockwork', trade: 'masonry', productivityRate: 15, productivityUnit: 'm²', crewSize: 5, dependsOn: ['Foundation'] },
  { name: 'Roofing', description: 'Roof structure and covering', trade: 'roofing', productivityRate: 25, productivityUnit: 'm²', crewSize: 4, dependsOn: ['Block Laying'] },
  { name: 'Plastering', description: 'Internal and external plastering', trade: 'plastering', productivityRate: 20, productivityUnit: 'm²', crewSize: 4, dependsOn: ['Roofing'] },
  { name: 'Tiling', description: 'Floor and wall tiling', trade: 'tiling', productivityRate: 15, productivityUnit: 'm²', crewSize: 3, dependsOn: ['Plastering'] },
  { name: 'Screeding', description: 'Floor screeding', trade: 'screeding', productivityRate: 30, productivityUnit: 'm²', crewSize: 3, dependsOn: ['Plastering'] },
  { name: 'POP Ceiling', description: 'POP ceiling installation', trade: 'pop_ceiling', productivityRate: 15, productivityUnit: 'm²', crewSize: 3, dependsOn: ['Roofing'] },
  { name: 'Painting', description: 'Primer, undercoat, finish coats', trade: 'painting', productivityRate: 40, productivityUnit: 'm²', crewSize: 3, dependsOn: ['Screeding', 'POP Ceiling'] },
  { name: 'Finishing', description: 'Fixtures, fittings, cleanup', trade: 'finishing', productivityRate: 1, productivityUnit: 'project', crewSize: 4, dependsOn: ['Painting', 'Tiling'] },
];

// =========================================================
// FACTORY
// =========================================================

let phaseIdCounter = 0;

function generatePhaseId(): string {
  return `phase_${++phaseIdCounter}`;
}

// =========================================================
// TIMELINE ESTIMATOR
// =========================================================

/**
 * Build a construction timeline from scope + templates.
 *
 * @param scope - Map of trade → quantity (e.g., { foundation: 50, masonry: 200 })
 * @param templates - Phase templates (defaults available)
 * @param options - Start date, weather delay buffer, etc.
 */
export function estimateTimeline(
  scope: Map<string, number>,
  templates: PhaseTemplate[] = DEFAULT_PHASE_TEMPLATES,
  options?: {
    startDate?: string;
    weatherBufferPercent?: number;
    contingencyDays?: number;
  },
): TimelineResult {
  const weatherBuffer = options?.weatherBufferPercent ?? 0;
  const contingencyDays = options?.contingencyDays ?? 0;

  // Build phases from templates
  const phases: TimelinePhase[] = templates.map((tmpl, idx) => {
    const quantity = scope.get(tmpl.trade) ?? scope.get(tmpl.name) ?? 0;
    let estimatedDays = 0;

    if (quantity > 0 && tmpl.productivityRate > 0) {
      estimatedDays = Math.ceil(quantity / tmpl.productivityRate);
      // Apply weather buffer
      estimatedDays = Math.ceil(estimatedDays * (1 + weatherBuffer / 100));
    } else if (quantity > 0 && tmpl.productivityUnit === 'project') {
      estimatedDays = Math.ceil(quantity);
    }

    return {
      id: generatePhaseId(),
      name: tmpl.name,
      description: tmpl.description,
      sequence: idx + 1,
      estimatedDays,
      dependsOn: [], // Will resolve names → IDs below
      productivityRate: tmpl.productivityRate,
      productivityUnit: tmpl.productivityUnit,
      quantity,
      crewSize: tmpl.crewSize,
      status: 'not_started',
      startDay: 0,
      endDay: 0,
      explanation: `${tmpl.name}: ${quantity} ${tmpl.productivityUnit} ÷ ${tmpl.productivityRate}/day = ${estimatedDays} days`,
    };
  });

  // Resolve dependency names to phase IDs
  const nameToId = new Map<string, string>();
  for (const phase of phases) {
    nameToId.set(phase.name, phase.id);
  }
  for (let i = 0; i < templates.length; i++) {
    const tmpl = templates[i];
    const phase = phases[i];
    phase.dependsOn = tmpl.dependsOn
      .map((dep) => nameToId.get(dep))
      .filter((id): id is string => id !== undefined);
  }

  // Resolve schedule (critical path)
  resolveSchedule(phases);

  // Calculate totals
  const totalEstimatedDays = Math.max(0, ...phases.map((p) => p.endDay)) + contingencyDays;

  // Build critical path
  const criticalPath = findCriticalPath(phases);

  // Build milestones
  const milestones: TimelineMilestone[] = phases
    .filter((p) => p.estimatedDays > 0)
    .map((p) => ({
      name: `${p.name} complete`,
      day: p.endDay,
      phaseId: p.id,
      description: `${p.name} phase completion (Day ${p.startDay + 1}–${p.endDay})`,
    }));

  // Calculate dates
  let startDate: string | null = null;
  let endDate: string | null = null;
  if (options?.startDate) {
    const start = new Date(options.startDate);
    startDate = start.toISOString().split('T')[0];
    const end = new Date(start);
    end.setDate(end.getDate() + totalEstimatedDays);
    endDate = end.toISOString().split('T')[0];
  }

  // Explanation
  const explanation: string[] = [];
  explanation.push(`Total estimated timeline: ${totalEstimatedDays} days`);
  explanation.push(`Phases: ${phases.filter((p) => p.estimatedDays > 0).length} active`);
  if (weatherBuffer > 0) {
    explanation.push(`Weather buffer: ${weatherBuffer}%`);
  }
  if (contingencyDays > 0) {
    explanation.push(`Contingency: ${contingencyDays} days`);
  }
  explanation.push(`Critical path: ${criticalPath.length} phases`);
  if (startDate && endDate) {
    explanation.push(`Start: ${startDate}, End: ${endDate}`);
  }

  return {
    phases,
    totalEstimatedDays,
    criticalPath,
    milestones,
    startDate,
    endDate,
    explanation,
  };
}

// =========================================================
// SCHEDULE RESOLVER (Critical Path Method)
// =========================================================

function resolveSchedule(phases: TimelinePhase[]): void {
  const phaseMap = new Map<string, TimelinePhase>();
  for (const p of phases) {
    phaseMap.set(p.id, p);
  }

  // Topological resolution — a phase starts after all dependencies end
  for (const phase of phases) {
    if (phase.dependsOn.length === 0) {
      phase.startDay = 0;
    } else {
      let maxEnd = 0;
      for (const depId of phase.dependsOn) {
        const dep = phaseMap.get(depId);
        if (dep && dep.endDay > maxEnd) {
          maxEnd = dep.endDay;
        }
      }
      phase.startDay = maxEnd;
    }
    phase.endDay = phase.startDay + phase.estimatedDays;
  }
}

// =========================================================
// CRITICAL PATH FINDER
// =========================================================

function findCriticalPath(phases: TimelinePhase[]): string[] {
  if (phases.length === 0) return [];

  // Find the phase that ends last
  const lastPhase = phases.reduce((max, p) => (p.endDay > max.endDay ? p : max), phases[0]);
  const criticalPath: string[] = [lastPhase.name];

  // Walk backwards through dependencies
  let current = lastPhase;
  while (current.dependsOn.length > 0) {
    // Find the dependency that ends latest (the bottleneck)
    const phaseMap = new Map(phases.map((p) => [p.id, p]));
    let latestDep: TimelinePhase | null = null;
    for (const depId of current.dependsOn) {
      const dep = phaseMap.get(depId);
      if (dep && (!latestDep || dep.endDay > latestDep.endDay)) {
        latestDep = dep;
      }
    }
    if (latestDep) {
      criticalPath.unshift(latestDep.name);
      current = latestDep;
    } else {
      break;
    }
  }

  return criticalPath;
}
