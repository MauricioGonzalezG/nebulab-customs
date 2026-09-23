import type { CollarConfig } from '../types';
import { COLLAR_ICONS } from './collarIcons';

const XML_ENTITIES: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' };
const escapeXml = (value: string) => value.replace(/[<>&'"]/g, char => XML_ENTITIES[char]);

// Miniatura vectorial del collar para carrito, correos y pedidos: medalla con
// nombre y teléfono usando los colores elegidos, sin cargar ningún motor 3D.
export function collarPreviewDataUrl(config: CollarConfig): string {
  const plate = config.plateColor || '#1E293B';
  const border = config.borderColor || '#FFFFFF';
  const ink = config.textColor || '#FFFFFF';
  const name = (config.petName || 'MASCOTA').trim().toUpperCase() || 'MASCOTA';
  const phone = (config.phoneText || '').trim();
  const dangling = config.mountType === 'dangling';

  const fit = (value: string, size: number, available: number) => {
    const estimated = Array.from(value).length * size * 0.68;
    return estimated > available ? ` textLength="${available.toFixed(1)}" lengthAdjust="spacingAndGlyphs"` : '';
  };

  const isMedal = config.plateStyle === 'circle';
  const body = isMedal
    ? `<circle cx="0" cy="8" r="50" fill="${plate}"/>`
    : `<rect x="-50" y="-31" width="100" height="78" rx="18" fill="${plate}"/>`;
  const ring = isMedal
    ? `<circle cx="0" cy="8" r="42" fill="none" stroke="${border}" stroke-width="4.5"/>`
    : `<rect x="-43" y="-24" width="86" height="64" rx="13" fill="none" stroke="${border}" stroke-width="4.5"/>`;
  const tab = dangling
    ? `<circle cx="0" cy="-52" r="9" fill="${plate}"/><circle cx="0" cy="-52" r="3.4" fill="#0b0f19"/>`
    : '';

  const iconDef = config.icon === 'none' ? undefined : COLLAR_ICONS.find(entry => entry.id === config.icon);
  const iconSvg = iconDef
    ? `<g transform="translate(0 -18) scale(1.6 -1.6)" fill="${ink}">` +
      iconDef.art.circles.map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`).join('') +
      iconDef.art.paths.map(points => `<polygon points="${points.map(([x, y]) => `${x},${y}`).join(' ')}"/>`).join('') +
      `</g>`
    : '';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-62 -72 124 146">
${tab}
${body}
${ring}
${iconSvg}
<text x="0" y="${phone ? '6' : '13'}" font-family="'Arial Black','Arial Bold',Arial,sans-serif" font-weight="900" font-size="20" fill="${ink}" text-anchor="middle" dominant-baseline="central"${fit(name, 20, 80)}>${escapeXml(name)}</text>
${phone ? `<text x="0" y="28" font-family="Arial,sans-serif" font-weight="700" font-size="12.5" letter-spacing="1" fill="${ink}" text-anchor="middle" dominant-baseline="central"${fit(phone, 12.5, 76)}>${escapeXml(phone)}</text>` : ''}
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
