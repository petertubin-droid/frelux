/**
 * Pillar 3: Three.js scene construction for the IFC model viewer.
 *
 * Pure scene-building, picking and highlighting against real three.js
 * objects, so the geometry path is exercised in unit tests without a
 * WebGL renderer. The React viewer component (IfcModelViewer.tsx) is a thin
 * shell around this module.
 */

import * as THREE from "three";

import type { IfcModelElement } from "./ifc-model-loader";

export interface IfcSceneModel {
  group: THREE.Group;
  /** globalId -> meshes of that element. */
  meshesByElement: Map<string, THREE.Mesh[]>;
  /** scene bounding box of all placed meshes (null when empty). */
  boundingBox: THREE.Box3 | null;
}

const HIGHLIGHT_COLOR = new THREE.Color(0x1f6feb);

/**
 * Build one Mesh per geometry part of every element. Positions/normals come
 * straight from web-ifc's interleaved buffer; the placement is web-ifc's
 * column-major flatTransformation.
 */
export function buildScene(elements: IfcModelElement[]): IfcSceneModel {
  const group = new THREE.Group();
  const meshesByElement = new Map<string, THREE.Mesh[]>();
  const box = new THREE.Box3();
  let any = false;

  for (const element of elements) {
    if (!element.globalId || element.geometry.length === 0) continue;
    const meshes: THREE.Mesh[] = [];
    for (const part of element.geometry) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(part.positions, 3),
      );
      geometry.setAttribute(
        "normal",
        new THREE.BufferAttribute(part.normals, 3),
      );
      geometry.setIndex(new THREE.BufferAttribute(part.indices, 1));
      const material = new THREE.MeshLambertMaterial({
        color: new THREE.Color(part.color[0], part.color[1], part.color[2]),
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      if (part.matrix.length === 16) {
        mesh.applyMatrix4(new THREE.Matrix4().fromArray(part.matrix));
      }
      mesh.userData = {
        globalId: element.globalId,
        expressID: element.expressID,
      };
      meshes.push(mesh);
      group.add(mesh);
      geometry.computeBoundingBox();
      if (geometry.boundingBox) {
        box.expandByObject(mesh);
        any = true;
      }
    }
    if (meshes.length > 0) meshesByElement.set(element.globalId, meshes);
  }

  return { group, meshesByElement, boundingBox: any ? box : null };
}

/** Best-fit camera distance to frame the whole model. */
export function fitCameraDistance(
  boundingBox: THREE.Box3 | null,
  fovDegrees = 50,
): number {
  if (!boundingBox || boundingBox.isEmpty()) return 10;
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  const radius = Math.max(size.length() / 2, 1e-6);
  const fovRad = (fovDegrees * Math.PI) / 180;
  return (radius / Math.sin(fovRad / 2)) * 1.2;
}

/**
 * Highlight one element (by GlobalId) in the scene and un-highlight every
 * other element. Idempotent: safe to call on every selection change.
 */
export function highlightElement(
  scene: IfcSceneModel,
  globalId: string | null,
): void {
  for (const meshes of scene.meshesByElement.values()) {
    for (const mesh of meshes) {
      const material = mesh.material as THREE.MeshLambertMaterial;
      material.emissive.setHex(0x000000);
    }
  }
  if (!globalId) return;
  for (const mesh of scene.meshesByElement.get(globalId) ?? []) {
    const material = mesh.material as THREE.MeshLambertMaterial;
    material.emissive.copy(HIGHLIGHT_COLOR);
    material.emissiveIntensity = 0.6;
  }
}

/**
 * Pick the element under normalized device coordinates (-1..1). Returns the
 * GlobalId or null when the ray hits nothing.
 */
export function pickElement(
  scene: IfcSceneModel,
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera,
): string | null {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
  const hits = raycaster.intersectObjects(scene.group.children, false);
  for (const hit of hits) {
    const globalId = hit.object.userData?.globalId;
    if (typeof globalId === "string") return globalId;
  }
  return null;
}

/** Release GPU-side buffers when the viewer unmounts. */
export function disposeScene(scene: IfcSceneModel): void {
  for (const meshes of scene.meshesByElement.values()) {
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  }
  scene.group.clear();
  scene.meshesByElement.clear();
}
