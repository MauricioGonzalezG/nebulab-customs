import * as THREE from 'three';
import { ClickerConfig, ClickerBaseStyle } from '../types';
import { ProcessedClickerData } from './clickerProcessor';
import { createEyeletShape, getClickerEyelet, shapeFromContour } from './clickerGeometry';
import { CLICKER_SOCKET, createHollowBaseParts, createHollowCapParts } from './clickerFit';
import { unionClickerGeometries } from './clickerSolid';

function buildBaseShapeForStl(
  style: ClickerBaseStyle,
  scale: number,
  pts: Array<{ x: number; y: number }>,
  bevelRadius: number = 2.0,
  margin: number = 0
): THREE.Shape {
  const shape = new THREE.Shape();

  switch (style) {
    case 'circle':
      shape.absarc(0, 0, scale, 0, Math.PI * 2, false);
      break;

    case 'square':
      shape.moveTo(-scale, -scale);
      shape.lineTo(scale, -scale);
      shape.lineTo(scale, scale);
      shape.lineTo(-scale, scale);
      shape.closePath();
      break;

    case 'rounded-square': {
      const r = Math.min(bevelRadius * 2, scale * 0.4);
      const s = scale - r;
      shape.moveTo(-s, -scale);
      shape.lineTo(s, -scale);
      shape.absarc(s, -s, r, -Math.PI / 2, 0, false);
      shape.lineTo(scale, s);
      shape.absarc(s, s, r, 0, Math.PI / 2, false);
      shape.lineTo(-s, scale);
      shape.absarc(-s, s, r, Math.PI / 2, Math.PI, false);
      shape.lineTo(-scale, -s);
      shape.absarc(-s, -s, r, Math.PI, Math.PI * 1.5, false);
      shape.closePath();
      break;
    }

    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(a) * scale;
        const y = Math.sin(a) * scale;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      break;
    }

    case 'pill': {
      const h = scale * 0.65;
      const w = scale;
      shape.moveTo(-w + h, -h);
      shape.lineTo(w - h, -h);
      shape.absarc(w - h, 0, h, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(-w + h, h);
      shape.absarc(-w + h, 0, h, Math.PI / 2, Math.PI * 1.5, false);
      shape.closePath();
      break;
    }

    case 'heart': {
      const s = scale * 0.038;
      shape.moveTo(0, -15 * s);
      shape.bezierCurveTo(25 * s, -35 * s, 35 * s, -10 * s, 35 * s, 10 * s);
      shape.bezierCurveTo(35 * s, 25 * s, 20 * s, 35 * s, 0, 45 * s);
      shape.bezierCurveTo(-20 * s, 35 * s, -35 * s, 25 * s, -35 * s, 10 * s);
      shape.bezierCurveTo(-35 * s, -10 * s, -25 * s, -35 * s, 0, -15 * s);
      shape.closePath();
      break;
    }

    case 'shield': {
      const s = scale;
      shape.moveTo(-s * 0.9, -s * 0.9);
      shape.lineTo(s * 0.9, -s * 0.9);
      shape.lineTo(s * 0.9, s * 0.1);
      shape.bezierCurveTo(s * 0.9, s * 0.7, 0, s * 1.1, 0, s * 1.1);
      shape.bezierCurveTo(0, s * 1.1, -s * 0.9, s * 0.7, -s * 0.9, s * 0.1);
      shape.closePath();
      break;
    }

    case 'outline':
    default: {
      return shapeFromContour(pts, scale, margin);
    }
  }

  return shape;
}

/**
 * Exports high-precision manifold STL file
 */
export const downloadClickerSTL = async (
  processedData: ProcessedClickerData | null,
  config: ClickerConfig
) => {
  const baseMargin = config.type === 'clicker'
    ? Math.max(CLICKER_SOCKET.minimumBaseMargin, config.baseMargin ?? CLICKER_SOCKET.minimumBaseMargin)
    : config.baseMargin ?? 1.1;
  const scale = config.size / 2 - baseMargin;
  const pts = processedData?.contourPoints || [];
  const topH = config.topHeight;
  const baseH = config.type === 'clicker' ? Math.max(12, config.baseHeight) : config.baseHeight;

  // 1. Cap Shape
  const capShape = shapeFromContour(pts, scale);

  const capParts: THREE.BufferGeometry[] = config.type === 'clicker'
    ? createHollowCapParts(capShape, topH, config.switchTolerance || 0)
    : (() => {
        const geometry = new THREE.ExtrudeGeometry(capShape, {
          depth: Math.max(2, topH - 0.8), bevelEnabled: true,
          bevelSegments: 2, bevelSize: 0.8, bevelThickness: 0.8,
        });
        geometry.center();
        return [geometry];
      })();
  const capCombined = await unionClickerGeometries(capParts);
  capCombined.computeBoundingBox();

  // 2. Base Housing Shape
  const baseScale = scale + baseMargin;
  const baseShape = buildBaseShapeForStl(config.baseStyle, config.baseStyle === 'outline' ? scale : baseScale, pts, config.baseBevel, baseMargin);

  const baseParts: THREE.BufferGeometry[] = config.type === 'clicker'
    ? createHollowBaseParts(baseShape, baseH)
    : (() => {
        const bevel = Math.min(1.0, config.baseBevel ?? 1.0);
        const geometry = new THREE.ExtrudeGeometry(baseShape, {
          depth: Math.max(4, baseH - bevel), bevelEnabled: bevel > 0,
          bevelSegments: 2, bevelSize: bevel, bevelThickness: bevel,
        });
        geometry.center();
        return [geometry];
      })();
  const baseCombined = await unionClickerGeometries(baseParts);
  if (config.type === 'clicker') {
    // Orient the closed floor downward for a support-free printable tray.
    baseCombined.scale(1, 1, -1);
    const triangles = baseCombined.index!.array;
    for (let i = 0; i < triangles.length; i += 3) {
      const second = triangles[i + 1];
      triangles[i + 1] = triangles[i + 2];
      triangles[i + 2] = second;
    }
    baseCombined.index!.needsUpdate = true;
    baseCombined.computeVertexNormals();
  }
  baseCombined.computeBoundingBox();
  const baseOffset = (capCombined.boundingBox?.max.x ?? scale) - (baseCombined.boundingBox?.min.x ?? -baseScale) + 6;
  baseCombined.translate(baseOffset, 0, 0);

  const geometries = [capCombined, baseCombined];

  if (config.includeRing || config.type === 'keychain') {
    const eyeletGeo = new THREE.ExtrudeGeometry(createEyeletShape(config, pts), {
      depth: 4.5, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.35, bevelThickness: 0.35,
    });
    eyeletGeo.center();
    const eyelet = getClickerEyelet(config, pts);
    eyeletGeo.translate(baseOffset + eyelet.x, eyelet.y, baseH / 2 - 1 + (config.ringHeight || 0));
    geometries.push(eyeletGeo);
  }

  let stlString = `solid NebulabStudio_Clicker_${config.type}_${config.size}mm\n`;

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

  stlString += `endsolid NebulabStudio_Clicker_${config.type}_${config.size}mm\n`;

  const blob = new Blob([stlString], { type: 'model/stl' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `NebulabStudio_${config.type}_${config.size}mm_ReadyToPrint.stl`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
