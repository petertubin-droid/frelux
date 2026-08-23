// =========================================================
// FRELUX Project Timeline Estimator
// Engine — Phase 32
//
// Estimates construction project durations based on:
// - Building type, size, and complexity
// - Nigerian construction labour productivity rates
// - Stage-by-stage breakdown with dependencies
// - Weather, material availability, and workforce factors
//
// Based on typical Nigerian construction practice and
// industry benchmarks for sub-Saharan Africa.
// =========================================================

// ── Types ──

export type ProjectComplexity = 'simple' | 'standard' | 'complex' | 'high_end';
export type WorkforceSize = 'small' | 'medium' | 'large';
export type Season = 'dry' | 'rainy';

export interface TimelineInput {
  building_type: string;
  building_length: number; // meters
  building_width: number; // meters
  number_of_floors: number;
  complexity: ProjectComplexity;
  workforce: WorkforceSize;
  season: Season;
  foundation_type: string;
  roof_type: string;
  has_engineer_schedule: boolean;
}

export interface StageDuration {
  stage: string;
  stage_label: string;
  estimated_days: number;
  min_days: number;
  max_days: number;
  dependencies: string[];
  activities: string[];
  notes: string;
}

export interface TimelineResult {
  total_days: number;
  total_weeks: number;
  total_months: number;
  estimated_start: string;
  estimated_end: string;
  stages: StageDuration[];
  critical_path: string[];
  milestones: { label: string; after_days: number; description: string }[];
  risks: string[];
  recommendations: string[];
  assumptions: string[];
}

// ── Complexity multipliers ──

const COMPLEXITY_MULTIPLIER: Record<ProjectComplexity, number> = {
  simple: 0.85,
  standard: 1.0,
  complex: 1.25,
  high_end: 1.5,
};

const WORKFORCE_MULTIPLIER: Record<WorkforceSize, number> = {
  small: 1.4,   // fewer workers → longer
  medium: 1.0,
  large: 0.75,  // more workers → faster
};

const SEASON_MULTIPLIER: Record<Season, number> = {
  dry: 1.0,
  rainy: 1.2,  // rainy season slows work
};

// ── Base stage durations (days) for a standard 100m² single-floor bungalow ──

interface BaseStage {
  stage: string;
  label: string;
  base_days: number;
  min_ratio: number; // minimum as % of base
  max_ratio: number; // maximum as % of base
  dependencies: string[];
  activities: string[];
}

const BASE_STAGES: BaseStage[] = [
  {
    stage: 'site_clearing',
    label: 'Site Clearing & Setting Out',
    base_days: 5,
    min_ratio: 0.6,
    max_ratio: 1.5,
    dependencies: [],
    activities: [
      'Clear vegetation and debris',
      'Set out building lines and corners',
      'Establish site benchmarks',
      'Install site hoarding/fencing',
    ],
  },
  {
    stage: 'excavation',
    label: 'Foundation Excavation',
    base_days: 7,
    min_ratio: 0.7,
    max_ratio: 1.8,
    dependencies: ['site_clearing'],
    activities: [
      'Excavate foundation trenches',
      'Excavate pad/strip footings',
      'Trim trench bottoms',
      'Verify levels and dimensions',
    ],
  },
  {
    stage: 'foundation_concrete',
    label: 'Foundation Concrete & Blockwork',
    base_days: 14,
    min_ratio: 0.7,
    max_ratio: 1.6,
    dependencies: ['excavation'],
    activities: [
      'Cast blinding concrete',
      'Lay foundation blocks to DPC level',
      'Cast foundation beams',
      'Install DPC membrane',
    ],
  },
  {
    stage: 'hardcore_filling',
    label: 'Hardcore Filling & Ground Floor',
    base_days: 10,
    min_ratio: 0.6,
    max_ratio: 1.5,
    dependencies: ['foundation_concrete'],
    activities: [
      'Fill with hardcore stone',
      'Compact hardcore layers',
      'Sand filling and leveling',
      'Cast ground floor slab',
    ],
  },
  {
    stage: 'walls',
    label: 'Blockwork Walls',
    base_days: 21,
    min_ratio: 0.6,
    max_ratio: 1.8,
    dependencies: ['hardcore_filling'],
    activities: [
      'Lay blockwork to window sill level',
      'Lay blockwork to lintel/roof level',
      'Install lintels over openings',
      'Cast columns and ring beams',
    ],
  },
  {
    stage: 'roofing',
    label: 'Roof Structure & Covering',
    base_days: 14,
    min_ratio: 0.7,
    max_ratio: 1.6,
    dependencies: ['walls'],
    activities: [
      'Install roof trusses/rafters',
      'Install purlins and bracing',
      'Fix roofing sheets',
      'Install ridge caps and fascia',
    ],
  },
  {
    stage: 'finishing_prep',
    label: 'Finishing Preparation (Plastering, Flooring)',
    base_days: 21,
    min_ratio: 0.5,
    max_ratio: 2.0,
    dependencies: ['roofing'],
    activities: [
      'Plaster internal and external walls',
      'Screed floor for tiling',
      'Install ceiling joists/POP',
      'First-fix electrical and plumbing',
    ],
  },
];

export function estimateTimeline(input: TimelineInput): TimelineResult {
  const area = input.building_length * input.building_width * input.number_of_floors;
  const area_factor = Math.max(0.5, Math.min(3.0, area / 100)); // normalize to 100m² base

  const complexity_mult = COMPLEXITY_MULTIPLIER[input.complexity];
  const workforce_mult = WORKFORCE_MULTIPLIER[input.workforce];
  const season_mult = SEASON_MULTIPLIER[input.season];

  // Foundation type adjustment
  let foundation_extra = 0;
  if (input.foundation_type === 'raft') foundation_extra = 7;
  if (input.foundation_type === 'pile') foundation_extra = 21;

  const total_mult = complexity_mult * workforce_mult * season_mult * area_factor;

  const stages: StageDuration[] = [];
  let cumulative_days = 0;
  const critical_path: string[] = [];

  for (const base of BASE_STAGES) {
    let days = base.base_days * total_mult;
    if (base.stage === 'excavation') days += foundation_extra;

    const min_days = Math.round(days * base.min_ratio);
    const max_days = Math.round(days * base.max_ratio);
    const estimated_days = Math.round(days);

    let notes = '';
    if (base.stage === 'foundation_concrete' && input.season === 'rainy') {
      notes = 'Rainy season may delay concrete curing. Allow extra days.';
    }
    if (base.stage === 'roofing' && input.season === 'rainy') {
      notes = 'Roofing work is significantly harder during rainy season.';
    }
    if (base.stage === 'walls' && input.number_of_floors > 1) {
      notes = `Multi-storey (${input.number_of_floors} floors) — walls take proportionally longer.`;
    }

    stages.push({
      stage: base.stage,
      stage_label: base.label,
      estimated_days,
      min_days,
      max_days,
      dependencies: base.dependencies,
      activities: base.activities,
      notes,
    });

    cumulative_days += estimated_days;
    critical_path.push(base.stage);
  }

  // Milestones
  const milestones: TimelineResult['milestones'] = [
    { label: 'Foundation Complete', after_days: stages.slice(0, 3).reduce((s, st) => s + st.estimated_days, 0), description: 'Foundation concrete and blockwork to DPC level' },
    { label: 'Ground Floor Cast', after_days: stages.slice(0, 4).reduce((s, st) => s + st.estimated_days, 0), description: 'Hardcore filling, compaction, and ground floor slab' },
    { label: 'Walls to Roof Level', after_days: stages.slice(0, 5).reduce((s, st) => s + st.estimated_days, 0), description: 'All blockwork, columns, and ring beams complete' },
    { label: 'Roof On (Weathertight)', after_days: stages.slice(0, 6).reduce((s, st) => s + st.estimated_days, 0), description: 'Building is weathertight — interior work can begin' },
  ];

  // Risks
  const risks: string[] = [
    'Material price fluctuations may affect pace of work',
    'Curing time for concrete cannot be rushed (28-day strength)',
  ];
  if (input.season === 'rainy') {
    risks.push('Rainy season (April–October in southern Nigeria) may cause 20-40% delays');
    risks.push('Excavation and foundation work especially vulnerable to rainfall');
  }
  if (input.workforce === 'small') {
    risks.push('Small workforce may bottleneck critical stages');
  }
  if (input.complexity === 'complex' || input.complexity === 'high_end') {
    risks.push('Complex designs require specialist tradesmen — may have scheduling constraints');
  }

  // Recommendations
  const recommendations: string[] = [
    'Order materials 1-2 weeks before each stage to avoid delays',
    'Cure concrete adequately (7-day minimum wet curing)',
    'Schedule roofing during dry season window if possible',
  ];
  if (input.season === 'rainy') {
    recommendations.push('Plan foundation work for the driest months (Nov–March in the south)');
  }
  if (!input.has_engineer_schedule) {
    recommendations.push('Engage a structural engineer early to avoid rework on structural members');
  }

  // Assumptions
  const assumptions = [
    `Based on ${area.toFixed(0)} m² total floor area`,
    `Complexity: ${input.complexity}, Workforce: ${input.workforce}, Season: ${input.season}`,
    'Assumes continuous work (6-day weeks)',
    'Excludes finishing stages (tiling, painting, fittings — estimate separately)',
    'Based on Nigerian construction productivity benchmarks',
  ];

  // Calculate dates
  const today = new Date();
  const estimated_start = today.toISOString().split('T')[0];
  const end_date = new Date(today.getTime() + cumulative_days * 24 * 60 * 60 * 1000);
  const estimated_end = end_date.toISOString().split('T')[0];

  return {
    total_days: cumulative_days,
    total_weeks: Math.ceil(cumulative_days / 6),
    total_months: Math.ceil(cumulative_days / 26),
    estimated_start,
    estimated_end,
    stages,
    critical_path,
    milestones,
    risks,
    recommendations,
    assumptions,
  };
}
