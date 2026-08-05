import { CollarConfig } from '../types';

export interface ProcessedCollarData {
  canvas: HTMLCanvasElement;
  originalCanvas: HTMLCanvasElement;
  previewDataUrl: string;
  contourPoints: Array<{ x: number; y: number }>;
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
  }
];

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

  // Draw image centered in canvas
  ctx.clearRect(0, 0, res, res);

  const aspect = image.width / (image.height || 1);
  let drawW = res;
  let drawH = res;
  if (aspect > 1) {
    drawH = res / aspect;
  } else {
    drawW = res * aspect;
  }

  const drawX = (res - drawW) / 2;
  const drawY = (res - drawH) / 2;

  ctx.drawImage(image, drawX, drawY, drawW, drawH);

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

  // Save original canvas with transparent background
  const originalCanvas = document.createElement('canvas');
  originalCanvas.width = res;
  originalCanvas.height = res;
  const origCtx = originalCanvas.getContext('2d');
  if (origCtx) {
    origCtx.putImageData(imgData, 0, 0);
  }

  // 2. Extract contour points
  const contourPoints: Array<{ x: number; y: number }> = [];
  const cx = res / 2;
  const cy = res / 2;
  const radius = res * 0.44;
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

  ctx.putImageData(imgData, 0, 0);

  return {
    canvas,
    originalCanvas,
    previewDataUrl: originalCanvas.toDataURL('image/png'),
    contourPoints,
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
  plateStyle: 'rounded',
  plateColor: '#1E293B', // Charcoal / Black plate
  textColor: '#FFFFFF',
  strapColor: 'olive',   // Military Olive Green (matches photo!)
  size: 'M',
  plateWidth: 50,
  plateHeight: 38,
  imageRotation: 0,
  flipHorizontal: false,
  viewMode: 'assembled',
});
