import * as THREE from 'three';
import { ClickerConfig, ClickerBaseStyle } from '../types';
import { ProcessedClickerData } from './clickerProcessor';
import { download3MFFile, ThreeMFMeshObject } from './threeMfExporter';

/**
 * Extracts vertices and triangles from any Three.js BufferGeometry
 */
function bufferGeometryTo3MFMesh(
  geometry: THREE.BufferGeometry,
  id: number,
  name: string,
  hexColor: string
): ThreeMFMeshObject {
  // Ensure indexed geometry for clean 3MF export
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
 * Helper to build base shape
 */
function buildBaseShapeForExport(
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
 * Exports full watertight multi-color 3MF file for Clicker or Keychain
 * (Directly loadable into Bambu Studio, OrcaSlicer, PrusaSlicer, Bambu Handy)
 */
export async function downloadClicker3MF(
  processedData: ProcessedClickerData | null,
  config: ClickerConfig
): Promise<void> {
  const scale = config.size / 2;
  const pts = processedData?.contourPoints || [];
  const topH = config.topHeight;
  const baseH = config.baseHeight;

  // 1. Cap Silhouette Shape
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

  const objects: ThreeMFMeshObject[] = [];
  let nextId = 2;

  // Object 1: Top Cap Body Shell
  const capBevel = 0.8;
  const capBodyGeo = new THREE.ExtrudeGeometry(capShape, {
    depth: Math.max(2, topH - capBevel),
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: capBevel,
    bevelThickness: capBevel,
  });
  capBodyGeo.center();
  capBodyGeo.computeVertexNormals();
  objects.push(bufferGeometryTo3MFMesh(capBodyGeo, nextId++, 'Tapa Keycap Principal', config.baseColor));

  // Object 2: Multi-layer Artwork / Relief Layer
  if (config.strokeMode === 'multi') {
    const outlineShape = new THREE.Shape();
    if (pts.length > 2) {
      outlineShape.moveTo(pts[0].x * scale * 0.94, -pts[0].y * scale * 0.94);
      for (let i = 1; i < pts.length; i++) {
        outlineShape.lineTo(pts[i].x * scale * 0.94, -pts[i].y * scale * 0.94);
      }
      outlineShape.closePath();
    } else {
      outlineShape.absarc(0, 0, scale * 0.94, 0, Math.PI * 2, false);
    }

    const outlineGeo = new THREE.ExtrudeGeometry(outlineShape, {
      depth: 0.8,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.2,
      bevelThickness: 0.2,
    });
    outlineGeo.center();
    outlineGeo.translate(0, 0, topH / 2 + 0.4);
    objects.push(bufferGeometryTo3MFMesh(outlineGeo, nextId++, 'Capa 1 - Trazo Silueta', config.outlineColor));

    // Accent Detail Layer
    const accentShape = new THREE.Shape();
    if (pts.length > 2) {
      accentShape.moveTo(pts[0].x * scale * 0.78, -pts[0].y * scale * 0.78);
      for (let i = 1; i < pts.length; i++) {
        accentShape.lineTo(pts[i].x * scale * 0.78, -pts[i].y * scale * 0.78);
      }
      accentShape.closePath();
    } else {
      accentShape.absarc(0, 0, scale * 0.78, 0, Math.PI * 2, false);
    }

    const accentGeo = new THREE.ExtrudeGeometry(accentShape, {
      depth: 0.6,
      bevelEnabled: false,
    });
    accentGeo.center();
    accentGeo.translate(0, 0, topH / 2 + 0.8);
    objects.push(bufferGeometryTo3MFMesh(accentGeo, nextId++, 'Capa 2 - Acento Detalle', config.accentColor));
  } else {
    // Single stroke relief
    const singleGeo = new THREE.ExtrudeGeometry(capShape, {
      depth: 0.6,
      bevelEnabled: false,
    });
    singleGeo.center();
    singleGeo.translate(0, 0, topH / 2 + 0.3);
    objects.push(bufferGeometryTo3MFMesh(singleGeo, nextId++, 'Relieve Monocromo Silueta', config.outlineColor));
  }

  // Object 3: Base Housing
  const baseMargin = config.baseMargin ?? 2.5;
  const baseScale = scale + baseMargin;
  const baseShape = buildBaseShapeForExport(config.baseStyle, baseScale, pts, config.baseBevel);

  if (config.type === 'clicker') {
    // Cutout 14x14mm for Cherry MX Switch Socket
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
  baseGeo.translate(0, 0, -baseH / 2 - 1.5);
  objects.push(bufferGeometryTo3MFMesh(baseGeo, nextId++, 'Cuerpo Base (Housing)', '#F8FAFC'));

  // Object 4: Keychain Attachment Ring (if enabled)
  if (config.includeRing || config.type === 'keychain') {
    const holeDiam = config.ringHoleDiameter || 4.5;
    const ringThick = config.ringThickness || 2.2;
    const majorRadius = holeDiam / 2 + ringThick / 2;
    const minorRadius = ringThick / 2;

    const ringGeo = new THREE.TorusGeometry(majorRadius, minorRadius, 16, 32);
    const angleDeg = config.ringAngle ?? 90;
    const angleRad = (angleDeg * Math.PI) / 180;
    const ringDist = baseScale + majorRadius * 0.75;

    const rx = Math.cos(angleRad) * ringDist + (config.ringOffsetX || 0);
    const ry = -Math.sin(angleRad) * ringDist + (config.ringOffsetY || 0);
    const rz = (config.ringHeight || 0) - baseH / 2 - 1.5;

    ringGeo.translate(rx, ry, rz);
    objects.push(bufferGeometryTo3MFMesh(ringGeo, nextId++, 'Argolla de Llavero', '#F8FAFC'));
  }

  const filename = `NebulabStudio_Clicker_${config.type}_${config.size}mm_AMS.3mf`;
  await download3MFFile(objects, filename);
}
