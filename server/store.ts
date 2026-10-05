import { createClient, type Client } from '@libsql/client';
import { randomBytes, scryptSync, createHash, timingSafeEqual } from 'node:crypto';
import type { CartItem, Order, OrderLogEntry, ShippingDetails } from '../src/types';

const SESSION_COOKIE = 'nebulab_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

export class StoreError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
  }
}

const requiredText = (value: unknown, label: string, maxLength: number): string => {
  if (typeof value !== 'string') throw new StoreError(`${label} no es válido.`);
  const clean = value.trim();
  if (!clean || clean.length > maxLength) throw new StoreError(`${label} no es válido.`);
  return clean;
};

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== 'string' || !value) return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export function getDb(): Client {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL || '';
  const authToken = process.env.TURSO_AUTH_TOKEN || '';
  if (!url || !authToken || !/^(libsql|https?):\/\//.test(url)) {
    throw new StoreError('La base de datos del servidor no está configurada.', 503);
  }
  client = createClient({ url, authToken });
  return client;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith('scrypt$')) return safeEqual(password, stored);
  const [, salt, expectedHex] = stored.split('$');
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function safeEqual(left: string, right: string): boolean {
  const a = createHash('sha256').update(left).digest();
  const b = createHash('sha256').update(right).digest();
  return timingSafeEqual(a, b) && left.length === right.length;
}

export async function initializeStore(): Promise<void> {
  schemaReady ??= (async () => {
    const db = getDb();
    await db.execute(`CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY, items_json TEXT NOT NULL, subtotal REAL NOT NULL,
      shipping_fee REAL NOT NULL, total REAL NOT NULL, shipping_details_json TEXT NOT NULL,
      payment_method TEXT NOT NULL, status TEXT NOT NULL, payment_status TEXT NOT NULL DEFAULT 'pending',
      currency TEXT DEFAULT 'COP', payment_details_json TEXT, logs_json TEXT,
      customer_id TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS order_images (
      id TEXT PRIMARY KEY, order_id TEXT NOT NULL, item_id TEXT NOT NULL, item_type TEXT NOT NULL,
      image_data TEXT NOT NULL, preview_data TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, role TEXT NOT NULL, expires_at INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.execute(`CREATE TABLE IF NOT EXISTS email_events (
      order_id TEXT NOT NULL, event TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (order_id, event))`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_order_images_order_id ON order_images(order_id)`);
    try { await db.execute(`ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'COP'`); } catch { /* already present */ }
    try { await db.execute(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending'`); } catch { /* already present */ }
    try { await db.execute(`ALTER TABLE orders ADD COLUMN payment_details_json TEXT`); } catch { /* already present */ }
    try { await db.execute(`ALTER TABLE orders ADD COLUMN logs_json TEXT`); } catch { /* already present */ }
    try { await db.execute(`ALTER TABLE orders ADD COLUMN customer_id TEXT`); } catch { /* already present */ }
    // Legacy accounts and order-to-customer links were created client-side without
    // verified email ownership. Retain orders for admin access, but remove those
    // identities and associations once so they cannot be claimed by email alone.
    const customerMigration = await db.execute({ sql: `SELECT value_json FROM store_settings WHERE key = 'secure_customer_accounts_v1' LIMIT 1` });
    if (!customerMigration.rows.length) {
      await db.execute(`UPDATE orders SET customer_id = NULL`);
      await db.execute(`DELETE FROM sessions WHERE role = 'customer'`);
      await db.execute(`DELETE FROM customers`);
      await db.execute({ sql: `INSERT OR IGNORE INTO store_settings (key, value_json) VALUES ('secure_customer_accounts_v1', 'true')`, args: [] });
    }
    await db.execute({ sql: `DELETE FROM sessions WHERE expires_at < ?`, args: [Math.floor(Date.now() / 1000)] });
  })();
  await schemaReady;
}

export interface SessionUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'customer';
}

const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function readSession(cookieHeader = ''): Promise<SessionUser | null> {
  const token = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  await initializeStore();
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  const result = await db.execute({
    sql: `SELECT user_id, role FROM sessions WHERE token_hash = ? AND expires_at > ? LIMIT 1`,
    args: [tokenHash(decodeURIComponent(token)), now],
  });
  if (!result.rows.length) return null;
  const { user_id: userId, role } = result.rows[0];
  if (String(role) === 'admin') {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    return email ? { id: String(userId), email, role: 'admin' } : null;
  }
  if (String(role) === 'customer') {
    const user = await db.execute({ sql: `SELECT id, name, email FROM customers WHERE id = ? LIMIT 1`, args: [String(userId)] });
    if (!user.rows.length) return null;
    return { id: String(user.rows[0].id), name: String(user.rows[0].name), email: String(user.rows[0].email), role: 'customer' };
  }
  return null;
}

export async function setSession(res: any, user: SessionUser, secure: boolean): Promise<void> {
  await initializeStore();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  await getDb().execute({
    sql: `INSERT INTO sessions (token_hash, user_id, role, expires_at) VALUES (?, ?, ?, ?)`,
    args: [tokenHash(token), user.id, user.role, expiresAt],
  });
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`);
}

export async function clearSession(req: any, res: any): Promise<void> {
  const user = await readSession(String(req.headers?.cookie || ''));
  const token = String(req.headers?.cookie || '').split(';').map((part: string) => part.trim()).find((part: string) => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (token) await getDb().execute({ sql: `DELETE FROM sessions WHERE token_hash = ?`, args: [tokenHash(decodeURIComponent(token))] });
  const secure = req.headers?.['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`);
  void user;
}

export async function authenticateAdmin(email: string, password: string): Promise<boolean> {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || '';
  const expectedPassword = process.env.ADMIN_PASSWORD || '';
  return Boolean(expectedEmail && expectedPassword && safeEqual(email.trim().toLowerCase(), expectedEmail) && safeEqual(password, expectedPassword));
}

export async function authenticateCustomer(email: string, password: string): Promise<SessionUser | null> {
  await initializeStore();
  const result = await getDb().execute({ sql: `SELECT id, name, email, password_hash FROM customers WHERE email = ? LIMIT 1`, args: [email.trim().toLowerCase()] });
  if (!result.rows.length) return null;
  const row = result.rows[0];
  const stored = String(row.password_hash || '');
  if (!verifyPassword(password, stored)) return null;
  if (!stored.startsWith('scrypt$')) {
    await getDb().execute({ sql: `UPDATE customers SET password_hash = ? WHERE id = ?`, args: [hashPassword(password), String(row.id)] });
  }
  return { id: String(row.id), name: String(row.name), email: String(row.email), role: 'customer' };
}

export async function registerCustomer(name: string, email: string, password: string): Promise<SessionUser> {
  const cleanName = requiredText(name, 'Nombre', 120);
  const cleanEmail = requiredText(email, 'Correo', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new StoreError('Ingresa un correo válido.');
  if (password.length < 10 || password.length > 128) throw new StoreError('La contraseña debe tener entre 10 y 128 caracteres.');
  await initializeStore();
  const user: SessionUser = { id: `CUST-${randomBytes(16).toString('hex')}`, name: cleanName, email: cleanEmail, role: 'customer' };
  try {
    await getDb().execute({ sql: `INSERT INTO customers (id, name, email, password_hash) VALUES (?, ?, ?, ?)`, args: [user.id, cleanName, cleanEmail, hashPassword(password)] });
  } catch (error: any) {
    if (String(error?.message || '').includes('UNIQUE')) throw new StoreError('El correo electrónico ya está registrado.', 409);
    throw error;
  }
  return user;
}

function mapOrder(row: any): Order {
  return {
    id: String(row.id), customerId: row.customer_id ? String(row.customer_id) : undefined, items: parseJson<CartItem[]>(row.items_json, []), subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee), total: Number(row.total), currency: (row.currency || 'COP') as Order['currency'],
    shippingDetails: parseJson<ShippingDetails>(row.shipping_details_json, {} as ShippingDetails),
    paymentMethod: String(row.payment_method) as Order['paymentMethod'], status: String(row.status) as Order['status'],
    paymentStatus: (row.payment_status || 'pending') as Order['paymentStatus'],
    paymentDetails: parseJson(row.payment_details_json, undefined), logs: parseJson<OrderLogEntry[]>(row.logs_json, []),
    createdAt: String(row.created_at),
  };
}

export async function getOrder(orderId: string): Promise<Order | null> {
  await initializeStore();
  const result = await getDb().execute({ sql: `SELECT * FROM orders WHERE id = ? LIMIT 1`, args: [orderId.trim().toUpperCase()] });
  return result.rows.length ? mapOrder(result.rows[0]) : null;
}

export async function listOrders(): Promise<Order[]> {
  await initializeStore();
  const result = await getDb().execute(`SELECT * FROM orders ORDER BY created_at DESC`);
  return result.rows.map(mapOrder);
}

const PRICES = {
  shippingUsd: 3.75, freeShippingUsd: 50,
  lithoBaseUsd: 6.25, lithoSizeExtraUsd: 5.5, lithoBaseExtras: { 'night-light': 3.75, 'led-wooden-base': 14, 'flat-stand': 4 } as Record<string, number>, lithoGiftUsd: 3.5,
  clickerUsd: 14.9, keychainUsd: 9.9, clickerSizeExtraUsd: 3,
  collarUsd: 15, plateUsd: 4.25,
};

function priceCartItem(item: CartItem): number {
  const quantity = Number(item.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new StoreError('La cantidad de un producto no es válida.');
  if (item.itemType === 'clicker') {
    const config = item.clickerConfig;
    if (!config || !['clicker', 'keychain'].includes(config.type) || !Number.isFinite(config.size) || config.size < 25 || config.size > 60) throw new StoreError('La configuración del clicker no es válida.');
    return (config.type === 'clicker' ? PRICES.clickerUsd : PRICES.keychainUsd) + (config.size > 40 ? PRICES.clickerSizeExtraUsd : 0);
  }
  if (item.itemType === 'collar') {
    if (!item.collarConfig || !['S', 'M', 'L', 'XL'].includes(item.collarConfig.size)) throw new StoreError('La configuración del collar no es válida.');
    return PRICES.collarUsd;
  }
  if (item.itemType === 'plate') {
    const p = item.plateConfig;
    if (!p || !Number.isFinite(p.width) || !Number.isFinite(p.height) || !Number.isFinite(p.thickness) || !Number.isFinite(p.relief) || p.width < 20 || p.width > 120 || p.height < 15 || p.height > 80 || p.thickness < 2 || p.thickness > 8 || p.relief < 0 || p.relief > 3) throw new StoreError('La configuración de la placa no es válida.');
    const factor = (p.width * p.height * (p.thickness + 0.25 * p.relief)) / (60 * 30 * (3 + 0.25 * 0.8));
    return Number((PRICES.plateUsd * factor).toFixed(2));
  }
  const c = item.config;
  if (!c || !Number.isFinite(c.width) || !Number.isFinite(c.height) || c.width < 20 || c.width > 300 || c.height < 20 || c.height > 300) throw new StoreError('La configuración de la litofanía no es válida.');
  const area = Math.max(0, (c.width * c.height - 120 * 100) / 10000);
  const base = PRICES.lithoBaseUsd + area * PRICES.lithoSizeExtraUsd + (PRICES.lithoBaseExtras[c.baseType] || 0) + (item.giftBox ? PRICES.lithoGiftUsd : 0);
  return Number(base.toFixed(2));
}

function sanitizedOrderItems(items: CartItem[]): { items: CartItem[]; images: { id: string; type: string; original: string; preview: string }[]; subtotal: number } {
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) throw new StoreError('El pedido debe incluir entre 1 y 20 productos.');
  const images: { id: string; type: string; original: string; preview: string }[] = [];
  let totalImageBytes = 0;
  const sanitized = items.map((input) => {
    const item = structuredClone(input);
    const price = priceCartItem(item);
    const serverItemId = `ITEM-${randomBytes(12).toString('hex')}`;
    const previewImage = typeof item.previewImageDataUrl === 'string' && item.previewImageDataUrl.startsWith('data:image/') ? item.previewImageDataUrl : '';
    const originalImage = [item.config?.imageUrl, item.clickerConfig?.imageUrl, item.collarConfig?.imageUrl]
      .find((value): value is string => typeof value === 'string' && value.startsWith('data:image/')) || '';
    totalImageBytes += previewImage.length + originalImage.length;
    if (previewImage || originalImage) {
      images.push({ id: serverItemId, type: item.itemType || 'lithophane', original: originalImage || previewImage, preview: previewImage });
    }
    if (previewImage) item.previewImageDataUrl = '[STORED_IN_TURSO]';
    if (item.config?.imageUrl?.startsWith('data:')) item.config.imageUrl = '[STORED_IN_TURSO]';
    if (item.clickerConfig?.imageUrl?.startsWith('data:')) item.clickerConfig.imageUrl = '[STORED_IN_TURSO]';
    if (item.collarConfig?.imageUrl?.startsWith('data:')) item.collarConfig.imageUrl = '[STORED_IN_TURSO]';
    if (totalImageBytes > 8_000_000) throw new StoreError('Las imágenes del pedido exceden el tamaño permitido.');
    return { ...item, id: serverItemId, price, quantity: Number(item.quantity) };
  });
  const subtotal = sanitized.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return { items: sanitized, images, subtotal: Number(subtotal.toFixed(2)) };
}

export async function createOrder(input: any, customerId?: string): Promise<Order> {
  const displayCurrency = input?.currency === 'COP' || input?.currency === 'USD' ? input.currency : null;
  if (!displayCurrency) throw new StoreError('La moneda seleccionada no es válida.');
  const shippingInput = input?.shippingDetails || {};
  const shippingDetails: ShippingDetails = {
    fullName: requiredText(shippingInput.fullName, 'Nombre', 120),
    email: requiredText(shippingInput.email, 'Correo', 254).toLowerCase(),
    phone: requiredText(shippingInput.phone || '-', 'Teléfono', 40),
    address: requiredText(shippingInput.address, 'Dirección', 240),
    department: typeof shippingInput.department === 'string' ? shippingInput.department.slice(0, 100) : '',
    city: requiredText(shippingInput.city, 'Ciudad', 100),
    postalCode: typeof shippingInput.postalCode === 'string' ? shippingInput.postalCode.slice(0, 20) : '',
    country: 'Colombia',
    notes: typeof shippingInput.notes === 'string' ? shippingInput.notes.slice(0, 1000) : undefined,
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingDetails.email)) throw new StoreError('Ingresa un correo válido.');
  if (!['mercadopago', 'whatsapp'].includes(input?.paymentMethod)) throw new StoreError('El método de pago no es válido.');
  const { items, images, subtotal } = sanitizedOrderItems(input.items);
  const shippingFee = subtotal >= PRICES.freeShippingUsd ? 0 : PRICES.shippingUsd;
  const id = `LITHO-${randomBytes(24).toString('hex').toUpperCase()}`;
  const log: OrderLogEntry = {
    id: `LOG-${randomBytes(12).toString('hex')}`, timestamp: new Date().toISOString(), type: 'system',
    title: 'Pedido registrado', description: 'Pedido creado en el servidor.', actor: 'Checkout',
  };
  const order: Order = {
    id, customerId, items, subtotal, shippingFee, total: Number((subtotal + shippingFee).toFixed(2)), currency: displayCurrency,
    shippingDetails, paymentMethod: input.paymentMethod, status: 'confirmed', paymentStatus: 'pending', logs: [log], createdAt: new Date().toISOString(),
  };
  await initializeStore();
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO orders (id, items_json, subtotal, shipping_fee, total, currency, shipping_details_json, payment_method, status, payment_status, logs_json, customer_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, JSON.stringify(items), order.subtotal, order.shippingFee, order.total, displayCurrency, JSON.stringify(shippingDetails), order.paymentMethod, order.status, order.paymentStatus, JSON.stringify(order.logs), customerId || null, order.createdAt],
  });
  for (const image of images) {
    await db.execute({
      sql: `INSERT INTO order_images (id, order_id, item_id, item_type, image_data, preview_data) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [`${id}_${image.id}`, id, image.id, image.type, image.original, image.preview],
    });
  }
  return order;
}

function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function sendTelegramMessage(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || '';
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim() || '';
  if (!token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
    });
    if (!response.ok) console.error('Telegram notification failed with HTTP status', response.status);
    return response.ok;
  } catch (error: any) {
    console.error('Telegram notification failed:', error?.message || 'network error');
    return false;
  }
}

export async function sendTelegramForOrder(order: Order, kind: 'new_order' | 'payment_approved', paymentId?: string): Promise<boolean> {
  const escape = escapeTelegramHtml;
  const currency = order.currency || 'USD';
  const configuredRate = Number(process.env.COP_EXCHANGE_RATE || '4000');
  const exchangeRate = Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : 4000;
  const displayedTotal = currency === 'COP' ? Math.round(order.total * exchangeRate) : Number(order.total.toFixed(2));
  const formattedTotal = displayedTotal.toLocaleString('es-CO', { maximumFractionDigits: currency === 'COP' ? 0 : 2 });
  const lines = kind === 'payment_approved'
    ? [
        '✅ <b>PAGO APROBADO — Nebulab 3D</b>',
        `🧾 <b>Orden:</b> ${escape(order.id)}`,
        paymentId ? `🔗 <b>Pago MP:</b> ${escape(paymentId)}` : '',
        `💰 <b>Total:</b> ${formattedTotal} ${escape(currency)}`,
        `👤 <b>Cliente:</b> ${escape(order.shippingDetails.fullName)}`,
      ]
    : [
        '💰 <b>NUEVA VENTA — Nebulab 3D</b>',
        `🧾 <b>Orden:</b> ${escape(order.id)}`,
        `💰 <b>Total:</b> ${formattedTotal} ${escape(currency)}`,
        `📦 <b>Productos:</b> ${order.items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0)} · 💳 ${escape(order.paymentMethod)}`,
        `👤 <b>Cliente:</b> ${escape(order.shippingDetails.fullName)}`,
        `📱 <b>Tel:</b> ${escape(order.shippingDetails.phone || '—')} · 📍 ${escape(order.shippingDetails.city || '—')}`,
      ];
  return sendTelegramMessage(lines.filter(Boolean).join('\n'));
}

export async function getOrdersForCustomer(customerId: string): Promise<Order[]> {
  await initializeStore();
  const result = await getDb().execute({ sql: `SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC`, args: [customerId] });
  return result.rows.map(mapOrder);
}

export async function getOrderImage(orderId: string, itemId: string) {
  await initializeStore();
  const result = await getDb().execute({ sql: `SELECT image_data, preview_data FROM order_images WHERE order_id = ? AND item_id = ? LIMIT 1`, args: [orderId, itemId] });
  if (!result.rows.length) return { imageData: null, previewData: null };
  return { imageData: String(result.rows[0].image_data || ''), previewData: String(result.rows[0].preview_data || '') };
}

export async function appendOrderLog(orderId: string, log: Partial<OrderLogEntry>, actor = 'Admin'): Promise<OrderLogEntry> {
  const order = await getOrder(orderId);
  if (!order) throw new StoreError('No se encontró el pedido.', 404);
  const entry: OrderLogEntry = {
    id: `LOG-${randomBytes(12).toString('hex')}`, timestamp: new Date().toISOString(),
    type: (log.type || 'note') as OrderLogEntry['type'], title: requiredText(log.title, 'Título del registro', 200),
    description: typeof log.description === 'string' ? log.description.slice(0, 2000) : undefined,
    actor, metadata: log.metadata,
  };
  const logs = [entry, ...(order.logs || [])].slice(0, 500);
  await getDb().execute({ sql: `UPDATE orders SET logs_json = ? WHERE id = ?`, args: [JSON.stringify(logs), order.id] });
  return entry;
}

export async function updateOrder(orderId: string, field: 'status' | 'payment_status', value: string, actor: string, note?: string): Promise<void> {
  const allowed = field === 'status' ? ['confirmed', 'processing', 'completed', 'cancelled'] : ['pending', 'approved', 'rejected', 'refunded'];
  if (!allowed.includes(value)) throw new StoreError('El estado solicitado no es válido.');
  const order = await getOrder(orderId);
  if (!order) throw new StoreError('No se encontró el pedido.', 404);
  const previous = field === 'status' ? order.status : order.paymentStatus;
  const type: OrderLogEntry['type'] = field === 'status' ? 'status_change' : 'payment_update';
  const title = field === 'status' ? `Estado actualizado a ${value}` : `Estado del pago actualizado a ${value}`;
  await appendOrderLog(orderId, { type, title, description: note || `Estado actualizado de ${previous} a ${value}.` }, actor);
  await getDb().execute({ sql: `UPDATE orders SET ${field} = ? WHERE id = ?`, args: [value, order.id] });
}

export function requireRole(user: SessionUser | null, role: SessionUser['role']): SessionUser {
  if (!user || user.role !== role) throw new StoreError('No autorizado.', 401);
  return user;
}

export function setOrderPaymentState(orderId: string, paymentStatus: string, status: string, paymentDetails: unknown, log: OrderLogEntry): Promise<any> {
  return getDb().execute({
    sql: `UPDATE orders SET payment_status = ?, status = ?, payment_details_json = ?, logs_json = json_insert(COALESCE(logs_json, '[]'), '$[0]', json(?)) WHERE id = ?`,
    args: [paymentStatus, status, JSON.stringify(paymentDetails), JSON.stringify(log), orderId],
  });
}

export async function getEmailSettings(): Promise<any> {
  await initializeStore();
  const result = await getDb().execute({ sql: `SELECT value_json FROM store_settings WHERE key = 'email_settings' LIMIT 1` });
  return result.rows.length ? parseJson(result.rows[0].value_json, {}) : null;
}

export async function saveEmailSettings(settings: unknown): Promise<void> {
  await initializeStore();
  await getDb().execute({
    sql: `INSERT INTO store_settings (key, value_json, updated_at) VALUES ('email_settings', ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`,
    args: [JSON.stringify(settings)],
  });
}

export async function claimEmailEvent(orderId: string, event: string): Promise<boolean> {
  await initializeStore();
  const result = await getDb().execute({
    sql: `INSERT OR IGNORE INTO email_events (order_id, event) VALUES (?, ?)`,
    args: [orderId, event],
  });
  return result.rowsAffected === 1;
}

export function sessionCookieName(): string { return SESSION_COOKIE; }
