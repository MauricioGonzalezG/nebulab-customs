import assert from 'node:assert/strict';
import { build } from 'esbuild';
import * as THREE from 'three';
import Module from 'manifold-3d';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const compiled = await build({ entryPoints: ['src/core/clickerFit.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const { CLICKER_SOCKET, createHollowBaseParts, createHollowCapParts, createSwitchCoverGeometry } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`);

const circle = radius => {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  return shape;
};
const rayHits = (parts, x, zStart, maxDistance = Infinity) => {
  const ray = new THREE.Raycaster(new THREE.Vector3(x, 0, zStart), new THREE.Vector3(0, 0, 1), 0, maxDistance);
  return parts.flatMap(geometry => ray.intersectObject(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))));
};

const cap = createHollowCapParts(circle(18), 8, 0);
assert.equal(rayHits(cap, 6, -1, 4).length, 0, 'The cap underside has a deep open cavity');
assert(rayHits(cap, 0, -5, 2).length > 0, 'The cap has a closed printed roof');
assert.equal(rayHits([cap[2]], 0, -2, 12).length, 0, 'The cross socket is open through the stem');
assert(rayHits([cap[2]], 2.8, -2, 12).length > 0, 'The cross socket has a printable outer wall');
cap[1].computeBoundingBox();
cap[2].computeBoundingBox();
assert((cap[1].boundingBox?.max.z ?? 0) > (cap[2].boundingBox?.max.z ?? 0), 'The socket remains recessed within the sliding skirt');

const base = createHollowBaseParts(circle(18), 12);
assert.equal(rayHits(base, 5, -7, 8).length, 0, 'The base has an open, switch-sized tray');
assert(rayHits(base, 5, -7, 13).length > 0, 'The base has a solid floor below its cavity');
assert(rayHits(base, 16, -7, 8).length > 0, 'The base retains an outside wall');
assert(CLICKER_SOCKET.opening > 14, 'The switch guides leave insertion clearance');

const cover = createSwitchCoverGeometry();
assert.equal(rayHits([cover], 0, -1).length, 0, 'The switch cover leaves room for the moving stem');
cover.dispose();

const api = await Module();
api.setup();
const asSolid = geometry => {
  const onlyPositions = new THREE.BufferGeometry();
  onlyPositions.setAttribute('position', geometry.attributes.position.clone());
  if (geometry.index) onlyPositions.setIndex(geometry.index.clone());
  const welded = mergeVertices(onlyPositions, 1e-4);
  const solid = new api.Manifold(new api.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(welded.attributes.position.array),
    triVerts: new Uint32Array(welded.index.array),
  }));
  assert.equal(solid.status(), 'NoError', 'Each printed volume is manifold');
  onlyPositions.dispose();
  welded.dispose();
  return solid;
};
const verifyJoined = (geometries, description) => {
  const parts = geometries.map(asSolid);
  const united = api.Manifold.union(parts);
  assert.equal(united.status(), 'NoError', `${description} is watertight`);
  const components = united.decompose();
  assert.equal(components.length, 1, `${description} is one printable piece`);
  components.forEach(component => component.delete());
  united.delete();
  parts.forEach(part => part.delete());
  geometries.forEach(geometry => geometry.dispose());
};

verifyJoined(cap, 'Hollow cap and cross socket');
verifyJoined(base, 'Closed-bottom base and switch guides');
for (const margin of [CLICKER_SOCKET.minimumBaseMargin, 3.5, 5]) {
  const capRadius = 17.5 - margin;
  const capParts = createHollowCapParts(circle(capRadius), 8, 0);
  const baseParts = createHollowBaseParts(circle(17.5), 12);
  capParts[0].computeBoundingBox();
  capParts[1].computeBoundingBox();
  baseParts[0].computeBoundingBox();
  const baseInnerRadius = 17.5 - CLICKER_SOCKET.wallThickness;
  assert((capParts[1].boundingBox?.max.x ?? Infinity) < baseInnerRadius,
    `The sliding skirt clears the base wall with ${margin} mm margin`);
  assert(Math.abs((capParts[1].boundingBox?.max.x ?? 0) - (capParts[0].boundingBox?.max.x ?? 0)) < 0.01,
    'The sliding wall follows the exact outside edge of the cap');
  const baseRimY = -2.4;
  const capRestY = baseRimY + 3.2 + 0.2 + CLICKER_SOCKET.capRoofThickness - 8 / 2;
  const skirtBottomY = capRestY - (capParts[1].boundingBox?.max.z ?? 0);
  assert(skirtBottomY < baseRimY, 'The skirt remains inside the base at rest');
  assert(baseRimY + 0.2 >= capRestY - 3.2 + 8 / 2 - CLICKER_SOCKET.capRoofThickness - 1e-4,
    'The cap roof clears the base rim through the click travel');
  verifyJoined(capParts, `Nested cap with ${margin} mm margin`);
  baseParts.forEach(part => part.dispose());
}
for (const height of [8, 10, 14]) {
  const parts = createHollowCapParts(circle(18), height, 0);
  parts[1].computeBoundingBox();
  parts[2].computeBoundingBox();
  const capRestY = -0.8;
  const rimY = -2.4;
  const roofUndersideY = capRestY + height / 2 - CLICKER_SOCKET.capRoofThickness;
  const skirtBottomY = capRestY - (parts[1].boundingBox?.max.z ?? 0);
  const socketTipY = capRestY - (parts[2].boundingBox?.max.z ?? 0);
  assert(roofUndersideY - 3.2 > rimY, `The ${height} mm roof clears the housing while pressed`);
  assert(skirtBottomY < rimY, `The ${height} mm skirt stays in the housing at rest`);
  assert(skirtBottomY - 3.2 > rimY - CLICKER_SOCKET.interiorDepth,
    `The ${height} mm skirt clears the base floor while pressed`);
  assert(Math.abs(socketTipY + 3.3) < 0.05, `The ${height} mm socket reaches the switch stem`);
  verifyJoined(parts, `${height} mm sliding cap`);
}
for (const radius of [12.5, 17.5, 30]) {
  verifyJoined(createHollowCapParts(circle(radius), 8, 0.2), `Hollow cap ${radius * 2} mm`);
  verifyJoined(createHollowBaseParts(circle(radius), 12), `Hollow base ${radius * 2} mm`);
}
for (const height of [12, 16, 20]) {
  verifyJoined(createHollowBaseParts(circle(18), height), `Hollow base ${height} mm high`);
}
const heart = new THREE.Shape();
heart.moveTo(0, -5.7);
heart.bezierCurveTo(9.5, -13.3, 13.3, -3.8, 13.3, 3.8);
heart.bezierCurveTo(13.3, 9.5, 7.6, 13.3, 0, 17.1);
heart.bezierCurveTo(-7.6, 13.3, -13.3, 9.5, -13.3, 3.8);
heart.bezierCurveTo(-13.3, -3.8, -9.5, -13.3, 0, -5.7);
heart.closePath();
verifyJoined(createHollowBaseParts(heart, 12), 'Hollow concave heart base');
verifyJoined(createHollowCapParts(heart, 8, 0), 'Hollow concave heart cap');
const shield = new THREE.Shape();
shield.moveTo(-14, -14);
shield.lineTo(14, -14);
shield.lineTo(14, 2);
shield.bezierCurveTo(14, 11, 0, 17, 0, 17);
shield.bezierCurveTo(0, 17, -14, 11, -14, 2);
shield.closePath();
verifyJoined(createHollowBaseParts(shield, 12), 'Hollow shield base');
verifyJoined(createHollowCapParts(shield, 8, 0), 'Hollow shield cap');
const triangle = new THREE.Shape();
triangle.moveTo(0, 18);
triangle.lineTo(-18, -14);
triangle.lineTo(18, -14);
triangle.closePath();
verifyJoined(createHollowCapParts(triangle, 8, 0), 'Sharp triangle cap without vertex protrusions');
verifyJoined(createHollowBaseParts(triangle, 12), 'Sharp triangle base without vertex protrusions');
const square = new THREE.Shape();
square.moveTo(-17.5, -17.5);
square.lineTo(17.5, -17.5);
square.lineTo(17.5, 17.5);
square.lineTo(-17.5, 17.5);
square.closePath();
verifyJoined(createHollowCapParts(square, 8, 0), 'Square cap with perimeter wall');
verifyJoined(createHollowBaseParts(square, 12), 'Square base with clean inside corners');
console.log('Clicker fit: hollow cap, cross socket, closed-bottom switch tray, and manifold export passed.');
