import * as THREE from 'three';
import { ClickerConfig } from '../types';

export type ContourPoint = { x: number; y: number };

export function offsetContour(points: ContourPoint[], distance: number): ContourPoint[] {
  if (points.length < 3 || distance === 0) return points;
  const area = points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0);
  const sign = area >= 0 ? 1 : -1;
  return points.map((point, i) => {
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const first = new THREE.Vector2(point.x - prev.x, point.y - prev.y).normalize();
    const second = new THREE.Vector2(next.x - point.x, next.y - point.y).normalize();
    const normalA = new THREE.Vector2(first.y * sign, -first.x * sign);
    const normalB = new THREE.Vector2(second.y * sign, -second.x * sign);
    const bisector = normalA.add(normalB).normalize();
    const denominator = Math.max(0.5, Math.abs(bisector.dot(normalB)));
    const miter = Math.min(Math.abs(distance) * 1.65, Math.abs(distance) / denominator);
    return { x: point.x + bisector.x * miter * Math.sign(distance), y: point.y + bisector.y * miter * Math.sign(distance) };
  });
}

export function shapeFromContour(points: ContourPoint[], scale: number, offset = 0): THREE.Shape {
  const shape = new THREE.Shape();
  if (points.length < 3) {
    shape.absarc(0, 0, scale + offset, 0, Math.PI * 2, false);
    return shape;
  }
  const outline = offsetContour(points.map(p => ({ x: p.x * scale, y: p.y * scale })), offset);
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
