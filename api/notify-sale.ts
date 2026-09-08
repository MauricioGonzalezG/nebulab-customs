/**
 * POST /api/notify-sale — Notificación instantánea de ventas a Telegram.
 *
 * Env vars (Vercel → Settings → Environment Variables):
 *   TELEGRAM_BOT_TOKEN = token de @BotFather
 *   TELEGRAM_CHAT_ID   = tu chat id (lo ves en /getUpdates tras hablarle al bot)
 *
 * Body esperado:
 *   { orderId, total, currency?, customerName?, customerPhone?, city?,
 *     itemCount?, paymentMethod?, kind?: 'new_order' | 'payment_approved', paymentId? }
 *
 * Nunca lanza error al checkout: si Telegram no está configurado responde
 * { success:false, skipped:true } y el frontend lo ignora.
 */

const escapeHtml = (s: unknown): string =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const getEnv = (key: string): string =>
  (process.env as Record<string, string | undefined>)[key] ||
  (process.env as Record<string, string | undefined>)[`VITE_${key}`] ||
  '';

export async function sendTelegramMessage(text: string): Promise<{ ok: boolean; error?: string }> {
  const token = getEnv('TELEGRAM_BOT_TOKEN').trim();
  const chatId = getEnv('TELEGRAM_CHAT_ID').trim();

  if (!token || !chatId) {
    return { ok: false, error: 'Telegram no configurado (falta TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID).' };
  }

  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return { ok: false, error: `Telegram API ${resp.status}: ${errText.slice(0, 200)}` };
  }
  return { ok: true };
}

export function buildSaleMessage(body: any): string {
  const kind = body?.kind || 'new_order';
  const orderId = escapeHtml(body?.orderId || 'SIN-ID');
  const total = Number(body?.total || 0);
  const currency = escapeHtml(body?.currency || 'USD');
  const customer = escapeHtml(body?.customerName || 'Cliente');
  const phone = escapeHtml(body?.customerPhone || '—');
  const city = escapeHtml(body?.city || '—');
  const items = Number(body?.itemCount || 0);
  const payMethod = escapeHtml(body?.paymentMethod || '—');
  const paymentId = body?.paymentId ? `\n🆔 <b>Pago MP:</b> ${escapeHtml(body.paymentId)}` : '';

  const money = total.toLocaleString('es-CO');

  if (kind === 'payment_approved') {
    return (
      `✅ <b>PAGO APROBADO — Nebulab 3D</b>\n` +
      `🧾 <b>Orden:</b> ${orderId}${paymentId}\n` +
      `💰 <b>Total:</b> ${money} ${currency}\n` +
      `👤 <b>Cliente:</b> ${customer}`
    );
  }

  return (
    `💰 <b>NUEVA VENTA — Nebulab 3D</b>\n` +
    `🧾 <b>Orden:</b> ${orderId}\n` +
    `💰 <b>Total:</b> ${money} ${currency}\n` +
    `📦 <b>Items:</b> ${items} · 💳 ${payMethod}\n` +
    `👤 <b>Cliente:</b> ${customer}\n` +
    `📱 <b>Tel:</b> ${phone} · 📍 ${city}`
  );
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).send('OK');

  // GET para verificar configuración sin spamear: /api/notify-sale o /api/notify-sale?test=1
  if (req.method === 'GET') {
    const configured = Boolean(getEnv('TELEGRAM_BOT_TOKEN') && getEnv('TELEGRAM_CHAT_ID'));
    const query = req.query || {};
    if (query.test === '1' || query.test === 'true') {
      if (!configured) {
        return res.status(200).json({ success: false, skipped: true, message: 'Telegram no configurado.' });
      }
      const result = await sendTelegramMessage('🔔 <b>Nebulab 3D:</b> notificaciones de ventas activas ✅');
      return res.status(200).json({ success: result.ok, message: result.ok ? 'Mensaje de prueba enviado.' : result.error });
    }
    return res.status(200).json({ success: true, configured });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    if (!body) body = {};

    if (!body.orderId) {
      return res.status(400).json({ success: false, message: 'Falta orderId.' });
    }

    const text = buildSaleMessage(body);
    const result = await sendTelegramMessage(text);

    if (!result.ok && result.error?.includes('no configurado')) {
      return res.status(200).json({ success: false, skipped: true, message: result.error });
    }
    if (!result.ok) {
      console.error('notify-sale Telegram error:', result.error);
      return res.status(502).json({ success: false, message: result.error });
    }

    return res.status(200).json({ success: true, message: 'Notificación enviada a Telegram.' });
  } catch (error: any) {
    console.error('notify-sale error:', error);
    return res.status(500).json({ success: false, message: error?.message || 'Error interno.' });
  }
}
