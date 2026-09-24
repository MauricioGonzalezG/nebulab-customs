import * as THREE from 'three';
import { offsetContour } from './clickerGeometry';

// El modelo de vista previa representa un switch MX de 14 mm de cuerpo y
// una cruz de 4.0 × 1.15 mm. Estas holguras son ajustables para impresión FDM.
export const CLICKER_SOCKET = {
  opening: 14.4,
  seatOpening: 12.8,
  seatOutside: 15.4,
  seatDepth: 2,
  seatTopFromHousingTop: 10,
  stemOutsideRadius: 3,
  stemLength: 4.3,
  switchWellRadius: 3.2,
  wallThickness: 2.2,
  capRoofThickness: 2.2,
  skirtWallThickness: 1.4,
  minimumBaseMargin: 2.8,
  interiorDepth: 10,
  guideHeight: 3,
};

export function squarePath(size: number): THREE.Path {
  const half = size / 2;
  const path = new THREE.Path();
  path.moveTo(-half, -half);
  path.lineTo(half, -half);
  path.lineTo(half, half);
  path.lineTo(-half, half);
  path.closePath();
  return path;
}

export function addSwitchOpening(shape: THREE.Shape): void {
  shape.holes.push(squarePath(CLICKER_SOCKET.opening));
}

export function createSwitchSeatGeometry(): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const half = CLICKER_SOCKET.seatOutside / 2;
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();
  shape.holes.push(squarePath(CLICKER_SOCKET.seatOpening));
  return new THREE.ExtrudeGeometry(shape, {
    depth: CLICKER_SOCKET.seatDepth,
    bevelEnabled: false,
    curveSegments: 16,
  });
}

function crossPath(armLength: number, armWidth: number): THREE.Path {
  const a = armLength / 2;
  const b = armWidth / 2;
  const points: Array<[number, number]> = [
    [-b, -a], [b, -a], [b, -b], [a, -b], [a, b], [b, b],
    [b, a], [-b, a], [-b, b], [-a, b], [-a, -b], [-b, -b],
  ];
  const path = new THREE.Path();
  path.moveTo(...points[0]);
  points.slice(1).forEach(point => path.lineTo(...point));
  path.closePath();
  return path;
}

export function createCapStemGeometry(tolerance: number): THREE.ExtrudeGeometry {
  return createCapStemAtDepth(tolerance, CLICKER_SOCKET.stemLength);
}

function createCapStemAtDepth(tolerance: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, CLICKER_SOCKET.stemOutsideRadius, 0, Math.PI * 2, false);
  shape.holes.push(crossPath(4.3 + tolerance, 1.45 + tolerance));
  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 48,
  });
}

function insetShape(outside: THREE.Shape, distance: number): THREE.Shape {
  const outline = outside.getPoints(12);
  if (outline.length > 1 && outline[0].distanceTo(outline[outline.length - 1]) < 1e-5) outline.pop();
  const inside = offsetContour(outline.map(point => ({ x: point.x, y: point.y })), -distance);
  const shape = new THREE.Shape();
  if (inside.length < 3) return shape;
  shape.moveTo(inside[0].x, inside[0].y);
  inside.slice(1).forEach(point => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}

function shellWallShape(outside: THREE.Shape, wall: number): THREE.Shape {
  const inside = insetShape(outside, wall).getPoints();
  const shape = outside.clone();
  if (inside.length < 3) return shape;
  const opening = new THREE.Path();
  opening.moveTo(inside[0].x, inside[0].y);
  inside.slice(1).forEach(point => opening.lineTo(point.x, point.y));
  opening.closePath();
  shape.holes.push(opening);
  return shape;
}

function extrudeAt(shape: THREE.Shape | THREE.Shape[], depth: number, z: number): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: false, curveSegments: 24,
  });
  geometry.translate(0, 0, z);
  return geometry;
}

export function createHollowCapParts(outside: THREE.Shape, topHeight: number, tolerance: number): THREE.BufferGeometry[] {
  const roof = Math.min(CLICKER_SOCKET.capRoofThickness, topHeight / 2);
  const top = -topHeight / 2;
  const capRoof = extrudeAt(outside, roof, top);
  const skirtShape = shellWallShape(outside, CLICKER_SOCKET.skirtWallThickness);
  const skirt = skirtShape.holes.length
    ? extrudeAt(skirtShape, topHeight - roof + 0.1, top + roof - 0.1)
    : null;
  // Keep the socket at the same switch height as the cap thickness changes.
  const stemDepth = CLICKER_SOCKET.stemLength + Math.max(0, topHeight - 8) / 2;
  const stem = createCapStemAtDepth(tolerance, stemDepth + 0.1);
  stem.translate(0, 0, top + roof - 0.1);
  return skirt ? [capRoof, skirt, stem] : [capRoof, stem];
}

export function createHollowBaseParts(outside: THREE.Shape, baseHeight: number): THREE.BufferGeometry[] {
  const top = -baseHeight / 2;
  const floorTop = top + CLICKER_SOCKET.interiorDepth;
  const baseWalls = extrudeAt(shellWallShape(outside, CLICKER_SOCKET.wallThickness), CLICKER_SOCKET.interiorDepth, top);
  const baseFloor = extrudeAt(outside, baseHeight - CLICKER_SOCKET.interiorDepth, floorTop);
  // Four short guides hold the 14 mm switch centered without covering its pins.
  const guideShapes: THREE.Shape[] = [];
  const innerFace = CLICKER_SOCKET.opening / 2;
  const makeGuide = (cx: number, cy: number, width: number, height: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(cx - width / 2, cy - height / 2);
    shape.lineTo(cx + width / 2, cy - height / 2);
    shape.lineTo(cx + width / 2, cy + height / 2);
    shape.lineTo(cx - width / 2, cy + height / 2);
    shape.closePath();
    guideShapes.push(shape);
  };
  for (const sign of [-1, 1]) {
    makeGuide(sign * (innerFace + 0.4), 0, 0.8, 5);
    makeGuide(0, sign * (innerFace + 0.4), 5, 0.8);
  }
  const guides = extrudeAt(guideShapes, CLICKER_SOCKET.guideHeight + 0.1, floorTop - CLICKER_SOCKET.guideHeight);
  return [baseWalls, baseFloor, guides];
}

function switchShellGeometry(size: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const half = size / 2;
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.closePath();
  const well = new THREE.Path();
  well.absarc(0, 0, CLICKER_SOCKET.switchWellRadius, 0, Math.PI * 2, true);
  shape.holes.push(well);
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 });
}

export const createSwitchCoverGeometry = () => switchShellGeometry(13.6, 4.2);
export const createSwitchLowerGeometry = () => switchShellGeometry(14, 5.8);
