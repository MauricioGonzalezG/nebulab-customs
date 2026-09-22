import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';

const compiled = await build({ entryPoints: ['src/components/3d/plateKeychainPhysics.ts', 'src/components/3d/plateKeychain.ts'], bundle: true, write: false, outdir: 'unused', platform: 'node', format: 'esm' });
const modules = await Promise.all(compiled.outputFiles.map(file => import(`data:text/javascript;base64,${Buffer.from(file.text).toString('base64')}`)));
const { createKeychainDynamics, KEYCHAIN_ANCHOR, LINK_LENGTH, LINK_COUNT, RING_RADIUS } = modules[0];
const { createPlateKeychain } = modules[1];
const size = { width: 60, height: 30, thickness: 3, relief: 0.8 };
const identity = new THREE.Matrix4();
const lengths = [...Array(LINK_COUNT).fill(LINK_LENGTH), RING_RADIUS];
const check = (simulation, matrix = identity, scale = 1) => {
  const points = simulation.positions;
  assert(points.every(point => point.toArray().every(Number.isFinite)), 'Finite coordinates');
  assert(points[0].distanceTo(KEYCHAIN_ANCHOR.clone().applyMatrix4(matrix)) < 1e-7, 'Eyelet stays anchored');
  for (let i = 0; i < lengths.length; i++) {
    assert(Math.abs(points[i].distanceTo(points[i + 1]) - lengths[i] * scale) < 0.3 * scale, `Link ${i} stays connected`);
  }
};

const simulation = createKeychainDynamics();
simulation.update(0, identity, size);
const initialX = simulation.positions.at(-1).x;
for (let i = 0; i < 600; i++) simulation.update(1 / 60, identity, size);
check(simulation);
assert(Math.abs(simulation.positions.at(-1).x - KEYCHAIN_ANCHOR.x) < 0.1, 'Gravity settles the ring under the eyelet');
assert(Math.abs(initialX - simulation.positions.at(-1).x) > 15, 'Gravity visibly moves the ring');

// Mover la sujeción no debe arrastrar rígidamente toda la cadena.
const moved = new THREE.Matrix4();
const before = simulation.positions.at(-1).clone();
for (let i = 1; i <= 30; i++) {
  moved.makeTranslation(12 * i / 30, 0, 0);
  simulation.update(1 / 60, moved, size);
  check(simulation, moved);
}
assert(Math.abs(simulation.positions.at(-1).x - before.x - 12) > 1, 'Ring lags behind a moving plate');
const released = simulation.positions.at(-1).clone();
for (let i = 0; i < 20; i++) simulation.update(1 / 60, moved, size);
assert(released.distanceTo(simulation.positions.at(-1)) > 0.5, 'Ring keeps swinging after release');
for (let i = 0; i < 700; i++) simulation.update(1 / 60, moved, size);
assert(Math.abs(simulation.positions.at(-1).x - KEYCHAIN_ANCHOR.x - 12) < 0.1, 'Damping returns the ring to rest');

// El paso fijo mantiene el resultado en pantallas de distinta frecuencia.
const endpoints = [30, 60, 120].map(fps => {
  const run = createKeychainDynamics();
  for (let i = 0; i < fps * 3; i++) run.update(1 / fps, identity, size);
  check(run);
  return run.positions.at(-1).clone();
});
assert(endpoints.every(point => point.distanceTo(endpoints[0]) < 0.01), 'Frame-rate-independent simulation');

for (const width of [45, 60, 90]) {
  const run = createKeychainDynamics();
  const scale = 60 / width;
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 360; i++) {
    matrix.makeRotationY(Math.sin(i / 60) * 1.4).scale(new THREE.Vector3(scale, scale, scale));
    run.update(1 / 60, matrix, { ...size, width, height: width / 2 });
    check(run, matrix, scale);
  }
  run.update(120, matrix, { ...size, width, height: width / 2 });
  check(run, matrix, scale);
  run.reset();
  run.update(0, matrix, size);
  check(run, matrix, scale);
}
// Revisar las mallas finales, además del esqueleto de la simulación.
const keychain = createPlateKeychain();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 1000);
camera.position.set(0, -48, 150);
camera.lookAt(0, 0, 0);
for (let i = 0; i < 300; i++) {
  keychain.group.rotation.y = Math.sin(i / 45) * 1.2;
  keychain.update(1 / 60, camera);
  const ring = keychain.group.getObjectByName('keychain-ring');
  const lastLink = keychain.group.getObjectByName(`keychain-link-${LINK_COUNT - 1}`);
  const ringContact = new THREE.Vector3(0, RING_RADIUS, 0).applyQuaternion(ring.quaternion).add(ring.position);
  const linkContact = new THREE.Vector3(0, -LINK_LENGTH / 2, 0).applyQuaternion(lastLink.quaternion).add(lastLink.position);
  assert(ringContact.distanceTo(linkContact) < 0.3, 'Rendered ring stays connected while swinging and rotating');
  assert(Math.abs(ring.quaternion.length() - 1) < 1e-6, 'Valid ring orientation');
}
keychain.dispose();
console.log('Keychain: gravity, inertia, damping, attachment, frame rates, sizes, suspension, reset and rendered joints passed.');
