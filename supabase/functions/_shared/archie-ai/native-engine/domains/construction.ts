// supabase/functions/_shared/archie-ai/native-engine/domains/construction.ts
// =========================================================
// CONSTRUCTION DOMAIN SKILL (audit fix 2026-09-11, domain-
// capture removal): the deterministic construction calculator,
// ARCHIE's three construction reasoning rules and the
// construction planning operator — moved VERBATIM out of the
// general engine (engine.ts / reasoning.ts / planning.ts) into
// this pluggable skill. Behavior is identical when the skill is
// registered (it is, by default); the core engine is now
// domain-neutral and future domains register the same way.
// The customer-facing FRELUX room-based paint estimator is a
// separate product surface and is NOT touched by this move.
// =========================================================

import type { Operator, Rule } from "../types.ts";
import type { DomainSkill } from "./registry.ts";

// ── Deterministic helpers (moved from engine.ts) ──

/** Parse decimal numbers from free text. */
function parseNumbers(input: string): number[] {
  return (input.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** Feet→meters when the query is in imperial units. */
const isFeet = (input: string): boolean =>
  /\b(?:feet|foot|ft\b|ft\.|['’])/i.test(input);

const FT_TO_M = 0.3048;
/** Effective face area of a standard 450x225mm block including
 *  a 10mm mortar joint: 0.46 x 0.235 = 0.1081 m2. */
const BLOCK_FACE_M2 = 0.1081;
/** Smooth-plaster paint coverage per litre per coat. */
const PAINT_M2_PER_LITRE = 10;
/** 1:2:4 concrete: dry volume factor, mix sum, cement density. */
const DRY_VOLUME_FACTOR = 1.54;
const MIX_SUM = 7;
const CEMENT_KG_PER_M3 = 1440;
const CEMENT_KG_PER_BAG = 50;

/** Deterministic construction estimate with honest assumptions.
 *  Returns the fully-composed answer string. (Moved verbatim
 *  from engine.ts — audit 2026-09-11.) */
export function constructionEstimate(input: string): string {
  const nums = parseNumbers(input);
  const feet = isFeet(input);
  const meters = nums.map((n) => (feet ? n * FT_TO_M : n));

  const wantsBlocks = /\b(?:blocks?|bricks?)\b/i.test(input);
  const wantsPaint = /\bpaint\b/i.test(input);
  const wantsCement = /\bcement\b/i.test(input) && !wantsBlocks && !wantsPaint;

  if (wantsBlocks) {
    if (meters.length < 2) {
      return `To estimate blocks I need the wall length and height — for example "how many blocks for a 6 by 3 meter wall". I will not guess dimensions.`;
    }
    const [l, h] = meters;
    const area = l * h;
    const base = area / BLOCK_FACE_M2;
    const withWaste = Math.ceil(base * 1.05);
    return (
      `For a ${feet ? `${nums[0]} ft x ${nums[1]} ft` : `${nums[0]} x ${nums[1]} m`} wall (${area.toFixed(2)} m2): approximately ${withWaste} blocks. ` +
      `Assumptions: standard 450x225mm block with 10mm mortar joints (0.1081 m2 face), plus 5% breakage/waste allowance. This is a deterministic estimate — verify on site before ordering.`
    );
  }

  if (wantsPaint) {
    if (meters.length < 1) {
      return `To estimate paint I need the surface area — for example "how much paint for a 4 by 5 meter wall". I will not guess dimensions.`;
    }
    const area = meters.length >= 2 ? meters[0] * meters[1] : meters[0];
    const litres = Math.ceil((area / PAINT_M2_PER_LITRE) * 2);
    return (
      `For ${area.toFixed(2)} m2 of surface: approximately ${litres} litres for two coats. ` +
      `Assumptions: smooth plaster at ~10 m2 per litre per coat, 2 coats. Rough or textured surfaces need more — this is a deterministic estimate, not a guess.`
    );
  }

  if (wantsCement) {
    if (meters.length < 1) {
      return `To estimate cement I need the concrete volume — for example "how many bags of cement for 2 cubic meters of concrete". I will not guess volumes.`;
    }
    const volume = meters[0];
    const bags = Math.ceil(
      ((volume * DRY_VOLUME_FACTOR) / MIX_SUM) *
        (CEMENT_KG_PER_M3 / CEMENT_KG_PER_BAG) *
        1.05,
    );
    return (
      `For ${volume} cubic meter(s) of concrete: approximately ${bags} x 50kg bags of cement. ` +
      `Assumptions: 1:2:4 mix (dry volume factor 1.54, cement at 1440 kg/m3), plus 5% waste. This is a deterministic estimate — verify with your engineer for structural work.`
    );
  }

  return `I can calculate three construction estimates deterministically: blocks for a wall ("how many blocks for a 6 by 3 meter wall"), paint for an area ("how much paint for 20 square meters"), and cement bags for a concrete volume ("how many bags of cement for 2 cubic meters"). Give me the numbers and I will compute — never guess.`;
}

// ── Construction reasoning rules (moved verbatim from
//    reasoning.ts DEFAULT_RULES — audit 2026-09-11) ──

export const CONSTRUCTION_RULES: Rule[] = [
  {
    id: "rule_concrete_mix_ratio",
    conditions: [
      { subject: "concrete", predicate: "grade" },
      { subject: "concrete", predicate: "mix-ratio" },
    ],
    produces: {
      subject: "concrete",
      predicate: "characteristic-strength",
      object: "determined by its mix ratio",
    },
    weight: 0.85,
    description: "Concrete grade strength follows from its mix ratio",
  },
  {
    id: "rule_screeding_thickness_area",
    conditions: [
      { subject: "screed", predicate: "thickness" },
      { subject: "floor", predicate: "area" },
    ],
    produces: {
      subject: "screed",
      predicate: "volume",
      object: "thickness × floor area",
    },
    weight: 0.9,
    description: "Screed volume = thickness × area (geometry)",
  },
  {
    id: "rule_cement_bag_standard",
    conditions: [{ subject: "cement", predicate: "bag-mass" }],
    produces: {
      subject: "cement",
      predicate: "bag-volume",
      object: "0.035 m³ (50 kg standard bag)",
    },
    weight: 0.95,
    description: "A 50 kg cement bag has a standard volume of 0.035 m³",
  },
];

// ── Construction planning operator (moved verbatim from
//    planning.ts DEFAULT_OPERATORS — audit 2026-09-11) ──

export const CONSTRUCTION_OPERATORS: Operator[] = [
  {
    id: "op_plan_project_phases",
    description: "Decompose a construction project into phased tasks",
    achieves: { subject: "project", predicate: "planned" },
    preconditions: [{ subject: "project", predicate: "scope-defined" }],
    effects: [],
    cost: 3,
  },
];

// ── The skill itself ──

export const constructionSkill: DomainSkill = {
  id: "construction",
  intents: ["construction_calc"],
  rules: CONSTRUCTION_RULES,
  operators: CONSTRUCTION_OPERATORS,
  handler: (intent, input) => {
    if (intent !== "construction_calc") return null;
    return constructionEstimate(input);
  },
};
