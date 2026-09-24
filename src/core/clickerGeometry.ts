import * as THREE from 'three';
import ClipperLib from 'clipper-lib';
import { ClickerConfig } from '../types';

export type ContourPoint = { x: number; y: number };

export function offsetContour(points: ContourPoint[], distance: number): ContourPoint[] {
  if (points.length < 3 || distance === 0) return points;
  const precision = 1000;
  const source = points.map(point => ({
    X: Math.round(point.x * precision), Y: Math.round(point.y * precision),
  }));
  const simple = ClipperLib.Clipper.SimplifyPolygon(source, ClipperLib.PolyFillType.pftEvenOdd);
  if (!simple.length) return [];
  const outline = simple.reduce((best, path) =>
    Math.abs(ClipperLib.Clipper.Area(path)) > Math.abs(ClipperLib.Clipper.Area(best)) ? path : best,
  simple[0]).slice();
  if (!ClipperLib.Clipper.Orientation(outline)) outline.reverse();
  const offset = new ClipperLib.ClipperOffset(2, 50);
  offset.AddPath(outline, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const paths: ClipperLib.Paths = [];
  offset.Execute(paths, Math.round(distance * precision));
  if (!paths.length) return [];
  const largest = paths.reduce((best, path) =>
    Math.abs(ClipperLib.Clipper.Area(path)) > Math.abs(ClipperLib.Clipper.Area(best)) ? path : best,
  paths[0]);
  return largest.map(point => ({ x: point.X / precision, y: point.Y / precision }));
}

export function shapeFromContour(points: ContourPoint[], scale: number, offset = 0): THREE.Shape {
  const shape = new THREE.Shape();
  if (points.length < 3) {
    shape.absarc(0, 0, scale + offset, 0, Math.PI * 2, false);
    return shape;
  }
  const outline = offsetContour(points.map(p => ({ x: p.x * scale, y: p.y * scale })), offset);
  if (!outline.length) {
    shape.absarc(0, 0, Math.max(1, scale + offset), 0, Math.PI * 2, false);
    return shape;
  }
  shape.moveTo(outline[0].x, outline[0].y);
  outline.slice(1).forEach(point => shape.lineTo(point.x, point.y));
  shape.closePath();
  return shape;
}

export function getClickerEyelet(config: ClickerConfig, points: ContourPoint[]) {
  const angle = (config.ringAngle ?? 90) * Math.PI / 180;
  const direction = new THREE.Vector2(Math.cos(angle), -Math.sin(angle));
  const margin = config.baseMargin ?? 1.1;
  const scale = config.size / 2 - margin;
  const extent = config.baseStyle === 'outline' && points.length > 2
    ? Math.max(...points.map(point => (point.x * direction.x + point.y * direction.y) * scale)) + margin
    : scale + margin;
  const holeRadius = (config.ringHoleDiameter || 4.5) / 2;
  const tubeRadius = (config.ringThickness || 2.2) / 2;
  const outerRadius = holeRadius + tubeRadius;
  // The eyelet overlaps the body so its outer wall remains printable as one assembly.
  const radius = extent + outerRadius * 0.55;
  return {
    x: direction.x * radius + (config.ringOffsetX || 0),
    y: direction.y * radius + (config.ringOffsetY || 0),
    holeRadius,
    outerRadius,
    tubeRadius,
  };
}

export function createEyeletShape(config: ClickerConfig, points: ContourPoint[]): THREE.Shape {
  const { x, y, holeRadius, outerRadius } = getClickerEyelet(config, points);
  const eyelet = new THREE.Shape();
  eyelet.absarc(x, y, outerRadius, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(x, y, holeRadius, 0, Math.PI * 2, true);
  eyelet.holes.push(hole);
  return eyelet;
}
