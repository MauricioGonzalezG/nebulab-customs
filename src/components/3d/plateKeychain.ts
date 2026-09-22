import * as THREE from 'three';
import { createKeychainDynamics, KEYCHAIN_ANCHOR, LINK_COUNT, LINK_LENGTH, RING_RADIUS, type KeychainPlateSize } from './plateKeychainPhysics';

// Accesorios de presentación en milímetros, separados del sólido imprimible.
export function createPlateKeychain() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xdce2eb, metalness: 1, roughness: 0.23, envMapIntensity: 1.5,
  });
  const geometries: THREE.BufferGeometry[] = [];
  const addTube = (points: THREE.Vector3[], radius: number, closed: boolean) => {
    const curve = new THREE.CatmullRomCurve3(points, closed);
    const geometry = new THREE.TubeGeometry(curve, points.length * 3, radius, 12, closed);
    geometries.push(geometry);
    return new THREE.Mesh(geometry, material);
  };
  const oval = (width: number, length: number) => Array.from({ length: 48 }, (_, i) => {
    const angle = i / 48 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * width, Math.sin(angle) * length, 0);
  });

  const attachment = new THREE.Group();
  attachment.rotation.z = -0.58;
  const connector = addTube(oval(3.35, 4.2), 0.48, true);
  connector.rotation.y = Math.PI / 2;
  connector.position.y = -3.5;
  attachment.add(connector);
  group.add(attachment);

  const linkGeometry = addTube(oval(1.7, 3.25), 0.48, true).geometry;
  // El último eslabón ofrece holgura para ambas vueltas de la argolla y cruza
  // su plano a 90°, sin el empate coplanar de la primera versión.
  const terminalGeometry = addTube(oval(3.2, 3.25), 0.48, true).geometry;
  const links = Array.from({ length: LINK_COUNT }, (_, i) => {
    const link = new THREE.Mesh(i === LINK_COUNT - 1 ? terminalGeometry : linkGeometry, material);
    link.name = `keychain-link-${i}`;
    group.add(link);
    return link;
  });

  // Corte en el costado inferior, alejado de la unión. El paso de la espiral
  // supera el diámetro del alambre para que las dos vueltas no se atraviesen.
  const ringPoints = Array.from({ length: 193 }, (_, i) => {
    const t = i / 192;
    const angle = t * Math.PI * 3.94 - Math.PI / 4;
    return new THREE.Vector3(RING_RADIUS * Math.cos(angle), RING_RADIUS * Math.sin(angle), (t - 0.5) * 3.15);
  });
  const ring = addTube(ringPoints, 0.7, false);
  ring.name = 'keychain-ring';
  const capGeometry = new THREE.SphereGeometry(0.7, 12, 8);
  geometries.push(capGeometry);
  for (const point of [ringPoints[0], ringPoints[ringPoints.length - 1]]) {
    const cap = new THREE.Mesh(capGeometry, material);
    cap.position.copy(point);
    ring.add(cap);
  }
  group.add(ring);

  const dynamics = createKeychainDynamics();
  const localToView = new THREE.Matrix4();
  const viewToLocal = new THREE.Matrix4();
  const direction = new THREE.Vector3();
  const twist = new THREE.Quaternion();
  const yAxis = new THREE.Vector3(0, 1, 0);
  const normalView = new THREE.Vector3(0, 0, 1);
  const normalLocal = new THREE.Vector3(0, 0, 1);
  const up = new THREE.Vector3();
  const right = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const basis = new THREE.Matrix4();
  let orientationInitialized = false;
  const localPoints = Array.from({ length: LINK_COUNT + 2 }, () => new THREE.Vector3());
  let size: KeychainPlateSize = { width: 60, height: 30, thickness: 3, relief: 0.8 };

  const orient = (mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3, angle = 0) => {
    up.copy(from).sub(to).normalize();
    normal.copy(normalLocal).addScaledVector(up, -normalLocal.dot(up));
    if (normal.lengthSq() < 1e-8) normal.set(1, 0, 0).addScaledVector(up, -up.x);
    normal.normalize();
    right.crossVectors(up, normal).normalize();
    normal.crossVectors(right, up);
    mesh.quaternion.setFromRotationMatrix(basis.makeBasis(right, up, normal));
    twist.setFromAxisAngle(yAxis, angle);
    mesh.quaternion.multiply(twist);
  };
  const pose = (points: THREE.Vector3[]) => {
    links.forEach((link, i) => {
      link.position.copy(points[i]).add(points[i + 1]).multiplyScalar(0.5);
      orient(link, points[i], points[i + 1], i % 2 === 0 ? 0 : Math.PI / 2);
    });
    ring.position.copy(points[LINK_COUNT + 1]);
    // La inercia ya viene del péndulo: conservar exactamente el punto de unión.
    orient(ring, points[LINK_COUNT], points[LINK_COUNT + 1]);
  };
  const reset = () => {
    dynamics.reset();
    orientationInitialized = false;
    normalLocal.set(0, 0, 1);
    const initialDirection = new THREE.Vector3(-Math.sin(0.58), -Math.cos(0.58), 0);
    localPoints.forEach((point, i) => point.copy(KEYCHAIN_ANCHOR).addScaledVector(initialDirection,
      Math.min(i, LINK_COUNT) * LINK_LENGTH + (i > LINK_COUNT ? RING_RADIUS : 0)));
    pose(localPoints);
  };
  reset();

  return {
    group,
    reset,
    configure: (next: KeychainPlateSize) => {
      if (Object.keys(size).some(key => size[key as keyof KeychainPlateSize] !== next[key as keyof KeychainPlateSize])) {
        size = { width: next.width, height: next.height, thickness: next.thickness, relief: next.relief };
        connector.scale.x = Math.max(1, (size.thickness / 2 + 0.65) / 1.85);
        reset();
      }
    },
    update: (elapsed: number, camera: THREE.Camera) => {
      group.updateWorldMatrix(true, false);
      camera.updateMatrixWorld();
      localToView.multiplyMatrices(camera.matrixWorldInverse, group.matrixWorld);
      viewToLocal.copy(localToView).invert();
      const points = dynamics.update(elapsed, localToView, size);
      if (!orientationInitialized) {
        normalView.set(0, 0, 1).transformDirection(localToView);
        orientationInitialized = true;
      }
      // Transportar el plano del aro conservando su orientación libre; girar
      // la placa no transmite un giro rígido a la argolla a través de la cadena.
      direction.copy(points[LINK_COUNT + 1]).sub(points[LINK_COUNT]).normalize();
      normalView.addScaledVector(direction, -normalView.dot(direction));
      if (normalView.lengthSq() < 1e-8) normalView.set(0, 0, 1).addScaledVector(direction, -direction.z);
      normalView.normalize();
      normalLocal.copy(normalView).transformDirection(viewToLocal);
      points.forEach((point, i) => localPoints[i].copy(point).applyMatrix4(viewToLocal));
      pose(localPoints);
    },
    dispose: () => { geometries.forEach(geometry => geometry.dispose()); material.dispose(); },
  };
}
