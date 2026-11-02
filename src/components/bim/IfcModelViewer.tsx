/**
 * Pillar 3: 3D IFC model viewer (web-ifc + Three.js), 100% client-side.
 *
 * Thin React shell around lib/bim/viewer-scene.ts: the mesh building,
 * picking and highlighting logic lives there and is unit-tested headless.
 * This component owns the WebGL renderer, camera, orbit controls and
 * pointer events only.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { IfcModelElement } from "@/lib/bim/ifc-model-loader";
import {
  buildScene,
  disposeScene,
  fitCameraDistance,
  highlightElement,
  type IfcSceneModel,
} from "@/lib/bim/viewer-scene";

interface IfcModelViewerProps {
  elements: IfcModelElement[];
  selectedGlobalId: string | null;
  onSelect: (globalId: string | null) => void;
  className?: string;
}

export default function IfcModelViewer({
  elements,
  selectedGlobalId,
  onSelect,
  className,
}: IfcModelViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<IfcSceneModel | null>(null);
  const paintRef = useRef<(() => void) | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglError(
        "This browser or environment has no WebGL support, so the 3D model cannot be rendered. The quantity takeoff below is unaffected.",
      );
      return;
    }
    renderer.setSize(mount.clientWidth, Math.max(mount.clientHeight, 1));
    mount.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(
      50,
      Math.max(mount.clientWidth / Math.max(mount.clientHeight, 1), 0.1),
      0.1,
      100000,
    );
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(1, 2, 1.5);
    scene.add(dir);

    const model = buildScene(elements);
    scene.add(model.group);
    sceneRef.current = model;

    // Frame the model: camera on the box diagonal looking at the centre.
    const center = model.boundingBox
      ? model.boundingBox.getCenter(new THREE.Vector3())
      : new THREE.Vector3(0, 0, 0);
    const dist = fitCameraDistance(model.boundingBox);
    camera.position.set(
      center.x + dist * 0.7,
      center.y + dist * 0.7,
      center.z + dist * 0.7,
    );
    camera.lookAt(center);
    camera.updateMatrixWorld();

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.update();

    highlightElement(model, selectedGlobalId);
    renderer.render(scene, camera);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downAt: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!downAt) return;
      // Treat as a click only when the pointer barely moved (orbit vs pick).
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      downAt = null;
      if (moved > 5) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(model.group.children, false);
      const id =
        hits.length > 0 ? (hits[0].object.userData.globalId as string) : null;
      onSelect(hits.length > 0 ? id : null);
    };
    const onFrame = () => {
      controls.update();
      renderer.render(scene, camera);
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    controls.addEventListener("change", onFrame);
    onFrame();
    paintRef.current = () => renderer.render(scene, camera);
    setRendered(model.meshesByElement.size);

    return () => {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.removeEventListener("change", onFrame);
      paintRef.current = null;
      controls.dispose();
      disposeScene(model);
      scene.remove(model.group);
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [elements, onSelect]);

  // Selection highlight follows the prop without rebuilding the scene; repaint.
  useEffect(() => {
    const model = sceneRef.current;
    if (!model) return;
    highlightElement(model, selectedGlobalId);
    paintRef.current?.();
  }, [selectedGlobalId, rendered]);

  if (webglError) {
    return (
      <div
        className={`rounded-xl border border-input bg-muted/40 p-4 text-sm text-muted-foreground ${className ?? ""}`}
      >
        {webglError}
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={`h-[420px] w-full overflow-hidden rounded-xl border border-input bg-card ${className ?? ""}`}
      data-testid="ifc-viewer-canvas"
      data-rendered-elements={rendered}
    />
  );
}
