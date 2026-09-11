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
//
// TEMPORAL AXIS (audit phase 7, 2026-09-11): relations are
// VERSIONED. Each observation is stamped observed_at; a new
// observation that contradicts a current one SUPERSEDES it
// (the old version points at its replacement via
// superseded_by — nothing is silently overwritten).
// currentView() projects the present; history(subject)
// returns the full versioned past. The kernel's MODEL phase
// stamps observation time through relate() — the single
// point where observations enter the model.
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
  observed_at?: string | null;
  superseded_by?: string | null;
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
  /** CURRENT view only — superseded versions live in the
   *  observation log below (temporal axis, audit phase 7). */
  private relations = new Map<string, WorldRelation>();
  /** Full versioned observation log (current + superseded) —
   *  the temporal axis history() reads. */
  private observations: WorldRelation[] = [];
  private entities = new Map<string, WorldEntity>();
  /** Entity-kind memory per relation id (kinds live on DB rows,
   *  not on the WorldRelation projection) — lets re-observation
   *  persist a FULL row instead of a partial patch. */
  private kinds = new Map<
    string,
    { subjectKind: string; objectKind: string }
  >();
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
          "id,subject,relation,object,subject_kind,object_kind,confidence,provenance,created_at,observed_at,superseded_by",
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
        const versioned: WorldRelation = {
          id: row.id,
          subject: row.subject,
          relation: row.relation,
          object: row.object,
          confidence: row.confidence ?? 0.8,
          provenance: row.provenance ?? "hydrated",
          createdAt: row.created_at ?? new Date().toISOString(),
          observedAt: row.observed_at ?? row.created_at ?? new Date().toISOString(),
          supersededBy: row.superseded_by ?? null,
        };
        this.kinds.set(row.id, {
          subjectKind: row.subject_kind || "Concept",
          objectKind: row.object_kind || "Concept",
        });
        this.observations.push(versioned);
        // Superseded versions are history, not the present.
        if (!versioned.supersededBy) {
          this.relations.set(row.id, versioned);
        }
      }
      return this.relations.size;
    } catch {
      // Hydration failure is honest: the in-memory model still
      // operates; persistence retries on next write.
      return 0;
    }
  }

  /** Assert a relation (and both entities) into the model.
   *  Returns the stored relation.
   *
   *  TEMPORAL AXIS (audit phase 7, 2026-09-11):
   *  - every observation is stamped observed_at (the kernel's
   *    MODEL phase enters observations here — the single
   *    point where observation time is stamped);
   *  - re-observing the SAME subject+relation+object
   *    strengthens confidence and refreshes observed_at;
   *  - observing a DIFFERENT object for an existing current
   *    subject+relation pair SUPERSEDES the old version (it
   *    points at its replacement via superseded_by and leaves
   *    the current view) — nothing is silently overwritten;
   *    history(subject) still returns every version. */
  async relate(input: {
    subject: string;
    relation: string;
    object: string;
    subjectKind?: string;
    objectKind?: string;
    confidence: number;
    provenance: string;
  }): Promise<WorldRelation> {
    const observedAt = new Date().toISOString();
    const id = idFor(input.subject, input.relation, input.object);
    const existing = this.relations.get(id);
    if (existing) {
      // Strengthen confidence when re-observed — and stamp the
      // re-observation time (the temporal axis tracks the last
      // time this version was actually observed).
      existing.confidence = Math.min(
        0.99,
        existing.confidence + 0.5 * (1 - existing.confidence),
      );
      existing.observedAt = observedAt;
      const kind = this.kinds.get(id) ??
        { subjectKind: "Concept", objectKind: "Concept" };
      if (this.db) {
        try {
          // FULL row (not a partial patch): the re-observation
          // keeps the kinds and provenance of the stored
          // relation and stamps the new observation time.
          await this.db.from(WORLD_MODEL_TABLE).upsert({
            id,
            subject: existing.subject,
            relation: existing.relation,
            object: existing.object,
            subject_kind: kind.subjectKind,
            object_kind: kind.objectKind,
            confidence: existing.confidence,
            provenance: existing.provenance,
            superseded_by: null,
            observed_at: observedAt,
          });
        } catch {
          // Persistence failure does not corrupt the in-memory
          // model; the relation stays available for this run.
        }
      }
      return existing;
    }
    // SUPERSESSION — a new object for an existing current
    // subject+relation pair replaces the old version in the
    // current view; the old version is retained in the
    // observation log, pointing at its replacement.
    const supersededIds: string[] = [];
    for (const rel of this.relations.values()) {
      if (
        rel.subject.toLowerCase() === input.subject.toLowerCase() &&
        rel.relation.toLowerCase() === input.relation.toLowerCase() &&
        rel.object.toLowerCase() !== input.object.toLowerCase()
      ) {
        rel.supersededBy = id;
        supersededIds.push(rel.id);
        this.relations.delete(rel.id);
      }
    }
    const relation: WorldRelation = {
      id,
      subject: input.subject,
      relation: input.relation,
      object: input.object,
      confidence: input.confidence,
      provenance: input.provenance,
      createdAt: observedAt,
      observedAt,
      supersededBy: null,
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
    this.kinds.set(id, {
      subjectKind: input.subjectKind ?? "Concept",
      objectKind: input.objectKind ?? "Concept",
    });
    this.relations.set(id, relation);
    this.observations.push(relation);
    if (this.db) {
      try {
        // The superseded versions point at their replacement.
        for (const oldId of supersededIds) {
          await this.db
            .from(WORLD_MODEL_TABLE)
            .update({ superseded_by: id })
            .eq("id", oldId);
        }
        await this.db.from(WORLD_MODEL_TABLE).upsert({
          id,
          subject: input.subject,
          relation: input.relation,
          object: input.object,
          subject_kind: input.subjectKind ?? "Concept",
          object_kind: input.objectKind ?? "Concept",
          confidence: input.confidence,
          provenance: input.provenance,
          observed_at: observedAt,
          superseded_by: null,
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

  /** CURRENT VIEW (temporal axis, audit phase 7): every
   *  relation that has not been superseded — the world as it
   *  stands, each with its observation time. */
  currentView(): WorldRelation[] {
    return [...this.relations.values()].map((r) => ({ ...r }));
  }

  /** VERSIONED HISTORY (temporal axis, audit phase 7): every
   *  observation — current AND superseded — involving the
   *  subject, newest first. Superseded versions carry the id
   *  of their replacement; the timeline is never lossy. */
  history(subject: string): WorldRelation[] {
    const needle = subject.toLowerCase();
    return this.observations
      .filter(
        (r) =>
          r.subject.toLowerCase() === needle ||
          r.object.toLowerCase() === needle,
      )
      // newest first; same-timestamp ties resolve by insertion
      // order (the later observation is the newer one)
      .map((r, i) => ({ r, i }))
      .sort(
        (x, y) =>
          new Date(y.r.observedAt ?? y.r.createdAt).getTime() -
            new Date(x.r.observedAt ?? x.r.createdAt).getTime() ||
          y.i - x.i,
      )
      .map(({ r }) => ({ ...r }));
  }

  /** The full observation log — every version, current and
   *  superseded, newest first. */
  allObservations(): WorldRelation[] {
    return [...this.observations]
      .map((r, i) => ({ r, i }))
      .sort(
        (x, y) =>
          new Date(y.r.observedAt ?? y.r.createdAt).getTime() -
            new Date(x.r.observedAt ?? x.r.createdAt).getTime() ||
          y.i - x.i,
      )
      .map(({ r }) => ({ ...r }));
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
