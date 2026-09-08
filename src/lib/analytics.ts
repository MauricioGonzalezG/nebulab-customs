/**
 * Utilidad central de Google Analytics 4 (gtag.js).
 *
 * - El tag base G-ZQVSNJ1CHW ya está en `index.html`.
 * - Esta SPA hace `pushState` para navegar (/ /litofanias /clickers /collares),
 *   así que los page_view se envían manualmente con `trackPageView()`.
 * - Captura y persiste la atribución (UTMs, fbclid/gclid, referrer) para saber
 *   si el usuario llegó desde un anuncio de Instagram, TikTok, etc.
 */

export const GA_MEASUREMENT_ID =
  (import.meta as any)?.env?.VITE_GA_MEASUREMENT_ID || 'G-ZQVSNJ1CHW';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export interface Attribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
  fbclid: string;
  gclid: string;
  igshid: string;
  referrer: string;
  landing_page: string;
  first_seen_at: string;
}

const ATTRIBUTION_KEY = 'nebulab_attribution_v1';

const emptyAttribution = (): Attribution => ({
  utm_source: '',
  utm_medium: '',
  utm_campaign: '',
  utm_content: '',
  utm_term: '',
  fbclid: '',
  gclid: '',
  igshid: '',
  referrer: '',
  landing_page: '',
  first_seen_at: '',
});

function readStoredAttribution(): Attribution | null {
  try {
    const raw = sessionStorage.getItem(ATTRIBUTION_KEY) || localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    return { ...emptyAttribution(), ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

/**
 * Lee UTMs + click IDs de la URL actual y los guarda (first-touch).
 * Llamar una sola vez al cargar la app. Devuelve la atribución vigente.
 */
export function captureAttribution(): Attribution {
  const stored = readStoredAttribution();
  const params = new URLSearchParams(window.location.search);

  const current: Attribution = {
    utm_source: params.get('utm_source') || '',
    utm_medium: params.get('utm_medium') || '',
    utm_campaign: params.get('utm_campaign') || '',
    utm_content: params.get('utm_content') || '',
    utm_term: params.get('utm_term') || '',
    fbclid: params.get('fbclid') || '',
    gclid: params.get('gclid') || params.get('wbraid') || params.get('gbraid') || '',
    igshid: params.get('igshid') || '',
    referrer: document.referrer || '',
    landing_page: window.location.href,
    first_seen_at: new Date().toISOString(),
  };

  const hasPaidSignal =
    current.utm_source || current.utm_medium || current.utm_campaign || current.fbclid || current.gclid;

  // First-touch: si ya había atribución pagada guardada, no la sobrescribimos
  // con visitas directas posteriores. Si la visita actual trae UTMs, actualiza.
  const next: Attribution =
    stored && !hasPaidSignal
      ? stored
      : {
          ...emptyAttribution(),
          ...stored,
          ...(hasPaidSignal || !stored ? current : {}),
          // Siempre conserva el landing original (first-touch)
          landing_page: stored?.landing_page || current.landing_page,
          first_seen_at: stored?.first_seen_at || current.first_seen_at,
        };

  try {
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
    localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    /* almacenamiento no disponible (modo incógnito): se sigue midiendo en memoria */
  }

  return next;
}

export function getAttribution(): Attribution {
  return readStoredAttribution() || emptyAttribution();
}

function gtagSafe(...args: unknown[]): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  } else {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(args);
  }
}

/** Page view manual para SPA. Llamar en cada cambio de vista/ruta. */
export function trackPageView(path: string, title?: string): void {
  const attribution = getAttribution();
  gtagSafe('event', 'page_view', {
    page_path: path,
    page_title: title || document.title,
    page_location: window.location.href,
    // Dimensiones personalizadas útiles para filtrar tráfico pagado
    utm_source: attribution.utm_source || undefined,
    utm_medium: attribution.utm_medium || undefined,
    utm_campaign: attribution.utm_campaign || undefined,
  });
}

export type AnalyticsEventParams = Record<string, string | number | boolean | undefined>;

/** Evento genérico. Siempre adjunta atribución de campaña. */
export function trackEvent(eventName: string, params: AnalyticsEventParams = {}): void {
  const attribution = getAttribution();
  gtagSafe('event', eventName, {
    ...params,
    utm_source: attribution.utm_source || undefined,
    utm_medium: attribution.utm_medium || undefined,
    utm_campaign: attribution.utm_campaign || undefined,
    utm_content: attribution.utm_content || undefined,
  });
}

// ─── Eventos de ecommerce / funnel (GA4 recommended events) ───

export function trackViewItem(opts: { item_id: string; item_name: string; price?: number }): void {
  // GA4 espera `items` como array
  gtagSafe('event', 'view_item', {
    currency: 'USD',
    value: opts.price,
    items: [{ item_id: opts.item_id, item_name: opts.item_name, price: opts.price, quantity: 1 }],
  });
}

export function trackAddToCart(opts: { item_id: string; item_name: string; price: number; quantity?: number }): void {
  gtagSafe('event', 'add_to_cart', {
    currency: 'USD',
    value: opts.price * (opts.quantity ?? 1),
    items: [
      { item_id: opts.item_id, item_name: opts.item_name, price: opts.price, quantity: opts.quantity ?? 1 },
    ],
  });
}

export function trackBeginCheckout(opts: { value: number; num_items: number }): void {
  gtagSafe('event', 'begin_checkout', {
    currency: 'USD',
    value: opts.value,
    num_items: opts.num_items,
  });
}

export function trackPurchase(opts: { transaction_id: string; value: number; num_items: number }): void {
  gtagSafe('event', 'purchase', {
    currency: 'USD',
    transaction_id: opts.transaction_id,
    value: opts.value,
    num_items: opts.num_items,
  });
}

/** Permite saber qué vista de la app corresponde a cada ruta virtual. */
export function pathForView(view: 'home' | 'studio' | 'clicker' | 'collar' | 'admin'): string {
  switch (view) {
    case 'studio':
      return '/litofanias';
    case 'clicker':
      return '/clickers';
    case 'collar':
      return '/collares';
    case 'admin':
      return '/admin';
    default:
      return '/';
  }
}
