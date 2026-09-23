import type { CollarIcon } from '../types';

/**
 * Colección de íconos minimalistas para la placa del collar.
 *
 * Cada ícono se define una sola vez en unidades del ícono (±5) y de ahí se
 * derivan las dos representaciones: los polígonos del modelo 3D imprimible
 * (ver `iconPolygons` en collarModel.ts) y los glifos SVG del selector.
 *
 * Todo es macizo (sin huecos) y con rasgos gruesos (≥1.2 unidades ≈ 0.5 mm),
 * porque a ~4 mm de ancho los detalles finos no se imprimen ni se leen.
 */
export interface CollarIconArt {
  /** Círculos sólidos [cx, cy, r]. */
  circles: Array<[number, number, number]>;
  /** Polígonos sólidos (simples, sin autointersecciones). */
  paths: Array<Array<[number, number]>>;
}

export interface CollarIconDef {
  id: Exclude<CollarIcon, 'none'>;
  label: string;
  art: CollarIconArt;
}

const circle = (cx: number, cy: number, r: number): [number, number, number] => [cx, cy, r];

/** Luna creciente: arco exterior + arco interior recortado (lado derecho). */
function crescentArt(): CollarIconArt {
  const R = 4.1;
  const r = 3.4;
  const ox = 0.9;
  const ix = -1.5;
  const d = ox - ix;
  const a = (R * R - r * r + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0.01, R * R - a * a));
  const ipx = ox - a;
  const outer0 = Math.atan2(h, ipx - ox);
  const points: Array<[number, number]> = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const ang = outer0 - ((2 * outer0) * i) / N;
    points.push([ox + R * Math.cos(ang), R * Math.sin(ang)]);
  }
  // El borde del recorte es el lado derecho del círculo interior (por el 0°).
  const innerLow = Math.atan2(-h, ipx - ix);
  const innerHigh = Math.atan2(h, ipx - ix);
  const sweep = innerHigh - innerLow;
  const M = 16;
  for (let i = 1; i < M; i++) {
    const ang = innerLow + (sweep * i) / M;
    points.push([ix + r * Math.cos(ang), r * Math.sin(ang)]);
  }
  // Recentra la figura (el vientre queda a la derecha por construcción).
  return { circles: [], paths: [points.map(([x, y]) => [x - 1.75, y] as [number, number])] };
}

/** Sol: centro macizo + 8 rayos trapezoidales gruesos. */
function sunArt(): CollarIconArt {
  const paths: Array<Array<[number, number]>> = [];
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const spreadBase = 0.3;
    const spreadTip = 0.16;
    const r1 = 2.3;
    const r2 = 4.2;
    paths.push([
      [r1 * Math.cos(ang - spreadBase), r1 * Math.sin(ang - spreadBase)],
      [r1 * Math.cos(ang + spreadBase), r1 * Math.sin(ang + spreadBase)],
      [r2 * Math.cos(ang + spreadTip), r2 * Math.sin(ang + spreadTip)],
      [r2 * Math.cos(ang - spreadTip), r2 * Math.sin(ang - spreadTip)],
    ]);
  }
  return { circles: [circle(0, 0, 2.1)], paths };
}

export const COLLAR_ICONS: CollarIconDef[] = [
  {
    id: 'paw', label: 'Huella',
    art: { circles: [circle(0, -1.6, 2.4), circle(-3.5, 2.4, 1.25), circle(-1.2, 4.1, 1.25), circle(1.2, 4.1, 1.25), circle(3.5, 2.4, 1.25)], paths: [] },
  },
  {
    id: 'heart', label: 'Corazón',
    art: { circles: [circle(-2, 1.2, 2.3), circle(2, 1.2, 2.3)], paths: [[[-4.1, 0.6], [4.1, 0.6], [0, -4.2]]] },
  },
  {
    id: 'bone', label: 'Hueso',
    art: {
      circles: [circle(-2.6, -1.1, 1.5), circle(-2.6, 1.1, 1.5), circle(2.6, -1.1, 1.5), circle(2.6, 1.1, 1.5)],
      paths: [[[-2.6, -1.1], [2.6, -1.1], [2.6, 1.1], [-2.6, 1.1]]],
    },
  },
  {
    id: 'crown', label: 'Corona',
    art: { circles: [], paths: [[[-4.4, -3], [-4.4, 2], [-2, 0], [0, 4], [2, 0], [4.4, 2], [4.4, -3]]] },
  },
  {
    id: 'star', label: 'Estrella',
    art: {
      circles: [],
      paths: [Array.from({ length: 10 }, (_, i) => {
        const angle = Math.PI / 2 + (i * Math.PI) / 5;
        const radius = i % 2 ? 2 : 4.6;
        return [radius * Math.cos(angle), radius * Math.sin(angle)] as [number, number];
      })],
    },
  },
  {
    id: 'cross', label: 'Cruz',
    art: { circles: [], paths: [[[-1.2, -4], [-1.2, -1.2], [-4, -1.2], [-4, 1.2], [-1.2, 1.2], [-1.2, 4], [1.2, 4], [1.2, 1.2], [4, 1.2], [4, -1.2], [1.2, -1.2], [1.2, -4]]] },
  },
  {
    id: 'fish', label: 'Pez',
    art: { circles: [], paths: [[[4.6, 0], [1.8, 1.9], [-0.8, 1.7], [-3.6, 3.4], [-2.8, 0], [-3.6, -3.4], [-0.8, -1.7], [1.8, -1.9]]] },
  },
  {
    id: 'flower', label: 'Flor',
    art: {
      circles: [circle(0, 0, 1.7), ...Array.from({ length: 6 }, (_, i) => {
        const angle = (i * Math.PI) / 3;
        return circle(2.6 * Math.cos(angle), 2.6 * Math.sin(angle), 1.9);
      })],
      paths: [],
    },
  },
  {
    id: 'bolt', label: 'Rayo',
    art: { circles: [], paths: [[[1.2, -4.4], [-2.6, 0.6], [-0.6, 0.6], [-1.2, 4.4], [2.6, -0.6], [0.6, -0.6]]] },
  },
  { id: 'moon', label: 'Luna', art: crescentArt() },
  {
    id: 'cat', label: 'Gato',
    art: { circles: [], paths: [[[-3.6, 0.8], [-3.2, 4.3], [-1.2, 2.4], [1.2, 2.4], [3.2, 4.3], [3.6, 0.8], [3.2, -1.5], [1.8, -3.2], [0, -3.7], [-1.8, -3.2], [-3.2, -1.5]]] },
  },
  {
    id: 'bunny', label: 'Conejo',
    art: { circles: [circle(0, -0.8, 2.6), circle(-1.6, 2.6, 1.35), circle(1.6, 2.6, 1.35)], paths: [] },
  },
  {
    id: 'butterfly', label: 'Mariposa',
    art: {
      circles: [circle(-2.3, 1.3, 2.3), circle(2.3, 1.3, 2.3), circle(-1.9, -2.3, 1.6), circle(1.9, -2.3, 1.6)],
      paths: [[[-0.7, -3.4], [0.7, -3.4], [0.7, 3.4], [-0.7, 3.4]]],
    },
  },
  {
    id: 'clover', label: 'Trébol',
    art: {
      circles: [circle(-1.7, 1.7, 2), circle(1.7, 1.7, 2), circle(-1.7, -1.7, 2), circle(1.7, -1.7, 2)],
      paths: [[[0.7, -2], [-0.7, -2], [0, -4.2]]],
    },
  },
  {
    id: 'diamond', label: 'Diamante',
    art: { circles: [], paths: [[[0, -4.2], [3.2, -1], [1.9, 3.6], [-1.9, 3.6], [-3.2, -1]]] },
  },
  {
    id: 'music', label: 'Música',
    art: {
      circles: [circle(-1.8, -2.6, 1.9)],
      paths: [
        [[-0.1, -2.2], [1.3, -2.2], [1.3, 4.2], [-0.1, 4.2]],
        [[1.3, 4.2], [3.8, 3], [1.3, 1.6]],
      ],
    },
  },
  { id: 'sun', label: 'Sol', art: sunArt() },
  {
    id: 'leaf', label: 'Hoja',
    art: {
      circles: [],
      paths: [
        [[0, 4.3], [2.7, 0.6], [0, -4], [-2.7, 0.6]],
        [[0.7, -3], [0.7, -4.6], [-0.7, -4.6], [-0.7, -3]],
      ],
    },
  },
];

export function collarIconLabel(icon: CollarIcon): string {
  if (icon === 'none') return 'Sin ícono';
  return COLLAR_ICONS.find(entry => entry.id === icon)?.label ?? icon;
}
