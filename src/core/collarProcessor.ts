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
      if (dominantHexes.length >= maxColors) break;
    }
  }

  const fallbacks = ['#1E293B', '#D4AF37', '#FFFFFF', '#EF4444'];
  while (dominantHexes.length < maxColors) {
    for (const fb of fallbacks) {
      if (!dominantHexes.includes(fb)) {
        dominantHexes.push(fb);
        if (dominantHexes.length >= maxColors) break;
      }
    }
  }

  return dominantHexes.slice(0, maxColors);
};

/**
 * 2D Moore-Neighbor Boundary Tracing algorithm for pet tag silhouettes
 */
function traceCollarContour(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number = 40
): Array<{ x: number; y: number }> {
  const isSolid = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] >= alphaThreshold;
  };

  let startX = -1;
  let startY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isSolid(x, y)) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) {
    const fallback: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      fallback.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return fallback;
  }

  const dx = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dy = [0, -1, -1, -1, 0, 1, 1, 1];

  const contour: Array<{ x: number; y: number }> = [];
  let currX = startX;
  let currY = startY;
  let dir = 0;

  const maxSteps = width * height * 2;
  let steps = 0;

  contour.push({ x: currX, y: currY });

  while (steps < maxSteps) {
    steps++;
    let foundNext = false;

    for (let i = 0; i < 8; i++) {
      const checkDir = (dir + i) % 8;
      const nx = currX + dx[checkDir];
      const ny = currY + dy[checkDir];

      if (isSolid(nx, ny)) {
        currX = nx;
        currY = ny;
        dir = (checkDir + 6) % 8;
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;

    if (currX === startX && currY === startY && contour.length > 3) {
      break;
    }

    contour.push({ x: currX, y: currY });
  }

  if (contour.length < 4) {
    const fallback: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      fallback.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return fallback;
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const pt of contour) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const maxDim = Math.max(maxX - minX, maxY - minY, 1) / 2;

  const targetSamples = 120;
  const stride = Math.max(1, Math.floor(contour.length / targetSamples));
  const subsampled: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < contour.length; i += stride) {
    const p = contour[i];
    subsampled.push({
      x: (p.x - cx) / maxDim,
      y: (p.y - cy) / maxDim,
    });
  }

  // Chaikin smoothing
  let smoothed = subsampled;
  for (let pass = 0; pass < 2; pass++) {
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
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  const res = 512;
  canvas.width = res;
  canvas.height = res;

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  const aspect = image.width / (image.height || 1);
  let drawW = res;
  let drawH = res;
  if (aspect > 1) {
    drawH = res / aspect;
  } else {
    drawW = res * aspect;
  }

  // Draw image with rotation and flip applied
  ctx.clearRect(0, 0, res, res);
  ctx.save();
  ctx.translate(res / 2, res / 2);
  if (config.flipHorizontal) {
    ctx.scale(-1, 1);
  }
  if (config.imageRotation) {
    ctx.rotate((config.imageRotation * Math.PI) / 180);
  }
  ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();

  const imgData = ctx.getImageData(0, 0, res, res);
  const data = imgData.data;

  // 1. Background removal if requested
  if (config.removeBackground) {
    const corners = [
      0,
      (res - 1) * 4,
      ((res - 1) * res) * 4,
      ((res - 1) * res + (res - 1)) * 4,
    ];

    let bgR = 0, bgG = 0, bgB = 0, count = 0;
    for (const c of corners) {
      if (data[c + 3] > 100) {
        bgR += data[c];
        bgG += data[c + 1];
        bgB += data[c + 2];
        count++;
      }
    }

    if (count > 0) {
      bgR = Math.round(bgR / count);
      bgG = Math.round(bgG / count);
      bgB = Math.round(bgB / count);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        const colorDist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        if (a < 25 || colorDist < 42) {
          data[i + 3] = 0;
        }
      }
    }
  }

  const dominantColors = extractCollarDominantColors(imgData, 4);

  // Save original canvas with transparent background
  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = res;
  originalCanvas.height = res;
  const origCtx = originalCanvas.getContext('2d');
  if (origCtx) {
    origCtx.putImageData(imgData, 0, 0);
  }

  // 2. Extract contour points
  const contourPoints = traceCollarContour(imgData.data, res, res, 40);

  ctx.putImageData(imgData, 0, 0);

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
  imageUrl: COLLAR_SAMPLE_IMAGES[0].url,
  sampleId: 'kolla',
  removeBackground: true,
  petName: 'Kolla',
  phoneText: '315 678 9012',
  plateStyle: 'bone',
  mountType: 'slide',
  fontFamily: 'outfit',
  reliefStyle: 'embossed',
  icon: 'paw',
  plateColor: '#1E293B',
  borderColor: '#D4AF37',
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
