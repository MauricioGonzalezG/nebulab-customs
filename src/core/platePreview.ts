import type { PlateConfig } from './plateBuilder';

const XML_ENTITIES: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
const escapeXml = (value: string) => value.replace(/[<>&'"]/g, char => XML_ENTITIES[char]);

// Miniatura vectorial de la placa para carrito, correos y pedidos: refleja
// texto, colores, ojal y borde sin cargar el motor 3D ni el modelo completo.
export function platePreviewDataUrl(config: PlateConfig): string {
  const { width: w, height: h, baseColor, detailColor, text, subtitle, border } = config;
  const eyeRadius = config.holeDiameter / 2 + 2.4;
  const eyeX = -w / 2 - 1;
  const minX = eyeX - eyeRadius - 1;
  const maxX = w / 2 + 1;
  const minY = -h / 2 - 1;
  const maxY = h / 2 + 1;
  const twoLines = !!subtitle.trim();
  const mainSize = h * (twoLines ? 0.34 : 0.57);
  const subSize = h * 0.18;
  const fit = (value: string, size: number, available: number) => {
    const estimated = Array.from(value).length * size * 0.68;
    return estimated > available ? ` textLength="${available.toFixed(2)}" lengthAdjust="spacingAndGlyphs"` : '';
  };
  const main = text.trim();
  const sub = subtitle.trim();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX.toFixed(2)} ${minY.toFixed(2)} ${(maxX - minX).toFixed(2)} ${(maxY - minY).toFixed(2)}">
<rect x="${(-w / 2).toFixed(2)}" y="${(-h / 2).toFixed(2)}" width="${w}" height="${h}" rx="${(h * 0.12).toFixed(2)}" fill="${baseColor}"/>
<circle cx="${eyeX.toFixed(2)}" cy="0" r="${eyeRadius.toFixed(2)}" fill="${baseColor}"/>
<circle cx="${eyeX.toFixed(2)}" cy="0" r="${(config.holeDiameter / 2).toFixed(2)}" fill="#0b0f19"/>
${border ? `<rect x="${(-w / 2 + 1.5).toFixed(2)}" y="${(-h / 2 + 1.5).toFixed(2)}" width="${(w - 3).toFixed(2)}" height="${(h - 3).toFixed(2)}" rx="${(h * 0.1).toFixed(2)}" fill="none" stroke="${detailColor}" stroke-width="${Math.max(0.5, h * 0.07).toFixed(2)}"/>` : ''}
${main ? `<text x="0" y="${(twoLines ? h * 0.13 : 0).toFixed(2)}" font-family="'Arial Black','Arial Bold',Arial,sans-serif" font-weight="900" font-size="${mainSize.toFixed(2)}" fill="${detailColor}" text-anchor="middle" dominant-baseline="central"${fit(main, mainSize, w - 12)}>${escapeXml(main)}</text>` : ''}
${sub ? `<text x="0" y="${(-h * 0.24).toFixed(2)}" font-family="'Arial Black','Arial Bold',Arial,sans-serif" font-weight="900" font-size="${subSize.toFixed(2)}" fill="${detailColor}" text-anchor="middle" dominant-baseline="central"${fit(sub, subSize, w - 14)}>${escapeXml(sub)}</text>` : ''}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
