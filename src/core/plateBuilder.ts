import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import type { CrossSection, Manifold, ManifoldToplevel, Mesh, Vec2 } from 'manifold-3d';
import fontData from '../assets/plate-font.json';
import wasmUrl from 'manifold-3d/manifold.wasm?url';

let plateEngine: Promise<ManifoldToplevel> | undefined;

// El motor (WASM) se carga una sola vez y se reutiliza entre vistas y exportaciones.
export function loadPlateEngine(): Promise<ManifoldToplevel> {
  plateEngine ??= import('manifold-3d')
    .then(({ default: Module }) => Module({ locateFile: () => wasmUrl }))
    .then(api => { api.setup(); return api; })
    .catch(error => { plateEngine = undefined; throw error; });
  return plateEngine;
}

export interface PlateConfig {
  text: string;
  subtitle: string;
  width: number;
  height: number;
  thickness: number;
  relief: number;
  holeDiameter: number;
  border: boolean;
  baseColor: string;
  detailColor: string;
}

export const DEFAULT_PLATE: PlateConfig = {
  text: 'DLX 28F', subtitle: 'COLOMBIA', width: 60, height: 30,
  thickness: 3, relief: 0.8, holeDiameter: 4, border: true,
  baseColor: '#facc15', detailColor: '#171717',
};

// Material aproximado de la placa (área × altura efectiva). El relieve solo cubre
// una fracción del área, por eso pesa al 25%: la proporción mantiene el precio justo.
const plateMaterial = (config: Pick<PlateConfig, 'width' | 'height' | 'thickness' | 'relief'>) =>
  config.width * config.height * (config.thickness + 0.25 * config.relief);

// Factor de precio proporcional al material: la placa por defecto siempre vale 1
// (su precio es la tarifa base) y cualquier cambio de tamaño/grosor/relieve lo escala.
export function platePriceFactor(config: Pick<PlateConfig, 'width' | 'height' | 'thickness' | 'relief'>): number {
  return plateMaterial(config) / plateMaterial(DEFAULT_PLATE);
}

const font = new FontLoader().parse(fontData);
export const cleanPlateText = (value: string, max: number) =>
  Array.from(value.toUpperCase()).filter(c => c === ' ' || (c !== '?' && c in fontData.glyphs)).join('').slice(0, max);

function roundedRectangle(width: number, height: number, radius: number): Vec2[] {
  const points: Vec2[] = [];
  const r = Math.min(radius, width / 2, height / 2);
  for (const [x, y, start] of [
    [width / 2 - r, height / 2 - r, 0],
    [-width / 2 + r, height / 2 - r, 90],
    [-width / 2 + r, -height / 2 + r, 180],
    [width / 2 - r, -height / 2 + r, 270],
  ]) {
    for (let i = 0; i <= 12; i++) {
      const angle = (start + i * 90 / 12) * Math.PI / 180;
      points.push([x + r * Math.cos(angle), y + r * Math.sin(angle)]);
    }
  }
  return points;
}

export function textContours(text: string, maxWidth: number, maxHeight: number, centerY: number) {
  const shapes = font.generateShapes(text.trim(), 10);
  const contours = shapes.flatMap(shape => [shape.getPoints(10), ...shape.holes.map(hole => hole.getPoints(10))]);
  const points = contours.flat();
  if (!points.length) return { contours: [] as Vec2[][], height: 0 };
  const box = new THREE.Box2().setFromPoints(points);
  const size = box.getSize(new THREE.Vector2());
  const center = box.getCenter(new THREE.Vector2());
  const scale = Math.min(maxWidth / size.x, maxHeight / size.y);
  return {
    contours: contours.map(contour => contour.map(p => [(p.x - center.x) * scale, (p.y - center.y) * scale + centerY] as Vec2)),
    height: size.y * scale,
  };
}

export interface PlateModel {
  base: THREE.BufferGeometry;
  details: THREE.BufferGeometry;
  solid: THREE.BufferGeometry;
  smallestTextHeight: number;
  volume: number;
  dispose: () => void;
}

export function geometryFromMesh(mesh: Mesh): THREE.BufferGeometry {
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

// Shared construction for the preview and both export formats, in millimeters.
// The eyelet is unioned in 2D before extrusion; the hole crosses the entire base.
export function buildPlate(api: ManifoldToplevel, config: PlateConfig): PlateModel {
  const owned: Array<CrossSection | Manifold> = [];
  const keep = <T extends CrossSection | Manifold>(value: T): T => { owned.push(value); return value; };
  const { CrossSection: CS, Manifold: Solid } = api;
  try {
    const { width: w, height: h, thickness, relief } = config;
    const body = keep(new CS([roundedRectangle(w, h, 3)], 'EvenOdd'));
    const eyeX = -w / 2 - 1;
    const eyeRadius = config.holeDiameter / 2 + 2.4;
    const eye = keep(keep(CS.circle(eyeRadius, 64)).translate(eyeX, 0));
    const hole = keep(keep(CS.circle(config.holeDiameter / 2, 64)).translate(eyeX, 0));
    const outline = keep(keep(CS.union(body, eye)).subtract(hole));
    const base = keep(outline.extrude(thickness));
    const twoLines = !!config.subtitle.trim();
    const textWidth = w - 12;
    const main = textContours(config.text, textWidth, h * (twoLines ? 0.34 : 0.57), twoLines ? h * 0.13 : 0);
    const sub = textContours(config.subtitle, textWidth - 2, h * 0.18, -h * 0.24);
    const sections: CrossSection[] = [];
    for (const line of [main, sub]) {
      if (line.contours.length) sections.push(keep(new CS(line.contours, 'EvenOdd')));
    }
    if (config.border) {
      const outside = keep(new CS([roundedRectangle(w - 3, h - 3, 2)], 'EvenOdd'));
      const inside = keep(new CS([roundedRectangle(w - 5.4, h - 5.4, 0.8)], 'EvenOdd'));
      sections.push(keep(outside.subtract(inside)));
    }
    const detailSection = keep(CS.union(sections));
    const details = keep(keep(detailSection.extrude(relief)).translate(0, 0, thickness));
    const solid = keep(Solid.union(base, details));
    if (solid.status() !== 'NoError' || solid.isEmpty()) throw new Error('No se pudo construir una placa imprimible.');
    const baseGeometry = geometryFromMesh(base.getMesh());
    const detailGeometry = geometryFromMesh(details.getMesh());
    const solidGeometry = geometryFromMesh(solid.getMesh());
    return {
      base: baseGeometry, details: detailGeometry, solid: solidGeometry,
      smallestTextHeight: Math.min(...[main.height, sub.height].filter(height => height > 0)),
      volume: solid.volume(),
      dispose: () => { baseGeometry.dispose(); detailGeometry.dispose(); solidGeometry.dispose(); },
    };
  } finally {
    owned.reverse().forEach(value => value.delete());
  }
}
