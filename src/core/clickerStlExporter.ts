import * as THREE from 'three';
import { ClickerConfig, ClickerBaseStyle } from '../types';
import { ProcessedClickerData } from './clickerProcessor';

function buildBaseShapeForStl(
  style: ClickerBaseStyle,
  scale: number,
  pts: Array<{ x: number; y: number }>,
  bevelRadius: number = 2.0
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
      if (pts.length > 2) {
        shape.moveTo(pts[0].x * scale, pts[0].y * scale);
        for (let i = 1; i < pts.length; i++) {
          shape.lineTo(pts[i].x * scale, pts[i].y * scale);
        }
        shape.closePath();
      } else {
        shape.absarc(0, 0, scale, 0, Math.PI * 2, false);
      }
      break;
    }
  }

  return shape;
}

/**
 * Exports high-precision manifold STL file
 */
export const downloadClickerSTL = (
  processedData: ProcessedClickerData | null,
  config: ClickerConfig
) => {
  const scale = config.size / 2;
  const pts = processedData?.contourPoints || [];
  const topH = config.topHeight;
  const baseH = config.baseHeight;

  // 1. Cap Shape
  const capShape = new THREE.Shape();
  if (pts.length > 2) {
    capShape.moveTo(pts[0].x * scale, pts[0].y * scale);
    for (let i = 1; i < pts.length; i++) {
      capShape.lineTo(pts[i].x * scale, pts[i].y * scale);
    }
    capShape.closePath();
  } else {
    capShape.absarc(0, 0, scale, 0, Math.PI * 2, false);
  }

  const capBevel = 0.8;
  const capGeo = new THREE.ExtrudeGeometry(capShape, {
    depth: Math.max(2, topH - capBevel),
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: capBevel,
    bevelThickness: capBevel,
  });
  capGeo.center();

  // 2. Base Housing Shape
  const baseMargin = config.baseMargin ?? 2.5;
  const baseScale = scale + baseMargin;
  const baseShape = buildBaseShapeForStl(config.baseStyle, baseScale, pts, config.baseBevel);

  if (config.type === 'clicker') {
    const switchHole = new THREE.Path();
    const halfSw = 7.1;
    switchHole.moveTo(-halfSw, -halfSw);
    switchHole.lineTo(halfSw, -halfSw);
    switchHole.lineTo(halfSw, halfSw);
    switchHole.lineTo(-halfSw, halfSw);
    switchHole.closePath();
    baseShape.holes.push(switchHole);
  }

  const baseBevel = Math.min(1.0, config.baseBevel || 1.0);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
    depth: Math.max(4, baseH - baseBevel),
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: baseBevel,
    bevelThickness: baseBevel,
  });
  baseGeo.center();
  baseGeo.translate(baseScale * 1.5 + 5, 0, 0); // Position side-by-side ready for print bed

  // Combine geometries for STL export
  const geometries = [capGeo, baseGeo];

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
