/**
 * Mercado Pago Checkout Pro Integration Helper
 * Allows payments via PSE, Credit/Debit Cards, Nequi, Daviplata, Efecty & Mercado Pago Wallet.
 */

import { BRAND } from './brand';

export interface MercadoPagoConfig {
  publicKey: string;
  accessToken: string;
  currency: string;
  exchangeRateUsdToCop: number;
}

export const getMercadoPagoConfig = (): MercadoPagoConfig => {
  return {
    publicKey: import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '',
    accessToken: import.meta.env.VITE_MERCADOPAGO_ACCESS_TOKEN || '',
    currency: import.meta.env.VITE_MERCADOPAGO_CURRENCY || 'COP',
    exchangeRateUsdToCop: Number(import.meta.env.VITE_COP_EXCHANGE_RATE) || 4000,
  };
};

/**
 * Creates a Mercado Pago Checkout Pro preference via API REST
 * Returns the redirection init_point URL for payment.
 */
export async function createMercadoPagoPreference(params: {
  orderId: string;
  amountUsd: number;
  customerEmail: string;
  customerFullName: string;
  customerPhone?: string;
  redirectUrl?: string;
}): Promise<string> {
  const config = getMercadoPagoConfig();
  const currency = config.currency.toUpperCase();
  const exchangeRate = config.exchangeRateUsdToCop;

  // Calculate unit price based on currency
  const unitPrice = currency === 'USD' ? params.amountUsd : Math.round(params.amountUsd * exchangeRate);

  const redirectTarget = params.redirectUrl || window.location.href;
  const isLocalhost = redirectTarget.includes('localhost') || redirectTarget.includes('127.0.0.1');

  const payload: any = {
    items: [
      {
        id: params.orderId,
        title: `Pedido ${BRAND.name} #${params.orderId}`,
        description: `Productos 3D personalizados · ${BRAND.name}`,
        quantity: 1,
        currency_id: currency,
        unit_price: unitPrice,
      },
    ],
    payer: {
      name: params.customerFullName || `Cliente ${BRAND.name}`,
      email: params.customerEmail,
      phone: {
        number: params.customerPhone ? params.customerPhone.replace(/[^0-9]/g, '') : '',
      },
    },
    back_urls: {
      success: redirectTarget,
      failure: redirectTarget,
      pending: redirectTarget,
    },
    external_reference: params.orderId,
  };

  // Mercado Pago requires valid HTTPS and non-localhost URLs for auto_return and notification_url
  if (!isLocalhost && redirectTarget.startsWith('https://')) {
    payload.auto_return = 'approved';
    try {
      const origin = new URL(redirectTarget).origin;
      payload.notification_url = `${origin}/api/mercadopago-webhook`;
    } catch (e) {
      console.warn('Could not parse origin for webhook notification_url:', e);
    }
  }

  if (!config.accessToken) {
    console.warn('Mercado Pago Access Token not configured (VITE_MERCADOPAGO_ACCESS_TOKEN missing).');
    throw new Error('No se ha configurado VITE_MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.');
  }

  const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error creating Mercado Pago preference:', errorData);
    throw new Error(errorData.message || 'Error al generar la preferencia de pago en Mercado Pago.');
  }

  const data = await response.json();
  // Return init_point (or sandbox_init_point if test token)
  return data.init_point || data.sandbox_init_point || '';
}
