import { ClickerConfig } from '../types';

export interface ProcessedClickerData {
  canvas: HTMLCanvasElement;
  originalCanvas: HTMLCanvasElement;
  previewDataUrl: string;
  contourPoints: Array<{ x: number; y: number }>;
  colorLayers: Array<{
    color: string;
    points: Array<{ x: number; y: number }>;
  }>;
  width: number;
  height: number;
}


// Default presets for sample images
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

const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex.length === 3 ? cleanHex.split('').map(c => c + c).join('') : cleanHex, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

export const processClickerImage = (
  image: HTMLImageElement,
  config: ClickerConfig
): ProcessedClickerData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  const res = 256;
  canvas.width = res;
  canvas.height = res;

  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Draw image scaled to canvas
  ctx.clearRect(0, 0, res, res);
  ctx.drawImage(image, 0, 0, res, res);

  const imgData = ctx.getImageData(0, 0, res, res);
  const data = imgData.data;

  // 1. Background removal if requested
  if (config.removeBackground) {
    const bgR = data[0];
    const bgG = data[1];
    const bgB = data[2];
    const bgA = data[3];

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      const colorDist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
      if (a < 20 || (bgA > 200 && colorDist < 45)) {
        data[i + 3] = 0; // Set transparent
      }
    }
  }

  // Save original canvas with full colors and background removal
  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = res;
  originalCanvas.height = res;
  const origCtx = originalCanvas.getContext('2d');
  if (origCtx) {
    origCtx.putImageData(imgData, 0, 0);
  }

  // 2. 4-Color Palette Reduction or Single Outline Stroke Mode

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

  // 3. Extract outer contour points (silhouetting)
  const contourPoints: Array<{ x: number; y: number }> = [];
  const cx = res / 2;
  const cy = res / 2;
  const radius = res * 0.42;
  const numSamples = 64;

  for (let i = 0; i < numSamples; i++) {
    const angle = (i / numSamples) * Math.PI * 2;
    let dist = radius;

    for (let d = radius; d >= 5; d -= 2) {
      const px = Math.round(cx + Math.cos(angle) * d);
      const py = Math.round(cy + Math.sin(angle) * d);

      if (px >= 0 && px < res && py >= 0 && py < res) {
        const idx = (py * res + px) * 4;
        const alpha = data[idx + 3];
        if (alpha > 40) {
          dist = d + 4;
          break;
        }
      }
    }

    const nx = (cx + Math.cos(angle) * dist - cx) / cx;
    const ny = (cy + Math.sin(angle) * dist - cy) / cy;
    contourPoints.push({ x: nx, y: ny });
  }

  const colorLayers = [
    { color: config.baseColor, points: contourPoints },
    { color: config.outlineColor, points: contourPoints.map((p) => ({ x: p.x * 0.94, y: p.y * 0.94 })) },
    { color: config.detailColor, points: contourPoints.map((p) => ({ x: p.x * 0.7, y: p.y * 0.7 })) },
  ];

  return {
    canvas,
    originalCanvas,
    previewDataUrl: originalCanvas.toDataURL('image/png'),
    contourPoints,
    colorLayers,
    width: res,
    height: res,
  };

};

export const createDefaultClickerConfig = (): ClickerConfig => ({
  imageUrl: CLICKER_SAMPLE_IMAGES[0].url,
  sampleId: 'dog',
  removeBackground: true,
  type: 'clicker',
  baseStyle: 'outline',
  strokeMode: 'multi',
  size: 35,
  topHeight: 8,
  baseHeight: 12,
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
  ringPosition: 'top',
  ringAngle: 90,
  ringOffsetX: 0,
  ringOffsetY: 0,
  ringHeight: 0,
  includeRing: false,
  imageRotation: 180,
  flipHorizontal: false,
});






