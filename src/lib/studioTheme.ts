/**
 * Sistema de diseño del estudio de litofanías (Nebulab Studio).
 *
 * Regla: UN solo acento (cyan) y UN solo gradiente firma (cyan-400 → blue-600)
 * para acciones de marca. Los botones de compra conservan su estilo original
 * (cyan→blue para añadir, violeta sólido para comprar). Los colores semánticos
 * se reservan exclusivamente para su significado:
 *  - emerald → éxito / confirmación / WhatsApp
 *  - rose    → peligro / eliminar
 *  - amber   → advertencia / luz cálida (controles de iluminación)
 */

export const STUDIO_GRADIENT = 'from-cyan-400 to-blue-600';
export const STUDIO_GRADIENT_HOVER = 'hover:from-cyan-300 hover:to-blue-500';
export const STUDIO_GRADIENT_SHADOW = 'shadow-lg shadow-cyan-500/25';

export const STUDIO = {
  /** Tarjeta principal de sección */
  card: 'rounded-3xl border border-slate-800 bg-slate-900/80',
  /** Panel interno sobre una tarjeta */
  panel: 'rounded-2xl border border-slate-800 bg-slate-950/70',
  /** Botón primario: subir foto, añadir al carrito, siguiente, aplicar, tutorial */
  primaryBtn:
    'rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-600 font-bold text-white shadow-lg shadow-cyan-500/25 transition-all hover:from-cyan-300 hover:to-blue-500 active:scale-95',
  /** Botón secundario / fantasma */
  ghostBtn:
    'rounded-2xl border border-slate-700 bg-slate-900/60 text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800',
  /** Pastilla informativa */
  chip: 'border border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  /** Bloque de icono con gradiente firma */
  iconTile:
    'bg-gradient-to-tr from-cyan-400 to-blue-600 text-white shadow-lg shadow-cyan-500/25',
  /** Título de sección */
  sectionTitle: 'font-outfit font-extrabold text-white',
  /** Etiqueta pequeña de sección */
  sectionLabel: 'text-xs font-bold uppercase tracking-wider text-slate-300',
} as const;
