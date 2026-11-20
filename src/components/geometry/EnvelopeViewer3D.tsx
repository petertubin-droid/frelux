/**
 * The reconciled envelope, rendered.
 *
 * Thin React shell around lib/geometry/envelope-scene.ts: the solid is built
 * and tested headless there, and this component owns only the WebGL renderer,
 * the camera and the orbit controls.
 *
 * What it shows is what was measured: the four walls at their reconciled
 * dimensions, a real hole for every opening that was traced, and the roof at
 * the measured pitch. When no rise was measured the roof is drawn flat and the
 * caption says so, rather than a pitch being invented for the render.
 */

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { EnvelopeResult, ViewId } from "@/lib/geometry/envelope";
import {
  buildEnvelopeScene,
  cameraDistanceFor,
  sceneDimensions,
  type SceneOpening,
} from "@/lib/geometry/envelope-scene";
import { formatNumber } from "@/lib/convert/units";

interface EnvelopeViewer3DProps {
  envelope: EnvelopeResult;
  openings?: Partial<Record<ViewId, SceneOpening[]>>;
  className?: string;
}

export default function EnvelopeViewer3D({
  envelope,
  openings,
  className,
}: EnvelopeViewer3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [dims, setDims] = useState<{
    widthM: number;
    heightM: number;
    depthM: number;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setWebglError(
        "This browser has no WebGL support, so the 3D view cannot be drawn. The measured quantities are unaffected.",
      );
      return;
    }

    const model = buildEnvelopeScene({ envelope, openings });
    setDims(sceneDimensions(model.bounds));

    const width = Math.max(mount.clientWidth, 1);
    const height = Math.max(mount.clientHeight, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1115);
    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xffffff, 1.5);
    key.position.set(1, 2, 1.5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-1.5, 1, -1);
    scene.add(fill);
    scene.add(model.group);

    const center = model.bounds.isEmpty()
      ? new THREE.Vector3(0, 1.5, 0)
      : model.bounds.getCenter(new THREE.Vector3());
    const distance = cameraDistanceFor(model.bounds);
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.05, 5000);
    camera.position.set(
      center.x + distance * 0.75,
      center.y + distance * 0.5,
      center.z + distance * 0.75,
    );
    camera.lookAt(center);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(center);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.02;
    controls.minDistance = 1;
    controls.maxDistance = distance * 4;
    controls.update();

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
    };
    controls.addEventListener("change", render);
    render();

    const onResize = () => {
      const w = Math.max(mount.clientWidth, 1);
      const h = Math.max(mount.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      render();
    };
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(onResize)
        : null;
    observer?.observe(mount);
    window.addEventListener("resize", onResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
      controls.removeEventListener("change", render);
      controls.dispose();
      scene.remove(model.group);
      model.group.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as
          THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [envelope, openings]);

  if (webglError) {
    return (
      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
        {webglError}
      </p>
    );
  }

  return (
    <div className={className}>
      <div
        ref={mountRef}
        className="h-72 w-full overflow-hidden rounded-xl border border-border bg-[#0f1115]"
        role="img"
        aria-label="Three dimensional view of the measured envelope"
      />
      <p className="mt-2 text-[11px] text-muted-foreground">
        {dims
          ? `Measured solid: ${formatNumber(dims.widthM, 2)} m wide, ${formatNumber(dims.depthM, 2)} m deep, ${formatNumber(dims.heightM, 2)} m to the ridge. Walls drawn 200 mm thick; openings cut where you traced them.`
          : "Building the measured solid."}
        {isFlatRoof(envelope)
          ? " No roof rise was measured, so the roof is drawn flat."
          : ` Roof drawn at ${formatNumber(envelope.roofPitchDeg, 2)}° to the measured rise.`}
      </p>
    </div>
  );
}

function isFlatRoof(envelope: EnvelopeResult): boolean {
  return envelope.roofRiseMm === null || !(envelope.roofRiseMm > 0);
}
