/**
 * Wompi Payment Gateway Integration Helper
 * Wompi Colombia (Bancolombia, Nequi, PSE, Tarjetas de Crédito/Débito)
 */

export interface WompiConfig {
  publicKey: string;
  integritySecret: string;
  currency: string;
  exchangeRateUsdToCop: number; // e.g. 4000
}

export const getWompiConfig = (): WompiConfig => {
  return {
    publicKey: import.meta.env.VITE_WOMPI_PUBLIC_KEY || '',
    integritySecret: import.meta.env.VITE_WOMPI_INTEGRITY_SECRET || '',
    currency: import.meta.env.VITE_WOMPI_CURRENCY || 'COP',
    exchangeRateUsdToCop: Number(import.meta.env.VITE_COP_EXCHANGE_RATE) || 4000,
  };
};

/**
 * Generate SHA-256 integrity signature required by Wompi
 * Signature format: SHA256(reference + amountInCents + currency + integritySecret)
 */
export async function generateWompiSignature(
  reference: string,
  amountInCents: number,
  currency: string,
  integritySecret: string
): Promise<string> {
  const concatenated = `${reference}${amountInCents}${currency}${integritySecret}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(concatenated);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Converts USD amount to Wompi amount in cents based on currency
 */
export function calculateWompiAmountInCents(amountUsd: number, currency: string, exchangeRate: number): number {
  if (currency.toUpperCase() === 'USD') {
    return Math.round(amountUsd * 100);
  }
  // Default to COP in cents (1 COP = 100 centavos)
  const amountCop = amountUsd * exchangeRate;
  return Math.round(amountCop * 100);
}

/**
 * Build Wompi Web Checkout URL
 */
export async function buildWompiCheckoutUrl(params: {
  reference: string;
  amountUsd: number;
  customerEmail: string;
  customerFullName: string;
  customerPhone?: string;
  redirectUrl?: string;
}): Promise<string> {
  const config = getWompiConfig();
  const amountInCents = calculateWompiAmountInCents(params.amountUsd, config.currency, config.exchangeRateUsdToCop);

  const baseUrl = 'https://checkout.wompi.co/p/';
  const searchParams = new URLSearchParams();

  if (config.publicKey) {
    searchParams.set('public-key', config.publicKey);
  }
  searchParams.set('currency', config.currency);
  searchParams.set('amount-in-cents', amountInCents.toString());
  searchParams.set('reference', params.reference);

  // Generate integrity signature if secret exists
  if (config.integritySecret) {
    const signature = await generateWompiSignature(
      params.reference,
      amountInCents,
      config.currency,
      config.integritySecret
    );
    searchParams.set('signature:integrity', signature);
  }

  if (params.redirectUrl) {
    searchParams.set('redirect-url', params.redirectUrl);
  }
  if (params.customerEmail) {
    searchParams.set('customer-data:email', params.customerEmail);
  }
  if (params.customerFullName) {
    searchParams.set('customer-data:full-name', params.customerFullName);
  }
  if (params.customerPhone) {
    searchParams.set('customer-data:phone-number', params.customerPhone.replace(/[^0-9]/g, ''));
  }

  return `${baseUrl}?${searchParams.toString()}`;
}
