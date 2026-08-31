import { createClient } from '@libsql/client/web';

export default async function handler(req: any, res: any) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }

  try {
    const body = req.body || {};
    const query = req.query || {};

    const paymentId =
      query.id ||
      query['data.id'] ||
      body.data?.id ||
      body.id ||
      (body.action === 'payment.created' || body.action === 'payment.updated' ? body.data?.id : null);

    if (!paymentId) {
      return res.status(200).json({ status: 'ignored', message: 'No payment id found in webhook request' });
    }

    const accessToken = process.env.VITE_MERCADOPAGO_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.warn('Webhook received but MERCADOPAGO_ACCESS_TOKEN is missing in environment.');
      return res.status(200).json({ status: 'error', message: 'Missing Mercado Pago Access Token' });
    }

    // Verify payment details directly with Mercado Pago API REST
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error(`Mercado Pago API error for payment ${paymentId}:`, errText);
      return res.status(200).json({ status: 'error', message: 'Failed to verify payment with Mercado Pago API' });
    }

    const paymentData = await mpResponse.json();
    const paymentStatus = paymentData.status; // 'approved', 'pending', 'rejected', etc.
    const externalReference = paymentData.external_reference; // order.id e.g. LITHO-663557

    console.log(`Mercado Pago Webhook: Payment ${paymentId} status=${paymentStatus} for order=${externalReference}`);

    if (externalReference) {
      const dbUrl = process.env.VITE_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || '';
      const dbToken = process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || '';

      if (dbUrl && dbUrl.startsWith('libsql://')) {
        const tursoClient = createClient({
          url: dbUrl,
          authToken: dbToken,
        });

        let targetPaymentStatus = 'pending';
        let targetOrderStatus = 'confirmed';

        if (paymentStatus === 'approved') {
          targetPaymentStatus = 'approved';
          targetOrderStatus = 'processing';
        } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
          targetPaymentStatus = 'rejected';
          targetOrderStatus = 'cancelled';
        } else if (paymentStatus === 'refunded' || paymentStatus === 'charged_back') {
          targetPaymentStatus = 'refunded';
          targetOrderStatus = 'cancelled';
        }

        const webhookLogEntry = {
          id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          type: 'payment_update',
          title: `Pago Mercado Pago: ${targetPaymentStatus.toUpperCase()}`,
          description: `Notificación IPN/Webhook procesada para Payment ID #${paymentId} (${paymentStatus}). Estado orden: ${targetOrderStatus}.`,
          actor: 'Mercado Pago Webhook',
          metadata: { paymentId, paymentStatus, rawAction: body.action || query.topic },
        };

        // Fetch existing logs if available
        let existingLogs: any[] = [];
        try {
          const res = await tursoClient.execute({
            sql: `SELECT logs_json FROM orders WHERE id = ? LIMIT 1`,
            args: [externalReference],
          });
          if (res.rows.length > 0 && res.rows[0].logs_json) {
            existingLogs = JSON.parse(String(res.rows[0].logs_json));
          }
        } catch (e) {}

        const updatedLogsJson = JSON.stringify([webhookLogEntry, ...existingLogs]);

        await tursoClient.execute({
          sql: `UPDATE orders SET payment_status = ?, status = ?, logs_json = ? WHERE id = ?`,
          args: [targetPaymentStatus, targetOrderStatus, updatedLogsJson, externalReference],
        });

        console.log(`Order ${externalReference} successfully updated to payment_status=${targetPaymentStatus}, status=${targetOrderStatus} in Turso DB!`);
      }
    }

    return res.status(200).json({
      status: 'success',
      paymentId,
      paymentStatus,
      externalReference,
    });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(200).json({ status: 'error', message: error?.message || 'Internal webhook error' });
  }
}
