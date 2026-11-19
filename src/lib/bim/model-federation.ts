/**
 * Pillar 3: model federation for the IFC viewer.
 *
 * Engine-1A #1 (BIM/CAD) milestone: hold several models (architecture,
 * structure, MEP) in one scene without merging their data. Each model
 * keeps its own group, provenance and visibility; picking returns the
 * model id as well as the GlobalId so issues can be attributed.
 *
 * Additive by design: every model's scene is built by the existing
 * buildScene(), so geometry handling, materials, highlighting and
 * disposal stay single-source. Nothing here re-parses or re-derives
 * geometry, and no clash claim is made - overlapping bounds are
 * reported as a fact, never as a resolved or classified conflict.
 */

import * as THREE from "three";

import type { IfcModelElement } from "./ifc-model-loader";
import {
  buildScene,
  disposeScene,
  type IfcSceneModel,
} from "./viewer-scene";

export interface FederatedModelInput {
  /** Stable id used by picking, toggles and issue attribution. */
  id: string;
  /** Display name, e.g. "Architectural rev C". */
  name: string;
  elements: IfcModelElement[];
}

export interface FederatedModelRecord {
  id: string;
  name: string;
  scene: IfcSceneModel;
  visible: boolean;
}

export interface FederatedScene {
  group: THREE.Group;
  models: Map<string, FederatedModelRecord>;
  /** `${modelId}:${globalId}` -> meshes of that element. */
  meshesByKey: Map<string, THREE.Mesh[]>;
  boundingBox: THREE.Box3 | null;
}

/** Composite key used everywhere outside the single-model API. */
export function federatedKey(modelId: string, globalId: string): string {
  return `${modelId}:${globalId}`;
}

/**
 * Build one scene per model and nest the groups under a single root.
 * A model with no geometry still appears in `models` so the UI can
 * say so honestly rather than hiding it.
 */
export function buildFederatedScene(
  models: readonly FederatedModelInput[],
): FederatedScene {
  const seen = new Set<string>();
  for (const model of models) {
    if (!model.id) throw new Error("Federated model id is required");
    if (seen.has(model.id)) {
      throw new Error(`Duplicate federated model id: ${model.id}`);
    }
    seen.add(model.id);
  }

  const root = new THREE.Group();
  root.name = "federated-models";
  const records = new Map<string, FederatedModelRecord>();
  const meshesByKey = new Map<string, THREE.Mesh[]>();
  const box = new THREE.Box3();
  let any = false;

  for (const model of models) {
    const scene = buildScene(model.elements);
    scene.group.name = `model:${model.id}`;
    scene.group.userData.modelId = model.id;
    scene.group.userData.modelName = model.name;
    // Picking walks the meshes, not the group: carry the model id onto
    // every mesh so a hit can be attributed without a parent lookup.
    scene.group.traverse((object) => {
      if ((object as THREE.Mesh).isMesh) {
        object.userData.modelId = model.id;
        object.userData.modelName = model.name;
      }
    });
    root.add(scene.group);
    records.set(model.id, {
      id: model.id,
      name: model.name,
      scene,
      visible: true,
    });
    for (const [globalId, meshes] of scene.meshesByElement) {
      meshesByKey.set(federatedKey(model.id, globalId), meshes);
    }
    if (scene.boundingBox) {
      box.union(scene.boundingBox);
      any = true;
    }
  }

  return {
    group: root,
    models: records,
    meshesByKey,
    boundingBox: any ? box : null,
  };
}

/** Show or hide one model without touching the others. */
export function setModelVisibility(
  federated: FederatedScene,
  modelId: string,
  visible: boolean,
): void {
  const record = federated.models.get(modelId);
  if (!record) return;
  record.visible = visible;
  record.scene.group.visible = visible;
}

/**
 * Pick the element under normalized device coordinates across every
 * visible model. Hidden models are skipped, so a toggle is honest
 * about what can be selected.
 */
export function pickFederatedElement(
  federated: FederatedScene,
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera,
): { modelId: string; globalId: string } | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const visibleGroups = [...federated.models.values()]
    .filter((m) => m.visible)
    .map((m) => m.scene.group);
  const hits = raycaster.intersectObjects(visibleGroups, true);
  for (const hit of hits) {
    const globalId = hit.object.userData?.globalId;
    const modelId = hit.object.userData?.modelId;
    if (typeof globalId === "string" && typeof modelId === "string") {
      return { modelId, globalId };
    }
  }
  return null;
}

/**
 * Bounding-box overlap between two models. This is a screening fact
 * for the issues workflow, not clash detection: it says the extents
 * intersect, never that a real conflict exists.
 */
export function modelsOverlap(
  federated: FederatedScene,
  modelA: string,
  modelB: string,
): boolean {
  const a = federated.models.get(modelA)?.scene.boundingBox;
  const b = federated.models.get(modelB)?.scene.boundingBox;
  if (!a || !b) return false;
  return a.intersectsBox(b);
}

/** Release every model's GPU buffers. */
export function disposeFederatedScene(federated: FederatedScene): void {
  for (const record of federated.models.values()) {
    disposeScene(record.scene);
  }
  federated.models.clear();
  federated.meshesByKey.clear();
  federated.group.clear();
}
