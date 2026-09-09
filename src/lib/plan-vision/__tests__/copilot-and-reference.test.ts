// =========================================================
// PLAN VISION TESTS, Copilot bridge (§19), upload validation
// (§23), and the REFERENCE TEST (§25): the same dimensions
// through the manual calculator and through the plan workflow
// MUST produce identical quantities.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  describeVerifiedPlan,
  hasVerifiedPlanData,
  planFactsForCopilot,
} from "../copilot-bridge";
import { inferDocumentKind, validateUpload } from "../persistence";
import { confirmElement, editRoom } from "../review";
import { explicitDimension, unknownDimension } from "../dimensions";
import type {
  ExtractedBuildingFact,
  ExtractedRoom,
  PlanExtraction,
} from "../types";
import { resolveRequirements } from "@/lib/ai-foundation/requirements";
import type { FreluxContext } from "@/lib/ai-foundation/types";

let seq = 0;
function room(over: Partial<ExtractedRoom> = {}): ExtractedRoom {
  seq++;
  return {
    id: `r${seq}`,
    name: `Room ${seq}`,
    spaceType: "bedroom",
    length: explicitDimension(4, "m", 0.9),
    width: explicitDimension(3, "m", 0.9),
    height: explicitDimension(3, "m", 0.9),
    openings: [],
    floor: 1,
    provenance: { documentId: "doc1", page: 1, method: "vision_model" },
    confidence: 0.9,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function fact(
  key: string,
  valueM: number,
  over: Partial<ExtractedBuildingFact> = {},
): ExtractedBuildingFact {
  seq++;
  return {
    id: `f${seq}`,
    key,
    label: key.replace(/_/g, " "),
    dimension: explicitDimension(valueM, "m", 0.95),
    provenance: { documentId: "doc1", page: 1, method: "vision_model" },
    confidence: 0.9,
    reviewStatus: "ai_extracted",
    corrections: [],
    extractedAt: "2026-09-07T00:00:00Z",
    verifiedAt: null,
    ...over,
  };
}

function extraction(over: Partial<PlanExtraction> = {}): PlanExtraction {
  return {
    id: "ext1",
    documentId: "doc1",
    version: 1,
    scale: null,
    rooms: [],
    roof: null,
    buildingFacts: [],
    notes: [],
    warnings: [],
    issues: [],
    nativeUnit: "meters",
    extractedAt: "2026-09-07T00:00:00Z",
    ...over,
  };
}

// =========================================================
// COPILOT BRIDGE (§19)
// =========================================================

describe("Copilot bridge (§19)", () => {
  it("exposes VERIFIED building facts as project_data the resolver prioritizes", () => {
    const ex = extraction({
      buildingFacts: [
        confirmElement(fact("building_length", 15)),
        confirmElement(fact("building_width", 10)),
      ],
    });
    const facts = planFactsForCopilot(ex);
    const lengthFact = facts.find((f) => f.key === "building_length")!;
    expect(lengthFact.origin).toBe("project_data");
    expect(lengthFact.value).toBe(15);
    expect(lengthFact.confidence).toBe(1);
    expect(lengthFact.evidence).toContain("plan document");
  });

  it("does NOT expose unverified AI observations as project data", () => {
    const ex = extraction({
      buildingFacts: [fact("building_length", 15), fact("building_width", 10)],
      rooms: [room()],
    });
    expect(hasVerifiedPlanData(ex)).toBe(false);
    expect(planFactsForCopilot(ex)).toHaveLength(0);
  });

  it("exposes the first verified room for room-level tasks", () => {
    const ex = extraction({
      rooms: [confirmElement(room({ name: "Master Bedroom" }))],
    });
    const facts = planFactsForCopilot(ex);
    const length = facts.find((f) => f.key === "length")!;
    expect(length.value).toBe(4);
    expect(length.label).toContain("Master Bedroom");
    expect(facts.find((f) => f.key === "wallHeight")!.value).toBe(3);
  });

  it("describes the verified plan for Copilot answers (§19)", () => {
    const verified = extraction({
      rooms: [confirmElement(room({ name: "BATH" }))],
    });
    expect(describeVerifiedPlan(verified)).toContain("1 room");
    expect(describeVerifiedPlan(verified)).toContain("BATH");
    expect(describeVerifiedPlan(extraction({ rooms: [room()] }))).toContain(
      "No verified rooms yet",
    );
  });

  it("feeds the AI Foundation requirements resolver, no unnecessary questions (§19)", () => {
    const ex = extraction({
      buildingFacts: [
        confirmElement(fact("building_length", 15)),
        confirmElement(fact("building_width", 10)),
        confirmElement(fact("number_of_floors", 2)),
      ],
    });
    const context: FreluxContext = {
      userId: "u1",
      project: null,
      marketDataAvailable: false,
    };
    const resolution = resolveRequirements("building_estimate", context, [
      ...planFactsForCopilot(ex),
    ]);
    // Everything the plan knows is resolved from the PLAN (project_data),
    // not from smart defaults, the Copilot asks no unnecessary questions.
    expect(resolution.resolved.building_length?.value).toBe(15);
    expect(resolution.resolved.building_length?.origin).toBe("project_data");
    expect(resolution.resolved.building_width?.value).toBe(10);
    expect(resolution.resolved.number_of_floors?.value).toBe(2);
    // What the plan does NOT know falls back to visible assumptions
    // (bungalow default), never fabricated plan data.
    expect(resolution.resolved.building_type?.origin).toBe("smart_default");
    expect(resolution.resolved.building_type?.value).toBe("bungalow");
    // Nothing is left missing, and nothing plan-derived needed asking.
    expect(resolution.missing).toHaveLength(0);
    expect(resolution.assumptions.map((a) => a.key)).toContain("building_type");
  });

  it("unverified rooms stay invisible to the requirements resolver", () => {
    const ex = extraction({ rooms: [room()] });
    const context: FreluxContext = {
      userId: "u1",
      project: null,
      marketDataAvailable: false,
    };
    const resolution = resolveRequirements("painting_estimate", context, [
      ...planFactsForCopilot(ex),
    ]);
    expect(resolution.resolved.length).toBeUndefined();
    expect(resolution.missing.length).toBeGreaterThan(0);
  });
});

// =========================================================
// UPLOAD VALIDATION (§23)
// =========================================================

describe("upload validation (§23)", () => {
  it("accepts supported types within the size limit", () => {
    expect(
      validateUpload({ type: "application/pdf", size: 1024, name: "plan.pdf" })
        .ok,
    ).toBe(true);
    expect(
      validateUpload({
        type: "image/jpeg",
        size: 5 * 1024 * 1024,
        name: "plan.jpg",
      }).ok,
    ).toBe(true);
    expect(
      validateUpload({ type: "image/png", size: 1, name: "plan.png" }).ok,
    ).toBe(true);
  });

  it("rejects unsupported types", () => {
    const result = validateUpload({
      type: "application/msword",
      size: 100,
      name: "plan.doc",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("UNSUPPORTED_TYPE");
    expect(result.message).toContain("Unsupported file type");
  });

  it("rejects oversized files", () => {
    const result = validateUpload({
      type: "application/pdf",
      size: 30 * 1024 * 1024,
      name: "plan.pdf",
    });
    expect(result.ok).toBe(false);
    expect(result.code).toBe("TOO_LARGE");
  });

  it("rejects empty files", () => {
    expect(
      validateUpload({ type: "application/pdf", size: 0, name: "plan.pdf" })
        .code,
    ).toBe("EMPTY");
  });

  it("infers the document kind from name and mime type", () => {
    expect(inferDocumentKind("application/pdf", "site roof plan.pdf")).toBe(
      "roof_plan",
    );
    expect(inferDocumentKind("application/pdf", "front elevation.pdf")).toBe(
      "elevation",
    );
    expect(inferDocumentKind("application/pdf", "section A-A.pdf")).toBe(
      "section",
    );
    expect(inferDocumentKind("image/jpeg", "IMG_4032.jpg")).toBe("photograph");
    expect(inferDocumentKind("image/png", "Screenshot 2026.png")).toBe(
      "screenshot",
    );
    expect(inferDocumentKind("application/pdf", "anything.pdf")).toBe(
      "architectural_pdf",
    );
    expect(inferDocumentKind("image/jpeg", "site photo.jpg")).toBe(
      "photograph",
    );
  });
});

// =========================================================
// REFERENCE TEST (§25)
// Same dimensions: manual calculator vs plan-vision workflow
// MUST produce identical quantities, the workflow adds no math.
// =========================================================

describe("REFERENCE TEST, manual path vs plan-vision path (§25)", () => {
  const L = 4.8; // metres
  const W = 3.6;
  const H = 3.0;

  it("painting: identical litres/containers both ways", async () => {
    const { executeEngine } =
      await import("@/lib/ai-foundation/engines-registry");

    // ── MANUAL PATH: user types dimensions directly. ──
    const manual = await executeEngine("painting_project", {
      length: L,
      width: W,
      wallHeight: H,
      doors: 0,
      windows: 0,
      coats: 2,
      includeCeiling: true,
      wasteMargin: 10,
      unit: "meters",
    });
    expect(manual.ok).toBe(true);

    // ── PLAN-VISION PATH: same dims, extracted → confirmed → takeoff. ──
    const ex = extraction({
      rooms: [
        confirmElement(
          room({
            name: "MASTER BEDROOM",
            length: explicitDimension(L, "m", 0.95),
            width: explicitDimension(W, "m", 0.95),
            height: explicitDimension(H, "m", 0.95),
          }),
        ),
      ],
    });
    const { planRoomTakeoff, executeRoomTakeoff } = await import("../takeoff");
    const plan = planRoomTakeoff(ex, ["painting"]);
    expect(plan[0].status).toBe("ready");
    const executed = await executeRoomTakeoff(plan[0]);
    expect(executed.result!.ok).toBe(true);

    // IDENTICAL quantity lines, item by item.
    expect(executed.result!.quantities).toEqual(manual.quantities);
    expect(executed.result!.engine).toBe(manual.engine);
  });

  it("tyrolene: identical partition area both ways", async () => {
    const { executeEngine } =
      await import("@/lib/ai-foundation/engines-registry");

    const manual = await executeEngine("tyrolene_partition_area", {
      width: W,
      height: H,
    });
    expect(manual.ok).toBe(true);

    const ex = extraction({
      rooms: [
        confirmElement(
          room({
            name: "PARTITION",
            width: explicitDimension(W, "m", 0.95),
            height: explicitDimension(H, "m", 0.95),
          }),
        ),
      ],
    });
    const { planRoomTakeoff, executeRoomTakeoff } = await import("../takeoff");
    const plan = planRoomTakeoff(ex, ["tyrolene"]);
    expect(plan[0].status).toBe("ready");
    const executed = await executeRoomTakeoff(plan[0]);
    expect(executed.result!.ok).toBe(true);
    expect(executed.result!.quantities).toEqual(manual.quantities);
  });

  it("an EDITED room produces the same result as a manually-entered one", async () => {
    const { executeEngine } =
      await import("@/lib/ai-foundation/engines-registry");

    const manual = await executeEngine("painting_project", {
      length: 5.5,
      width: W,
      wallHeight: H,
      doors: 0,
      windows: 0,
    });

    const ex = extraction({
      rooms: [
        // AI couldn't read the length; the user typed it in review (§8/§17).
        editRoom(
          room({
            length: unknownDimension(),
            width: explicitDimension(W, "m", 0.95),
            height: explicitDimension(H, "m", 0.95),
          }),
          { lengthM: 5.5 },
        ),
      ],
    });
    const { planRoomTakeoff, executeRoomTakeoff } = await import("../takeoff");
    const executed = await executeRoomTakeoff(
      planRoomTakeoff(ex, ["painting"])[0],
    );
    expect(executed.result!.ok).toBe(true);
    expect(executed.result!.quantities).toEqual(manual.quantities);
  });
});
