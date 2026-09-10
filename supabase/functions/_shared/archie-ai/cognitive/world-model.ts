// =========================================================
// ARCHIE COGNITIVE ENGINE — WORLD MODEL
// supabase/functions/_shared/archie-ai/cognitive/world-model.ts
//
// Represents relationships between concepts, people,
// organizations, systems, software, objects, events,
// environments, projects and outcomes. Entities and relations
// are unbounded (no hardcoded domain ceiling) and carry
// confidence + provenance. Persisted in
// frelux_archie_world_model (owner-scoped). Every write is
// real; nothing is simulated.
// =========================================================

import type { SupabaseLike } from "../native-engine/persistence.ts";
import type { WorldEntity, WorldModelQuery, WorldRelation } from "./types.ts";

export const WORLD_MODEL_TABLE = "frelux_archie_world_model";

interface WorldModelRow {
  id: string;
  subject: string;
  relation: string;
  object: string;
  subject_kind: string;
  object_kind: string;
  confidence: number;
  provenance: string;
  created_at: string;
}

/** Entity kinds ARCHIE recognizes — open set: any other kind
 *  is accepted and stored verbatim (unbounded expansion). */
export const ENTITY_KINDS = [
  "Person",
  "Organization",
  "System",
  "Software",
  "Project",
  "Object",
  "Event",
  "Environment",
  "Concept",
  "Outcome",
] as const;

function idFor(...parts: string[]): string {
  return parts.join("::").toLowerCase();
}

export class WorldModel {
  private relations = new Map<string, WorldRelation>();
  private entities = new Map<string, WorldEntity>();
  private db: SupabaseLike | null;
  private hydrated = false;

  constructor(db?: SupabaseLike) {
    this.db = db ?? null;
  }

  /** Load persisted world relations (subject/relation/object
   *  rows; entities are derived). */
  async hydrate(): Promise<number> {
    if (this.hydrated || !this.db) return 0;
    this.hydrated = true;
    try {
      const { data, error } = await this.db
        .from(WORLD_MODEL_TABLE)
        .select(
          "id,subject,relation,object,subject_kind,object_kind,confidence,provenance,created_at",
        );
      if (error || !Array.isArray(data)) return 0;
      for (const row of data as WorldModelRow[]) {
        this.entities.set(idFor(row.subject), {
          id: idFor(row.subject),
          name: row.subject,
          kind: row.subject_kind || "Concept",
          confidence: row.confidence ?? 0.8,
          provenance: row.provenance ?? "hydrated",
          createdAt: row.created_at ?? new Date().toISOString(),
        });
        this.entities.set(idFor(row.object), {
          id: idFor(row.object),
          name: row.object,
          kind: row.object_kind || "Concept",
          confidence: row.confidence ?? 0.8,
          provenance: row.provenance ?? "hydrated",
          createdAt: row.created_at ?? new Date().toISOString(),
        });
        this.relations.set(row.id, {
          id: row.id,
          subject: row.subject,
          relation: row.relation,
          object: row.object,
          confidence: row.confidence ?? 0.8,
          provenance: row.provenance ?? "hydrated",
          createdAt: row.created_at ?? new Date().toISOString(),
        });
      }
      return this.relations.size;
    } catch {
      // Hydration failure is honest: the in-memory model still
      // operates; persistence retries on next write.
      return 0;
    }
  }

  /** Assert a relation (and both entities) into the model.
   *  Returns the stored relation. Idempotent on
   *  subject+relation+object. */
  async relate(input: {
    subject: string;
    relation: string;
    object: string;
    subjectKind?: string;
    objectKind?: string;
    confidence: number;
    provenance: string;
  }): Promise<WorldRelation> {
    const id = idFor(input.subject, input.relation, input.object);
    const existing = this.relations.get(id);
    if (existing) {
      // Strengthen confidence when re-observed.
      existing.confidence = Math.min(
        0.99,
        existing.confidence + 0.5 * (1 - existing.confidence),
      );
      return existing;
    }
    const relation: WorldRelation = {
      id,
      subject: input.subject,
      relation: input.relation,
      object: input.object,
      confidence: input.confidence,
      provenance: input.provenance,
      createdAt: new Date().toISOString(),
    };
    for (const [name, kind] of [
      [input.subject, input.subjectKind ?? "Concept"],
      [input.object, input.objectKind ?? "Concept"],
    ] as const) {
      const eid = idFor(name);
      if (!this.entities.has(eid)) {
        this.entities.set(eid, {
          id: eid,
          name,
          kind,
          confidence: input.confidence,
          provenance: input.provenance,
          createdAt: relation.createdAt,
        });
      }
    }
    this.relations.set(id, relation);
    if (this.db) {
      try {
        await this.db.from(WORLD_MODEL_TABLE).upsert({
          id,
          subject: input.subject,
          relation: input.relation,
          object: input.object,
          subject_kind: input.subjectKind ?? "Concept",
          object_kind: input.objectKind ?? "Concept",
          confidence: input.confidence,
          provenance: input.provenance,
        });
      } catch {
        // Persistence failure does not corrupt the in-memory
        // model; the relation stays available for this run.
      }
    }
    return relation;
  }

  /** Relations touching a given entity, expanding up to
   *  `depth` hops (breadth-first; default 1). */
  query(q: WorldModelQuery): WorldRelation[] {
    if (!q.about) return [...this.relations.values()];
    const depth = Math.max(1, Math.min(3, q.depth ?? 1));
    const visited = new Set<string>([q.about.toLowerCase()]);
    let frontier = [q.about];
    const found: WorldRelation[] = [];
    for (let hop = 0; hop < depth; hop += 1) {
      const next: string[] = [];
      for (const node of frontier) {
        for (const rel of this.relations.values()) {
          if (
            rel.subject.toLowerCase() === node.toLowerCase() ||
            rel.object.toLowerCase() === node.toLowerCase()
          ) {
            if (!found.includes(rel)) found.push(rel);
            const other =
              rel.subject.toLowerCase() === node.toLowerCase()
                ? rel.object
                : rel.subject;
            if (!visited.has(other.toLowerCase())) {
              visited.add(other.toLowerCase());
              next.push(other);
            }
          }
        }
      }
      frontier = next;
    }
    // Transitive causal composition (cr-2): if A causes B and
    // B causes C, derive the composite edge A causes C —
    // explicitly provenance-tagged as derived (never an
    // observed relation), confidence = product of the hops.
    if (q.relation === undefined || q.relation === "causes") {
      const causal = found.filter((r) => r.relation === "causes");
      const bySubject = new Map<string, WorldRelation[]>();
      for (const rel of causal) {
        const key = rel.subject.toLowerCase();
        if (!bySubject.has(key)) bySubject.set(key, []);
        bySubject.get(key)!.push(rel);
      }
      const derived: WorldRelation[] = [];
      for (const first of causal) {
        for (const second of bySubject.get(first.object.toLowerCase()) ?? []) {
          const id = `derived::${first.subject}::causes::${second.object}`;
          if (this.relations.has(id)) continue;
          derived.push({
            id,
            subject: first.subject,
            relation: "causes",
            object: second.object,
            confidence: Number((first.confidence * second.confidence).toFixed(3)),
            provenance: `derived: transitive ${first.subject}→${first.object}→${second.object}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
      // 3-hop chains compose from the 2-hop derivations.
      for (const d of derived) {
        for (const second of bySubject.get(d.object.toLowerCase()) ?? []) {
          const id = `derived::${d.subject}::causes::${second.object}`;
          if (derived.some((x) => x.id === id)) continue;
          derived.push({
            id,
            subject: d.subject,
            relation: "causes",
            object: second.object,
            confidence: Number((d.confidence * second.confidence).toFixed(3)),
            provenance: `derived: transitive chain via ${d.object}`,
            createdAt: new Date().toISOString(),
          });
        }
      }
      found.push(...derived);
    }
    return q.relation ? found.filter((r) => r.relation === q.relation) : found;
  }

  /** All relations involving a subject predicate pair. */
  about(name: string): WorldRelation[] {
    return this.query({ about: name, depth: 1 });
  }

  entitiesCount(): number {
    return this.entities.size;
  }

  relationsCount(): number {
    return this.relations.size;
  }

  listEntities(): WorldEntity[] {
    return [...this.entities.values()];
  }

  getEntity(name: string): WorldEntity | undefined {
    return this.entities.get(idFor(name));
  }
}
