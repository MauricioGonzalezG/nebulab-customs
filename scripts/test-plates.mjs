import assert from 'node:assert/strict';
import { build } from 'esbuild';
import Module from 'manifold-3d';
import * as THREE from 'three';
import JSZip from 'jszip';

// Bundle TS without emitting temporary files. Geometry tests use the same WASM
// engine as the browser and inspect the actual exported buffers.
const compiled = await build({ entryPoints: ['src/core/plateBuilder.ts', 'src/core/plateExporter.ts'], bundle: true, write: false, outdir: 'unused', platform: 'node', format: 'esm' });
const modules = await Promise.all(compiled.outputFiles.map(file => import(`data:text/javascript;base64,${Buffer.from(file.text).toString('base64')}`)));
const { buildPlate, DEFAULT_PLATE, cleanPlateText } = modules[0];
const { exportPlate } = modules[1];
const api = await Module();
api.setup();

function verifyClosedConnected(geometry) {
  const indices = geometry.index.array;
  const edges = new Map();
  const neighbors = new Map();
  for (let i = 0; i < indices.length; i += 3) {
    for (let j = 0; j < 3; j++) {
      const a = indices[i + j], b = indices[i + (j + 1) % 3];
      const key = `${Math.min(a, b)},${Math.max(a, b)}`;
      const entry = edges.get(key) ?? { count: 0, orientation: 0 };
      entry.count++; entry.orientation += a < b ? 1 : -1;
      edges.set(key, entry);
      if (!neighbors.has(a)) neighbors.set(a, new Set());
      neighbors.get(a).add(b);
    }
  }
  for (const edge of edges.values()) { assert.equal(edge.count, 2, 'Watertight edge'); assert.equal(edge.orientation, 0, 'Outward winding'); }
  const visited = new Set(), pending = [indices[0]];
  while (pending.length) {
    const vertex = pending.pop();
    if (visited.has(vertex)) continue;
    visited.add(vertex);
    pending.push(...neighbors.get(vertex));
  }
  assert.equal(visited.size, neighbors.size, 'All letters and eyelet join one solid');
}

const cases = [
  DEFAULT_PLATE,
  { ...DEFAULT_PLATE, text: 'HHW699', subtitle: '' },
  { ...DEFAULT_PLATE, text: 'ÁÉÍÓÚ Ñ', subtitle: 'BOGOTÁ' },
  { ...DEFAULT_PLATE, text: 'WWWWWWWWWWWW', subtitle: 'COLOMBIA 1234567890', width: 45, height: 24, thickness: 2, relief: 0.4, holeDiameter: 6 },
  { ...DEFAULT_PLATE, text: 'B8O0', subtitle: '', width: 90, height: 45, thickness: 5, relief: 1.6, holeDiameter: 3, border: false },
  { ...DEFAULT_PLATE, text: '', subtitle: '', border: false },
];
for (const config of cases) {
  const model = buildPlate(api, config);
  try {
    verifyClosedConnected(model.solid);
    model.solid.computeBoundingBox();
    assert.equal(model.solid.boundingBox.min.z, 0, 'Base sits on print bed');
    assert(model.volume > 0);
    assert(model.solid.boundingBox.max.z <= config.thickness + config.relief + 0.00001);
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const base = new THREE.Mesh(model.base, material);
    const ray = new THREE.Raycaster(new THREE.Vector3(-config.width / 2 - 1, 0, 20), new THREE.Vector3(0, 0, -1));
    assert.equal(ray.intersectObject(base).length, 0, 'Eyelet hole passes through the base');
    ray.ray.origin.x = 0;
    assert(ray.intersectObject(base).length > 0, 'Base is solid under text');
    material.dispose();
  } finally { model.dispose(); }
}
assert.equal(cleanPlateText('abc😀123', 12), 'ABC123');

const model = buildPlate(api, DEFAULT_PLATE);
let saved;
globalThis.document = { createElement: () => ({ click() {} }) };
URL.createObjectURL = blob => { saved = blob; return 'blob:test'; };
URL.revokeObjectURL = () => {};
globalThis.setTimeout = () => 0;
await exportPlate(model, DEFAULT_PLATE, 'stl');
const stl = new DataView(await saved.arrayBuffer());
assert.equal(stl.byteLength, 84 + stl.getUint32(80, true) * 50, 'Valid binary STL length');
assert.equal(stl.getUint32(80, true), model.solid.index.count / 3);
await exportPlate(model, DEFAULT_PLATE, '3mf');
const zip = await JSZip.loadAsync(await saved.arrayBuffer());
const xml = await zip.file('3D/3dmodel.model').async('string');
assert(xml.includes('unit="millimeter"'));
assert.equal((xml.match(/<item /g) ?? []).length, 1, 'Single assembled build item');
assert.equal((xml.match(/<component /g) ?? []).length, 2, 'Two aligned material parts');
assert(xml.includes('pindex="0"') && xml.includes('pindex="1"'));
assert(zip.file('[Content_Types].xml') && zip.file('_rels/.rels'));
model.dispose();
console.log('PASS: 6 plate configurations, watertight connected solids, through-hole, flat base, STL and 3MF exports.');
