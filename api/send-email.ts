import nodemailer from 'nodemailer';
import {
  buildCustomerOrderEmail,
  buildAdminNewOrderEmail,
  buildStatusChangeEmail,
  buildTestEmail,
} from '../src/lib/emailTemplates';

export default async function handler(req: any, res: any) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const { type, order, newStatus, testRecipient, customSettings } = req.body || {};

    const senderEmail =
      customSettings?.senderEmail ||
      process.env.SMTP_GMAIL_USER ||
      process.env.VITE_SMTP_GMAIL_USER ||
      '';

    const gmailAppPassword =
      customSettings?.gmailAppPassword ||
      process.env.SMTP_GMAIL_APP_PASSWORD ||
      process.env.VITE_SMTP_GMAIL_APP_PASSWORD ||
      '';

    const senderName = customSettings?.senderName || 'Nebulab Studio 3D';
    const adminNotificationEmail =
      customSettings?.adminNotificationEmail ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.VITE_ADMIN_DEFAULT_EMAIL ||
      senderEmail;

    const events = customSettings?.events || {
      notifyCustomerNewOrder: true,
      notifyAdminNewOrder: true,
      notifyCustomerStatusChange: true,
    };

    // If test email, sender credentials are required
    if (!senderEmail || !gmailAppPassword) {
      return res.status(400).json({
        success: false,
        message: 'No se han configurado las credenciales de Gmail (Email Emisor o Contraseña de Aplicación).',
      });
    }

    // Clean app password (remove spaces if user copied "abcd efgh ijkl mnop")
    const cleanAppPassword = gmailAppPassword.replace(/\s+/g, '');

    // Setup Nodemailer Transporter for Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: senderEmail.trim(),
        pass: cleanAppPassword,
      },
    });

    const sentTo: string[] = [];

    // 1. Handle Test Email
    if (type === 'test') {
      const recipient = (testRecipient || senderEmail).trim();
      const testEmailData = buildTestEmail(senderEmail);

      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail.trim()}>`,
        to: recipient,
        subject: testEmailData.subject,
        html: testEmailData.html,
      });

      sentTo.push(recipient);
      return res.status(200).json({
        success: true,
        message: `Correo de prueba enviado con éxito a ${recipient}`,
        sentTo,
      });
    }

    // 2. Handle New Order Created
    if (type === 'order_created' && order) {
      const promises: Promise<any>[] = [];

      // Customer confirmation email
      if (events.notifyCustomerNewOrder && order.shippingDetails?.email) {
        const customerEmail = order.shippingDetails.email.trim();
        const customerTemplate = buildCustomerOrderEmail(order);

        promises.push(
          transporter
            .sendMail({
              from: `"${senderName}" <${senderEmail.trim()}>`,
              to: customerEmail,
              subject: customerTemplate.subject,
              html: customerTemplate.html,
            })
            .then(() => sentTo.push(customerEmail))
            .catch((err) => {
              console.error(`Error sending customer order email to ${customerEmail}:`, err);
            })
        );
      }

      // Admin alert email
      if (events.notifyAdminNewOrder && adminNotificationEmail) {
        const adminEmail = adminNotificationEmail.trim();
        const adminTemplate = buildAdminNewOrderEmail(order);

        promises.push(
          transporter
            .sendMail({
              from: `"${senderName}" <${senderEmail.trim()}>`,
              to: adminEmail,
              subject: adminTemplate.subject,
              html: adminTemplate.html,
            })
            .then(() => sentTo.push(adminEmail))
            .catch((err) => {
              console.error(`Error sending admin alert email to ${adminEmail}:`, err);
            })
        );
      }

      await Promise.all(promises);

      return res.status(200).json({
        success: true,
        message: `Notificaciones de nuevo pedido procesadas (${sentTo.length} enviadas)`,
        sentTo,
      });
    }

    // 3. Handle Order Status Change
    if (type === 'status_changed' && order && newStatus) {
      if (events.notifyCustomerStatusChange && order.shippingDetails?.email) {
        const customerEmail = order.shippingDetails.email.trim();
        const statusTemplate = buildStatusChangeEmail(order, newStatus);

        await transporter.sendMail({
          from: `"${senderName}" <${senderEmail.trim()}>`,
          to: customerEmail,
          subject: statusTemplate.subject,
          html: statusTemplate.html,
        });

        sentTo.push(customerEmail);

        return res.status(200).json({
          success: true,
          message: `Notificación de cambio de estado enviada a ${customerEmail}`,
          sentTo,
        });
      } else {
        return res.status(200).json({
          success: true,
          skipped: true,
          message: 'Notificación de cambio de estado desactivada o correo de cliente no disponible.',
        });
      }
    }

    return res.status(400).json({
      success: false,
      message: 'Tipo de evento de correo no válido o datos incompletos.',
    });
  } catch (error: any) {
    console.error('Error in send-email API handler:', error);
    return res.status(500).json({
      success: false,
      message: error?.message || 'Error interno al enviar el correo.',
      error: error?.toString(),
    });
  }
}
