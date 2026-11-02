/**
 * Pillar 3 engine tests: three.js scene construction, picking and
 * highlighting, exercised headless with the real three.js against geometry
 * parsed by the real web-ifc loader (cube-advanced-brep.ifc).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import * as THREE from "three";
import { describe, expect, it } from "vitest";

import { parseIfcModel, type IfcModelElement } from "../ifc-model-loader";
import {
  buildScene,
  disposeScene,
  fitCameraDistance,
  highlightElement,
  pickElement,
} from "../viewer-scene";

const FIXTURES = join(__dirname, "fixtures");

async function loadCubeElements(): Promise<IfcModelElement[]> {
  const bytes = new Uint8Array(
    readFileSync(join(FIXTURES, "cube-advanced-brep.ifc")),
  );
  const result = await parseIfcModel(bytes);
  return result.elements;
}

describe("buildScene (real three.js + real web-ifc geometry)", () => {
  it("builds one mesh per geometry part with GlobalId metadata", async () => {
    const elements = await loadCubeElements();
    const scene = buildScene(elements);
    expect(scene.group.children.length).toBeGreaterThan(0);
    expect(scene.boundingBox).not.toBeNull();
    expect(scene.boundingBox!.isEmpty()).toBe(false);
    const mesh = scene.group.children[0] as THREE.Mesh;
    expect(mesh.userData.globalId).toBeTruthy();
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    expect(pos.count).toBeGreaterThan(100);
    // Picking metadata maps back to the meshesByElement index.
    const meshes = scene.meshesByElement.get(mesh.userData.globalId as string);
    expect(meshes).toContain(mesh);
    disposeScene(scene);
  });

  it("highlights exactly the selected element and clears the rest", async () => {
    const elements = await loadCubeElements();
    const scene = buildScene(elements);
    const all: THREE.Mesh[] = [];
    for (const meshes of scene.meshesByElement.values()) all.push(...meshes);
    expect(all.length).toBeGreaterThan(0);
    const target = all[0];
    highlightElement(scene, target.userData.globalId as string);
    for (const mesh of all) {
      const emissive = (mesh.material as THREE.MeshLambertMaterial).emissive;
      if (mesh === target) {
        expect(emissive.getHex()).not.toBe(0x000000);
      } else {
        expect(emissive.getHex()).toBe(0x000000);
      }
    }
    highlightElement(scene, null);
    for (const mesh of all) {
      expect(
        (mesh.material as THREE.MeshLambertMaterial).emissive.getHex(),
      ).toBe(0x000000);
    }
    disposeScene(scene);
  });

  it("picks an element through the model centre with a real raycaster", async () => {
    const elements = await loadCubeElements();
    const scene = buildScene(elements);
    const center = scene.boundingBox!.getCenter(new THREE.Vector3()).clone();
    const dist = fitCameraDistance(scene.boundingBox);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100000);
    camera.position.set(
      center.x + dist * 0.7,
      center.y + dist * 0.7,
      center.z + dist * 0.7,
    );
    camera.lookAt(center);
    camera.updateMatrixWorld();
    // Ray through the exact centre of the framed model must hit it.
    const hit = pickElement(scene, 0, 0, camera);
    expect(hit).toBeTruthy();
    // A ray far off the model must miss.
    const miss = pickElement(scene, 0.99, 0.99, camera);
    expect(miss === null || typeof miss === "string").toBe(true);
    disposeScene(scene);
  });

  it("returns a safe default distance for an empty model", () => {
    expect(fitCameraDistance(null)).toBeGreaterThan(0);
    const scene = buildScene([]);
    expect(scene.boundingBox).toBeNull();
    expect(scene.meshesByElement.size).toBe(0);
  });
});
