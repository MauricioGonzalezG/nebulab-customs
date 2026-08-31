import { Order, EmailSettings, EmailSendRequest, EmailSendResult } from '../types';
import { tursoService } from './turso';

export const emailService = {
  /**
   * Dispatch raw email request to /api/send-email
   */
  sendEmailRequest: async (payload: EmailSendRequest): Promise<EmailSendResult> => {
    try {
      // If customSettings is not explicitly provided, fetch current settings from Turso DB / LocalStorage
      if (!payload.customSettings) {
        payload.customSettings = await tursoService.getEmailSettings();
      }

      // Check if email sending is disabled globally
      if (!payload.customSettings?.enabled && payload.type !== 'test') {
        return {
          success: true,
          skipped: true,
          message: 'El sistema de correos está desactivado en la configuración.',
        };
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMsg = `Error de envío (${response.status})`;
        try {
          const errText = await response.text();
          try {
            const parsed = JSON.parse(errText);
            errMsg = parsed.message || parsed.error || errMsg;
          } catch (e) {
            if (errText.includes('FUNCTION_INVOCATION_FAILED')) {
              errMsg = 'La función del servidor falló al ejecutarse en Vercel. Por favor verifica tus credenciales.';
            } else if (errText) {
              errMsg = errText;
            }
          }
        } catch (e) {}

        return {
          success: false,
          error: errMsg,
          message: errMsg,
        };
      }

      const data: EmailSendResult = await response.json();
      return data;
    } catch (err: any) {
      console.error('Error invoking email API:', err);
      return {
        success: false,
        error: err?.message || 'Error de red al contactar servicio de correo',
        message: err?.message || 'Error de red',
      };
    }
  },

  /**
   * Trigger emails when a new order is created
   */
  sendOrderCreatedEmails: async (order: Order, customSettings?: EmailSettings): Promise<EmailSendResult> => {
    return emailService.sendEmailRequest({
      type: 'order_created',
      order,
      customSettings,
    });
  },

  /**
   * Trigger email when order status is changed
   */
  sendStatusChangeEmail: async (
    order: Order,
    newStatus: Order['status'],
    previousStatus?: Order['status'],
    customSettings?: EmailSettings
  ): Promise<EmailSendResult> => {
    return emailService.sendEmailRequest({
      type: 'status_changed',
      order,
      newStatus,
      previousStatus,
      customSettings,
    });
  },

  /**
   * Trigger a test email from Admin Settings tab
   */
  sendTestEmail: async (recipient: string, customSettings: EmailSettings): Promise<EmailSendResult> => {
    return emailService.sendEmailRequest({
      type: 'test',
      testRecipient: recipient,
      customSettings,
    });
  },
};
