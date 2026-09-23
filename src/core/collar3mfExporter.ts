import * as THREE from 'three';
import { CollarConfig } from '../types';
import { ProcessedCollarData } from './collarProcessor';
import { download3MFFile, ThreeMFMeshObject } from './threeMfExporter';
import { buildCollarModel } from './collarModel';
import { loadPlateEngine } from './plateBuilder';

function bufferGeometryTo3MFMesh(
  geometry: THREE.BufferGeometry,
  id: number,
  name: string,
  hexColor: string
): ThreeMFMeshObject {
  const geo = geometry.index ? geometry : geometry.toNonIndexed();
  const posAttr = geo.attributes.position;
  const vertices: Array<{ x: number; y: number; z: number }> = [];
  const triangles: Array<{ v1: number; v2: number; v3: number }> = [];

  for (let i = 0; i < posAttr.count; i++) {
    vertices.push({
      x: Number(posAttr.getX(i).toFixed(4)),
      y: Number(posAttr.getY(i).toFixed(4)),
      z: Number(posAttr.getZ(i).toFixed(4)),
    });
  }

  if (geo.index) {
    const index = geo.index;
    for (let i = 0; i < index.count; i += 3) {
      triangles.push({
        v1: index.getX(i),
        v2: index.getX(i + 1),
        v3: index.getX(i + 2),
      });
    }
  } else {
    for (let i = 0; i < posAttr.count; i += 3) {
      triangles.push({
        v1: i,
        v2: i + 1,
        v3: i + 2,
      });
    }
  }

  return {
    id,
    name,
    hexColor,
    vertices,
    triangles,
  };
}

/**
 * Exports full watertight multi-color 3MF file for Pet Collar ID Tag
 * (Directly loadable into Bambu Studio, OrcaSlicer, PrusaSlicer, Bambu Handy)
 */
export async function downloadCollar3MF(
  processedData: ProcessedCollarData | null,
  config: CollarConfig
): Promise<void> {
  const api = await loadPlateEngine();
  const model = buildCollarModel(api, config, processedData);
  try {
    const pieces: Array<[THREE.BufferGeometry, string, string]> = [
      [model.base, 'Placa y montaje', config.plateColor],
      [model.border, 'Borde decorativo', config.borderColor],
      [model.text, `Nombre y telefono: ${config.petName || 'Mascota'}`, config.textColor],
      [model.logo, 'Logo e icono', processedData?.dominantColors?.[0] || config.borderColor],
    ];
    const objects: ThreeMFMeshObject[] = pieces
      .filter(([geometry]) => geometry.getAttribute('position').count > 0)
      .map(([geometry, name, color], i) => bufferGeometryTo3MFMesh(geometry, i + 2, name, color));
    const safeName = (config.petName || 'Mascota').replace(/[^\p{L}\p{N}-]+/gu, '_');
    await download3MFFile(objects, `NebulabStudio_Collar_${safeName}_AMS.3mf`);
  } finally {
    model.dispose();
  }
}
