import type { Order } from '../types';

/**
 * Aviso fire-and-forget a Telegram vía /api/notify-sale.
 * Nunca bloquea ni rompe el checkout: los errores se ignoran.
 */
export function notifyNewSale(order: Order): void {
  try {
    const payload = {
      kind: 'new_order',
      orderId: order.id,
      total: order.total,
      currency: order.currency || 'USD',
      customerName: order.shippingDetails?.fullName || '',
      customerPhone: order.shippingDetails?.phone || '',
      city: order.shippingDetails?.city || '',
      itemCount: order.items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || order.items?.length || 0,
      paymentMethod: order.paymentMethod || '',
    };

    fetch('/api/notify-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* noop */
  }
}
