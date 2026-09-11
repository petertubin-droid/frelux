// supabase/functions/_shared/archie-ai/native-engine/domains/registry.ts
// =========================================================
// DOMAIN-SKILL REGISTRY (audit fix 2026-09-11, domain-capture
// removal): construction knowledge — the calculator, the
// construction reasoning rules and the construction planning
// operator — lived INSIDE the general engine, welded to the
// core. Skills are now pluggable: each domain contributes its
// rules, operators and deterministic handlers through this
// registry, and the core engine stays domain-neutral. A skill
// that is not registered yields an honest "capability not
// installed" answer — never a fabricated one.
// =========================================================

import type { Rule, Operator } from "../types.ts";

export interface DomainSkill {
  /** Stable skill identifier (e.g. "construction"). */
  id: string;
  /** NLU intents this skill serves. */
  intents: string[];
  /** Reasoning rules contributed to the engine's rule set. */
  rules?: Rule[];
  /** Planning operators contributed to the planner's library. */
  operators?: Operator[];
  /** Deterministic intent handler. Returns the complete
   *  answer text, or null when the skill declines (the engine
   *  answers honestly instead of guessing). */
  handler(intent: string, input: string): string | null;
}

export class DomainSkillRegistry {
  private skills = new Map<string, DomainSkill>();

  register(skill: DomainSkill): void {
    this.skills.set(skill.id, skill);
  }

  /** Composed rules of every registered skill. */
  rules(): Rule[] {
    const out: Rule[] = [];
    for (const s of this.skills.values()) out.push(...(s.rules ?? []));
    return out;
  }

  /** Composed operators of every registered skill. */
  operators(): Operator[] {
    const out: Operator[] = [];
    for (const s of this.skills.values())
      out.push(...(s.operators ?? []));
    return out;
  }

  ids(): string[] {
    return [...this.skills.keys()];
  }

  /** True when any registered skill serves this intent. */
  serves(intent: string): boolean {
    for (const s of this.skills.values())
      if (s.intents.includes(intent)) return true;
    return false;
  }

  /** Resolve the deterministic handler for an intent, or null
   *  when no registered skill serves it. */
  handlerFor(intent: string): ((input: string) => string) | null {
    for (const s of this.skills.values()) {
      if (s.intents.includes(intent)) {
        return (input: string) => s.handler(intent, input) ?? "";
      }
    }
    return null;
  }
}
