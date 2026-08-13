import * as THREE from 'three';
import { CollarConfig } from '../types';
import { ProcessedCollarData } from './collarProcessor';
import { download3MFFile, ThreeMFMeshObject } from './threeMfExporter';
import { createCollarPlateShape } from '../components/3d/CollarViewer';

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
  const pW = config.plateWidth || 48;
  const pH = config.plateHeight || 32;
  const pDepth = config.plateThickness || 4.0;
  const pBevel = Math.min(1.2, config.plateBevel || 1.0);
  const pts = processedData?.contourPoints || [];

  const plateShape = createCollarPlateShape(config.plateStyle, pW, pH, pts, pBevel);
  const objects: ThreeMFMeshObject[] = [];
  let nextId = 2;

  // Object 1: Main Plate Body
  const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
    depth: Math.max(2, pDepth - pBevel),
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: pBevel,
    bevelThickness: pBevel,
  });
  plateGeo.center();
  plateGeo.computeVertexNormals();
  objects.push(bufferGeometryTo3MFMesh(plateGeo, nextId++, 'Placa Base Mascota', config.plateColor));

  // Object 2: Decorative Rim / Border
  const rimGeo = new THREE.ExtrudeGeometry(plateShape, {
    depth: 0.8,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.25,
    bevelThickness: 0.25,
  });
  rimGeo.center();
  rimGeo.translate(0, 0, pDepth / 2 + 0.4);
  objects.push(bufferGeometryTo3MFMesh(rimGeo, nextId++, 'Borde Decorativo', config.borderColor || '#D4AF37'));

  // Object 3: Raised Text / Pet Name & Phone Relief Inlay
  const textReliefGeo = new THREE.ExtrudeGeometry(plateShape, {
    depth: 0.6,
    bevelEnabled: false,
  });
  textReliefGeo.center();
  textReliefGeo.scale(0.88, 0.88, 1);
  textReliefGeo.translate(0, 0, pDepth / 2 + 0.7);
  objects.push(bufferGeometryTo3MFMesh(textReliefGeo, nextId++, `Grabado (${config.petName || 'Mascota'})`, config.textColor || '#FFFFFF'));

  // Object 4: Mounting Hardware (Dangling Eyelet Ring if dangling)
  if (config.mountType === 'dangling') {
    const eyeletRadius = (config.ringDiameter || 4.5) / 2 + 1.2;
    const eyeletGeo = new THREE.TorusGeometry(eyeletRadius, 1.2, 16, 28);
    eyeletGeo.translate(0, -pH / 2 - eyeletRadius * 0.6, 0);
    objects.push(bufferGeometryTo3MFMesh(eyeletGeo, nextId++, 'Argolla de Sujeción', config.plateColor));
  }

  const filename = `NebulabStudio_PlacaCollar_${config.petName || 'Mascota'}_AMS.3mf`;
  await download3MFFile(objects, filename);
}
