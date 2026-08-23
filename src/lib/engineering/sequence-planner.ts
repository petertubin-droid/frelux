// =========================================================
// FRELUX Construction Sequence Planner
// Engine — Phase 32
//
// Generates the correct construction build order with:
// - Step-by-step sequence with dependencies
// - Quality checks for each stage
// - Material requirements per stage
// - Safety requirements per stage
// - Common mistakes to avoid
//
// Based on Nigerian building construction practice and
// the Build-to-Roof methodology (site → foundation → roof).
// =========================================================

// ── Types ──

export interface SequenceStep {
  step_number: number;
  stage: string;
  title: string;
  description: string;
  prerequisites: number[]; // step numbers that must be complete
  activities: string[];
  materials_required: string[];
  quality_checks: string[];
  safety_notes: string[];
  common_mistakes: string[];
  estimated_duration_days: string;
  is_critical: boolean; // on critical path
}

export interface SequencePlan {
  total_steps: number;
  stages: string[];
  steps: SequenceStep[];
  quality_gates: { after_step: number; gate_name: string; checks: string[] }[];
  parallel_activities: { can_overlap: boolean; steps: number[]; description: string }[];
}

// ── Full construction sequence (Build-to-Roof + prep for finishing) ──

const SEQUENCE_STEPS: Omit<SequenceStep, 'step_number'>[] = [
  // 1. Site preparation
  {
    stage: 'Site Preparation',
    title: 'Site Clearing & Vegetation Removal',
    description: 'Clear all vegetation, debris, and topsoil from the building footprint and surrounding work area.',
    prerequisites: [],
    activities: [
      'Mark building footprint with pegs and string',
      'Remove all vegetation within footprint + 2m buffer',
      'Strip topsoil (150-300mm) and stockpile for landscaping',
      'Remove any roots, organic material, and soft spots',
    ],
    materials_required: ['Pegs and string line', 'Cutlass/machete', 'Wheelbarrow', 'Shovels'],
    quality_checks: [
      'Footprint dimensions match approved drawing ±50mm',
      'No organic material remains in building area',
      'Stockpiled topsoil is free from debris',
    ],
    safety_notes: [
      'Wear protective boots and gloves',
      'Check for underground utilities before digging',
      'Keep children and non-workers away from site',
    ],
    common_mistakes: [
      'Not removing enough topsoil → ground instability',
      'Building too close to boundaries → legal disputes',
    ],
    estimated_duration_days: '2-3 days',
    is_critical: true,
  },
  // 2. Setting out
  {
    stage: 'Site Preparation',
    title: 'Setting Out & Survey',
    description: 'Establish precise building lines, corners, and levels using surveying equipment.',
    prerequisites: [1],
    activities: [
      'Establish site benchmark (temporary benchmark)',
      'Set out building corners using the 3-4-5 method or theodolite',
      'Mark foundation trench lines with lime/sand',
      'Verify all angles are 90° and diagonals are equal',
    ],
    materials_required: ['Theodolite or builder\'s square', 'Level and staff', 'Pegs', 'Lime or sand for marking'],
    quality_checks: [
      'All corner angles are exactly 90°',
      'Diagonal measurements are equal (±10mm tolerance)',
      'Building is within plot boundaries (verify with survey plan)',
      'Levels are referenced to a permanent benchmark',
    ],
    safety_notes: ['Ensure accurate setting out — errors here compound throughout the project'],
    common_mistakes: [
      'Inaccurate setting out → walls out of square',
      'Not checking diagonals → parallelogram instead of rectangle',
      'Ignoring setback requirements → demolition orders',
    ],
    estimated_duration_days: '1-2 days',
    is_critical: true,
  },
  // 3. Excavation
  {
    stage: 'Foundation',
    title: 'Foundation Trench Excavation',
    description: 'Excavate foundation trenches to the required depth and width.',
    prerequisites: [2],
    activities: [
      'Excavate strip foundation trenches to required depth',
      'Excavate pad footings if applicable',
      'Trim trench bottoms to firm, level surface',
      'Check trench depth against benchmark',
    ],
    materials_required: ['Digging tools', 'Wheelbarrows', 'Profile boards', 'Spirit level'],
    quality_checks: [
      'Trench bottom is firm and free from loose material',
      'Trench depth is consistent (±25mm)',
      'Trench width is as specified (±25mm)',
      'No water in trenches (dewater if necessary)',
      'Soil at trench bottom matches expected bearing strata',
    ],
    safety_notes: [
      'Provide trench supports if depth exceeds 1.2m',
      'Keep excavated soil at least 1m from trench edge',
      'No person in trench during machine excavation',
      'Provide safe access/egress for trench workers',
    ],
    common_mistakes: [
      'Not going deep enough → foundation on weak soil',
      'Leaving loose material in trench bottom → settlement',
      'Trenches too narrow → insufficient bearing area',
    ],
    estimated_duration_days: '3-5 days',
    is_critical: true,
  },
  // 4. Blinding
  {
    stage: 'Foundation',
    title: 'Blinding Concrete',
    description: 'Cast a thin layer of weak concrete (1:3:6) over the trench bottom to provide a clean, level working surface.',
    prerequisites: [3],
    activities: [
      'Cast 50-75mm blinding concrete in trench bottom',
      'Level and smooth the surface',
      'Allow to set before proceeding',
    ],
    materials_required: ['Cement', 'Sand', 'Granite/gravel (for 1:3:6 mix)', 'Water'],
    quality_checks: [
      'Blinding thickness is 50-75mm',
      'Surface is level and smooth',
      'No voids or gaps under reinforcement will exist',
    ],
    safety_notes: ['Standard concrete handling precautions'],
    common_mistakes: [
      'Skipping blinding → reinforcement corrosion risk',
      'Uneven blinding → inconsistent cover to reinforcement',
    ],
    estimated_duration_days: '1 day + curing',
    is_critical: true,
  },
  // 5. Foundation reinforcement & concrete
  {
    stage: 'Foundation',
    title: 'Foundation Reinforcement & Concrete Cast',
    description: 'Place reinforcement, cast foundation footing concrete and ground beams.',
    prerequisites: [4],
    activities: [
      'Place foundation reinforcement (if designed)',
      'Cast foundation footing concrete (strip or pad)',
      'Cast ground beams with reinforcement',
      'Insert column starter bars if applicable',
      'Vibrate concrete properly',
    ],
    materials_required: ['Reinforcement bars', 'Binding wire', 'Cement', 'Sand', 'Granite', 'Formwork', 'Concrete vibrator'],
    quality_checks: [
      'Reinforcement diameter, spacing, and cover match engineer\'s drawings',
      'Concrete grade is as specified (typically C25)',
      'No honeycombing in cast concrete',
      'Column starter bars are correctly positioned',
      'Concrete is cured for minimum 7 days (wet curing)',
    ],
    safety_notes: [
      'Reinforcement ends are capped (impalement protection)',
      'No walking on freshly cast concrete',
      'Adequate propping of formwork before pour',
    ],
    common_mistakes: [
      'Insufficient concrete cover → reinforcement corrosion',
      'No vibration → honeycombing and weak concrete',
      'Not curing → reduced strength (up to 30% loss)',
      'Wrong bar sizes → structural failure',
    ],
    estimated_duration_days: '5-7 days (including curing)',
    is_critical: true,
  },
  // 6. Foundation blockwork to DPC
  {
    stage: 'Foundation',
    title: 'Foundation Blockwork to DPC Level',
    description: 'Lay foundation blocks from footing to DPC level, install DPC membrane.',
    prerequisites: [5],
    activities: [
      'Lay foundation blocks (225mm) in mortar',
      'Build up to DPC level (typically 4-5 courses)',
      'Fill hollow blocks with concrete where specified',
      'Install DPC membrane over blockwork',
    ],
    materials_required: ['9-inch (225mm) hollow blocks', 'Cement', 'Sand', 'DPC membrane (polythene)'],
    quality_checks: [
      'Blocks are laid in stretcher bond',
      'Mortar joints are 10-12mm and fully filled',
      'Walls are plumb and level',
      'DPC membrane is lapped at joints (min 150mm)',
      'DPC extends full width of wall',
    ],
    safety_notes: ['Lift blocks properly (bend knees, not back)'],
    common_mistakes: [
      'Unfilled mortar joints → water seepage',
      'DPC membrane not lapped properly → rising damp',
      'Walls not plumb → load eccentricity',
    ],
    estimated_duration_days: '4-5 days',
    is_critical: true,
  },
  // 7. Hardcore filling
  {
    stage: 'Ground Floor',
    title: 'Hardcore Filling & Compaction',
    description: 'Fill the foundation area with hardcore stone, compact in layers.',
    prerequisites: [6],
    activities: [
      'Fill with hardcore stone in 150mm layers',
      'Compact each layer thoroughly',
      'Apply sand filling over hardcore',
      'Level to receive oversite concrete',
    ],
    materials_required: ['Hardcore stone/laterite', 'Sand', 'Compactor (manual or mechanical)'],
    quality_checks: [
      'Hardcore is placed in layers not exceeding 150mm',
      'Each layer is properly compacted',
      'No organic material mixed in',
      'Surface is level within ±15mm',
      'Voids between hardcore are filled with sand',
    ],
    safety_notes: ['Wear steel-toe boots when handling hardcore'],
    common_mistakes: [
      'Not compacting → settlement cracks in floor',
      'Too thick a layer at once → inadequate compaction',
      'Not filling voids → hollow spots under slab',
    ],
    estimated_duration_days: '3-5 days',
    is_critical: true,
  },
  // 8. Ground floor slab
  {
    stage: 'Ground Floor',
    title: 'Oversite Concrete (Ground Floor Slab)',
    description: 'Cast the ground floor concrete slab over compacted hardcore with DPM.',
    prerequisites: [7],
    activities: [
      'Install DPM (damp proof membrane) over sand blinding',
      'Place slab reinforcement (mesh or bars) if specified',
      'Cast oversite concrete (100-150mm thick)',
      'Level and trowel finish',
      'Cure for minimum 7 days',
    ],
    materials_required: ['DPM polythene sheet', 'Reinforcement mesh (BRC)', 'Cement', 'Sand', 'Granite'],
    quality_checks: [
      'DPM is continuous with no tears',
      'Slab thickness is as specified (min 100mm)',
      'Surface is level within ±5mm',
      'Concrete is cured properly (wet curing 7 days)',
      'No shrinkage cracks from poor curing',
    ],
    safety_notes: ['Standard concrete handling precautions'],
    common_mistakes: [
      'No DPM → rising damp through floor',
      'Insufficient curing → surface cracks',
      'Overworking the surface → weak surface layer',
    ],
    estimated_duration_days: '2-3 days (including curing)',
    is_critical: true,
  },
  // 9. Walls to window level
  {
    stage: 'Walls',
    title: 'Blockwork to Window Sill Level',
    description: 'Lay blockwork from DPC to window sill level.',
    prerequisites: [8],
    activities: [
      'Lay first course of blocks on DPC',
      'Continue blockwork to window sill level',
      'Install wall reinforcement where specified',
      'Cast columns to this level',
    ],
    materials_required: ['9-inch blocks (external)', '6-inch blocks (internal)', 'Cement', 'Sand', 'Column reinforcement'],
    quality_checks: [
      'First course is laid on mortar bed over DPC',
      'Walls are plumb and level',
      'Mortar joints are 10-12mm',
      'Columns are cast with proper cover',
      'Door openings are correctly positioned',
    ],
    safety_notes: ['Scaffold safely for higher courses'],
    common_mistakes: [
      'Not maintaining bond pattern → weak walls',
      'Door frames not set before blockwork → fitting problems',
    ],
    estimated_duration_days: '5-7 days',
    is_critical: true,
  },
  // 10. Walls to lintel/roof level
  {
    stage: 'Walls',
    title: 'Blockwork to Lintel & Roof Level',
    description: 'Continue blockwork from window sill to lintel level, install lintels, and build to roof level.',
    prerequisites: [9],
    activities: [
      'Install window frames at sill level',
      'Continue blockwork to lintel height',
      'Cast lintels over all openings',
      'Continue blockwork to ring beam/roof level',
      'Cast ring beam with reinforcement',
    ],
    materials_required: ['Blocks', 'Cement', 'Sand', 'Lintel reinforcement', 'Ring beam reinforcement', 'Formwork'],
    quality_checks: [
      'Lintels extend at least 150mm beyond opening on each side',
      'Ring beam is continuous and properly reinforced',
      'All openings have lintels (no unreinforced spans)',
      'Walls are plumb throughout',
      'Roof plate level is consistent',
    ],
    safety_notes: [
      'Adequate scaffolding for high work',
      'No materials stored on scaffolds',
      'Formwork is adequately propped',
    ],
    common_mistakes: [
      'No lintels over openings → cracks above windows/doors',
      'Ring beam not cast → no structural tie at roof level',
      'Inadequate propping → formwork collapse',
    ],
    estimated_duration_days: '7-14 days (multi-storey takes longer)',
    is_critical: true,
  },
  // 11. Roof structure
  {
    stage: 'Roofing',
    title: 'Roof Timber/Steel Structure',
    description: 'Install roof trusses or rafters, purlins, and bracing.',
    prerequisites: [10],
    activities: [
      'Install wall plate on ring beam',
      'Erect roof trusses or rafters at correct spacing',
      'Install purlins across rafters',
      'Install wind bracing',
      'Install fascia boards',
    ],
    materials_required: ['Wall plate timber (2x6 or 2x4)', 'Rafters/trusses', 'Purlins', 'Nails and bolts', 'Fascia board'],
    quality_checks: [
      'Wall plate is securely anchored to ring beam',
      'Trusses are at correct spacing (typically 900mm)',
      'Roof pitch is as designed',
      'Overhang is consistent (typically 600mm)',
      'All connections are properly nailed/bolted',
    ],
    safety_notes: [
      'Work at height — use harnesses and scaffolding',
      'Never work on roof during high winds or rain',
      'At least two people for truss erection',
    ],
    common_mistakes: [
      'Insufficient anchoring → roof lift-off in storms',
      'No bracing → roof instability',
      'Inconsistent pitch → water ponding',
    ],
    estimated_duration_days: '5-7 days',
    is_critical: true,
  },
  // 12. Roof covering
  {
    stage: 'Roofing',
    title: 'Roof Covering Installation',
    description: 'Install roofing sheets, ridge caps, and waterproofing.',
    prerequisites: [11],
    activities: [
      'Install roofing sheets (start from bottom edge)',
      'Overlap sheets correctly per manufacturer spec',
      'Install ridge caps at roof apex',
      'Install valley gutters if applicable',
      'Install flashings around penetrations',
    ],
    materials_required: ['Roofing sheets', 'Ridge caps', 'Roofing screws', 'Flashings', 'Sealant'],
    quality_checks: [
      'Sheets overlap by minimum 1.5 corrugations',
      'Ridge caps overlap min 100mm and point away from prevailing wind',
      'All screws have washers and are properly sealed',
      'No gaps at ridge or eaves',
      'Valley gutters have adequate fall',
    ],
    safety_notes: [
      'Do not walk on roofing sheets (especially aluminium)',
      'Use crawling boards for roof access',
      'Secure all loose materials before leaving roof',
    ],
    common_mistakes: [
      'Insufficient overlap → roof leaks',
      'Missing ridge cap seal → water penetration',
      'Screws too tight → sheet distortion',
      'No valley gutter → water ingress at valleys',
    ],
    estimated_duration_days: '3-5 days',
    is_critical: true,
  },
];

export function generateSequencePlan(buildingType?: string): SequencePlan {
  const steps: SequenceStep[] = SEQUENCE_STEPS.map((step, i) => ({
    ...step,
    step_number: i + 1,
  }));

  // Quality gates after critical transitions
  const quality_gates = [
    {
      after_step: 2,
      gate_name: 'Setting Out Verification Gate',
      checks: [
        'Surveyor has verified all dimensions',
        'Building is within plot boundaries',
        'Benchmark is established and protected',
      ],
    },
    {
      after_step: 5,
      gate_name: 'Foundation Quality Gate',
      checks: [
        'Concrete cubes tested (or acceptable proof of strength)',
        'Reinforcement inspected by engineer before pour',
        'Curing has been maintained for 7 days minimum',
        'No honeycombing or defects in cast concrete',
      ],
    },
    {
      after_step: 8,
      gate_name: 'DPC & Ground Floor Gate',
      checks: [
        'DPC membrane is continuous and properly lapped',
        'Ground floor slab is properly cured',
        'No cracks or defects in slab',
        'Damp proofing is complete',
      ],
    },
    {
      after_step: 10,
      gate_name: 'Structural Frame Gate',
      checks: [
        'All columns and ring beams cast per engineer\'s schedule',
        'All lintels in place over openings',
        'Walls are plumb and within tolerance',
        'Roof plate level is consistent and ready for roof',
      ],
    },
    {
      after_step: 12,
      gate_name: 'Weathertight Gate',
      checks: [
        'All roofing sheets installed with proper overlap',
        'Ridge caps and flashings complete',
        'No visible leaks during rain test',
        'Building is weathertight — finishing can begin',
      ],
    },
  ];

  // Parallel activities that can overlap
  const parallel_activities = [
    {
      can_overlap: true,
      steps: [6, 7],
      description: 'Foundation blockwork and hardcore filling can partially overlap — start hardcore on one side while finishing blockwork on another.',
    },
    {
      can_overlap: true,
      steps: [9, 10],
      description: 'Internal wall blockwork and external wall blockwork can proceed in parallel by different teams.',
    },
    {
      can_overlap: true,
      steps: [11, 12],
      description: 'Fascia boards can be installed while roofing sheets are being fixed on another roof section.',
    },
  ];

  return {
    total_steps: steps.length,
    stages: ['Site Preparation', 'Foundation', 'Ground Floor', 'Walls', 'Roofing'],
    steps,
    quality_gates,
    parallel_activities,
  };
}
