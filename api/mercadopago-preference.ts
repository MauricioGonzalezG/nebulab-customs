import { getOrder, initializeStore, StoreError } from '../server/store.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Método no permitido.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const orderId = String(body.orderId || '').trim().toUpperCase();
    if (!/^LITHO-[A-F0-9]{48}$/.test(orderId)) throw new StoreError('Código de pedido no válido.');
    await initializeStore();
    const order = await getOrder(orderId);
    if (!order) throw new StoreError('No se encontró el pedido.', 404);
    if (order.paymentMethod !== 'mercadopago' || order.paymentStatus !== 'pending') throw new StoreError('Este pedido no está disponible para iniciar un pago.', 409);

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    if (!accessToken) throw new StoreError('El servidor de pagos aún no está configurado.', 503);
    const currency = (process.env.MERCADOPAGO_CURRENCY || 'COP').toUpperCase();
    if (!['COP', 'USD'].includes(currency)) throw new StoreError('La moneda configurada para Mercado Pago no es válida.', 503);
    const rate = Number(process.env.COP_EXCHANGE_RATE || '4000');
    if (!Number.isFinite(rate) || rate <= 0) throw new StoreError('La tasa de cambio configurada no es válida.', 503);
    const amount = currency === 'USD' ? Number(order.total.toFixed(2)) : Math.round(order.total * rate);

    let siteUrl = process.env.APP_URL || '';
    if (!siteUrl && process.env.NODE_ENV !== 'production') {
      const host = String(req.headers?.host || 'localhost:3000');
      if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) throw new StoreError('Configura APP_URL para pagos fuera de localhost.', 503);
      siteUrl = `http://${host}`;
    }
    try {
      const parsed = new URL(siteUrl);
      if (parsed.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && parsed.hostname === 'localhost')) throw new Error('https required');
      siteUrl = parsed.origin;
    } catch {
      throw new StoreError('Configura APP_URL con el dominio HTTPS de tu tienda.', 503);
    }

    const displayOrderId = order.id.replace(/^(LITHO-[A-F0-9]{6})[A-F0-9]{42}$/, '$1');
    const payload = {
      items: [{
        id: order.id,
        title: `Pedido Nebulab #${displayOrderId}`,
        description: `${order.items.length} producto(s) personalizado(s)`,
        quantity: 1,
        currency_id: currency,
        unit_price: amount,
      }],
      payer: {
        name: order.shippingDetails.fullName,
        email: order.shippingDetails.email,
        phone: { number: order.shippingDetails.phone.replace(/[^0-9]/g, '') },
      },
      back_urls: {
        success: `${siteUrl}/?payment=success&order=${encodeURIComponent(order.id)}`,
        failure: `${siteUrl}/?payment=failure&order=${encodeURIComponent(order.id)}`,
        pending: `${siteUrl}/?payment=pending&order=${encodeURIComponent(order.id)}`,
      },
      external_reference: order.id,
      notification_url: `${siteUrl}/api/mercadopago-webhook`,
      auto_return: 'approved',
    };
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Mercado Pago preference failed with status', response.status);
      throw new StoreError('Mercado Pago no pudo crear el enlace de pago.', 502);
    }
    return res.status(200).json({ initPoint: result.init_point || result.sandbox_init_point || '' });
  } catch (error: any) {
    const status = error instanceof StoreError ? error.statusCode : 500;
    if (status >= 500) console.error('Mercado Pago preference error:', error?.message || error);
    return res.status(status).json({ message: error?.message || 'Error interno al iniciar el pago.' });
  }
}
