import { randomBytes } from 'node:crypto';
import { getDb, getOrder, initializeStore, sendTelegramForOrder } from '../server/store';
import type { OrderLogEntry } from '../src/types';

async function updatePayment(orderId: string, state: string, orderStatus: string, details: unknown, log: OrderLogEntry) {
  const order = await getOrder(orderId);
  if (!order) return { applied: false, newlyApproved: false };
  const rank: Record<string, number> = { pending: 0, rejected: 1, approved: 2, refunded: 3 };
  const priorRank = rank[order.paymentStatus || 'pending'] ?? 0;
  const nextRank = rank[state] ?? 0;
  const priorPaymentId = String(order.paymentDetails?.transactionId || '');
  const nextPaymentId = String((details as any)?.transactionId || '');
  if (nextRank < priorRank || (priorRank >= rank.approved && priorPaymentId && priorPaymentId !== nextPaymentId)) {
    return { applied: false, newlyApproved: false };
  }
  if (priorPaymentId === nextPaymentId && order.paymentStatus === state) return { applied: false, newlyApproved: false };
  const nextOrderStatus = state === 'approved'
    ? (order.status === 'confirmed' ? 'processing' : order.status)
    : state === 'rejected'
      ? (order.status === 'confirmed' ? 'cancelled' : order.status)
      : state === 'refunded'
        ? (order.status === 'completed' ? 'completed' : 'cancelled')
        : order.status || orderStatus;
  const logs = [log, ...(order.logs || [])].slice(0, 500);
  const result = await getDb().execute({
    sql: `UPDATE orders SET payment_status = ?, status = ?, payment_details_json = ?, logs_json = ? WHERE id = ? AND COALESCE(payment_status, 'pending') = ?`,
    args: [state, nextOrderStatus, JSON.stringify(details), JSON.stringify(logs), orderId, order.paymentStatus || 'pending'],
  });
  const applied = result.rowsAffected === 1;
  return { applied, newlyApproved: applied && state === 'approved' && order.paymentStatus !== 'approved' };
}

export default async function handler(req: any, res: any) {
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const query = req.query || {};
    const paymentId = query.id || query['data.id'] || body.data?.id || body.id || null;
    if (!paymentId || !/^\d{1,30}$/.test(String(paymentId))) return res.status(200).json({ status: 'ignored' });

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
    if (!accessToken) return res.status(503).json({ status: 'error', message: 'Payment service is not configured' });
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(paymentId))}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!mpResponse.ok) return res.status(502).json({ status: 'error', message: 'Payment verification failed' });
    const payment = await mpResponse.json();
    const orderId = String(payment.external_reference || '').trim().toUpperCase();
    if (!/^LITHO-[A-F0-9]{48}$/.test(orderId)) return res.status(200).json({ status: 'ignored' });

    await initializeStore();
    const order = await getOrder(orderId);
    if (!order || order.paymentMethod !== 'mercadopago') return res.status(200).json({ status: 'ignored' });
    const currency = (process.env.MERCADOPAGO_CURRENCY || 'COP').toUpperCase();
    const rate = Number(process.env.COP_EXCHANGE_RATE || '4000');
    const expectedAmount = currency === 'USD' ? Number(order.total.toFixed(2)) : Math.round(order.total * rate);
    const actualAmount = Number(payment.transaction_amount);
    const actualCurrency = String(payment.currency_id || '').toUpperCase();
    const tolerance = currency === 'USD' ? 0.01 : 0;
    if (actualCurrency !== currency || !Number.isFinite(actualAmount) || Math.abs(actualAmount - expectedAmount) > tolerance) {
      console.warn('Mercado Pago callback did not match the stored order amount/currency.');
      return res.status(200).json({ status: 'ignored', reason: 'payment_mismatch' });
    }

    const status = String(payment.status || 'pending');
    const map: Record<string, { payment: string; order: string }> = {
      approved: { payment: 'approved', order: 'processing' },
      rejected: { payment: 'rejected', order: 'cancelled' },
      cancelled: { payment: 'rejected', order: 'cancelled' },
      refunded: { payment: 'refunded', order: 'cancelled' },
      charged_back: { payment: 'refunded', order: 'cancelled' },
    };
    const target = map[status] || { payment: 'pending', order: order.status };
    const log: OrderLogEntry = {
      id: `LOG-${randomBytes(12).toString('hex')}`, timestamp: new Date().toISOString(), type: 'payment_update',
      title: `Pago Mercado Pago: ${target.payment.toUpperCase()}`,
      description: `Pago verificado por el servidor (estado ${status}).`, actor: 'Mercado Pago Webhook',
      metadata: { paymentId: String(paymentId), paymentStatus: status },
    };
    const paymentUpdate = await updatePayment(orderId, target.payment, target.order, {
      transactionId: String(paymentId), paymentGateway: 'Mercado Pago', paidAt: status === 'approved' ? new Date().toISOString() : undefined,
      amount: actualAmount, currency: actualCurrency,
    }, log);
    if (paymentUpdate.newlyApproved) await sendTelegramForOrder(order, 'payment_approved', String(paymentId));
    return res.status(200).json({ status: 'success', paymentId: String(paymentId), paymentStatus: status, externalReference: orderId });
  } catch (error: any) {
    console.error('Mercado Pago webhook processing failed:', error?.message || error);
    return res.status(200).json({ status: 'error' });
  }
}
