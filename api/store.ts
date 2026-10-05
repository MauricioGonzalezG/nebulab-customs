import {
  appendOrderLog,
  authenticateAdmin,
  authenticateCustomer,
  clearSession,
  createOrder,
  getDb,
  getEmailSettings,
  getOrder,
  getOrderImage,
  getOrdersForCustomer,
  initializeStore,
  listOrders,
  readSession,
  registerCustomer,
  requireRole,
  saveEmailSettings,
  sendTelegramForOrder,
  setSession,
  updateOrder,
  type SessionUser,
  StoreError,
} from '../server/store.js';

function sessionCookie(req: any): string {
  return String(req.headers?.cookie || '');
}

function secureRequest(req: any): boolean {
  return req.headers?.['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
}

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

function customerPublic(user: SessionUser) {
  return { id: user.id, name: user.name || '', email: user.email };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Método no permitido.' });
  try {
    assertSameOrigin(req);
    const body = parseBody(req.body);
    const action = String(body.action || '');
    const user = await readSession(sessionCookie(req));

    if (action === 'session') {
      await initializeStore();
      return res.status(200).json({ success: true, adminUser: user?.role === 'admin' ? { email: user.email, role: 'admin' } : null, customerUser: user?.role === 'customer' ? customerPublic(user) : null });
    }
    if (action === 'logout') {
      await clearSession(req, res);
      return res.status(200).json({ success: true });
    }
    if (action === 'loginAdmin') {
      const email = String(body.email || '');
      const password = String(body.password || '');
      if (!await authenticateAdmin(email, password)) throw new StoreError('Correo o contraseña incorrectos.', 401);
      const adminEmail = process.env.ADMIN_EMAIL!.trim().toLowerCase();
      const admin: SessionUser = { id: `ADMIN-${adminEmail}`, email: adminEmail, role: 'admin' };
      await setSession(res, admin, secureRequest(req));
      return res.status(200).json({ success: true, adminUser: { email: admin.email, role: 'admin' } });
    }
    if (action === 'registerCustomer') {
      const customer = await registerCustomer(String(body.name || ''), String(body.email || ''), String(body.password || ''));
      await setSession(res, customer, secureRequest(req));
      return res.status(201).json({ success: true, customer: customerPublic(customer) });
    }
    if (action === 'loginCustomer') {
      const customer = await authenticateCustomer(String(body.email || ''), String(body.password || ''));
      if (!customer) throw new StoreError('Correo o contraseña incorrectos.', 401);
      await setSession(res, customer, secureRequest(req));
      return res.status(200).json({ success: true, customer: customerPublic(customer) });
    }
    if (action === 'createOrder') {
      const order = await createOrder(body.order, user?.role === 'customer' ? user.id : undefined);
      void sendTelegramForOrder(order, 'new_order').catch(() => undefined);
      return res.status(201).json({ success: true, order });
    }
    if (action === 'getOrderById') {
      const id = String(body.orderId || '').trim().toUpperCase();
      if (!id) throw new StoreError('Código de pedido no válido.');
      if (!user && !/^LITHO-[A-F0-9]{48}$/.test(id)) throw new StoreError('El pedido requiere iniciar sesión para consultar sus datos.', 401);
      const order = await getOrder(id);
      if (!order) return res.status(200).json({ success: true, order: null });
      if (user?.role === 'customer' && order.customerId !== user.id) throw new StoreError('No autorizado.', 403);
      if (user?.role === 'admin' || user?.role === 'customer' || /^LITHO-[A-F0-9]{48}$/.test(id)) return res.status(200).json({ success: true, order });
      throw new StoreError('No autorizado.', 403);
    }
    if (action === 'getOrdersByCustomerEmail') {
      const customer = requireRole(user, 'customer');
      return res.status(200).json({ success: true, orders: await getOrdersForCustomer(customer.id) });
    }
    if (action === 'getDbStatus') {
      await initializeStore();
      await getDb().execute('SELECT 1');
      return res.status(200).json({ connected: true, mode: 'Turso Cloud SQLite', url: 'Conexión segura del servidor', info: 'Conexión activa con la base de datos.' });
    }
    if (action === 'getOrders') {
      requireRole(user, 'admin');
      return res.status(200).json({ success: true, orders: await listOrders() });
    }
    if (action === 'getCustomersWithMetrics') {
      requireRole(user, 'admin');
      await initializeStore();
      const customers = await getDb().execute(`SELECT id, name, email, created_at FROM customers ORDER BY created_at DESC`);
      const orders = await listOrders();
      const metrics = new Map<string, { orderCount: number; totalSpent: number; name: string; createdAt: string; latestOrderAt: string; firstOrderId: string }>();
      for (const order of orders) {
        const email = order.shippingDetails.email.trim().toLowerCase();
        if (!email) continue;
        const metric = metrics.get(email) || { orderCount: 0, totalSpent: 0, name: order.shippingDetails.fullName, createdAt: order.createdAt, latestOrderAt: order.createdAt, firstOrderId: order.id };
        metric.orderCount += 1;
        if (order.status !== 'cancelled') metric.totalSpent += order.total;
        if (order.createdAt < metric.createdAt) {
          metric.createdAt = order.createdAt;
          metric.firstOrderId = order.id;
        }
        if (order.createdAt > metric.latestOrderAt) {
          metric.latestOrderAt = order.createdAt;
          metric.name = order.shippingDetails.fullName;
        }
        metrics.set(email, metric);
      }
      const registeredEmails = new Set<string>();
      const registered = customers.rows.map((row) => {
        const email = String(row.email).trim().toLowerCase();
        registeredEmails.add(email);
        const metric = metrics.get(email);
        return {
        id: String(row.id), name: String(row.name), email: String(row.email), createdAt: String(row.created_at || ''),
        orderCount: metric?.orderCount || 0, totalSpent: metric?.totalSpent || 0,
      };
      });
      const guests = [...metrics.entries()]
        .filter(([email]) => !registeredEmails.has(email))
        .map(([email, metric]) => ({
          id: `GUEST-${metric.firstOrderId}`, name: metric.name || email, email,
          createdAt: metric.createdAt, orderCount: metric.orderCount, totalSpent: metric.totalSpent,
        }));
      const result = [...registered, ...guests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return res.status(200).json({ success: true, customers: result });
    }
    if (action === 'getOrderImage') {
      const orderId = String(body.orderId || '').trim().toUpperCase();
      const order = await getOrder(orderId);
      if (!order) throw new StoreError('No se encontró el pedido.', 404);
      if (user?.role !== 'admin' && (user?.role !== 'customer' || order.customerId !== user.id)) throw new StoreError('No autorizado.', 403);
      return res.status(200).json({ success: true, image: await getOrderImage(orderId, String(body.itemId || '')) });
    }
    if (action === 'addOrderLog') {
      const admin = requireRole(user, 'admin');
      const entry = await appendOrderLog(String(body.orderId || ''), body.log || {}, `Admin (${admin.email})`);
      return res.status(200).json({ success: true, entry });
    }
    if (action === 'updateOrderStatus' || action === 'updatePaymentStatus') {
      const admin = requireRole(user, 'admin');
      const field = action === 'updateOrderStatus' ? 'status' : 'payment_status';
      await updateOrder(String(body.orderId || ''), field, String(body.value || ''), `Admin (${admin.email})`, typeof body.note === 'string' ? body.note.slice(0, 1000) : undefined);
      return res.status(200).json({ success: true });
    }
    if (action === 'getEmailSettings') {
      requireRole(user, 'admin');
      return res.status(200).json({ success: true, settings: await getEmailSettings() });
    }
    if (action === 'saveEmailSettings') {
      requireRole(user, 'admin');
      if (!body.settings || typeof body.settings !== 'object') throw new StoreError('Configuración no válida.');
      await saveEmailSettings(body.settings);
      return res.status(200).json({ success: true });
    }
    throw new StoreError('Operación no reconocida.', 404);
  } catch (error: any) {
    const status = error instanceof StoreError ? error.statusCode : 500;
    if (status >= 500) console.error('Store API error:', error?.message || error);
    return res.status(status).json({ success: false, message: error?.message || 'Error interno del servidor.' });
  }
}
