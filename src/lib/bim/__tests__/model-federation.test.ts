/**
 * Federation tests: multiple real IFC models in one scene, built by the
 * existing buildScene() so geometry handling is not duplicated. Uses the
 * same real web-ifc fixture as the viewer tests.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { parseIfcModel, type IfcModelElement } from "../ifc-model-loader";
import {
  buildFederatedScene,
  disposeFederatedScene,
  federatedKey,
  modelsOverlap,
  pickFederatedElement,
  setModelVisibility,
} from "../model-federation";

const FIXTURES = join(__dirname, "fixtures");

async function loadCubeElements(): Promise<IfcModelElement[]> {
  const bytes = new Uint8Array(
    readFileSync(join(FIXTURES, "cube-advanced-brep.ifc")),
  );
  const result = await parseIfcModel(bytes);
  return result.elements;
}

async function twoModels() {
  const elements = await loadCubeElements();
  return buildFederatedScene([
    { id: "arch", name: "Architectural rev C", elements },
    { id: "struct", name: "Structural rev A", elements },
  ]);
}

describe("buildFederatedScene", () => {
  it("keeps each model in its own named group with provenance", async () => {
    const fed = await twoModels();
    expect(fed.models.size).toBe(2);
    expect(fed.group.children).toHaveLength(2);
    const arch = fed.models.get("arch")!;
    expect(arch.name).toBe("Architectural rev C");
    expect(arch.scene.group.userData.modelId).toBe("arch");
    expect(fed.group.children).toContain(arch.scene.group);
    disposeFederatedScene(fed);
  });

  it("keys meshes by model and GlobalId so identical ids never collide", async () => {
    const fed = await twoModels();
    const keys = [...fed.meshesByKey.keys()];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      expect(key).toMatch(/^(arch|struct):/);
    }
    const globalId = keys[0].split(":")[1];
    expect(fed.meshesByKey.has(federatedKey("arch", globalId))).toBe(true);
    expect(fed.meshesByKey.has(federatedKey("struct", globalId))).toBe(true);
    // The two entries are different mesh instances, not shared objects.
    const a = fed.meshesByKey.get(federatedKey("arch", globalId))![0];
    const b = fed.meshesByKey.get(federatedKey("struct", globalId))![0];
    expect(a).not.toBe(b);
    disposeFederatedScene(fed);
  });

  it("unions model bounds and reports extent overlap as a screening fact", async () => {
    const fed = await twoModels();
    expect(fed.boundingBox).not.toBeNull();
    expect(fed.boundingBox!.isEmpty()).toBe(false);
    // Both models use the same fixture geometry, so extents intersect.
    expect(modelsOverlap(fed, "arch", "struct")).toBe(true);
    // Unknown ids are answered honestly.
    expect(modelsOverlap(fed, "arch", "mep")).toBe(false);
    disposeFederatedScene(fed);
  });

  it("refuses duplicate or missing model ids instead of merging silently", async () => {
    const elements = await loadCubeElements();
    expect(() =>
      buildFederatedScene([
        { id: "arch", name: "A", elements },
        { id: "arch", name: "A again", elements },
      ]),
    ).toThrow(/Duplicate federated model id/);
    expect(() =>
      buildFederatedScene([{ id: "", name: "Nope", elements }]),
    ).toThrow(/id is required/);
  });

  it("hides a model from rendering and picking without touching the other", async () => {
    const fed = await twoModels();
    setModelVisibility(fed, "struct", false);
    expect(fed.models.get("struct")!.visible).toBe(false);
    expect(fed.models.get("struct")!.scene.group.visible).toBe(false);
    expect(fed.models.get("arch")!.scene.group.visible).toBe(true);

    // Camera looking straight at the origin from +Z: the cube is centred.
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 50);
    camera.lookAt(0, 0, 0);
    const picked = pickFederatedElement(fed, 0, 0, camera);
    expect(picked?.modelId).toBe("arch");

    setModelVisibility(fed, "arch", false);
    expect(pickFederatedElement(fed, 0, 0, camera)).toBeNull();
    disposeFederatedScene(fed);
  });

  it("disposes every model and clears the registries", async () => {
    const fed = await twoModels();
    disposeFederatedScene(fed);
    expect(fed.models.size).toBe(0);
    expect(fed.meshesByKey.size).toBe(0);
    expect(fed.group.children).toHaveLength(0);
  });
});
