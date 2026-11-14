import type { Bounds, OrnamentModel } from './ornamentBuilder';
import type { OrnamentConfig } from './ornamentConfig';

type Polygons = ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
type Crop = Pick<OrnamentConfig, 'photoZoom' | 'photoX' | 'photoY'>;

const MAX_PHOTO_SIDE = 1400;
const MAX_FILE_BYTES = 20 * 1024 * 1024;

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    image.src = url;
  });
}

// Lee la foto del cliente y la normaliza a JPEG de tamaño moderado: suficiente
// para imprimirla a 300 dpi en la ventana y liviana para guardarla con el pedido.
export async function readOrnamentPhoto(file: File): Promise<{ dataUrl: string; image: HTMLImageElement }> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error('Usa una foto en formato JPG, PNG o WEBP.');
  if (file.size > MAX_FILE_BYTES) throw new Error('La foto pesa demasiado. Usa una de menos de 20 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const source = await loadImage(objectUrl);
    const width = source.naturalWidth, height = source.naturalHeight;
    if (!width || !height) throw new Error('No se pudo leer la imagen.');
    const ratio = Math.min(1, MAX_PHOTO_SIDE / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return { dataUrl, image: await loadImage(dataUrl) };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Dibuja la foto cubriendo el rectángulo dado según el encuadre del cliente.
// Sin foto, dibuja un marcador para que la ventana no se vea vacía.
export function drawOrnamentPhoto(ctx: CanvasRenderingContext2D, image: HTMLImageElement | null, crop: Crop, x: number, y: number, w: number, h: number) {
  if (!image) {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#334155');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    const unit = Math.min(w, h);
    ctx.strokeStyle = 'rgba(226,232,240,0.55)';
    ctx.fillStyle = 'rgba(226,232,240,0.55)';
    ctx.lineWidth = Math.max(1, unit * 0.022);
    // Silueta sencilla de retrato.
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.4, unit * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.4 + unit * 0.4, unit * 0.24, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.font = `700 ${Math.max(7, unit * 0.1)}px Outfit, Inter, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TU FOTO', x + w / 2, y + h * 0.8);
    return;
  }
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight) * Math.max(1, crop.photoZoom);
  const dw = image.naturalWidth * scale, dh = image.naturalHeight * scale;
  const dx = x + (w - dw) / 2 + crop.photoX * (dw - w) / 2;
  const dy = y + (h - dh) / 2 + crop.photoY * (dh - h) / 2;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, dx, dy, dw, dh);
}

const tracePolygons = (ctx: CanvasRenderingContext2D, polygons: Polygons, px: (x: number) => number, py: (y: number) => number) => {
  ctx.beginPath();
  for (const polygon of polygons) {
    polygon.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))));
    ctx.closePath();
  }
};

// La foto tal como debe imprimirse: recortada a la zona que tapa el marco (ventana
// + margen de pegado). Sirve de textura en el visor 3D y de archivo de impresión.
export function renderOrnamentPhoto(image: HTMLImageElement | null, config: Crop, model: OrnamentModel, pxPerMm: number): HTMLCanvasElement {
  const area: Bounds = model.photoBounds;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round((area.maxX - area.minX) * pxPerMm));
  canvas.height = Math.max(2, Math.round((area.maxY - area.minY) * pxPerMm));
  const ctx = canvas.getContext('2d')!;
  tracePolygons(ctx, model.photoArea, x => (x - area.minX) * pxPerMm, y => (area.maxY - y) * pxPerMm);
  ctx.clip('evenodd');
  drawOrnamentPhoto(ctx, image, config, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Miniatura del adorno para carrito, correos y pedidos: silueta, foto encuadrada
// y relieve de color, sin depender del visor 3D.
export function ornamentPreviewDataUrl(model: OrnamentModel, config: OrnamentConfig, image: HTMLImageElement | null, size = 360): string {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#0b0f19';
  ctx.fillRect(0, 0, size, size);
  const { bounds, photoBounds } = model;
  const pad = size * 0.07;
  const k = (size - pad * 2) / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  const px = (x: number) => size / 2 + (x - (bounds.minX + bounds.maxX) / 2) * k;
  const py = (y: number) => size / 2 - (y - (bounds.minY + bounds.maxY) / 2) * k;

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.04;
  ctx.shadowOffsetY = size * 0.015;
  tracePolygons(ctx, model.outline, px, py);
  ctx.fillStyle = config.bodyColor;
  ctx.fill('evenodd');
  ctx.restore();

  ctx.save();
  tracePolygons(ctx, model.window, px, py);
  ctx.clip('evenodd');
  drawOrnamentPhoto(ctx, image, config, px(photoBounds.minX), py(photoBounds.maxY), (photoBounds.maxX - photoBounds.minX) * k, (photoBounds.maxY - photoBounds.minY) * k);
  ctx.restore();
  tracePolygons(ctx, model.window, px, py);
  ctx.strokeStyle = 'rgba(15,23,42,0.35)';
  ctx.lineWidth = Math.max(1, size * 0.006);
  ctx.stroke();

  tracePolygons(ctx, model.accents, px, py);
  ctx.fillStyle = config.accentColor;
  ctx.fill('evenodd');
  return canvas.toDataURL('image/jpeg', 0.86);
}

// Archivo para imprimir la foto a escala real (300 dpi). El borde transparente
// marca por dónde recortarla para que no asome por la silueta del adorno.
export function downloadOrnamentPrintPhoto(image: HTMLImageElement, config: OrnamentConfig, model: OrnamentModel) {
  const dpi = 300;
  const canvas = renderOrnamentPhoto(image, config, model, dpi / 25.4);
  const width = (model.photoBounds.maxX - model.photoBounds.minX).toFixed(1);
  const height = (model.photoBounds.maxY - model.photoBounds.minY).toFixed(1);
  canvas.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nebulab_Navidad_Foto_${width}x${height}mm_${dpi}dpi.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, 'image/png');
}
