import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three';

/** Shared hint text shown under every 3D viewer */
export const VIEWER_CONTROL_HINT =
  'Clic izquierdo: rotar • Clic derecho: desplazar • Rueda: zoom';

/**
 * Applies the same orbit interaction map across all product viewers:
 * left = rotate, right = pan, wheel = zoom.
 */
export function applyStandardOrbitControls(controls: OrbitControls): void {
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;
  controls.screenSpacePanning = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN,
  };
  // Prevent browser context menu on right-click pan
  controls.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
}
