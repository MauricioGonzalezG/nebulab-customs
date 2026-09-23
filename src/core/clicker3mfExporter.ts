import * as THREE from 'three';
import { ClickerConfig, ClickerBaseStyle } from '../types';
import { ProcessedClickerData } from './clickerProcessor';
import { download3MFFile, ThreeMFMeshObject } from './threeMfExporter';
import { createEyeletShape, getClickerEyelet, shapeFromContour } from './clickerGeometry';
import { hexToRgb } from './clickerProcessor';

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
 * Exports full watertight multi-color 3MF file for Clicker or Keychain
 * (Directly loadable into Bambu Studio, OrcaSlicer, PrusaSlicer, Bambu Handy)
 */
export async function downloadClicker3MF(
  processedData: ProcessedClickerData | null,
  config: ClickerConfig
): Promise<void> {
  const scale = config.size / 2 - (config.baseMargin ?? 1.1);
  const pts = processedData?.contourPoints || [];
  const topH = config.topHeight;
  const baseH = config.baseHeight;
  const bedOffset = scale + (config.baseMargin ?? 1.1) + 6;

  // 1. Cap Silhouette Shape
  const capShape = shapeFromContour(pts, scale);

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
  capBodyGeo.computeBoundingBox();
  const capLift = -(capBodyGeo.boundingBox?.min.z ?? 0);
  capBodyGeo.translate(-bedOffset, 0, capLift);
  capBodyGeo.computeVertexNormals();
  objects.push(bufferGeometryTo3MFMesh(capBodyGeo, nextId++, 'Tapa Keycap Principal', config.baseColor));

  // Convert the visible artwork into color regions. The former nested solid
  // silhouettes hid the actual eyes, face and uploaded design in the 3MF.
  if (processedData?.canvas) {
    const resolution = 72;
    const raster = document.createElement('canvas');
    raster.width = raster.height = resolution;
    const context = raster.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.imageSmoothingEnabled = false;
      context.drawImage(processedData.canvas, 0, 0, resolution, resolution);
      const pixels = context.getImageData(0, 0, resolution, resolution).data;
      const colors = processedData.paletteColors;
      const rgb = colors.map(hexToRgb);
      const region = (x: number, y: number) => {
        const index = (y * resolution + x) * 4;
        if (pixels[index + 3] < 128) return -1;
        let closest = 0, best = Infinity;
        for (let i = 0; i < rgb.length; i++) {
          const dr = pixels[index] - rgb[i].r;
          const dg = pixels[index + 1] - rgb[i].g;
          const db = pixels[index + 2] - rgb[i].b;
          const distance = dr * dr + dg * dg + db * db;
          if (distance < best) { best = distance; closest = i; }
        }
        return closest;
      };
      const shapes = colors.map(() => [] as THREE.Shape[]);
      const unit = 2 * scale / (resolution * 0.86);
      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution;) {
          const color = region(x, y);
          if (color < 0) { x++; continue; }
          let end = x + 1;
          while (end < resolution && region(end, y) === color) end++;
          const x0 = (x - resolution / 2) * unit;
          const x1 = (end - resolution / 2) * unit;
          const y0 = (y - resolution / 2) * unit;
          const y1 = y0 + unit;
          const tile = new THREE.Shape();
          tile.moveTo(x0, y0); tile.lineTo(x1, y0);
          tile.lineTo(x1, y1); tile.lineTo(x0, y1); tile.closePath();
          shapes[color].push(tile);
          x = end;
        }
      }
      const relief = config.reliefStyle === 'embossed' ? Math.max(0.5, config.reliefDepth) : 0.5;
      shapes.forEach((regions, i) => {
        if (!regions.length) return;
        const geometry = new THREE.ExtrudeGeometry(regions, { depth: relief, bevelEnabled: false });
        geometry.translate(-bedOffset, 0, topH / 2 + 0.35 + capLift);
        objects.push(bufferGeometryTo3MFMesh(geometry, nextId++, `Ilustración - color ${i + 1}`, colors[i]));
      });
    }
  }

  // Object 3: Base Housing
  const baseMargin = config.baseMargin ?? 1.1;
  const baseScale = scale + baseMargin;
  const baseShape = buildBaseShapeForExport(config.baseStyle, config.baseStyle === 'outline' ? scale : baseScale, pts, config.baseBevel, baseMargin);

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

  const baseBevel = Math.min(1.0, config.baseBevel ?? 1.0);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
    depth: Math.max(4, baseH - baseBevel),
    bevelEnabled: baseBevel > 0,
    bevelSegments: 2,
    bevelSize: baseBevel,
    bevelThickness: baseBevel,
  });
  baseGeo.center();
  baseGeo.translate(0, 0, -baseH / 2 - 1.5);
  baseGeo.computeBoundingBox();
  const baseLift = -(baseGeo.boundingBox?.min.z ?? 0);
  baseGeo.translate(bedOffset, 0, baseLift);
  objects.push(bufferGeometryTo3MFMesh(baseGeo, nextId++, 'Cuerpo Base (Housing)', config.baseColor));

  // Object 4: Keychain Attachment Ring (if enabled)
  if (config.includeRing || config.type === 'keychain') {
    const eyelet = getClickerEyelet(config, pts);
    const ringGeo = new THREE.ExtrudeGeometry(createEyeletShape(config, pts), {
      depth: 4.5, bevelEnabled: true, bevelSegments: 2,
      bevelSize: 0.35, bevelThickness: 0.35,
    });
    ringGeo.center();
    ringGeo.translate(bedOffset + eyelet.x, eyelet.y, (config.ringHeight || 0) - 2.5 + baseLift);
    objects.push(bufferGeometryTo3MFMesh(ringGeo, nextId++, 'Ojal imprimible para llavero', config.baseColor));
  }

  const filename = `NebulabStudio_Clicker_${config.type}_${config.size}mm_AMS.3mf`;
  await download3MFFile(objects, filename);
}
