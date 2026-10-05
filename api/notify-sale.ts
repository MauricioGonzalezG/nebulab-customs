import { getOrder, readSession, requireRole, sendTelegramForOrder, sendTelegramMessage } from '../server/store';
import { StoreError } from '../server/store';

function assertSameOrigin(req: any): void {
  const origin = req.headers?.origin;
  const host = req.headers?.host;
  if (!origin || !host) return;
  try {
    if (new URL(String(origin)).host !== String(host)) throw new StoreError('Origen de solicitud no permitido.', 403);
  } catch (error) {
    if (error instanceof StoreError) throw error;
    throw new StoreError('Origen de solicitud no permitido.', 403);
  }
}

function parseBody(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value || {};
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ success: false, message: 'Método no permitido.' });

  try {
    assertSameOrigin(req);
    const user = await readSession(String(req.headers?.cookie || ''));
    requireRole(user, 'admin');

    if (req.method === 'GET') {
      const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
      return res.status(200).json({ success: true, configured });
    }

    const body = parseBody(req.body);
    if (body.test === true) {
      const sent = await sendTelegramMessage('🔔 <b>Nebulab 3D:</b> notificaciones de ventas activas ✅');
      return res.status(sent ? 200 : 503).json({ success: sent });
    }
    const orderId = String(body.orderId || '').trim().toUpperCase();
    const kind = body.kind === 'payment_approved' ? 'payment_approved' : 'new_order';
    if (!/^LITHO-[A-F0-9]{48}$/.test(orderId)) throw new StoreError('Código de pedido no válido.');
    const order = await getOrder(orderId);
    if (!order) throw new StoreError('No se encontró el pedido.', 404);
    const sent = await sendTelegramForOrder(order, kind);
    if (!sent) return res.status(503).json({ success: false, message: 'Telegram no está configurado o no respondió.' });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    const status = error instanceof StoreError ? error.statusCode : 500;
    return res.status(status).json({ success: false, message: error?.message || 'Error interno.' });
  }
}
