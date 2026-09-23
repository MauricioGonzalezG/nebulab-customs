import * as THREE from 'three';
import { CollarPlateStyle } from '../types';

export function createCollarPlateShape(
  style: CollarPlateStyle,
  width: number,
  height: number,
  pts: Array<{ x: number; y: number }> = [],
  bevelRadius: number = 2.0
): THREE.Shape {
  const shape = new THREE.Shape();
  const halfW = width / 2;
  const halfH = height / 2;

  switch (style) {
    case 'bone': {
      // Four rounded lobes, with continuous curves and no self-intersections.
      shape.moveTo(-halfW * .58, halfH * .68);
      shape.bezierCurveTo(-halfW, halfH * 1.5, -halfW * 1.3, halfH * .25, -halfW * .86, 0);
      shape.bezierCurveTo(-halfW * 1.3, -halfH * .25, -halfW, -halfH * 1.5, -halfW * .58, -halfH * .68);
      shape.lineTo(halfW * .58, -halfH * .68);
      shape.bezierCurveTo(halfW, -halfH * 1.5, halfW * 1.3, -halfH * .25, halfW * .86, 0);
      shape.bezierCurveTo(halfW * 1.3, halfH * .25, halfW, halfH * 1.5, halfW * .58, halfH * .68);
      shape.closePath();
      break;
    }

    case 'circle': {
      const r = Math.min(halfW, halfH);
      shape.absarc(0, 0, r, 0, Math.PI * 2, false);
      break;
    }

    case 'shield': {
      const sX = halfW;
      const sY = halfH;
      shape.moveTo(-sX * 0.9, sY * 0.9);
      shape.lineTo(sX * 0.9, sY * 0.9);
      shape.lineTo(sX * 0.9, -sY * 0.1);
      shape.bezierCurveTo(sX * 0.9, -sY * 0.7, 0, -sY * 1.05, 0, -sY * 1.05);
      shape.bezierCurveTo(0, -sY * 1.05, -sX * 0.9, -sY * 0.7, -sX * 0.9, -sY * 0.1);
      shape.closePath();
      break;
    }

    case 'heart': {
      const s = Math.min(halfW, halfH) * 0.038;
      shape.moveTo(0, 15 * s);
      shape.bezierCurveTo(25 * s, 35 * s, 35 * s, 10 * s, 35 * s, -10 * s);
      shape.bezierCurveTo(35 * s, -25 * s, 20 * s, -35 * s, 0, -45 * s);
      shape.bezierCurveTo(-20 * s, -35 * s, -35 * s, -25 * s, -35 * s, -10 * s);
      shape.bezierCurveTo(-35 * s, 10 * s, -25 * s, 35 * s, 0, 15 * s);
      shape.closePath();
      break;
    }

    case 'hexagon': {
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(angle) * (halfW * 0.95);
        const y = Math.sin(angle) * (halfH * 0.95);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }
      shape.closePath();
      break;
    }

    case 'pill': {
      const r = halfH * 0.85;
      shape.moveTo(-halfW + r, -r);
      shape.lineTo(halfW - r, -r);
      shape.absarc(halfW - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(-halfW + r, r);
      shape.absarc(-halfW + r, 0, r, Math.PI / 2, Math.PI * 1.5, false);
      shape.closePath();
      break;
    }

    case 'silhouette': {
      if (pts.length > 2) {
        shape.moveTo(pts[0].x * halfW, -pts[0].y * halfH);
        for (let i = 1; i < pts.length; i++) {
          shape.lineTo(pts[i].x * halfW, -pts[i].y * halfH);
        }
        shape.closePath();
      } else {
        shape.absarc(0, 0, Math.min(halfW, halfH), 0, Math.PI * 2, false);
      }
      break;
    }

    case 'rectangle': {
      shape.moveTo(-halfW, -halfH);
      shape.lineTo(halfW, -halfH);
      shape.lineTo(halfW, halfH);
      shape.lineTo(-halfW, halfH);
      shape.closePath();
      break;
    }

    case 'rounded':
    default: {
      const r = Math.min(bevelRadius * 3, halfH * 0.4, halfW * 0.4);
      shape.moveTo(-halfW + r, -halfH);
      shape.lineTo(halfW - r, -halfH);
      shape.quadraticCurveTo(halfW, -halfH, halfW, -halfH + r);
      shape.lineTo(halfW, halfH - r);
      shape.quadraticCurveTo(halfW, halfH, halfW - r, halfH);
      shape.lineTo(-halfW + r, halfH);
      shape.quadraticCurveTo(-halfW, halfH, -halfW, halfH - r);
      shape.lineTo(-halfW, -halfH + r);
      shape.quadraticCurveTo(-halfW, -halfH, -halfW + r, -halfH);
      shape.closePath();
      break;
    }
  }

  const points = shape.getPoints(40);
  const box = new THREE.Box2().setFromPoints(points);
  const size = box.getSize(new THREE.Vector2());
  const center = box.getCenter(new THREE.Vector2());
  const result = new THREE.Shape(points.map(p => new THREE.Vector2(
    (p.x - center.x) * width / Math.max(size.x, .01),
    (p.y - center.y) * height / Math.max(size.y, .01)
  )));
  result.closePath();
  return result;
}

