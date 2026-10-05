import type { Order, EmailSettings, EmailSendRequest, EmailSendResult } from '../types';

async function send(payload: Record<string, unknown>): Promise<EmailSendResult> {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { success: false, error: data.message || `Error de envío (${response.status})`, message: data.message || 'Error de envío.' };
    return data as EmailSendResult;
  } catch (error: any) {
    return { success: false, error: error?.message || 'Error de red al contactar el servicio de correo.', message: error?.message || 'Error de red.' };
  }
}

export const emailService = {
  sendEmailRequest: (payload: EmailSendRequest): Promise<EmailSendResult> => send(payload as unknown as Record<string, unknown>),

  sendOrderCreatedEmails: (order: Order): Promise<EmailSendResult> => send({ type: 'order_created', orderId: order.id }),

  sendStatusChangeEmail: (
    order: Order,
    newStatus: Order['status'],
    previousStatus?: Order['status'],
  ): Promise<EmailSendResult> => send({ type: 'status_changed', orderId: order.id, newStatus, previousStatus }),

  sendTestEmail: (recipient: string, _settings: EmailSettings): Promise<EmailSendResult> => send({ type: 'test', testRecipient: recipient }),
};
