export const formatEmailPrice = (amount: number, currency: string = 'COP'): string => {
  if (currency === 'COP') {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
};

const BRAND_NAME = 'Nebulab Studio 3D';
const BRAND_URL = 'https://nebulab-customs.vercel.app';
const BRAND_PRIMARY = '#8b5cf6';
const BRAND_ACCENT = '#06b6d4';
const BRAND_DARK = '#0b0f19';
const BRAND_CARD = '#151d2e';

const getItemDescriptionHtml = (item: any): string => {
  if (item.itemType === 'collar' && item.collarConfig) {
    return `
      <div style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 4px;">
        <strong style="color: #f1f5f9;">Mascota:</strong> ${item.collarConfig.petName || 'N/A'} • 
        <strong style="color: #f1f5f9;">Tel:</strong> ${item.collarConfig.phoneText || 'N/A'}<br/>
        Talla: <span style="color: #cbd5e1;">${item.collarConfig.size}</span> | 
        Estilo Placa: <span style="color: #cbd5e1;">${item.collarConfig.plateStyle}</span> | 
        Correa: <span style="color: #cbd5e1;">${item.collarConfig.strapColor}</span>
      </div>
    `;
  }

  if (item.itemType === 'clicker' && item.clickerConfig) {
    const typeLabel = item.clickerConfig.type === 'clicker' ? 'Clicker Teclado MX' : 'Llavero 3D';
    return `
      <div style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 4px;">
        Tipo: <strong style="color: #f1f5f9;">${typeLabel}</strong> (${item.clickerConfig.size}mm)<br/>
        Base: <span style="color: #cbd5e1;">${item.clickerConfig.baseStyle}</span> | 
        Switch: <span style="color: #cbd5e1;">${item.clickerConfig.switchType}</span> | 
        Relieve: <span style="color: #cbd5e1;">${item.clickerConfig.reliefStyle}</span>
      </div>
    `;
  }

  const shapeName =
    item.config?.shape === 'arc'
      ? 'Curvada (Arco)'
      : item.config?.shape === 'cylinder'
      ? 'Cilíndrica 360°'
      : 'Plana';
  const baseName =
    item.config?.baseType === 'night-light'
      ? 'Lámpara de Noche LED'
      : item.config?.baseType === 'led-wooden-base'
      ? 'Base LED de Madera'
      : item.config?.baseType === 'flat-stand'
      ? 'Soporte de Escritorio'
      : 'Sin Base';

  return `
    <div style="font-size: 13px; color: #94a3b8; line-height: 1.5; margin-top: 4px;">
      Forma: <strong style="color: #f1f5f9;">${shapeName}</strong> (${item.config?.width || 120}x${item.config?.height || 100}mm)<br/>
      Soporte: <span style="color: #cbd5e1;">${baseName}</span> | 
      Material: <span style="color: #cbd5e1;">${item.config?.material || 'PLA Blanco'}</span>
      ${item.config?.notes ? `<br/><span style="color: #38bdf8;">Nota: "${item.config.notes}"</span>` : ''}
    </div>
  `;
};

const wrapInEmailTemplate = (title: string, preheader: string, contentHtml: string): string => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${BRAND_DARK};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #f1f5f9;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: ${BRAND_ACCENT};
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 12px !important;
      }
      .card {
        padding: 20px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND_DARK};">
  <div style="display: none; font-size: 1px; color: ${BRAND_DARK}; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${preheader}
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_DARK};">
    <tr>
      <td align="center" style="padding: 32px 12px;">
        
        <table role="presentation" class="container" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          
          <!-- Header / Brand Logo -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="${BRAND_URL}" target="_blank" style="text-decoration: none; display: inline-block; padding: 10px 20px; background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.15)); border: 1px solid ${BRAND_PRIMARY}4d; border-radius: 16px;">
                <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; background: linear-gradient(to right, #a78bfa, #38bdf8); -webkit-background-clip: text; color: #a78bfa; text-transform: uppercase;">
                  NEBULAB STUDIO 3D
                </span>
              </a>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td>
              <table role="presentation" class="card" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_CARD}; border: 1px solid #1e293b; border-radius: 20px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <tr>
                  <td>
                    ${contentHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 28px; color: #64748b; font-size: 12px; line-height: 1.6;">
              <p style="margin: 0 0 8px 0;">
                Este correo fue enviado automáticamente por <a href="${BRAND_URL}" target="_blank" style="color: #94a3b8; font-weight: bold; text-decoration: none;">${BRAND_NAME}</a>.
              </p>
              <p style="margin: 0;">
                Tecnología de Litofanías y Personalización 3D • Medellín, Colombia
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

export const buildCustomerOrderEmail = (order: any): { subject: string; html: string } => {
  const curr = order.currency || 'COP';
  const formattedTotal = formatEmailPrice(order.total, curr);
  const formattedSubtotal = formatEmailPrice(order.subtotal, curr);
  const formattedShipping = order.shippingFee > 0 ? formatEmailPrice(order.shippingFee, curr) : '¡Gratis!';

  const itemsHtml = (order.items || [])
    .map(
      (item: any, idx: number) => `
      <div style="padding: 16px 0; border-bottom: 1px solid #1e293b; ${idx === 0 ? 'border-top: 1px solid #1e293b;' : ''}">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 15px; font-weight: 700; color: #f8fafc;">
                ${item.title || (item.itemType === 'collar' ? 'Collar para Mascota 3D' : item.itemType === 'clicker' ? 'Clicker / Llavero 3D' : 'Litofanía 3D Personalizada')}
                <span style="color: #38bdf8; font-size: 13px; font-weight: 500;"> x${item.quantity}</span>
              </div>
              ${getItemDescriptionHtml(item)}
            </td>
            <td style="vertical-align: top; text-align: right; white-space: nowrap; padding-left: 12px;">
              <div style="font-size: 15px; font-weight: 700; color: #38bdf8;">
                ${formatEmailPrice(item.price * item.quantity, curr)}
              </div>
            </td>
          </tr>
        </table>
      </div>
    `
    )
    .join('');

  const shipping = order.shippingDetails || {};

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; padding: 6px 14px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; color: #34d399; font-size: 13px; font-weight: 600;">
        ✓ ¡Pedido Confirmado con Éxito!
      </span>
      <h1 style="margin: 16px 0 6px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
        ¡Gracias por tu compra, ${String(shipping.fullName || 'Cliente').split(' ')[0]}!
      </h1>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">
        Hemos recibido tu pedido correctamente y comenzaremos su preparación en nuestro taller 3D.
      </p>
    </div>

    <div style="background-color: #0f172a; border-radius: 14px; padding: 16px; margin-bottom: 24px; border: 1px solid #1e293b;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size: 13px; color: #94a3b8;">
            Número de Orden: <strong style="color: #f1f5f9; font-family: monospace; font-size: 14px;">${order.id}</strong>
          </td>
          <td style="text-align: right; font-size: 13px; color: #94a3b8;">
            Fecha: <strong style="color: #f1f5f9;">${new Date(order.createdAt || Date.now()).toLocaleDateString('es-CO')}</strong>
          </td>
        </tr>
      </table>
    </div>

    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 15px; font-weight: 700; color: #e2e8f0; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0;">
        Resumen de Productos
      </h2>
      ${itemsHtml}
    </div>

    <div style="background-color: #0f172a; border-radius: 14px; padding: 18px; margin-bottom: 24px; border: 1px solid #1e293b;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #94a3b8;">
        <tr>
          <td style="padding: 4px 0;">Subtotal</td>
          <td style="text-align: right; color: #f1f5f9;">${formattedSubtotal}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0;">Costo de Envío</td>
          <td style="text-align: right; color: #f1f5f9;">${formattedShipping}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0 0 0; font-size: 16px; font-weight: 700; color: #ffffff; border-top: 1px solid #1e293b;">Total</td>
          <td style="padding: 12px 0 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #38bdf8; border-top: 1px solid #1e293b;">
            ${formattedTotal}
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #0f172a; border-radius: 14px; padding: 18px; margin-bottom: 28px; border: 1px solid #1e293b;">
      <h3 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px 0;">
        Dirección de Entrega
      </h3>
      <div style="font-size: 14px; color: #f1f5f9; line-height: 1.5;">
        <strong>${shipping.fullName || 'N/A'}</strong><br/>
        ${shipping.address || ''}<br/>
        ${shipping.city || ''}${shipping.department ? `, ${shipping.department}` : ''}, Colombia<br/>
        <span style="color: #94a3b8;">Teléfono:</span> ${shipping.phone || 'N/A'} • <span style="color: #94a3b8;">Email:</span> ${shipping.email || 'N/A'}
      </div>
    </div>

    <div style="text-align: center; font-size: 13px; color: #94a3b8;">
      ¿Tienes preguntas sobre tu pedido? Escríbenos directamente a través de WhatsApp o respondiendo a este correo.
    </div>
  `;

  return {
    subject: `¡Pedido Confirmado! #${order.id} - Nebulab Studio 3D`,
    html: wrapInEmailTemplate('Confirmación de Pedido - Nebulab Studio', `¡Tu pedido #${order.id} ha sido confirmado con éxito!`, contentHtml),
  };
};

export const buildAdminNewOrderEmail = (order: any): { subject: string; html: string } => {
  const curr = order.currency || 'COP';
  const formattedTotal = formatEmailPrice(order.total, curr);
  const shipping = order.shippingDetails || {};

  const itemsHtml = (order.items || [])
    .map(
      (item: any) => `
      <div style="padding: 12px; background-color: #0f172a; border-radius: 10px; margin-bottom: 8px; border: 1px solid #1e293b;">
        <strong style="color: #f8fafc; font-size: 14px;">
          ${item.title || (item.itemType === 'collar' ? 'Collar 3D' : item.itemType === 'clicker' ? 'Clicker/Llavero 3D' : 'Litofanía 3D')} (x${item.quantity})
        </strong>
        ${getItemDescriptionHtml(item)}
      </div>
    `
    )
    .join('');

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; padding: 6px 14px; background-color: rgba(139, 92, 246, 0.2); border: 1px solid rgba(139, 92, 246, 0.4); border-radius: 9999px; color: #c4b5fd; font-size: 13px; font-weight: 700;">
        🚨 NUEVA VENTA REGISTRADA
      </span>
      <h1 style="margin: 16px 0 6px 0; font-size: 24px; font-weight: 800; color: #ffffff;">
        Nueva Orden: #${order.id}
      </h1>
      <p style="margin: 0; color: #94a3b8; font-size: 14px;">
        Un cliente acaba de realizar una orden en la tienda.
      </p>
    </div>

    <div style="display: table; width: 100%; margin-bottom: 20px;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding: 12px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; text-align: center; width: 33%;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Total</div>
            <div style="font-size: 18px; font-weight: 800; color: #38bdf8; margin-top: 4px;">${formattedTotal}</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 12px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; text-align: center; width: 33%;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Método</div>
            <div style="font-size: 14px; font-weight: 700; color: #f1f5f9; margin-top: 6px; text-transform: uppercase;">${order.paymentMethod}</div>
          </td>
          <td style="width: 8px;"></td>
          <td style="padding: 12px; background-color: #0f172a; border-radius: 12px; border: 1px solid #1e293b; text-align: center; width: 33%;">
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Ítems</div>
            <div style="font-size: 18px; font-weight: 800; color: #a78bfa; margin-top: 4px;">${(order.items || []).length}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #0f172a; border-radius: 14px; padding: 18px; margin-bottom: 20px; border: 1px solid #1e293b;">
      <h3 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 0 0 10px 0;">
        Datos del Cliente & Envío
      </h3>
      <div style="font-size: 14px; color: #f1f5f9; line-height: 1.6;">
        <strong>Nombre:</strong> ${shipping.fullName || 'N/A'}<br/>
        <strong>Email:</strong> <a href="mailto:${shipping.email}">${shipping.email}</a><br/>
        <strong>Teléfono:</strong> <a href="tel:${shipping.phone}">${shipping.phone}</a><br/>
        <strong>Dirección:</strong> ${shipping.address || ''}, ${shipping.city || ''}${shipping.department ? `, ${shipping.department}` : ''}
      </div>
    </div>

    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 0 0 10px 0;">
        Detalle de Productos para Fabricación 3D
      </h3>
      ${itemsHtml}
    </div>

    <div style="text-align: center; padding-top: 8px;">
      <p style="font-size: 13px; color: #94a3b8; margin: 0;">
        Ingresa al Panel de Administrador de Nebulab para descargar los archivos STL / imágenes y gestionar el estado del pedido.
      </p>
    </div>
  `;

  return {
    subject: `🚨 [Nueva Venta] Orden #${order.id} (${formattedTotal}) - ${shipping.fullName || 'Cliente'}`,
    html: wrapInEmailTemplate('Nueva Venta Registrada', `Nueva orden #${order.id} de ${shipping.fullName || 'Cliente'} por ${formattedTotal}`, contentHtml),
  };
};

export const buildStatusChangeEmail = (order: any, newStatus: string): { subject: string; html: string } => {
  const statusLabels: Record<string, { title: string; badge: string; color: string; desc: string }> = {
    confirmed: {
      title: 'Tu pedido ha sido recibido y confirmado',
      badge: '✓ Confirmado',
      color: '#38bdf8',
      desc: 'Hemos registrado tu pedido y está en cola de producción para nuestro taller 3D.',
    },
    processing: {
      title: '¡Tu pedido ha entrado en producción 3D! 🖨️✨',
      badge: '⚙️ En Producción',
      color: '#a855f7',
      desc: 'Nuestro equipo ha iniciado el proceso de modelado, laminado e impresión 3D de tus productos personalizados.',
    },
    completed: {
      title: '¡Tu pedido está listo / en camino! 📦🚀',
      badge: '🚚 Listo / Despachado',
      color: '#10b981',
      desc: 'Tus productos 3D han superado el control de calidad y han sido preparados para su entrega o despacho a tu dirección.',
    },
    cancelled: {
      title: 'Tu pedido ha sido cancelado',
      badge: '✕ Cancelado',
      color: '#f43f5e',
      desc: 'Tu orden ha sido marcada como cancelada. Si consideras que es un error o necesitas ayuda, contáctanos de inmediato.',
    },
  };

  const statusInfo = statusLabels[newStatus] || statusLabels.confirmed;
  const shipping = order.shippingDetails || {};
  const curr = order.currency || 'COP';

  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; padding: 6px 16px; background-color: rgba(255, 255, 255, 0.08); border: 1px solid ${statusInfo.color}; border-radius: 9999px; color: ${statusInfo.color}; font-size: 13px; font-weight: 700;">
        ${statusInfo.badge}
      </span>
      <h1 style="margin: 16px 0 8px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
        ${statusInfo.title}
      </h1>
      <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">
        ${statusInfo.desc}
      </p>
    </div>

    <div style="background-color: #0f172a; border-radius: 14px; padding: 18px; margin-bottom: 24px; border: 1px solid #1e293b;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size: 13px; color: #94a3b8;">
            Orden ID: <strong style="color: #f1f5f9; font-family: monospace; font-size: 14px;">${order.id}</strong><br/>
            Cliente: <strong style="color: #f1f5f9;">${shipping.fullName || 'Cliente'}</strong>
          </td>
          <td style="text-align: right; font-size: 13px; color: #94a3b8; vertical-align: top;">
            Total: <strong style="color: #38bdf8; font-size: 15px;">${formatEmailPrice(order.total, curr)}</strong>
          </td>
        </tr>
      </table>
    </div>

    <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.08)); border-radius: 14px; padding: 18px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2);">
      <h3 style="font-size: 13px; font-weight: 700; color: #cbd5e1; text-transform: uppercase; margin: 0 0 8px 0;">
        Dirección de Destino:
      </h3>
      <p style="margin: 0; font-size: 14px; color: #f1f5f9;">
        ${shipping.address || ''}, ${shipping.city || ''}${shipping.department ? `, ${shipping.department}` : ''}
      </p>
    </div>

    <div style="text-align: center; font-size: 13px; color: #94a3b8; line-height: 1.5;">
      Si tienes preguntas o deseas realizar seguimiento con nosotros, no dudes en escribirnos por WhatsApp o responder a este correo.
    </div>
  `;

  return {
    subject: `Actualización de tu Pedido #${order.id} - ${statusInfo.badge}`,
    html: wrapInEmailTemplate(`Estado de Pedido #${order.id}`, `Tu pedido #${order.id} se encuentra ahora en estado: ${statusInfo.badge}`, contentHtml),
  };
};

export const buildTestEmail = (senderEmail: string): { subject: string; html: string } => {
  const contentHtml = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; padding: 6px 14px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 9999px; color: #34d399; font-size: 13px; font-weight: 700;">
        ✓ CONEXIÓN EXITOSA
      </span>
      <h1 style="margin: 16px 0 8px 0; font-size: 22px; font-weight: 800; color: #ffffff;">
        Prueba de Notificaciones por Correo
      </h1>
      <p style="margin: 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">
        El sistema de envío de correos de <strong>Nebulab Studio 3D</strong> está configurado y funcionando perfectamente a través de Gmail SMTP.
      </p>
    </div>

    <div style="background-color: #0f172a; border-radius: 14px; padding: 18px; margin-bottom: 20px; border: 1px solid #1e293b;">
      <h3 style="font-size: 13px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin: 0 0 10px 0;">
        Detalles de la Configuración
      </h3>
      <div style="font-size: 14px; color: #f1f5f9; line-height: 1.6;">
        <strong>Correo Emisor:</strong> ${senderEmail}<br/>
        <strong>Servicio:</strong> Gmail SMTP (App Password)<br/>
        <strong>Fecha de Prueba:</strong> ${new Date().toLocaleString('es-CO')}
      </div>
    </div>

    <div style="text-align: center; font-size: 13px; color: #94a3b8;">
      A partir de ahora, los eventos configurados (nuevos pedidos y cambios de estado) se despacharán automáticamente.
    </div>
  `;

  return {
    subject: `✓ [Prueba Exitosa] Sistema de Correos Nebulab Studio 3D`,
    html: wrapInEmailTemplate('Prueba de Correo Nebulab', 'Prueba de conexión exitosa con el sistema de correos', contentHtml),
  };
};
