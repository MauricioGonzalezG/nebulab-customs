import assert from 'node:assert/strict';
import { build } from 'esbuild';
import Module from 'manifold-3d';
import * as THREE from 'three';
import JSZip from 'jszip';

// Mismo enfoque que test-plates: se empaqueta el TS en memoria y se inspeccionan
// las geometrías reales que produce el motor WASM del navegador.
const compiled = await build({
  entryPoints: ['src/core/ornamentBuilder.ts', 'src/core/ornamentExporter.ts', 'src/core/ornamentConfig.ts'],
  bundle: true, write: false, outdir: 'unused', platform: 'node', format: 'esm', loader: { '.wasm': 'empty' },
});
const modules = await Promise.all(compiled.outputFiles.map(file => import(`data:text/javascript;base64,${Buffer.from(file.text).toString('base64')}`)));
const { buildOrnament } = modules[0];
const { exportOrnament } = modules[1];
const { DEFAULT_ORNAMENT, ORNAMENT_SHAPE_LABELS, ORNAMENT_WINDOW_LABELS, ORNAMENT_SIZES } = modules[2];
const api = await Module();
api.setup();

function verifyClosedConnected(geometry, label) {
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
  for (const edge of edges.values()) { assert.equal(edge.count, 2, `${label}: watertight edge`); assert.equal(edge.orientation, 0, `${label}: outward winding`); }
  const visited = new Set(), pending = [indices[0]];
  while (pending.length) {
    const vertex = pending.pop();
    if (visited.has(vertex)) continue;
    visited.add(vertex);
    pending.push(...neighbors.get(vertex));
  }
  assert.equal(visited.size, neighbors.size, `${label}: one connected solid`);
}

// Distancia mínima entre dos conjuntos de contornos (grosor de pared del marco).
function minDistance(a, b) {
  let best = Infinity;
  for (const pa of a) for (const p of pa) for (const pb of b) for (let i = 0; i < pb.length; i++) {
    const q = pb[i], r = pb[(i + 1) % pb.length];
    const dx = r[0] - q[0], dy = r[1] - q[1];
    const t = Math.max(0, Math.min(1, ((p[0] - q[0]) * dx + (p[1] - q[1]) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(p[0] - q[0] - t * dx, p[1] - q[1] - t * dy));
  }
  return best;
}

const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const hits = (geometry, x, y) => new THREE.Raycaster(new THREE.Vector3(x, y, 50), new THREE.Vector3(0, 0, -1)).intersectObject(new THREE.Mesh(geometry, material)).length;

let count = 0, thinnest = Infinity;
for (const shape of Object.keys(ORNAMENT_SHAPE_LABELS)) {
  for (const window of Object.keys(ORNAMENT_WINDOW_LABELS)) {
    for (const text of ['', 'NAVIDAD 2026', 'WWWWWWWWWWWWWW']) {
      for (const { size } of ORNAMENT_SIZES) {
        const config = { ...DEFAULT_ORNAMENT, shape, window, text, size };
        const label = `${shape}/${window}/${text || 'sin texto'}/${size}`;
        const model = buildOrnament(api, config);
        try {
          verifyClosedConnected(model.back, `${label} tapa`);
          verifyClosedConnected(model.front, `${label} marco`);
          model.back.computeBoundingBox(); model.front.computeBoundingBox();
          assert.equal(model.back.boundingBox.min.z, 0, `${label}: tapa apoyada`);
          assert(Math.abs(model.front.boundingBox.min.z - config.backThickness) < 1e-5, `${label}: marco sobre la tapa`);
          assert(model.front.boundingBox.max.z <= config.backThickness + config.thickness + config.relief + 1e-5);
          assert(model.relief.getAttribute('position').count > 0, `${label}: tiene relieve de color`);
          const side = Math.max(model.bounds.maxX - model.bounds.minX, model.bounds.maxY - model.bounds.minY);
          assert(side >= size - 0.01 && side < size + 12, `${label}: tamaño ${side.toFixed(1)}`);
          // Orificio pasante en ambas piezas; ventana abierta en el marco y cerrada por la tapa.
          assert.equal(hits(model.back, ...model.hole), 0, `${label}: orificio en la tapa`);
          assert.equal(hits(model.front, ...model.hole), 0, `${label}: orificio en el marco`);
          const wx = (model.windowBounds.minX + model.windowBounds.maxX) / 2, wy = (model.windowBounds.minY + model.windowBounds.maxY) / 2;
          assert.equal(hits(model.front, wx, wy), 0, `${label}: ventana abierta`);
          assert(hits(model.back, wx, wy) > 0, `${label}: tapa detrás de la foto`);
          const windowWidth = model.windowBounds.maxX - model.windowBounds.minX;
          assert(windowWidth >= 14, `${label}: ventana de ${windowWidth.toFixed(1)} mm`);
          const outer = model.outline.filter(contour => contour.length > 60);
          const wall = minDistance(model.window, outer);
          assert(wall >= 2, `${label}: pared de ${wall.toFixed(2)} mm entre ventana y borde`);
          thinnest = Math.min(thinnest, wall);
          if (text) assert(model.textHeight > 1.2, `${label}: texto de ${model.textHeight.toFixed(2)} mm`);
          assert(model.photoArea.length >= 1 && model.volume > 0);
          count++;
        } finally { model.dispose(); }
      }
    }
  }
}

const config = { ...DEFAULT_ORNAMENT, text: 'EMMA 2026' };
const model = buildOrnament(api, config);
let saved;
globalThis.document = { createElement: () => ({ click() {} }) };
URL.createObjectURL = blob => { saved = blob; return 'blob:test'; };
URL.revokeObjectURL = () => {};
globalThis.setTimeout = () => 0;
await exportOrnament(model, config, 'stl');
const stl = new DataView(await saved.arrayBuffer());
assert.equal(stl.byteLength, 84 + stl.getUint32(80, true) * 50, 'Valid binary STL length');
assert.equal(stl.getUint32(80, true), (model.front.index.count + model.back.index.count) / 3, 'STL holds frame and back cover');
let minZ = Infinity;
for (let i = 0; i < stl.getUint32(80, true); i++) for (let v = 0; v < 3; v++) minZ = Math.min(minZ, stl.getFloat32(84 + i * 50 + 12 + v * 12 + 8, true));
assert(Math.abs(minZ) < 1e-5, 'Both pieces rest on the print bed');
await exportOrnament(model, config, '3mf');
const zip = await JSZip.loadAsync(await saved.arrayBuffer());
const xml = await zip.file('3D/3dmodel.model').async('string');
assert(xml.includes('unit="millimeter"'));
assert.equal((xml.match(/<item /g) ?? []).length, 2, 'Frame assembly and back cover on the bed');
assert.equal((xml.match(/<component /g) ?? []).length, 2, 'Frame body and colored relief stay aligned');
assert(xml.includes('pindex="0"') && xml.includes('pindex="1"'));
model.dispose();
material.dispose();
console.log(`PASS: ${count} ornament configurations (thinnest wall ${thinnest.toFixed(2)} mm), watertight connected pieces, through-hole, open window, STL and 3MF exports.`);
