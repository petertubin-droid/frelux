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
import { constructionConstant } from "./construction.data.ts";

// ── Deterministic helpers (moved from engine.ts) ──

/** Parse decimal numbers from free text. */
function parseNumbers(input: string): number[] {
  return (input.match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** Feet→meters when the query is in imperial units. */
const isFeet = (input: string): boolean =>
  /\b(?:feet|foot|ft\b|ft\.|['’])/i.test(input);

// ── Constants are SEEDED DATA RECORDS (audit phase 2
//    completion, 2026-09-11): every number the calculator
//    uses is looked up by record id from the seeded set —
//    data changes never touch the calculator's logic, and
//    an unseeded constant fails loudly instead of guessing.
//    Mirrored in DB by migration
//    20260916000000_archie_construction_domain_data.sql
//    (frelux_archie_domain_constants). ──
const C = {
  ftToM: constructionConstant("ft_to_m").value,
  blockFaceM2: constructionConstant("block_face_m2").value,
  blockWaste: constructionConstant("block_waste_allowance").value,
  paintM2PerLitreCoat: constructionConstant("paint_m2_per_litre_coat").value,
  paintCoats: constructionConstant("paint_coats_standard").value,
  dryVolumeFactor: constructionConstant("concrete_dry_volume_factor").value,
  mixSum: constructionConstant("concrete_mix_sum").value,
  cementKgPerM3: constructionConstant("cement_kg_per_m3").value,
  cementBagKg: constructionConstant("cement_bag_kg").value,
  cementWaste: constructionConstant("cement_waste_allowance").value,
};

/** Deterministic construction estimate with honest assumptions.
 *  Returns the fully-composed answer string. (Moved verbatim
 *  from engine.ts — audit 2026-09-11.) */
export function constructionEstimate(input: string): string {
  const nums = parseNumbers(input);
  const feet = isFeet(input);
  const meters = nums.map((n) => (feet ? n * C.ftToM : n));

  const wantsBlocks = /\b(?:blocks?|bricks?)\b/i.test(input);
  const wantsPaint = /\bpaint\b/i.test(input);
  const wantsCement = /\bcement\b/i.test(input) && !wantsBlocks && !wantsPaint;

  if (wantsBlocks) {
    if (meters.length < 2) {
      return `To estimate blocks I need the wall length and height — for example "how many blocks for a 6 by 3 meter wall". I will not guess dimensions.`;
    }
    const [l, h] = meters;
    const area = l * h;
    const base = area / C.blockFaceM2;
    const withWaste = Math.ceil(base * C.blockWaste);
    return (
      `For a ${feet ? `${nums[0]} ft x ${nums[1]} ft` : `${nums[0]} x ${nums[1]} m`} wall (${area.toFixed(2)} m2): approximately ${withWaste} blocks. ` +
      `Assumptions: standard 450x225mm block with 10mm mortar joints (${C.blockFaceM2} m2 face), plus 5% breakage/waste allowance. This is a deterministic estimate — verify on site before ordering.`
    );
  }

  if (wantsPaint) {
    if (meters.length < 1) {
      return `To estimate paint I need the surface area — for example "how much paint for a 4 by 5 meter wall". I will not guess dimensions.`;
    }
    const area = meters.length >= 2 ? meters[0] * meters[1] : meters[0];
    const litres = Math.ceil((area / C.paintM2PerLitreCoat) * C.paintCoats);
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
      ((volume * C.dryVolumeFactor) / C.mixSum) *
        (C.cementKgPerM3 / C.cementBagKg) *
        C.cementWaste,
    );
    return (
      `For ${volume} cubic meter(s) of concrete: approximately ${bags} x 50kg bags of cement. ` +
      `Assumptions: 1:2:4 mix (dry volume factor ${C.dryVolumeFactor}, cement at ${C.cementKgPerM3} kg/m3), plus 5% waste. This is a deterministic estimate — verify with your engineer for structural work.`
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
