import {
  buildCustomerOrderEmail,
  buildAdminNewOrderEmail,
  buildStatusChangeEmail,
  buildTestEmail,
} from './emailTemplates';

export default async function handler(req: any, res: any) {
  // Always attach CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    // Parse body safely
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    if (!body) body = {};

    const { type, order, newStatus, testRecipient, customSettings } = body;

    const provider: 'mailtrap' | 'gmail' = customSettings?.provider || 'mailtrap';
    const senderName = customSettings?.senderName || 'Nebulab Studio 3D';

    const events = customSettings?.events || {
      notifyCustomerNewOrder: true,
      notifyAdminNewOrder: true,
      notifyCustomerStatusChange: true,
    };

    let senderEmail = customSettings?.senderEmail?.trim() || '';
    const adminNotificationEmail =
      customSettings?.adminNotificationEmail?.trim() ||
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.VITE_ADMIN_DEFAULT_EMAIL ||
      'admin@nebuladb3d.com.co';

    // Helper: Unified Dispatch Function
    const dispatchEmail = async (toEmail: string, subject: string, html: string, category: string = 'Notification') => {
      const cleanTo = toEmail.trim();

      if (provider === 'mailtrap') {
        const mailtrapToken =
          customSettings?.mailtrapApiToken ||
          process.env.MAILTRAP_API_TOKEN ||
          process.env.VITE_MAILTRAP_API_TOKEN ||
          '';

        if (!mailtrapToken) {
          throw new Error('Falta configurar el Token API de Mailtrap en la configuración.');
        }

        const effectiveSender = senderEmail || 'hello@demomailtrap.co';

        const mtRes = await fetch('https://send.api.mailtrap.io/api/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mailtrapToken.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: {
              email: effectiveSender,
              name: senderName,
            },
            to: [
              {
                email: cleanTo,
              },
            ],
            subject,
            html,
            category,
          }),
        });

        if (!mtRes.ok) {
          const errorData: any = await mtRes.json().catch(() => ({}));
          const rawErrors =
            (Array.isArray(errorData?.errors) ? errorData.errors.join(', ') : errorData?.errors) ||
            errorData?.message ||
            `Error HTTP ${mtRes.status} de Mailtrap`;

          let userFriendly = rawErrors;
          if (
            mtRes.status === 401 ||
            String(rawErrors).toLowerCase().includes('unauthorized') ||
            String(rawErrors).toLowerCase().includes('incorrect api token')
          ) {
            userFriendly =
              'Token API de Mailtrap no autorizado (401). Verifica que hayas copiado el "API Token" desde tu cuenta de Mailtrap (mailtrap.io → Email Sending → API Tokens).';
          } else if (
            String(rawErrors).toLowerCase().includes('from.email') ||
            String(rawErrors).toLowerCase().includes('domain') ||
            String(rawErrors).toLowerCase().includes('unverified')
          ) {
            userFriendly =
              'Mailtrap: El correo emisor debe ser "hello@demomailtrap.co" para pruebas, o debes tener tu propio dominio verificado en Mailtrap.';
          }

          throw new Error(userFriendly);
        }

        return await mtRes.json().catch(() => ({ success: true }));
      } else {
        // Gmail SMTP via dynamic import
        const nodemailerModule = await import('nodemailer');
        const nodemailer = (nodemailerModule as any).default || nodemailerModule;

        const gmailAppPassword =
          customSettings?.gmailAppPassword ||
          process.env.SMTP_GMAIL_APP_PASSWORD ||
          process.env.VITE_SMTP_GMAIL_APP_PASSWORD ||
          '';

        if (!senderEmail || !gmailAppPassword) {
          throw new Error('Falta configurar el Correo Emisor o la Contraseña de Aplicación de Gmail.');
        }

        const cleanAppPassword = String(gmailAppPassword).replace(/\s+/g, '');

        const createTransportFn =
          (nodemailer as any).createTransport ||
          (nodemailer as any).default?.createTransport ||
          nodemailer;

        const transporter = createTransportFn({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: senderEmail,
            pass: cleanAppPassword,
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        return await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: cleanTo,
          subject,
          html,
        });
      }
    };

    const sentTo: string[] = [];

    // 1. Handle Test Email
    if (type === 'test') {
      const recipient = (testRecipient || adminNotificationEmail || senderEmail || 'test@example.com').trim();
      const testEmailData = buildTestEmail(senderEmail || (provider === 'mailtrap' ? 'Mailtrap API' : 'Gmail'));

      await dispatchEmail(
        recipient,
        testEmailData.subject,
        testEmailData.html,
        'Integration Test'
      );

      sentTo.push(recipient);
      return res.status(200).json({
        success: true,
        message: `Correo de prueba enviado con éxito a ${recipient} vía ${provider === 'mailtrap' ? 'Mailtrap API' : 'Gmail SMTP'}`,
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
          dispatchEmail(customerEmail, customerTemplate.subject, customerTemplate.html, 'Order Confirmation')
            .then(() => sentTo.push(customerEmail))
            .catch((err: any) => {
              console.error(`Error sending customer order email to ${customerEmail}:`, err);
            })
        );
      }

      // Admin alert email
      if (events.notifyAdminNewOrder && adminNotificationEmail) {
        const adminEmail = adminNotificationEmail.trim();
        const adminTemplate = buildAdminNewOrderEmail(order);

        promises.push(
          dispatchEmail(adminEmail, adminTemplate.subject, adminTemplate.html, 'Admin Order Alert')
            .then(() => sentTo.push(adminEmail))
            .catch((err: any) => {
              console.error(`Error sending admin alert email to ${adminEmail}:`, err);
            })
        );
      }

      await Promise.all(promises);

      return res.status(200).json({
        success: true,
        message: `Notificaciones de nuevo pedido procesadas (${sentTo.length} enviadas vía ${provider})`,
        sentTo,
      });
    }

    // 3. Handle Order Status Change
    if (type === 'status_changed' && order && newStatus) {
      if (events.notifyCustomerStatusChange && order.shippingDetails?.email) {
        const customerEmail = order.shippingDetails.email.trim();
        const statusTemplate = buildStatusChangeEmail(order, newStatus);

        await dispatchEmail(customerEmail, statusTemplate.subject, statusTemplate.html, 'Order Status Change');
        sentTo.push(customerEmail);

        return res.status(200).json({
          success: true,
          message: `Notificación de cambio de estado enviada a ${customerEmail} vía ${provider}`,
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

    let userMessage = error?.message || 'Error al enviar el correo.';
    if (userMessage.includes('535') || userMessage.includes('BadCredentials') || userMessage.includes('Username and Password not accepted')) {
      userMessage = 'Gmail rechazó las credenciales. Verifica que el correo emisor sea correcto y que la contraseña de aplicación de 16 caracteres esté activa.';
    }

    return res.status(400).json({
      success: false,
      message: userMessage,
      error: error?.message || error?.toString(),
    });
  }
}
