import * as THREE from 'three';
import { CollarConfig } from '../types';
import { ProcessedCollarData } from './collarProcessor';
import { createCollarPlateShape } from '../components/3d/CollarViewer';

/**
 * Exports high-precision manifold STL file for Pet Collar plate
 */
export const downloadCollarSTL = (
  processedData: ProcessedCollarData | null,
  config: CollarConfig
) => {
  const pW = config.plateWidth || 48;
  const pH = config.plateHeight || 32;
  const pDepth = config.plateThickness || 4.0;
  const pBevel = Math.min(1.2, config.plateBevel || 1.0);
  const pts = processedData?.contourPoints || [];

  const plateShape = createCollarPlateShape(config.plateStyle, pW, pH, pts, pBevel);

  const plateGeo = new THREE.ExtrudeGeometry(plateShape, {
    depth: Math.max(2, pDepth - pBevel),
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: pBevel,
    bevelThickness: pBevel,
  });
  plateGeo.center();

  // Add mounting ring if dangling
  const geometries: THREE.BufferGeometry[] = [plateGeo];

  if (config.mountType === 'dangling') {
    const eyeletRadius = (config.ringDiameter || 4.5) / 2 + 1.2;
    const eyeletGeo = new THREE.TorusGeometry(eyeletRadius, 1.2, 16, 28);
    eyeletGeo.translate(0, -pH / 2 - eyeletRadius * 0.6, 0);
    geometries.push(eyeletGeo);
  }

  let stlString = `solid NebulabStudio_PlacaCollar_${config.petName || 'Mascota'}\n`;

  for (const geo of geometries) {
    const nonIndexed = geo.toNonIndexed();
    const pos = nonIndexed.attributes.position;
    nonIndexed.computeVertexNormals();
    const norm = nonIndexed.attributes.normal;

    for (let i = 0; i < pos.count; i += 3) {
      const nx = norm ? norm.getX(i).toFixed(4) : '0';
      const ny = norm ? norm.getY(i).toFixed(4) : '0';
      const nz = norm ? norm.getZ(i).toFixed(4) : '1';

      stlString += `facet normal ${nx} ${ny} ${nz}\n  outer loop\n`;
      stlString += `    vertex ${pos.getX(i).toFixed(4)} ${pos.getY(i).toFixed(4)} ${pos.getZ(i).toFixed(4)}\n`;
      stlString += `    vertex ${pos.getX(i + 1).toFixed(4)} ${pos.getY(i + 1).toFixed(4)} ${pos.getZ(i + 1).toFixed(4)}\n`;
      stlString += `    vertex ${pos.getX(i + 2).toFixed(4)} ${pos.getY(i + 2).toFixed(4)} ${pos.getZ(i + 2).toFixed(4)}\n`;
      stlString += `  endloop\nendfacet\n`;
    }
  }

  stlString += `endsolid NebulabStudio_PlacaCollar_${config.petName || 'Mascota'}\n`;

  const blob = new Blob([stlString], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NebulabStudio_PlacaCollar_${config.petName || 'Mascota'}_ReadyToPrint.stl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
