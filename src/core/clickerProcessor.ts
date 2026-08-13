import { ClickerConfig } from '../types';

export interface ProcessedClickerData {
  canvas: HTMLCanvasElement;
  originalCanvas: HTMLCanvasElement;
  previewDataUrl: string;
  contourPoints: Array<{ x: number; y: number }>;
  dominantColors: string[];
  colorLayers: Array<{
    color: string;
    points: Array<{ x: number; y: number }>;
  }>;
  width: number;
  height: number;
  aspectRatio: number;
}

// Default sample images with clean vector-like designs
export const CLICKER_SAMPLE_IMAGES = [
  {
    id: 'dog',
    name: 'Mascota Perro',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23FFFFFF" stroke="%23000000" stroke-width="4" d="M20,40 Q20,10 50,20 Q80,10 80,40 Q90,70 50,90 Q10,70 20,40 Z"/><ellipse cx="35" cy="45" rx="5" ry="7" fill="%23000000"/><ellipse cx="65" cy="45" rx="5" ry="7" fill="%23000000"/><ellipse cx="50" cy="60" rx="8" ry="6" fill="%23000000"/><path fill="none" stroke="%23000000" stroke-width="3" d="M42,66 Q50,75 58,66"/><path fill="%23FF5555" d="M46,71 Q50,82 54,71 Z"/></svg>'
  },
  {
    id: 'heart',
    name: 'Corazón Cute',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23FF4B4B" stroke="%23000000" stroke-width="4" d="M50,88 C20,65 5,45 15,25 C25,5 45,15 50,30 C55,15 75,5 85,25 C95,45 80,65 50,88 Z"/><circle cx="35" cy="40" r="4" fill="%23000000"/><circle cx="65" cy="40" r="4" fill="%23000000"/><path fill="none" stroke="%23000000" stroke-width="3" stroke-linecap="round" d="M42,48 Q50,55 58,48"/></svg>'
  },
  {
    id: 'paw',
    name: 'Huella Animal',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23FF99DD" stroke="%23000000" stroke-width="4" d="M50,45 C35,45 25,60 30,78 C35,90 65,90 70,78 C75,60 65,45 50,45 Z"/><ellipse cx="22" cy="35" rx="8" ry="12" fill="%23FF99DD" stroke="%23000000" stroke-width="3"/><ellipse cx="40" cy="22" rx="8" ry="12" fill="%23FF99DD" stroke="%23000000" stroke-width="3"/><ellipse cx="60" cy="22" rx="8" ry="12" fill="%23FF99DD" stroke="%23000000" stroke-width="3"/><ellipse cx="78" cy="35" rx="8" ry="12" fill="%23FF99DD" stroke="%23000000" stroke-width="3"/></svg>'
  },
  {
    id: 'vostok',
    name: 'Logo Vostok 3D',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,10 90,85 10,85" fill="%23FFFFFF" stroke="%23000000" stroke-width="5"/><polygon points="50,25 78,78 22,78" fill="%23111827"/><line x1="30" y1="45" x2="70" y2="45" stroke="%23FFFFFF" stroke-width="6"/></svg>'
  },
  {
    id: 'cheese',
    name: 'Queso Snack',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="%23FFCC00" stroke="%23000000" stroke-width="4" d="M15,75 L85,85 L85,45 L15,15 Z"/><circle cx="35" cy="45" r="7" fill="%23E6B800"/><circle cx="65" cy="65" r="9" fill="%23E6B800"/><circle cx="60" cy="35" r="5" fill="%23E6B800"/></svg>'
  },
  {
    id: 'radiation',
    name: 'Icono Rad',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="%23FFCC00" stroke="%23000000" stroke-width="4"/><circle cx="50" cy="50" r="10" fill="%23000000"/><path fill="%23000000" d="M50,50 L30,15 A40,40 0 0,1 70,15 Z"/><path fill="%23000000" transform="rotate(120 50 50)" d="M50,50 L30,15 A40,40 0 0,1 70,15 Z"/><path fill="%23000000" transform="rotate(240 50 50)" d="M50,50 L30,15 A40,40 0 0,1 70,15 Z"/></svg>'
  }
];

export const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Extracts dominant distinct colors from an ImageData object
 */
export const extractDominantColors = (imgData: ImageData, maxColors: number = 4): string[] => {
  const data = imgData.data;
  const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();

  // Quantize into 32-level steps (5 bits per channel)
  const step = 32;
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3];
    if (a < 60) continue; // Skip transparent

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

  // Sort by popularity
  const sorted = Array.from(colorBuckets.values()).sort((a, b) => b.count - a.count);

  const dominantHexes: string[] = [];
  for (const bucket of sorted) {
    const r = Math.round(bucket.r / bucket.count);
    const g = Math.round(bucket.g / bucket.count);
    const b = Math.round(bucket.b / bucket.count);
    const hex = rgbToHex(r, g, b);

    // Ensure distinctness (Delta E threshold)
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

  // Fallbacks if image is monochromatic or too few colors
  const fallbacks = ['#eab308', '#0f172a', '#ffffff', '#ef4444'];
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
 * 2D Moore-Neighbor Boundary Tracing algorithm to extract the true silhouette contour of non-transparent pixels
 */
function traceOuterContour(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number = 40
): Array<{ x: number; y: number }> {
  // Helper: check if pixel is solid
  const isSolid = (x: number, y: number): boolean => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false;
    return data[(y * width + x) * 4 + 3] >= alphaThreshold;
  };

  // 1. Find starting pixel (top-most, left-most solid pixel)
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
    // If empty, generate standard circle
    const fallback: Array<{ x: number; y: number }> = [];
    const n = 64;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      fallback.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    return fallback;
  }

  // 8-neighbor directional offsets (clockwise starting from West)
  const dx = [-1, -1, 0, 1, 1, 1, 0, -1];
  const dy = [0, -1, -1, -1, 0, 1, 1, 1];

  const contour: Array<{ x: number; y: number }> = [];
  let currX = startX;
  let currY = startY;
  let dir = 0; // Starting search direction

  const maxSteps = width * height * 2;
  let steps = 0;

  contour.push({ x: currX, y: currY });

  while (steps < maxSteps) {
    steps++;
    let foundNext = false;

    // Search 8 neighbors clockwise
    for (let i = 0; i < 8; i++) {
      const checkDir = (dir + i) % 8;
      const nx = currX + dx[checkDir];
      const ny = currY + dy[checkDir];

      if (isSolid(nx, ny)) {
        currX = nx;
        currY = ny;
        // Backtrack direction: where we came from minus 2 positions counter-clockwise
        dir = (checkDir + 6) % 8;
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;

    // Check if looped back to start
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

  // Find bounding box to center and normalize
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

  // Subsample and smooth contour
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

  // Chaikin smoothing algorithm (2 passes)
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

  // Cap point count to ~120 for optimal performance in Three.js and 3MF
  if (smoothed.length > 120) {
    const finalStep = Math.ceil(smoothed.length / 120);
    smoothed = smoothed.filter((_, idx) => idx % finalStep === 0);
  }

  return smoothed;
}

export const processClickerImage = (
  image: HTMLImageElement,
  config: ClickerConfig
): ProcessedClickerData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  const res = 512; // Higher resolution for crisp contour and texture mapping
  canvas.width = res;
  canvas.height = res;

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Compute aspect ratio fit
  const imgW = image.naturalWidth || image.width || 100;
  const imgH = image.naturalHeight || image.height || 100;
  const aspectRatio = imgW / imgH;

  let drawW = res;
  let drawH = res;

  if (aspectRatio > 1) {
    drawH = res / aspectRatio;
  } else if (aspectRatio < 1) {
    drawW = res * aspectRatio;
  }

  // Draw image scaled to canvas with rotation and flip applied
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

  // 1. Intelligent Background Removal
  if (config.removeBackground) {
    // Sample corner pixels to detect solid background color
    const corners = [
      0, // Top-left
      (res - 1) * 4, // Top-right
      ((res - 1) * res) * 4, // Bottom-left
      ((res - 1) * res + (res - 1)) * 4, // Bottom-right
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
          data[i + 3] = 0; // Set transparent
        }
      }
    }
  }

  // Extract Dominant Colors for auto-palette
  const dominantColors = extractDominantColors(imgData, 4);

  // Save original canvas with full crisp colors and background removal
  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = res;
  originalCanvas.height = res;
  const origCtx = originalCanvas.getContext('2d');
  if (origCtx) {
    origCtx.putImageData(imgData, 0, 0);
  }

  // 2. Palette Reduction according to strokeMode
  if (config.strokeMode === 'single') {
    const strokeRgb = hexToRgb(config.outlineColor);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 40) {
        data[i] = strokeRgb.r;
        data[i + 1] = strokeRgb.g;
        data[i + 2] = strokeRgb.b;
        data[i + 3] = 255;
      }
    }
  } else {
    // 4-Color Palette Reduction
    const palette = [
      hexToRgb(config.baseColor),
      hexToRgb(config.outlineColor),
      hexToRgb(config.accentColor),
      hexToRgb(config.detailColor),
    ];

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 30) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        let minDist = Infinity;
        let closest = palette[0];
        for (const p of palette) {
          const dist = Math.sqrt((r - p.r) ** 2 + (g - p.g) ** 2 + (b - p.b) ** 2);
          if (dist < minDist) {
            minDist = dist;
            closest = p;
          }
        }

        data[i] = closest.r;
        data[i + 1] = closest.g;
        data[i + 2] = closest.b;
        data[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Extract True Boundary Contour using Moore-Neighbor algorithm
  const contourPoints = traceOuterContour(imgData.data, res, res, 40);

  // Segmented multi-color layers based on smoothed contour and offsets
  const colorLayers = [
    { color: config.baseColor, points: contourPoints },
    { color: config.outlineColor, points: contourPoints.map((p) => ({ x: p.x * 0.94, y: p.y * 0.94 })) },
    { color: config.accentColor, points: contourPoints.map((p) => ({ x: p.x * 0.80, y: p.y * 0.80 })) },
    { color: config.detailColor, points: contourPoints.map((p) => ({ x: p.x * 0.64, y: p.y * 0.64 })) },
  ];

  return {
    canvas,
    originalCanvas,
    previewDataUrl: originalCanvas.toDataURL('image/png'),
    contourPoints,
    dominantColors,
    colorLayers,
    width: res,
    height: res,
    aspectRatio,
  };
};

export const createDefaultClickerConfig = (): ClickerConfig => ({
  imageUrl: CLICKER_SAMPLE_IMAGES[0].url,
  sampleId: 'dog',
  removeBackground: true,
  type: 'clicker',
  baseStyle: 'outline',
  strokeMode: 'multi',
  reliefStyle: 'inlaid',
  reliefDepth: 0.8,
  size: 35,
  topHeight: 8,
  baseHeight: 12,
  baseBevel: 1.2,
  baseMargin: 2.5,
  colorsCount: 4,
  smoothing: 15,
  baseColor: '#eab308',
  outlineColor: '#0f172a',
  accentColor: '#ffffff',
  detailColor: '#ef4444',
  showSwitch: true,
  switchType: 'red',
  switchCount: 1,
  switchTolerance: 0,
  viewMode: 'assembled',
  renderStyle: 'color',
  lightingMode: 'studio',
  ringPosition: 'top',
  ringAngle: 90,
  ringOffsetX: 0,
  ringOffsetY: 0,
  ringHeight: 0,
  ringHoleDiameter: 4.5,
  ringThickness: 2.2,
  includeRing: false,
  imageRotation: 0,
  flipHorizontal: false,
  soundEnabled: true,
});
