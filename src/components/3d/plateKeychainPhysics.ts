import * as THREE from 'three';

export const LINK_LENGTH = 4.7;
export const LINK_COUNT = 6;
export const RING_RADIUS = 11.5;
export const KEYCHAIN_ANCHOR = new THREE.Vector3(-Math.sin(0.58) * 6.8, -Math.cos(0.58) * 6.8, 0);
const REST_DIRECTION = new THREE.Vector3(-Math.sin(0.58), -Math.cos(0.58), 0);
const STEP = 1 / 120;

export interface KeychainPlateSize { width: number; height: number; thickness: number; relief: number }

// La simulación vive en coordenadas de la cámara: al orbitar, la placa mueve
// el punto de sujeción mientras la cadena conserva su inercia en pantalla.
export function createKeychainDynamics() {
  const lengths = [...Array<number>(LINK_COUNT).fill(LINK_LENGTH), RING_RADIUS];
  const positions = Array.from({ length: lengths.length + 1 }, () => new THREE.Vector3());
  const previous = positions.map(point => point.clone());
  const weights = positions.map((_, i) => i === 0 ? 0 : i === positions.length - 1 ? 0.18 : 1);
  const anchor = new THREE.Vector3();
  const delta = new THREE.Vector3();
  const velocity = new THREE.Vector3();
  const localPoint = new THREE.Vector3();
  const inverse = new THREE.Matrix4();
  let initialized = false;
  let accumulator = 0;

  const reset = () => { initialized = false; accumulator = 0; };
  const update = (elapsed: number, localToView: THREE.Matrix4, size: KeychainPlateSize) => {
    const scale = new THREE.Vector3().setFromMatrixScale(localToView).x;
    inverse.copy(localToView).invert();
    anchor.copy(KEYCHAIN_ANCHOR).applyMatrix4(localToView);
    if (!initialized) {
      let distance = 0;
      positions.forEach((point, i) => {
        if (i) distance += lengths[i - 1];
        point.copy(KEYCHAIN_ANCHOR).addScaledVector(REST_DIRECTION, distance).applyMatrix4(localToView);
        previous[i].copy(point);
      });
      initialized = true;
    }
    // No acumular tiempo de pestañas suspendidas ni pasos de duración variable.
    accumulator += Math.min(Math.max(elapsed, 0), STEP * 8);
    while (accumulator >= STEP) {
      accumulator -= STEP;
      positions[0].copy(anchor);
      for (let i = 1; i < positions.length; i++) {
        const point = positions[i];
        velocity.copy(point).sub(previous[i]).multiplyScalar(Math.exp(-1.65 * STEP));
        previous[i].copy(point);
        point.add(velocity);
        point.y -= 240 * scale * STEP * STEP;
      }
      // Restricciones de distancia: eslabones articulados, argolla más pesada.
      for (let iteration = 0; iteration < 18; iteration++) {
        for (let i = 0; i < lengths.length; i++) {
          delta.copy(positions[i + 1]).sub(positions[i]);
          const distance = delta.length();
          if (distance < 1e-8) continue;
          delta.multiplyScalar((distance - lengths[i] * scale) / (distance * (weights[i] + weights[i + 1])));
          positions[i].addScaledVector(delta, weights[i]);
          positions[i + 1].addScaledVector(delta, -weights[i + 1]);
        }
        // Colisión conservadora con el cuerpo de la placa; el ojal queda libre.
        for (let i = 1; i < positions.length; i++) {
          const radius = i === positions.length - 1 ? RING_RADIUS + 0.7 : 0.75;
          localPoint.copy(positions[i]).applyMatrix4(inverse);
          const min = [1 - radius, -size.height / 2 - radius, -size.thickness / 2 - radius];
          const max = [size.width + 1 + radius, size.height / 2 + radius, size.thickness / 2 + size.relief + radius];
          const coordinates = [localPoint.x, localPoint.y, localPoint.z];
          if (coordinates.every((value, axis) => value > min[axis] && value < max[axis])) {
            let correction = Infinity;
            let correctionAxis = 0;
            for (let axis = 0; axis < 3; axis++) {
              for (const edge of [min[axis], max[axis]]) {
                const candidate = edge - coordinates[axis];
                if (Math.abs(candidate) < Math.abs(correction)) { correction = candidate; correctionAxis = axis; }
              }
            }
            localPoint.setComponent(correctionAxis, localPoint.getComponent(correctionAxis) + correction);
            positions[i].copy(localPoint).applyMatrix4(localToView);
          }
        }
      }
    }
    positions[0].copy(anchor);
    return positions;
  };
  return { positions, reset, update };
}
