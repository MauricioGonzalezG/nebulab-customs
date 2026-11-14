import * as THREE from 'three';
import type { CrossSection, Manifold, ManifoldToplevel, SimplePolygon, Vec2 } from 'manifold-3d';
import { geometryFromMesh, textContours } from './plateBuilder';
import type { OrnamentConfig, OrnamentShape, OrnamentWindow } from './ornamentConfig';

export { loadPlateEngine as loadOrnamentEngine } from './plateBuilder';

// Margen de foto que queda oculto detrás del marco, para pegarla sin que se vea el borde.
export const PHOTO_MARGIN = 2.5;

export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

export interface OrnamentModel {
  // Geometrías en posición de ensamblaje: tapa en z=0, marco encima y relieve al frente.
  frame: THREE.BufferGeometry;
  relief: THREE.BufferGeometry;
  back: THREE.BufferGeometry;
  front: THREE.BufferGeometry; // marco + relieve unidos (pieza frontal imprimible)
  // Contornos 2D en mm (Y hacia arriba) para miniaturas y plantilla de foto.
  outline: SimplePolygon[];
  window: SimplePolygon[];
  accents: SimplePolygon[];
  photoArea: SimplePolygon[];
  bounds: Bounds;
  windowBounds: Bounds;
  photoBounds: Bounds;
  hole: Vec2;
  textHeight: number;
  volume: number;
  dispose: () => void;
}

type Box = { cx: number; cy: number; w: number; h: number; round?: boolean };

interface Kit {
  poly: (points: Vec2[]) => CrossSection;
  union: (...items: CrossSection[]) => CrossSection;
  cut: (a: CrossSection, b: CrossSection) => CrossSection;
  grow: (section: CrossSection, delta: number) => CrossSection;
  soften: (section: CrossSection, radius: number) => CrossSection;
}

// Cada forma se dibuja en unidades de diseño; luego se escala al tamaño pedido.
interface Design {
  outline: CrossSection;
  accents: CrossSection[];
  windowBox: Box;
  textBox: { cy: number; w: number; h: number };
  hole: Vec2;
  trim?: [number, number]; // aro decorativo alrededor de la ventana (desde, hasta)
}

const rad = (degrees: number) => degrees * Math.PI / 180;

function ellipse(cx: number, cy: number, rx: number, ry: number, segments = 64): Vec2[] {
  return Array.from({ length: segments }, (_, i) => {
    const angle = i / segments * Math.PI * 2;
    return [cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)] as Vec2;
  });
}

const circle = (cx: number, cy: number, r: number, segments = 72) => ellipse(cx, cy, r, r, segments);

function arc(cx: number, cy: number, r: number, from: number, to: number, steps = 10): Vec2[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = rad(from + (to - from) * i / steps);
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as Vec2;
  });
}

function roundedRect(cx: number, cy: number, w: number, h: number, radius: number): Vec2[] {
  const r = Math.min(radius, w / 2, h / 2);
  return [
    ...arc(cx + w / 2 - r, cy + h / 2 - r, r, 0, 90),
    ...arc(cx - w / 2 + r, cy + h / 2 - r, r, 90, 180),
    ...arc(cx - w / 2 + r, cy - h / 2 + r, r, 180, 270),
    ...arc(cx + w / 2 - r, cy - h / 2 + r, r, 270, 360),
  ];
}

// Ventana de arco: base recta con esquinas suaves y medio círculo arriba.
function arch(cx: number, cy: number, w: number, h: number): Vec2[] {
  const r = w / 2;
  const bottom = cy - h / 2;
  const corner = Math.min(2.5, w / 8);
  return [
    ...arc(cx + r - corner, bottom + corner, corner, 270, 360, 6),
    ...arc(cx, cy + h / 2 - r, r, 0, 180, 40),
    ...arc(cx - r + corner, bottom + corner, corner, 180, 270, 6),
  ];
}

function star(cx: number, cy: number, outer: number, inner: number, points = 5): Vec2[] {
  return Array.from({ length: points * 2 }, (_, i) => {
    const angle = Math.PI / 2 + i * Math.PI / points;
    const r = i % 2 ? inner : outer;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as Vec2;
  });
}

// Lazo en forma de gota: punta en el origen y extremo redondeado hacia `angle`.
function teardrop(ox: number, oy: number, length: number, width: number, angle: number, segments = 56): Vec2[] {
  const cos = Math.cos(rad(angle)), sin = Math.sin(rad(angle));
  return Array.from({ length: segments }, (_, i) => {
    const t = i / segments * Math.PI * 2;
    const along = length * (1 - Math.cos(t)) / 2;
    const across = width * Math.sin(t) * Math.sin(t / 2);
    return [ox + along * cos - across * sin, oy + along * sin + across * cos] as Vec2;
  });
}

function bezier(p0: Vec2, p1: Vec2, p2: Vec2, p3: Vec2, steps = 22): Vec2[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, u = 1 - t;
    return [
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ] as Vec2;
  });
}

// Convierte una línea abierta en una cinta de ancho constante con puntas redondas.
function stroke(path: Vec2[], width: number): Vec2[] {
  const half = width / 2;
  const normals = path.map((_, i) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1;
    return [-dy / length, dx / length] as Vec2;
  });
  const side = (sign: number) => path.map((p, i) => [p[0] + normals[i][0] * half * sign, p[1] + normals[i][1] * half * sign] as Vec2);
  const cap = (index: number, flip: number) => {
    const start = Math.atan2(normals[index][1] * flip, normals[index][0] * flip);
    return Array.from({ length: 7 }, (_, i) => {
      const angle = start - (i + 1) * Math.PI / 8;
      return [path[index][0] + half * Math.cos(angle), path[index][1] + half * Math.sin(angle)] as Vec2;
    });
  };
  const last = path.length - 1;
  return [...side(1), ...cap(last, 1), ...side(-1).reverse(), ...cap(0, -1)];
}

// Moño con dos lazos huecos, nudo y cintas. `filled` es su silueta completa
// (para el respaldo del cuerpo) y `ribbon` lo que se imprime en relieve.
function bow(k: Kit, x: number, y: number, s: number) {
  const loops = [162, 18].map(angle => k.poly(teardrop(x, y, 17 * s, 9 * s, angle)));
  const rings = loops.map(loop => k.cut(loop, k.grow(loop, -2.5 * s)));
  const knot = k.poly(ellipse(x, y, 3.3 * s, 3.9 * s, 40));
  const tails = [-1, 1].map(side => k.poly(stroke(bezier(
    [x + side * 1.2 * s, y - 2 * s], [x + side * 5 * s, y - 6.5 * s],
    [x + side * 11 * s, y - 4.5 * s], [x + side * 13.5 * s, y - 12.5 * s],
  ), 2.7 * s)));
  return { filled: k.union(...loops, knot, ...tails), ribbon: k.union(...rings, knot, ...tails) };
}

const SHAPES: Record<OrnamentShape, (k: Kit, hasText: boolean) => Design> = {
  // Etiqueta de regalo: marco rectangular con un moño que sobresale por arriba.
  gift: (k, hasText) => {
    const body = k.poly(roundedRect(0, 0, 52, 62, 6));
    const ribbon = bow(k, 0, 30, 1);
    return {
      outline: k.union(body, k.grow(ribbon.filled, 2.2)),
      accents: [ribbon.ribbon],
      windowBox: hasText ? { cx: 0, cy: 1, w: 40, h: 34 } : { cx: 0, cy: -3.5, w: 40, h: 43 },
      textBox: { cy: -24, w: 42, h: 6.5 },
      hole: [0, 37.5],
    };
  },
  // Esfera clásica con su capuchón.
  bauble: (k, hasText) => ({
    outline: k.union(k.poly(circle(0, 0, 30, 96)), k.poly(roundedRect(0, 32, 15, 8, 2))),
    accents: [k.poly(roundedRect(0, 32.4, 11.5, 4.6, 1.2))],
    windowBox: hasText ? { cx: 0, cy: 3, w: 38, h: 38, round: true } : { cx: 0, cy: 0, w: 44, h: 44, round: true },
    textBox: { cy: -22.5, w: 26, h: 5.5 },
    hole: [0, 39.5],
    trim: [1.2, 2.4],
  }),
  // Pino de tres niveles con estrella y esferas; el texto va en una base.
  tree: (k, hasText) => {
    const side: Vec2[] = [[14, 19], [9.5, 19], [23, -3], [17, -3], [32, -27]];
    const crown = k.soften(k.poly([[0, 42], ...side, ...side.map(([x, y]) => [-x, y] as Vec2).reverse()]), 2);
    const foot = hasText ? k.poly(roundedRect(0, -31.5, 44, 13, 3)) : k.poly(roundedRect(0, -31, 11, 10, 1.5));
    const topper = k.poly(star(0, 41, 8, 3.7));
    const balls = ([[-5, 27], [6, 13], [-13, 6], [15, 1], [-24, -21], [24, -21]] as Vec2[]).map(([x, y]) => k.poly(circle(x, y, 1.9, 28)));
    return {
      outline: k.union(crown, foot, k.grow(topper, 1.8)),
      accents: [topper, ...balls],
      windowBox: { cx: 0, cy: -9, w: 26, h: 28 },
      textBox: { cy: -32, w: 38, h: 6 },
      hole: [0, 50.5],
    };
  },
  // Estrella de cinco puntas; el texto va en una cinta entre las puntas inferiores.
  star: (k, hasText) => {
    const body = k.soften(k.poly(star(0, 0, 40, 22)), 2.5);
    const dots = [90, 162, 18, ...(hasText ? [] : [234, 306])].map(angle => k.poly(circle(28.5 * Math.cos(rad(angle)), 28.5 * Math.sin(rad(angle)), 1.7, 28)));
    return {
      outline: hasText ? k.union(body, k.poly(roundedRect(0, -26.5, 46, 10, 3))) : body,
      accents: dots,
      windowBox: { cx: 0, cy: 0, w: 30, h: 30, round: true },
      textBox: { cy: -26.5, w: 36, h: 5.5 },
      hole: [0, 38.5],
      trim: [1.2, 2.4],
    };
  },
  // Campana con moño, banda en el borde y badajo.
  bell: (k, hasText) => {
    const right: Vec2[] = [
      ...arc(0, 14, 20, 90, 0, 24),
      ...bezier([20, 14], [20.4, 5], [21.5, -7], [25, -14], 14).slice(1),
      ...bezier([25, -14], [27, -19.5], [30, -24], [34, -25.5], 14).slice(1),
      [34, -29],
    ];
    const body = k.soften(k.poly([...right, ...right.slice(1).map(([x, y]) => [-x, y] as Vec2).reverse()]), 1.4);
    const ribbon = bow(k, 0, 33.5, 0.62);
    return {
      outline: k.union(body, k.poly(circle(0, -31.5, 6.5, 48)), k.grow(ribbon.filled, 1.8)),
      accents: [ribbon.ribbon, k.poly(roundedRect(0, -27.2, 66, 3.4, 1.5)), k.poly(circle(0, -33, 4.2, 40))],
      windowBox: hasText ? { cx: 0, cy: 5.5, w: 30, h: 37 } : { cx: 0, cy: 2.5, w: 30, h: 43 },
      textBox: { cy: -19.5, w: 38, h: 5.5 },
      hole: [0, 40],
    };
  },
  // Casita con techo, chimenea y la foto como ventana.
  house: (k, hasText) => {
    const walls = k.poly(roundedRect(0, -13, 46, 36, 3));
    const roof = k.soften(k.poly([[0, 36], [-30, 3], [30, 3]]), 2);
    const chimney = k.union(k.poly(roundedRect(15.5, 21, 7, 18, 1)), k.poly(roundedRect(15.5, 30, 10.5, 4.2, 1.6)));
    const roofTrim = k.cut(k.cut(roof, k.grow(roof, -3.4)), k.grow(chimney, 0.8));
    return {
      outline: k.union(walls, roof, chimney),
      accents: [roofTrim, k.poly(roundedRect(15.5, 30, 8.6, 2.6, 1.1))],
      windowBox: hasText ? { cx: 0, cy: -2, w: 30, h: 30 } : { cx: 0, cy: -6, w: 30, h: 38 },
      textBox: { cy: -24.5, w: 38, h: 6 },
      hole: [0, 37],
    };
  },
};

function windowPoints(kind: OrnamentWindow, box: Box): Vec2[] {
  const { cx, cy } = box;
  if (kind === 'circle') return circle(cx, cy, Math.min(box.w, box.h) / 2, 96);
  if (kind === 'square') {
    const w = box.round ? box.w * 0.74 : box.w, h = box.round ? box.h * 0.74 : box.h;
    return roundedRect(cx, cy, w, h, Math.min(w, h) * 0.1);
  }
  const w = box.round ? box.w * 0.72 : box.w, h = box.round ? box.h * 0.88 : box.h;
  return arch(cx, cy, w, Math.max(h, w / 2 + 1));
}

const toBounds = (section: CrossSection): Bounds => {
  const { min, max } = section.bounds();
  return { minX: min[0], minY: min[1], maxX: max[0], maxY: max[1] };
};

const emptyGeometry = () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
  geometry.setIndex([]);
  return geometry;
};

// Construcción única para la vista previa, la miniatura y las exportaciones (mm).
// El adorno son dos piezas: marco frontal con ventana y relieve de color, y una
// tapa trasera lisa; la foto impresa queda entre ambas.
export function buildOrnament(api: ManifoldToplevel, config: OrnamentConfig): OrnamentModel {
  const owned: Array<CrossSection | Manifold> = [];
  const keep = <T extends CrossSection | Manifold>(value: T): T => { owned.push(value); return value; };
  const { CrossSection: CS, Manifold: Solid } = api;
  const kit: Kit = {
    poly: points => keep(new CS([points], 'NonZero')),
    union: (...items) => keep(CS.union(items)),
    cut: (a, b) => keep(a.subtract(b)),
    grow: (section, delta) => keep(section.offset(delta, 'Round', 2, 64)),
    soften: (section, radius) => kit.grow(kit.grow(kit.grow(section, -radius), radius * 2), -radius),
  };
  try {
    const text = config.text.trim();
    const design = SHAPES[config.shape](kit, !!text);
    const windowUnits = kit.poly(windowPoints(config.window, design.windowBox));

    // Escala: el lado mayor de la silueta mide `config.size` y queda centrada.
    const raw = toBounds(design.outline);
    const scale = config.size / Math.max(raw.maxX - raw.minX, raw.maxY - raw.minY);
    const cx = (raw.minX + raw.maxX) / 2, cy = (raw.minY + raw.maxY) / 2;
    const place = (section: CrossSection) => keep(keep(section.translate(-cx, -cy)).scale(scale));

    const windowSection = place(windowUnits);
    const hole: Vec2 = [(design.hole[0] - cx) * scale, (design.hole[1] - cy) * scale];
    const holeRadius = config.holeDiameter / 2;
    const eyeRadius = holeRadius + 2;
    // El ojal baja como una cápsula para fundirse siempre con el cuerpo.
    const eyelet = keep(CS.hull([
      keep(keep(CS.circle(eyeRadius, 48)).translate(hole[0], hole[1])),
      keep(keep(CS.circle(eyeRadius, 48)).translate(hole[0], hole[1] - eyeRadius - 1)),
    ]));
    const holeSection = keep(keep(CS.circle(holeRadius, 48)).translate(hole[0], hole[1]));
    const silhouette = kit.union(place(design.outline), eyelet);
    const backSection = kit.cut(silhouette, holeSection);
    const frameSection = kit.cut(backSection, windowSection);

    const accentParts = design.accents.map(place);
    if (design.trim) accentParts.push(place(kit.cut(kit.grow(windowUnits, design.trim[1]), kit.grow(windowUnits, design.trim[0]))));
    let textHeight = 0;
    if (text) {
      const line = textContours(text, design.textBox.w * scale, design.textBox.h * scale, (design.textBox.cy - cy) * scale);
      textHeight = line.height;
      if (line.contours.length) accentParts.push(keep(keep(new CS(line.contours, 'EvenOdd')).translate(-cx * scale, 0)));
    }
    // El relieve nunca toca el borde, la ventana ni el orificio.
    const accentSection = accentParts.length
      ? kit.cut(kit.cut(keep(kit.union(...accentParts).intersect(kit.grow(silhouette, -0.6))), kit.grow(windowSection, 0.8)), kit.grow(holeSection, 0.8))
      : undefined;
    const photoSection = keep(kit.grow(windowSection, PHOTO_MARGIN).intersect(kit.grow(silhouette, -1.2)));

    const { thickness, relief, backThickness } = config;
    const back = keep(backSection.extrude(backThickness));
    const frame = keep(keep(frameSection.extrude(thickness)).translate(0, 0, backThickness));
    const hasRelief = !!accentSection && !accentSection.isEmpty() && relief > 0;
    const reliefSolid = hasRelief ? keep(keep(accentSection!.extrude(relief)).translate(0, 0, backThickness + thickness)) : undefined;
    const front = reliefSolid ? keep(Solid.union(frame, reliefSolid)) : frame;
    for (const solid of [back, front]) {
      if (solid.status() !== 'NoError' || solid.isEmpty()) throw new Error('No se pudo construir un adorno imprimible.');
    }

    const geometries = [
      geometryFromMesh(frame.getMesh()),
      reliefSolid ? geometryFromMesh(reliefSolid.getMesh()) : emptyGeometry(),
      geometryFromMesh(back.getMesh()),
      geometryFromMesh(front.getMesh()),
    ];
    return {
      frame: geometries[0], relief: geometries[1], back: geometries[2], front: geometries[3],
      outline: backSection.toPolygons(),
      window: windowSection.toPolygons(),
      accents: hasRelief ? accentSection!.toPolygons() : [],
      photoArea: photoSection.toPolygons(),
      bounds: toBounds(silhouette),
      windowBounds: toBounds(windowSection),
      photoBounds: toBounds(photoSection),
      hole,
      textHeight,
      volume: back.volume() + front.volume(),
      dispose: () => geometries.forEach(geometry => geometry.dispose()),
    };
  } finally {
    owned.reverse().forEach(value => value.delete());
  }
}
