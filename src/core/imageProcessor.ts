/**
 * Utility to process uploaded images for Lithophane generation.
 * Converts images into grayscale luminance matrices for 3D displacement map generation.
 */

export interface ProcessedImageData {
  width: number;
  height: number;
  luminanceMatrix: Float32Array; // Normalized values 0.0 (darkest) to 1.0 (lightest)
  previewDataUrl: string;
  aspectRatio: number;
}

export function processImageForLithophane(
  imgElement: HTMLImageElement,
  options: {
    brightness: number; // -100 to 100
    contrast: number;   // -100 to 100
    invert: boolean;    // true = dark is thick, false = light is thick
    gridResolution?: number; // default 380 for Ultra HD 3D relief detail
  }
): ProcessedImageData {
  const resolution = options.gridResolution || 380;
  
  // Calculate target grid dimensions maintaining aspect ratio
  const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
  let gridW = resolution;
  let gridH = Math.round(resolution / aspectRatio);

  // Ensure minimum grid dimensions
  gridW = Math.max(50, gridW);
  gridH = Math.max(50, gridH);

  // Canvas for pixel analysis
  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('No canvas 2d context available');
  }

  // High quality image scaling algorithms
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Clear canvas
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, gridW, gridH);

  // Draw scaled image
  ctx.drawImage(imgElement, 0, 0, gridW, gridH);

  // Get image pixel data
  const imageData = ctx.getImageData(0, 0, gridW, gridH);
  const data = imageData.data;

  // Contrast factor adjustment (-100 to 100)
  const contrastFactor = (259 * (options.contrast + 255)) / (255 * (259 - options.contrast));
  const brightnessOffset = options.brightness * 2.55; // convert -100..100 to -255..255

  const luminanceMatrix = new Float32Array(gridW * gridH);

  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const idx = (y * gridW + x) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      // Apply Brightness
      r += brightnessOffset;
      g += brightnessOffset;
      b += brightnessOffset;

      // Apply Contrast
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;

      // Clamp values 0..255
      r = Math.min(255, Math.max(0, r));
      g = Math.min(255, Math.max(0, g));
      b = Math.min(255, Math.max(0, b));

      // Standard ITU-R BT.601 Grayscale luminance
      let luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

      // Invert if requested
      if (options.invert) {
        luminance = 1.0 - luminance;
      }

      // Store in matrix
      luminanceMatrix[y * gridW + x] = luminance;

      // Update image data for preview canvas
      const grayVal = Math.round(luminance * 255);
      data[idx] = grayVal;
      data[idx + 1] = grayVal;
      data[idx + 2] = grayVal;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const previewDataUrl = canvas.toDataURL('image/jpeg', 0.85);

  return {
    width: gridW,
    height: gridH,
    luminanceMatrix,
    previewDataUrl,
    aspectRatio
  };
}

/**
 * Generate a default fallback placeholder canvas with a nice gradient pattern
 */
export function createPlaceholderImage(): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 400, 300);
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(0.5, '#475569');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 300);

      // Draw stylized camera / portrait icon
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(200, 130, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(200, 230, 75, Math.PI, 0, false);
      ctx.fill();

      // Soft glow center
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(200, 150, 110, 0, Math.PI * 2);
      ctx.fill();
    }
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.src = canvas.toDataURL();
  });
}
