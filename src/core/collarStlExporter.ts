import * as THREE from 'three';
import type { CollarConfig } from '../types';
import type { ProcessedCollarData } from './collarProcessor';
import { buildCollarModel } from './collarModel';
import { loadPlateEngine } from './plateBuilder';

function binaryStl(geometry: THREE.BufferGeometry): Blob {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const positions = source.getAttribute('position');
  const facets = Math.floor(positions.count / 3);
  const buffer = new ArrayBuffer(84 + facets * 50);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  new TextEncoder().encode('Nebulab Studio - Collar imprimible en milimetros').forEach((byte, i) => { bytes[i] = byte; });
  view.setUint32(80, facets, true);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const edge = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 0; i < facets; i++) {
    a.fromBufferAttribute(positions, 3 * i);
    b.fromBufferAttribute(positions, 3 * i + 1);
    c.fromBufferAttribute(positions, 3 * i + 2);
    normal.subVectors(b, a).cross(edge.subVectors(c, a)).normalize();
    let offset = 84 + 50 * i;
    for (const value of [normal.x, normal.y, normal.z, a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z]) {
      view.setFloat32(offset, value, true);
      offset += 4;
    }
    view.setUint16(offset, 0, true);
  }
  if (source !== geometry) source.dispose();
  return new Blob([buffer], { type: 'model/stl' });
}

export async function downloadCollarSTL(processedData: ProcessedCollarData | null, config: CollarConfig): Promise<void> {
  const api = await loadPlateEngine();
  const model = buildCollarModel(api, config, processedData);
  try {
    const url = URL.createObjectURL(binaryStl(model.solid));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `NebulabStudio_Collar_${(config.petName || 'Mascota').replace(/[^\p{L}\p{N}-]+/gu, '_')}.stl`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } finally {
    model.dispose();
  }
}
