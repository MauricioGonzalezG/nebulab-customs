/** Creates a checkout preference for a server-validated order. */
export async function createMercadoPagoPreference(params: { orderId: string }): Promise<string> {
  const response = await fetch('/api/mercadopago-preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ orderId: params.orderId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'No se pudo iniciar el pago con Mercado Pago.');
  if (typeof data.initPoint !== 'string' || !data.initPoint) throw new Error('Mercado Pago no devolvió el enlace de pago.');
  return data.initPoint;
}
