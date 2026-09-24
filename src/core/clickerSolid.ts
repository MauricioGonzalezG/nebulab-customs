import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Manifold, ManifoldToplevel, Mesh } from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';

let engine: Promise<ManifoldToplevel> | undefined;
const loadEngine = () => {
  engine ??= import('manifold-3d')
    .then(({ default: Module }) => Module({ locateFile: () => wasmUrl }))
    .then(api => { api.setup(); return api; })
    .catch(error => { engine = undefined; throw error; });
  return engine;
};

function toManifold(api: ManifoldToplevel, geometry: THREE.BufferGeometry): Manifold {
  const positions = new THREE.BufferGeometry();
  positions.setAttribute('position', geometry.getAttribute('position').clone());
  if (geometry.index) positions.setIndex(geometry.index.clone());
  const welded = mergeVertices(positions, 1e-4);
  const mesh = new api.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(welded.getAttribute('position').array),
    triVerts: new Uint32Array(welded.index!.array),
  });
  const solid = new api.Manifold(mesh);
  positions.dispose();
  welded.dispose();
  if (solid.status() !== 'NoError' || solid.isEmpty()) {
    solid.delete();
    throw new Error('No se pudo preparar una geometría sólida para el clicker.');
  }
  return solid;
}

function fromMesh(mesh: Mesh): THREE.BufferGeometry {
  const positions = new Float32Array(mesh.vertProperties.length / mesh.numProp * 3);
  for (let i = 0; i < positions.length / 3; i++) {
    positions.set(mesh.vertProperties.subarray(i * mesh.numProp, i * mesh.numProp + 3), i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  geometry.computeVertexNormals();
  return geometry;
}

// Une las piezas que se tocan en un único volumen cerrado antes de exportar.
export async function unionClickerGeometries(geometries: THREE.BufferGeometry[]): Promise<THREE.BufferGeometry> {
  if (geometries.length === 1) return geometries[0];
  const api = await loadEngine();
  const parts: Manifold[] = [];
  let united: Manifold | undefined;
  try {
    geometries.forEach(geometry => parts.push(toManifold(api, geometry)));
    united = api.Manifold.union(parts);
    if (united.status() !== 'NoError' || united.isEmpty()) throw new Error('El encaje del clicker no forma una pieza imprimible.');
    const components = united.decompose();
    const connected = components.length === 1;
    components.forEach(component => component.delete());
    if (!connected) throw new Error('La unión del clicker contiene piezas desconectadas.');
    return fromMesh(united.getMesh());
  } finally {
    united?.delete();
    parts.forEach(part => part.delete());
  }
}
