import { CollarConfig } from '../types';

export interface ProcessedCollarData {
  canvas: HTMLCanvasElement;
  originalCanvas: HTMLCanvasElement;
  previewDataUrl: string;
  contourPoints: Array<{ x: number; y: number }>;
  dominantColors: string[];
  width: number;
  height: number;
}

// Sample gallery templates for Pet Collar badges
export const COLLAR_SAMPLE_IMAGES = [
  {
    id: 'kolla',
    name: 'Logo Kolla Mascotas',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100"><text x="100" y="55" font-family="Outfit, sans-serif" font-weight="900" font-size="42" fill="%23FFFFFF" text-anchor="middle">Kolla</text><text x="100" y="80" font-family="Inter, sans-serif" font-weight="700" font-size="16" fill="%23E2E8F0" text-anchor="middle" letter-spacing="2">MASCOTAS</text><path fill="%23FF5555" d="M92,20 C92,15 96,12 100,16 C104,12 108,15 108,20 C108,26 100,32 100,32 C100,32 92,26 92,20 Z"/></svg>'
  },
  {
    id: 'dog_crest',
    name: 'Silueta Perro',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23FFFFFF" d="M30,45 Q25,20 50,30 Q75,20 70,45 Q80,70 50,85 Q20,70 30,45 Z"/><ellipse cx="38" cy="48" rx="4" ry="6" fill="%23111827"/><ellipse cx="62" cy="48" rx="4" ry="6" fill="%23111827"/><ellipse cx="50" cy="62" rx="7" ry="5" fill="%23111827"/></svg>'
  },
  {
    id: 'bone_icon',
    name: 'Icono Hueso',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60"><path fill="%23FFFFFF" d="M25,12 C18,12 12,18 12,25 C12,28 14,31 16,33 C14,35 12,38 12,41 C12,48 18,54 25,54 C30,54 35,51 38,46 L82,46 C85,51 90,54 95,54 C102,54 108,48 108,41 C108,38 106,35 104,33 C106,31 108,28 108,25 C108,18 102,12 95,12 C90,12 85,15 82,20 L38,20 C35,15 30,12 25,12 Z"/></svg>'
  },
  {
    id: 'paw_crest',
    name: 'Huella Dorada',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23D4AF37" d="M50,45 C35,45 25,60 30,78 C35,90 65,90 70,78 C75,60 65,45 50,45 Z"/><ellipse cx="22" cy="35" rx="8" ry="12" fill="%23D4AF37"/><ellipse cx="40" cy="22" rx="8" ry="12" fill="%23D4AF37"/><ellipse cx="60" cy="22" rx="8" ry="12" fill="%23D4AF37"/><ellipse cx="78" cy="35" rx="8" ry="12" fill="%23D4AF37"/></svg>'
  },
  {
    id: 'cat_cute',
    name: 'Gatito Cute',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="20,40 32,15 48,32" fill="%23FFFFFF"/><polygon points="80,40 68,15 52,32" fill="%23FFFFFF"/><circle cx="50" cy="55" r="35" fill="%23FFFFFF"/><ellipse cx="38" cy="52" rx="4" ry="6" fill="%23111827"/><ellipse cx="62" cy="52" rx="4" ry="6" fill="%23111827"/><polygon points="46,62 54,62 50,67" fill="%23FF5555"/></svg>'
  },
  {
    id: 'crown_royal',
    name: 'Corona Royal',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><polygon points="15,65 20,25 38,45 50,15 62,45 80,25 85,65" fill="%23F59E0B" stroke="%23B45309" stroke-width="3"/><circle cx="20" cy="22" r="4" fill="%23EF4444"/><circle cx="50" cy="12" r="5" fill="%233B82F6"/><circle cx="80" cy="22" r="4" fill="%23EF4444"/><rect x="18" y="65" width="64" height="6" fill="%23D97706" rx="2"/></svg>'
  }
];

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Extracts dominant distinct colors from an ImageData object
 */
export const extractCollarDominantColors = (imgData: ImageData, maxColors: number = 4): string[] => {
  const target = Number.isFinite(maxColors) ? Math.max(0, Math.min(8, Math.floor(maxColors))) : 4;
  if (target === 0) return [];
  const data = imgData.data;
  const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  const step = 32;
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3];
    if (a < 60) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const qr = Math.floor(r / step) * step + step / 2;
    const qg = Math.floor(g / step) * step + step / 2;
    const qb = Math.floor(b / step) * step + step / 2;
    const key = `${qr},${qg},${qb}`;

    const existing = colorBuckets.get(key);
    if (existing) {
      existing.count++;
      existing.r += r;
      existing.g += g;
      existing.b += b;
    } else {
      colorBuckets.set(key, { count: 1, r, g, b });
    }
  }

  const sorted = Array.from(colorBuckets.values()).sort((a, b) => b.count - a.count);

  const dominantHexes: string[] = [];
  for (const bucket of sorted) {
    const r = Math.round(bucket.r / bucket.count);
    const g = Math.round(bucket.g / bucket.count);
    const b = Math.round(bucket.b / bucket.count);
    const hex = rgbToHex(r, g, b);

    const isTooClose = dominantHexes.some(existingHex => {
      const exRgb = hexToRgb(existingHex);
      const dist = Math.sqrt((r - exRgb.r) ** 2 + (g - exRgb.g) ** 2 + (b - exRgb.b) ** 2);
      return dist < 45;
    });

    if (!isTooClose) {
      dominantHexes.push(hex);
      if (dominantHexes.length >= target) break;
    }
  }

  const fallbacks = ['#1E293B', '#D4AF37', '#FFFFFF', '#EF4444', '#38BDF8', '#84CC16', '#A855F7', '#F97316'];
  for (const fb of fallbacks) {
    if (dominantHexes.length >= target) break;
    if (!dominantHexes.includes(fb)) dominantHexes.push(fb);
  }

  return dominantHexes.slice(0, target);
};

/**
 * Remove a uniform, connected background from the *source* image. Sampling
 * the padded output canvas would only find its transparent corners for most
 * landscape and portrait uploads. Flood filling also protects enclosed white
 * details (such as the centre of a letter) from being erased.
 */
export function removeCollarBackground(imgData: ImageData): boolean {
  const { data, width, height } = imgData;
  const pixelCount = width * height;
  if (!pixelCount || data.length < pixelCount * 4) return false;

  let transparent = 0;
  let opaque = 0;
  for (let pixel = 0; pixel < pixelCount; pixel++) {
    const alpha = data[pixel * 4 + 3];
    if (alpha < 220) transparent++;
    if (alpha >= 40) opaque++;
  }
  // Already-cut-out artwork, including SVG samples, needs no colour key.
  if (transparent > pixelCount * 0.01 || opaque === 0) return false;

  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  const border: number[] = [];
  const insetX = Math.min(width - 1, Math.floor(width * 0.01));
  const insetY = Math.min(height - 1, Math.floor(height * 0.01));
  const addBorder = (x: number, y: number) => {
    const pixel = y * width + x;
    const index = pixel * 4;
    if (data[index + 3] < 220) return;
    border.push(pixel);
    const key = `${data[index] >> 4},${data[index + 1] >> 4},${data[index + 2] >> 4}`;
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.count++;
      bucket.r += data[index];
      bucket.g += data[index + 1];
      bucket.b += data[index + 2];
    } else {
      buckets.set(key, { count: 1, r: data[index], g: data[index + 1], b: data[index + 2] });
    }
  };
  for (let x = insetX; x < width - insetX; x++) {
    addBorder(x, insetY);
    if (height - 1 - insetY !== insetY) addBorder(x, height - 1 - insetY);
  }
  for (let y = insetY + 1; y < height - 1 - insetY; y++) {
    addBorder(insetX, y);
    if (width - 1 - insetX !== insetX) addBorder(width - 1 - insetX, y);
  }
  if (border.length < 4) return false;

  const candidate = [...buckets.values()].sort((a, b) => b.count - a.count)[0];
  const bgR = candidate.r / candidate.count;
  const bgG = candidate.g / candidate.count;
  const bgB = candidate.b / candidate.count;
  const distance = (pixel: number) => {
    const index = pixel * 4;
    return Math.hypot(data[index] - bgR, data[index + 1] - bgG, data[index + 2] - bgB);
  };
  const matchingBorder = border.filter(pixel => distance(pixel) <= 45);
  // A photograph or patterned edge has no reliable background colour.
  if (matchingBorder.length < border.length * 0.55) return false;

  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const enqueue = (pixel: number) => {
    if (visited[pixel] || data[pixel * 4 + 3] < 40 || distance(pixel) > 58) return;
    visited[pixel] = 1;
    queue[tail++] = pixel;
  };
  // Seed at the actual source image edge, not the inset sampling line.
  for (let x = 0; x < width; x++) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }
  if (tail === 0) return false;

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    if (x > 0) enqueue(pixel - 1);
    if (x + 1 < width) enqueue(pixel + 1);
    if (pixel >= width) enqueue(pixel - width);
    if (pixel + width < pixelCount) enqueue(pixel + width);
  }

  if (tail < opaque * 0.02 || opaque - tail < Math.max(8, opaque * 0.001)) return false;
  for (let i = 0; i < tail; i++) {
    const pixel = queue[i];
    const index = pixel * 4 + 3;
    // A narrow feather softens JPEG antialiasing without changing the artwork.
    const keep = Math.max(0, Math.min(1, (distance(pixel) - 28) / 30));
    data[index] = Math.round(data[index] * keep);
  }
  return true;
}

/** A convex outer contour encloses all visible parts of a disconnected logo. */
export function traceCollarContour(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number = 80
): Array<{ x: number; y: number }> {
  const fallback = () => {
    const fallback: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      fallback.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return fallback;
  };

  if (width <= 0 || height <= 0 || data.length < width * height * 4) return fallback();
  const isSolid = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] >= alphaThreshold;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const components: Array<{ size: number; boundary: Array<{ x: number; y: number }> }> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const start = y * width + x;
      if (visited[start] || !isSolid(x, y)) continue;
      let head = 0;
      let tail = 0;
      visited[start] = 1;
      queue[tail++] = start;
      const componentBoundary: Array<{ x: number; y: number }> = [];
      while (head < tail) {
        const pixel = queue[head++];
        const px = pixel % width;
        const py = Math.floor(pixel / width);
        if (!isSolid(px - 1, py) || !isSolid(px + 1, py) || !isSolid(px, py - 1) || !isSolid(px, py + 1)) {
          componentBoundary.push({ x: px, y: py });
        }
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const nx = px + dx;
            const ny = py + dy;
            if (!isSolid(nx, ny)) continue;
            const neighbor = ny * width + nx;
            if (visited[neighbor]) continue;
            visited[neighbor] = 1;
            queue[tail++] = neighbor;
          }
        }
      }
      components.push({ size: tail, boundary: componentBoundary });
    }
  }
  const largest = components.reduce((size, component) => Math.max(size, component.size), 0);
  const boundary = components
    .filter(component => component.size >= Math.max(4, largest * 0.01))
    .flatMap(component => component.boundary);
  if (boundary.length < 3) return fallback();
  boundary.sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const lower: typeof boundary = [];
  for (const point of boundary) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
    lower.push(point);
  }
  const upper: typeof boundary = [];
  for (let i = boundary.length - 1; i >= 0; i--) {
    const point = boundary[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
    upper.push(point);
  }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  if (hull.length < 3) return fallback();

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pt of hull) {
    minX = Math.min(minX, pt.x);
    maxX = Math.max(maxX, pt.x);
    minY = Math.min(minY, pt.y);
    maxY = Math.max(maxY, pt.y);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const maxDim = Math.max(maxX - minX, maxY - minY, 1) / 2;

  const normalized = hull.map(p => ({
      x: (p.x - cx) / maxDim,
      y: (p.y - cy) / maxDim,
  }));

  // One pass rounds pixel corners while preserving a simple, convex outline.
  let smoothed = normalized;
  for (let pass = 0; pass < 1; pass++) {
    const nextSmooth: Array<{ x: number; y: number }> = [];
    const len = smoothed.length;
    for (let i = 0; i < len; i++) {
      const p0 = smoothed[i];
      const p1 = smoothed[(i + 1) % len];

      const q = { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y };
      const r = { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y };

      nextSmooth.push(q);
      nextSmooth.push(r);
    }
    smoothed = nextSmooth;
  }

  if (smoothed.length > 120) {
    const finalStep = Math.ceil(smoothed.length / 120);
    smoothed = smoothed.filter((_, idx) => idx % finalStep === 0);
  }

  return smoothed;
}

export const processCollarImage = (
  image: HTMLImageElement,
  config: CollarConfig
): ProcessedCollarData => {
  const naturalW = image.naturalWidth || image.width;
  const naturalH = image.naturalHeight || image.height;
  if (!Number.isFinite(naturalW) || !Number.isFinite(naturalH) || naturalW <= 0 || naturalH <= 0) {
    throw new Error('La imagen del collar no tiene dimensiones válidas.');
  }

  const res = 512;
  const longest = Math.max(naturalW, naturalH);
  const sourceW = Math.max(1, Math.round(naturalW * res / longest));
  const sourceH = Math.max(1, Math.round(naturalH * res / longest));
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = sourceW;
  sourceCanvas.height = sourceH;
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) throw new Error('Canvas 2D context not available');
  sourceCtx.clearRect(0, 0, sourceW, sourceH);
  sourceCtx.drawImage(image, 0, 0, sourceW, sourceH);
  if (config.removeBackground) {
    const sourceData = sourceCtx.getImageData(0, 0, sourceW, sourceH);
    if (removeCollarBackground(sourceData)) sourceCtx.putImageData(sourceData, 0, 0);
  }

  const canvas = document.createElement('canvas');
  canvas.width = res;
  canvas.height = res;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context not available');

  const rotation = Number.isFinite(config.imageRotation) ? config.imageRotation : 0;
  const radians = (rotation * Math.PI) / 180;
  const rotatedW = Math.abs(Math.cos(radians)) * sourceW + Math.abs(Math.sin(radians)) * sourceH;
  const rotatedH = Math.abs(Math.sin(radians)) * sourceW + Math.abs(Math.cos(radians)) * sourceH;
  // Reserve padding for every rotation; otherwise corners are cropped at 45°.
  const scale = (res * 0.86) / Math.max(rotatedW, rotatedH);
  ctx.clearRect(0, 0, res, res);
  ctx.save();
  ctx.translate(res / 2, res / 2);
  ctx.rotate(radians);
  ctx.scale(config.flipHorizontal ? -scale : scale, scale);
  ctx.drawImage(sourceCanvas, -sourceW / 2, -sourceH / 2, sourceW, sourceH);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, res, res);

  const dominantColors = extractCollarDominantColors(imgData, 4);

  // Save original canvas with transparent background
  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = res;
  originalCanvas.height = res;
  const origCtx = originalCanvas.getContext('2d');
  if (origCtx) {
    origCtx.putImageData(imgData, 0, 0);
  }

  const contourPoints = traceCollarContour(imgData.data, res, res);

  return {
    canvas,
    originalCanvas,
    previewDataUrl: originalCanvas.toDataURL('image/png'),
    contourPoints,
    dominantColors,
    width: res,
    height: res,
  };
};

export const createDefaultCollarConfig = (): CollarConfig => ({
  imageUrl: null,
  sampleId: undefined,
  removeBackground: false,
  petName: 'Kolla',
  phoneText: '315 678 9012',
  plateStyle: 'circle',
  mountType: 'slide',
  fontFamily: 'outfit',
  reliefStyle: 'embossed',
  icon: 'none',
  plateColor: '#1E293B',
  borderColor: '#FFFFFF',
  textColor: '#FFFFFF',
  strapColor: 'olive',
  size: 'M',
  plateWidth: 50,
  plateHeight: 32,
  plateThickness: 4.0,
  plateBevel: 1.0,
  ringDiameter: 4.5,
  imageRotation: 0,
  flipHorizontal: false,
  lightingMode: 'studio',
  viewMode: 'assembled',
});
