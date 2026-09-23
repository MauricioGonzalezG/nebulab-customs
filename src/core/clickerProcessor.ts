import { ClickerConfig } from '../types';

export interface ProcessedClickerData {
  canvas: HTMLCanvasElement;
  originalCanvas: HTMLCanvasElement;
  previewDataUrl: string;
  contourPoints: Array<{ x: number; y: number }>;
  dominantColors: string[];
  paletteColors: string[];
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
 * Weighted median-cut palette from the visible artwork. No invented fallback
 * colors: even a low-contrast photo keeps its own hue family.
 */
export const extractDominantColors = (imgData: ImageData, maxColors: number = 8): string[] => {
  const data = imgData.data;
  type Bucket = { count: number; r: number; g: number; b: number };
  const histogram = new Map<number, Bucket>();
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 160) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const existing = histogram.get(key);
    if (existing) {
      existing.count++; existing.r += r; existing.g += g; existing.b += b;
    } else {
      histogram.set(key, { count: 1, r, g, b });
    }
  }
  const buckets = [...histogram.values()].map(bucket => ({
    count: bucket.count, r: bucket.r / bucket.count,
    g: bucket.g / bucket.count, b: bucket.b / bucket.count,
  }));
  if (!buckets.length) return [];
  const boxes = [buckets];
  const limit = Math.min(8, Math.max(1, Math.round(maxColors)));
  while (boxes.length < limit) {
    let bestIndex = -1, bestScore = -1, bestAxis: 'r' | 'g' | 'b' = 'r';
    boxes.forEach((box, index) => {
      if (box.length < 2) return;
      const ranges = (['r', 'g', 'b'] as const).map(axis => ({
        axis, range: Math.max(...box.map(c => c[axis])) - Math.min(...box.map(c => c[axis])),
      }));
      ranges.sort((a, b) => b.range - a.range);
      const population = box.reduce((sum, c) => sum + c.count, 0);
      const score = ranges[0].range * Math.log2(population + 1);
      if (score > bestScore) { bestScore = score; bestIndex = index; bestAxis = ranges[0].axis; }
    });
    if (bestIndex < 0 || bestScore < 1) break;
    const box = boxes.splice(bestIndex, 1)[0].sort((a, b) => a[bestAxis] - b[bestAxis]);
    const half = box.reduce((sum, c) => sum + c.count, 0) / 2;
    let weight = 0, cut = 1;
    while (cut < box.length - 1 && weight + box[cut - 1].count < half) weight += box[cut++ - 1].count;
    boxes.push(box.slice(0, cut), box.slice(cut));
  }
  return boxes.map(box => {
    const weight = box.reduce((sum, c) => sum + c.count, 0);
    return rgbToHex(
      box.reduce((sum, c) => sum + c.r * c.count, 0) / weight,
      box.reduce((sum, c) => sum + c.g * c.count, 0) / weight,
      box.reduce((sum, c) => sum + c.b * c.count, 0) / weight,
    );
  }).filter((color, index, all) => all.indexOf(color) === index);
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

// Trace exposed pixel edges and keep the largest closed boundary. This avoids
// following isolated details inside the artwork or jumping across corners.
function traceSilhouette(data: Uint8ClampedArray, width: number, height: number, smoothing: number): Array<{ x: number; y: number }> {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 60 ? 1 : 0;
  const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
  const next = new Map<number, number[]>();
  const edge = (x1: number, y1: number, x2: number, y2: number) => {
    const key = y1 * (width + 1) + x1;
    const end = y2 * (width + 1) + x2;
    const targets = next.get(key) || [];
    targets.push(end);
    next.set(key, targets);
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!solid(x, y)) continue;
    if (!solid(x, y - 1)) edge(x, y, x + 1, y);
    if (!solid(x + 1, y)) edge(x + 1, y, x + 1, y + 1);
    if (!solid(x, y + 1)) edge(x + 1, y + 1, x, y + 1);
    if (!solid(x - 1, y)) edge(x, y + 1, x, y);
  }
  const loops: Array<Array<{ x: number; y: number }>> = [];
  while (next.size) {
    const start = next.keys().next().value as number;
    const loop: Array<{ x: number; y: number }> = [];
    let current = start;
    for (let guard = 0; guard < width * height * 4; guard++) {
      loop.push({ x: current % (width + 1), y: Math.floor(current / (width + 1)) });
      const targets = next.get(current);
      if (!targets?.length) break;
      current = targets.pop()!;
      if (!targets.length) next.delete(loop[loop.length - 1].y * (width + 1) + loop[loop.length - 1].x);
      if (current === start) { loops.push(loop); break; }
    }
  }
  const area = (loop: Array<{ x: number; y: number }>) => Math.abs(loop.reduce((sum, p, i) => {
    const q = loop[(i + 1) % loop.length];
    return sum + p.x * q.y - q.x * p.y;
  }, 0));
  loops.sort((a, b) => area(b) - area(a));
  let contour = loops[0];
  if (!contour || contour.length < 20) return traceOuterContour(data, width, height);
  if (loops.length > 1) {
    const significant = loops.filter(loop => area(loop) > area(contour) * 0.015);
    if (significant.length > 1) {
      const all = significant.flat().sort((a, b) => a.x - b.x || a.y - b.y);
      const turn = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
        (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
      const lower: typeof all = [], upper: typeof all = [];
      for (const point of all) {
        while (lower.length > 1 && turn(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) lower.pop();
        lower.push(point);
      }
      for (let i = all.length - 1; i >= 0; i--) {
        const point = all[i];
        while (upper.length > 1 && turn(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) upper.pop();
        upper.push(point);
      }
      contour = lower.slice(0, -1).concat(upper.slice(0, -1));
    }
  }

  const xs = contour.map(point => point.x);
  const ys = contour.map(point => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
  const radius = Math.max(maxX - minX, maxY - minY, 1) / 2;

  // Sample by arc length before smoothing, so sharp ears and rounded cheeks
  // retain comparable detail regardless of how long each pixel edge is.
  const target = Math.min(180, Math.max(96, Math.round(contour.length / 8)));
  const lengths = contour.map((point, i) => {
    const next = contour[(i + 1) % contour.length];
    return Math.hypot(next.x - point.x, next.y - point.y);
  });
  const perimeter = lengths.reduce((sum, length) => sum + length, 0);
  let segment = 0, distance = 0;
  let sampled = Array.from({ length: target }, (_, i) => {
    const wanted = i / target * perimeter;
    while (segment < lengths.length - 1 && distance + lengths[segment] < wanted) distance += lengths[segment++];
    const p = contour[segment], q = contour[(segment + 1) % contour.length];
    const t = lengths[segment] > 0 ? (wanted - distance) / lengths[segment] : 0;
    return { x: (p.x + (q.x - p.x) * t - centerX) / radius,
      y: (p.y + (q.y - p.y) * t - centerY) / radius };
  });
  for (let pass = 0; pass < Math.round(smoothing / 8); pass++) {
    sampled = sampled.map((point, i) => {
      const prev = sampled[(i - 1 + sampled.length) % sampled.length];
      const following = sampled[(i + 1) % sampled.length];
      return { x: point.x * 0.6 + (prev.x + following.x) * 0.2, y: point.y * 0.6 + (prev.y + following.y) * 0.2 };
    });
  }
  return sampled;
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

  let drawW = res * 0.86;
  let drawH = res * 0.86;

  if (aspectRatio > 1) {
    drawH = drawW / aspectRatio;
  } else if (aspectRatio < 1) {
    drawW = drawH * aspectRatio;
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

  let imgData = ctx.getImageData(0, 0, res, res);
  let data = imgData.data;

  // 1. Intelligent Background Removal
  if (config.removeBackground) {
    // Sample the actual image corners; the padded canvas corners are transparent.
    const left = Math.max(0, Math.floor((res - drawW) / 2 + 2));
    const right = Math.min(res - 1, Math.ceil((res + drawW) / 2 - 3));
    const top = Math.max(0, Math.floor((res - drawH) / 2 + 2));
    const bottom = Math.min(res - 1, Math.ceil((res + drawH) / 2 - 3));
    const corners = [
      (top * res + left) * 4,
      (top * res + right) * 4,
      (bottom * res + left) * 4,
      (bottom * res + right) * 4,
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

      const visited = new Uint8Array(res * res);
      const queue = new Int32Array(res * res);
      let tail = 0;
      for (const corner of corners) {
        const index = corner / 4;
        if (!visited[index]) { visited[index] = 1; queue[tail++] = index; }
      }
      for (let head = 0; head < tail; head++) {
        const index = queue[head];
        const offset = index * 4;
        if (data[offset + 3] < 25) continue;
        const dr = data[offset] - bgR, dg = data[offset + 1] - bgG, db = data[offset + 2] - bgB;
        if (dr * dr + dg * dg + db * db >= 42 * 42) continue;
        data[offset + 3] = 0;
        const x = index % res, y = Math.floor(index / res);
        if (x > 0 && !visited[index - 1]) { visited[index - 1] = 1; queue[tail++] = index - 1; }
        if (x < res - 1 && !visited[index + 1]) { visited[index + 1] = 1; queue[tail++] = index + 1; }
        if (y > 0 && !visited[index - res]) { visited[index - res] = 1; queue[tail++] = index - res; }
        if (y < res - 1 && !visited[index + res]) { visited[index + res] = 1; queue[tail++] = index + res; }
      }
    }
  }

  // Fill the usable canvas with the visible design, not transparent margins
  // inside the uploaded file. This keeps texture pixels aligned to the traced
  // outline for both square and rectangular uploads.
  let minX = res, minY = res, maxX = -1, maxY = -1;
  for (let y = 0; y < res; y++) for (let x = 0; x < res; x++) {
    if (data[(y * res + x) * 4 + 3] < 60) continue;
    minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
  }
  if (maxX >= minX && maxY >= minY) {
    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const factor = res * 0.86 / Math.max(cropW, cropH);
    const source = document.createElement('canvas');
    source.width = res; source.height = res;
    source.getContext('2d')!.putImageData(imgData, 0, 0);
    ctx.clearRect(0, 0, res, res);
    ctx.drawImage(source, minX, minY, cropW, cropH,
      (res - cropW * factor) / 2, (res - cropH * factor) / 2,
      cropW * factor, cropH * factor);
    imgData = ctx.getImageData(0, 0, res, res);
    data = imgData.data;
  }

  // Reserve one filament for the housing, keeping the entire printable
  // assembly within the selected maximum of eight colors.
  const dominantColors = extractDominantColors(imgData, config.colorsCount - 1);
  const paletteColors = config.strokeMode === 'single'
    ? [config.outlineColor]
    : config.paletteMode === 'custom'
      ? [config.baseColor, config.outlineColor, config.accentColor, config.detailColor]
      : dominantColors.length ? [config.baseColor, ...dominantColors.filter(color => color.toLowerCase() !== config.baseColor.toLowerCase())] : [config.baseColor];

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
      }
    }
  } else {
    const palette = paletteColors.map(hexToRgb);

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
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // 3. Extract True Boundary Contour using Moore-Neighbor algorithm
  const contourPoints = traceSilhouette(imgData.data, res, res, config.smoothing);

  return {
    canvas,
    originalCanvas,
    previewDataUrl: canvas.toDataURL('image/png'),
    contourPoints,
    dominantColors,
    paletteColors,
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
  paletteMode: 'auto',
  reliefStyle: 'inlaid',
  reliefDepth: 0.8,
  size: 35,
  topHeight: 8,
  baseHeight: 12,
  baseBevel: 1.2,
  baseMargin: 1.1,
  colorsCount: 8,
  smoothing: 16,
  baseColor: '#171923',
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
  includeRing: true,
  imageRotation: 0,
  flipHorizontal: false,
  soundEnabled: true,
});
