import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { CrossSection, Manifold, ManifoldToplevel, Vec2 } from 'manifold-3d';
import type { CollarConfig, CollarIcon } from '../types';
import type { ProcessedCollarData } from './collarProcessor';
import { COLLAR_ICONS } from './collarIcons';
import { createCollarPlateShape } from './collarShape';
import { COLLAR_REAR_PASSAGE, COLLAR_SIZES, collarRearPassageLength } from './collarSizing';
import { geometryFromMesh, textContours } from './plateBuilder';

/** The same millimetre geometry is used by the viewer, STL and 3MF exporters. */
export interface CollarModel {
  base: THREE.BufferGeometry;
  border: THREE.BufferGeometry;
  text: THREE.BufferGeometry;
  logo: THREE.BufferGeometry;
  solid: THREE.BufferGeometry;
  volume: number;
  dispose(): void;
}

const emptyGeometry = () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
  return geometry;
};

function polygon(points: THREE.Vector2[]): Vec2[] {
  return points.map(({ x, y }) => [x, y]);
}

function rectangle(cx: number, cy: number, width: number, height: number): Vec2[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return [
    [cx - halfWidth, cy - halfHeight], [cx + halfWidth, cy - halfHeight],
    [cx + halfWidth, cy + halfHeight], [cx - halfWidth, cy + halfHeight],
  ];
}

// Los íconos se definen una vez en collarIcons.ts (misma geometría para el
// modelo 3D y la vista previa) y aquí solo se escalan a milímetros.
function iconPolygons(icon: CollarIcon, x: number, y: number, width: number): Vec2[][] {
  const def = COLLAR_ICONS.find(entry => entry.id === icon);
  if (!def) return [];
  const s = width / 10;
  const result: Vec2[][] = [];
  for (const [cx, cy, r] of def.art.circles) {
    result.push(Array.from({ length: 20 }, (_, i) => {
      const angle = (i * 2 * Math.PI) / 20;
      return [x + s * (cx + r * Math.cos(angle)), y + s * (cy + r * Math.sin(angle))] as Vec2;
    }));
  }
  for (const coords of def.art.paths) {
    result.push(coords.map(([px, py]) => [x + s * px, y + s * py] as Vec2));
  }
  return result;
}

/** Converts alpha or foreground pixels into printable, simplified 2D artwork. */
function imagePolygons(data: ProcessedCollarData | null, centerX: number, centerY: number, maxWidth: number, maxHeight: number): Vec2[][] {
  if (!data) return [];
  const canvas = data.originalCanvas || data.canvas;
  if (!canvas) return [];
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  const { width, height } = canvas;
  if (!width || !height) return [];
  const rgba = context.getImageData(0, 0, width, height).data;
  const gridW = 64;
  const gridH = 48;
  const samples: Array<{ a: number; r: number; g: number; b: number }> = [];
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const px = Math.min(width - 1, Math.floor((gx + 0.5) * width / gridW));
      const py = Math.min(height - 1, Math.floor((gy + 0.5) * height / gridH));
      const i = (py * width + px) * 4;
      samples.push({ r: rgba[i], g: rgba[i + 1], b: rgba[i + 2], a: rgba[i + 3] });
    }
  }
  let alphaMinX = gridW, alphaMinY = gridH, alphaMaxX = -1, alphaMaxY = -1;
  let opaque = 0;
  samples.forEach((sample, i) => {
    if (sample.a <= 120) return;
    opaque++;
    const x = i % gridW;
    const y = Math.floor(i / gridW);
    alphaMinX = Math.min(alphaMinX, x); alphaMaxX = Math.max(alphaMaxX, x);
    alphaMinY = Math.min(alphaMinY, y); alphaMaxY = Math.max(alphaMaxY, y);
  });
  if (!opaque) return [];
  // The processor pads every image with transparency. Inspect the opaque image
  // rectangle, not the canvas, to recognize a white-backed uploaded logo.
  const alphaArea = (alphaMaxX - alphaMinX + 1) * (alphaMaxY - alphaMinY + 1);
  const useColour = opaque > alphaArea * 0.85;
  const corners = [
    samples[alphaMinY * gridW + alphaMinX], samples[alphaMinY * gridW + alphaMaxX],
    samples[alphaMaxY * gridW + alphaMinX], samples[alphaMaxY * gridW + alphaMaxX],
  ];
  const bg = [0, 1, 2].map(channel => corners.reduce((total, sample) => total + [sample.r, sample.g, sample.b][channel], 0) / 4);
  const colourMask = samples.map(sample => sample.a > 110 &&
    Math.hypot(sample.r - bg[0], sample.g - bg[1], sample.b - bg[2]) > 55);
  const foregroundCount = colourMask.filter(Boolean).length;
  const mask = useColour && foregroundCount >= Math.max(3, opaque * 0.015)
    ? colourMask : samples.map(sample => sample.a > 110);
  let minX = gridW, minY = gridH, maxX = -1, maxY = -1;
  mask.forEach((filled, i) => {
    if (!filled) return;
    const gx = i % gridW;
    const gy = Math.floor(i / gridW);
    minX = Math.min(minX, gx); maxX = Math.max(maxX, gx);
    minY = Math.min(minY, gy); maxY = Math.max(maxY, gy);
  });
  if (maxX < minX) return [];
  const imageW = maxX - minX + 1;
  const imageH = maxY - minY + 1;
  const scale = Math.min(maxWidth / imageW, maxHeight / imageH);
  const toX = (gridX: number) => centerX + (gridX - (minX + maxX + 1) / 2) * scale;
  const toY = (gridY: number) => centerY - (gridY - (minY + maxY + 1) / 2) * scale;
  const polygons: Vec2[][] = [];
  for (let gy = minY; gy <= maxY; gy++) {
    let gx = minX;
    while (gx <= maxX) {
      if (!mask[gy * gridW + gx]) { gx++; continue; }
      const start = gx;
      while (gx <= maxX && mask[gy * gridW + gx]) gx++;
      polygons.push([[toX(start), toY(gy + 1)], [toX(gx), toY(gy + 1)], [toX(gx), toY(gy)], [toX(start), toY(gy)]]);
    }
  }
  return polygons;
}

/** Builds a proper bevel rather than stretching a thin duplicate of the plate. */
function beveledSolid(api: ManifoldToplevel, shape: THREE.Shape, thickness: number, bevel: number): Manifold {
  const actualBevel = Math.min(Math.max(bevel, 0), thickness * 0.34);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.5, thickness - 2 * actualBevel),
    bevelEnabled: actualBevel > 0.01,
    bevelSize: actualBevel,
    bevelThickness: actualBevel,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geometry.translate(0, 0, actualBevel);
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  const welded = mergeVertices(geometry, 0.00001);
  const position = welded.getAttribute('position');
  const indices = welded.getIndex();
  if (!indices) throw new Error('No se pudo cerrar la malla de la placa.');
  const vertices = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    vertices.set([position.getX(i), position.getY(i), position.getZ(i)], i * 3);
  }
  const triangles = new Uint32Array(indices.count);
  for (let i = 0; i < indices.count; i++) triangles[i] = indices.getX(i);
  const solid = new api.Manifold(new api.Mesh({ numProp: 3, vertProperties: vertices, triVerts: triangles }));
  welded.dispose();
  geometry.dispose();
  if (solid.status() !== 'NoError' || solid.isEmpty()) throw new Error('No se pudo construir el bisel de la placa.');
  return solid;
}

export function buildCollarModel(api: ManifoldToplevel, config: CollarConfig, processedData: ProcessedCollarData | null): CollarModel {
  const owned: Array<CrossSection | Manifold> = [];
  const keep = <T extends CrossSection | Manifold>(value: T): T => { owned.push(value); return value; };
  const { CrossSection: CS, Manifold: Solid } = api;
  try {
    const width = Math.max(30, config.plateWidth || 50);
    const height = Math.max(22, config.plateHeight || 32);
    const thickness = Math.max(2, config.plateThickness || 4);
    const bevel = Math.min(config.plateBevel ?? 0.8, thickness * 0.32);
    const shape = createCollarPlateShape(config.plateStyle, width, height, processedData?.contourPoints ?? [], bevel);
    const outline = keep(new CS([polygon(shape.getPoints(12))], 'EvenOdd'));
    const safe = keep(outline.offset(-Math.max(1.5, bevel + 0.8)));
    if (safe.isEmpty()) throw new Error('La forma seleccionada no deja espacio para el grabado.');

    let body = keep(beveledSolid(api, shape, thickness, bevel));
    if (config.mountType === 'dangling') {
      const eyeRadius = Math.max(2, config.ringDiameter / 2) + 2.2;
      const eyeY = height / 2 + eyeRadius * 0.45;
      const eye = keep(keep(CS.circle(eyeRadius, 48)).translate(0, eyeY));
      const eyeSolid = keep(eye.extrude(thickness));
      body = keep(Solid.union(body, eyeSolid));
      const hole = keep(keep(CS.circle(Math.max(1.5, config.ringDiameter / 2), 48)).translate(0, eyeY));
      const drill = keep(keep(hole.extrude(thickness + 2)).translate(0, 0, -1));
      body = keep(body.subtract(drill));
    } else {
      // A shallow notch seats the strap against the rear of the plate. Two
      // narrow loops retain it without piercing the decorated front face.
      const passageLength = collarRearPassageLength(width);
      const innerHalfWidth = (COLLAR_SIZES[config.size].width + COLLAR_REAR_PASSAGE.widthClearance) / 2;
      const sideWall = COLLAR_REAR_PASSAGE.sideWall;
      const outerHalfWidth = innerHalfWidth + sideWall;
      const recessDepth = Math.min(COLLAR_REAR_PASSAGE.recess, thickness * 0.28);
      const notch = keep(new CS([rectangle(0, 0, passageLength + 4, innerHalfWidth * 2)], 'NonZero'));
      const notchCut = keep(keep(notch.extrude(recessDepth + 0.05)).translate(0, 0, -0.05));
      body = keep(body.subtract(notchCut));
      const loopWidth = Math.min(4, passageLength * 0.2);
      const loopX = passageLength / 2 - loopWidth / 2;
      const walls = keep(new CS([
        rectangle(-loopX, innerHalfWidth + sideWall / 2, loopWidth, sideWall),
        rectangle(-loopX, -innerHalfWidth - sideWall / 2, loopWidth, sideWall),
        rectangle(loopX, innerHalfWidth + sideWall / 2, loopWidth, sideWall),
        rectangle(loopX, -innerHalfWidth - sideWall / 2, loopWidth, sideWall),
      ], 'NonZero'));
      const rearWall = keep(new CS([
        rectangle(-loopX, 0, loopWidth, outerHalfWidth * 2),
        rectangle(loopX, 0, loopWidth, outerHalfWidth * 2),
      ], 'NonZero'));
      const overlap = 0.2;
      const sideWalls = keep(keep(walls.extrude(COLLAR_REAR_PASSAGE.gap + overlap))
        .translate(0, 0, -COLLAR_REAR_PASSAGE.gap));
      const bridge = keep(keep(rearWall.extrude(COLLAR_REAR_PASSAGE.wall + overlap))
        .translate(0, 0, -COLLAR_REAR_PASSAGE.gap - COLLAR_REAR_PASSAGE.wall));
      body = keep(Solid.union([body, sideWalls, bridge]));
    }

    const borderOuter = keep(outline.offset(-Math.max(1.0, bevel + 0.25)));
    const borderInner = keep(outline.offset(-Math.max(2.0, bevel + 1.25)));
    const borderRing = keep(borderOuter.subtract(borderInner));

    const tapered = ['bone', 'shield', 'heart', 'silhouette'].includes(config.plateStyle);
    const availableWidth = Math.min(width - 9, tapered ? width * 0.65 : width - 9);
    // Three balanced rows stay within the waist of a bone and the tapered
    // lower half of a shield or heart, without sacrificing the phone number.
    const name = textContours(config.petName.trim().toUpperCase(), availableWidth,
      height * 0.16, 0);
    const phone = textContours(config.phoneText.trim(), availableWidth * 0.94,
      height * 0.086, -height * 0.16);
    const textLines = [name, phone].filter(line => line.contours.length).map(line => keep(new CS(line.contours, 'EvenOdd')));
    const textSection = textLines.length ? keep(CS.union(textLines)) : null;

    const iconWidth = Math.min(4.4, height * 0.13);
    const logoCenterY = height * 0.16;
    const imageWidth = availableWidth * (config.icon === 'none' ? 0.44 : 0.34);
    const imageCenterX = config.icon === 'none' ? 0 : iconWidth * 0.54;
    const image = imagePolygons(processedData, imageCenterX, logoCenterY, imageWidth, height * 0.13);
    const icon = iconPolygons(config.icon, image.length ? -imageWidth * 0.55 : 0, logoCenterY, iconWidth);
    const imageSection = image.length ? keep(new CS(image, 'NonZero')) : null;
    const iconSection = icon.length ? keep(new CS(icon, 'NonZero')) : null;
    const logoSources = [imageSection, iconSection].filter((section): section is CrossSection => !!section);
    const logoSection = logoSources.length ? keep(CS.union(logoSources)) : null;

    // Every coloured detail stays on the printable face and clear of the rim.
    const detailSafe = keep(outline.offset(-Math.max(2.2, bevel + 1.6)));
    const borderMask = keep(borderRing.intersect(outline));
    const textMask = textSection ? keep(textSection.intersect(detailSafe)) : null;
    const logoMask = logoSection ? keep(logoSection.intersect(detailSafe)) : null;
    const rimHeight = Math.min(0.55, thickness * 0.18);
    const featureHeight = config.reliefStyle === 'embossed' ? 0.75 : 0.72;
    const featureZ = config.reliefStyle === 'embossed' ? thickness - 0.10 : thickness - featureHeight;
    const colourHeight = config.reliefStyle === 'debossed' ? 0.20 : featureHeight + 0.02;
    const colourZ = featureZ - 0.02;
    const extrudeAt = (section: CrossSection | null, depth: number, z: number): Manifold | null =>
      section && !section.isEmpty() ? keep(keep(section.extrude(depth)).translate(0, 0, z)) : null;
    const rim = extrudeAt(borderMask, rimHeight + 0.10, thickness - 0.10);
    const textPocket = extrudeAt(textMask, featureHeight + 0.04, featureZ - 0.02);
    const logoPocket = extrudeAt(logoMask, featureHeight + 0.04, featureZ - 0.02);
    const textColour = extrudeAt(textMask, colourHeight, colourZ);
    const logoColour = extrudeAt(logoMask, colourHeight, colourZ);

    // Separate, non-duplicated material bodies for 3MF; union for STL.
    let cutBody = body;
    if (config.reliefStyle === 'embossed') {
      const masks = [textMask, logoMask, borderMask].filter((section): section is CrossSection => !!section && !section.isEmpty());
      const cuts = extrudeAt(keep(CS.union(masks)), 0.11, thickness - 0.10);
      if (cuts) cutBody = keep(cutBody.subtract(cuts));
    } else {
      const pockets = [textPocket, logoPocket].filter((part): part is Manifold => !!part);
      if (pockets.length) cutBody = keep(cutBody.subtract(keep(Solid.union(pockets))));
    }
    const rimBase = rim ? keep(cutBody.subtract(rim)) : cutBody;
    const borderPart = rim;
    const base = rimBase;
    const detailParts = [borderPart, textColour, logoColour].filter((part): part is Manifold => !!part);
    const solid = detailParts.length ? keep(Solid.union([base, ...detailParts])) : base;
    if (solid.status() !== 'NoError' || solid.isEmpty() || solid.volume() <= 0) {
      throw new Error(`No se pudo construir un collar imprimible (${solid.status()}, ${solid.volume().toFixed(2)} mm³).`);
    }

    const geom = (part: Manifold | null) => !part || part.isEmpty() ? emptyGeometry() : geometryFromMesh(part.getMesh());
    const result: CollarModel = {
      base: geom(base), border: geom(borderPart), text: geom(textColour), logo: geom(logoColour),
      solid: geom(solid), volume: solid.volume(),
      dispose() { this.base.dispose(); this.border.dispose(); this.text.dispose(); this.logo.dispose(); this.solid.dispose(); },
    };
    return result;
  } finally {
    owned.reverse().forEach(value => value.delete());
  }
}
