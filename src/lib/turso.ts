import { createClient, Client } from '@libsql/client/web';
import { Order, EmailSettings, OrderLogEntry } from '../types';

// Admin credentials configuration
export const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_DEFAULT_EMAIL || 'admin@nebuladb3d.com.co';
export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_DEFAULT_PASSWORD || 'Nebulab26*';

export const DEFAULT_EMAIL_SETTINGS: EmailSettings = {
  enabled: false,
  provider: 'mailtrap',
  senderEmail: 'hello@demomailtrap.co',
  senderName: 'Nebulab Studio 3D',
  mailtrapApiToken: '',
  gmailAppPassword: '',
  smtpHost: 'smtp.gmail.com',
  smtpPort: 465,
  smtpSecure: true,
  adminNotificationEmail: DEFAULT_ADMIN_EMAIL,
  events: {
    notifyCustomerNewOrder: true,
    notifyAdminNewOrder: true,
    notifyCustomerStatusChange: true,
  },
};

const dbUrl = import.meta.env.VITE_TURSO_DATABASE_URL || '';
const dbToken = import.meta.env.VITE_TURSO_AUTH_TOKEN || '';

let tursoClient: Client | null = null;
let isConfigured = false;

if (dbUrl && dbUrl.startsWith('libsql://')) {
  try {
    tursoClient = createClient({
      url: dbUrl,
      authToken: dbToken,
    });
    isConfigured = true;
  } catch (err) {
    console.warn('Turso client initialization failed, fallback to local storage mode:', err);
  }
}

const LOCAL_STORAGE_ORDERS_KEY = 'nebulab_litho_orders_v1';

// Seed sample orders if empty in local storage
const seedInitialLocalOrders = (): Order[] => {
  const existing = localStorage.getItem(LOCAL_STORAGE_ORDERS_KEY);
  if (existing) {
    try {
      return JSON.parse(existing);
    } catch (e) {
      console.error('Error parsing local orders', e);
    }
  }

  const initialOrders: Order[] = [
    {
      id: 'LITHO-849201',
      items: [
        {
          id: 'ITEM-1',
          config: {
            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
            brightness: 10,
            contrast: 25,
            invert: false,
            shape: 'arc',
            resolutionMode: 'hd',
            width: 120,
            height: 100,
            minThickness: 0.8,
            maxThickness: 1.8,
            arcAngle: 60,
            frameWidth: 3,
            baseType: 'night-light',
            material: 'white-pla',
            puckDiameter: 70,
            puckDepth: 25,
            puckAngle: 55,
            puckArcCoverage: 180,
            strutCount: 4,
            showLampPuck: true,
            enableLight: true,
            lightWarmth: 40,
            lightIntensity: 85,
          },
          previewImageDataUrl: '',
          price: 24.9,
          quantity: 1,
          createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        },
      ],
      subtotal: 24.9,
      shippingFee: 4.9,
      total: 29.8,
      shippingDetails: {
        fullName: 'Carlos Mendoza',
        email: 'carlos.mendoza@example.com',
        phone: '+57 300 123 4567',
        address: 'Calle 100 #15-23 Apt 502',
        city: 'Bogotá',
        postalCode: '110111',
        country: 'Colombia',
      },
      paymentMethod: 'whatsapp',
      status: 'confirmed',
      paymentStatus: 'approved',
      logs: [
        {
          id: 'LOG-849201-1',
          timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
          type: 'system',
          title: 'Pedido Registrado',
          description: 'Orden creada por el cliente a través de WhatsApp Checkout.',
          actor: 'Cliente (Carlos Mendoza)',
        },
        {
          id: 'LOG-849201-2',
          timestamp: new Date(Date.now() - 3600000 * 24 * 2 + 1000 * 90).toISOString(),
          type: 'email_sent',
          title: 'Email de Confirmación Enviado',
          description: 'Resumen de compra enviado a carlos.mendoza@example.com',
          actor: 'Sistema de Correos',
        },
        {
          id: 'LOG-849201-3',
          timestamp: new Date(Date.now() - 3600000 * 24 * 1.8).toISOString(),
          type: 'payment_update',
          title: 'Pago Aprobado',
          description: 'Comprobante de transferencia Bancolombia validado.',
          actor: 'Admin (admin@nebuladb3d.com.co)',
        },
        {
          id: 'LOG-849201-4',
          timestamp: new Date(Date.now() - 3600000 * 24 * 1.5).toISOString(),
          type: 'status_change',
          title: 'Estado Actualizado a Confirmado',
          description: 'Orden confirmada y enviada a la cola de preparación 3D.',
          actor: 'Admin (admin@nebuladb3d.com.co)',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    },
    {
      id: 'LITHO-392014',
      items: [
        {
          id: 'ITEM-2',
          config: {
            imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
            brightness: 5,
            contrast: 20,
            invert: false,
            shape: 'flat',
            resolutionMode: 'ultra',
            width: 150,
            height: 120,
            minThickness: 0.8,
            maxThickness: 2.2,
            arcAngle: 0,
            frameWidth: 4,
            baseType: 'led-wooden-base',
            material: 'warm-ivory',
            puckDiameter: 60,
            puckDepth: 25,
            puckAngle: 45,
            puckArcCoverage: 240,
            strutCount: 4,
            showLampPuck: true,
            enableLight: true,
            lightWarmth: 60,
            lightIntensity: 90,
          },
          previewImageDataUrl: '',
          price: 34.5,
          quantity: 1,
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        },
      ],
      subtotal: 34.5,
      shippingFee: 0,
      total: 34.5,
      shippingDetails: {
        fullName: 'María Fernanda Gómez',
        email: 'maria.gomez@example.com',
        phone: '+57 315 987 6543',
        address: 'Carrera 43A #1-50',
        city: 'Medellín',
        postalCode: '050021',
        country: 'Colombia',
      },
      paymentMethod: 'whatsapp',
      status: 'processing',
      paymentStatus: 'approved',
      logs: [
        {
          id: 'LOG-392014-1',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          type: 'system',
          title: 'Pedido Registrado',
          description: 'Orden creada por el cliente a través de WhatsApp Checkout.',
          actor: 'Cliente (María Fernanda Gómez)',
        },
        {
          id: 'LOG-392014-2',
          timestamp: new Date(Date.now() - 3600000 * 4.8).toISOString(),
          type: 'status_change',
          title: 'Estado Actualizado a En Proceso',
          description: 'Impresión de litofanía plana en PLA Marfil iniciada en impresora #3.',
          actor: 'Admin (admin@nebuladb3d.com.co)',
        },
        {
          id: 'LOG-392014-3',
          timestamp: new Date(Date.now() - 3600000 * 4.7).toISOString(),
          type: 'email_sent',
          title: 'Notificación de Estado Enviada',
          description: 'Aviso de producción enviado a maria.gomez@example.com',
          actor: 'Sistema de Correos',
        },
      ],
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
  ];

  localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(initialOrders));
  return initialOrders;
};

const LOCAL_STORAGE_CUSTOMERS_KEY = 'nebulab_litho_customers_v1';

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface CustomerWithMetrics {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

const getLocalCustomers = (): { id: string; name: string; email: string; pass: string; createdAt: string }[] => {
  const existing = localStorage.getItem(LOCAL_STORAGE_CUSTOMERS_KEY);
  if (!existing) return [];
  try {
    return JSON.parse(existing);
  } catch (e) {
    return [];
  }
};

export const tursoService = {
  isConfigured: () => isConfigured,

  getDbStatus: async () => {
    if (!tursoClient || !isConfigured) {
      return {
        connected: false,
        mode: 'LocalStorage (Dev Mode)',
        url: dbUrl || 'No configurado',
        info: 'Para conectar a Turso en producción, agrega VITE_TURSO_DATABASE_URL y VITE_TURSO_AUTH_TOKEN en Vercel.',
      };
    }
    try {
      await tursoClient.execute('SELECT 1');
      return {
        connected: true,
        mode: 'Turso Cloud SQLite',
        url: dbUrl,
        info: 'Conexión activa con base de datos de Turso.',
      };
    } catch (error) {
      return {
        connected: false,
        mode: 'Error de conexión',
        url: dbUrl,
        info: (error as Error).message || 'Error al conectar con Turso.',
      };
    }
  },

  initDatabase: async () => {
    seedInitialLocalOrders();

    if (!tursoClient || !isConfigured) return;

    try {
      // Create admin_users table
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'admin',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create customers table
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS customers (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create orders table
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          items_json TEXT NOT NULL,
          subtotal REAL NOT NULL,
          shipping_fee REAL NOT NULL,
          total REAL NOT NULL,
          shipping_details_json TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          status TEXT NOT NULL,
          payment_status TEXT NOT NULL DEFAULT 'pending',
          currency TEXT DEFAULT 'COP',
          payment_details_json TEXT,
          logs_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Migration for existing tables without payment_status, currency, payment_details_json or logs_json columns
      try {
        await tursoClient.execute(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'pending';`);
      } catch (e) {}
      try {
        await tursoClient.execute(`ALTER TABLE orders ADD COLUMN currency TEXT DEFAULT 'COP';`);
      } catch (e) {}
      try {
        await tursoClient.execute(`ALTER TABLE orders ADD COLUMN payment_details_json TEXT;`);
      } catch (e) {}
      try {
        await tursoClient.execute(`ALTER TABLE orders ADD COLUMN logs_json TEXT;`);
      } catch (e) {}

      // Create order_images table for storing original photos without bloating the main orders list
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS order_images (
          id TEXT PRIMARY KEY,
          order_id TEXT NOT NULL,
          item_id TEXT NOT NULL,
          item_type TEXT NOT NULL,
          image_data TEXT NOT NULL,
          preview_data TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
        );
      `);

      // Create store_settings table for persistent configs (email, gateways, etc.)
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS store_settings (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Seed default admin user
      await tursoClient.execute({
        sql: `
          INSERT INTO admin_users (id, email, password_hash, role)
          VALUES (?, ?, ?, 'admin')
          ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash;
        `,
        args: ['admin-1', DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD],
      });

      // Create indexes for faster queries as orders grow
      await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);`);
      await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);`);
      await tursoClient.execute(`CREATE INDEX IF NOT EXISTS idx_order_images_order_id ON order_images(order_id);`);
    } catch (err) {
      console.error('Error initializing Turso tables:', err);
    }
  },

  authenticateAdmin: async (email: string, pass: string): Promise<boolean> => {
    // Standard verification for default credentials
    if (email.trim().toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() && pass === DEFAULT_ADMIN_PASSWORD) {
      return true;
    }

    if (!tursoClient || !isConfigured) {
      return false;
    }

    try {
      const res = await tursoClient.execute({
        sql: `SELECT * FROM admin_users WHERE email = ? AND password_hash = ? LIMIT 1`,
        args: [email.trim().toLowerCase(), pass],
      });

      return res.rows.length > 0;
    } catch (err) {
      console.error('Authentication query failed:', err);
      return false;
    }
  },

  registerCustomer: async (name: string, email: string, pass: string): Promise<CustomerUser> => {
    const cleanEmail = email.trim().toLowerCase();
    const customerId = `CUST-${Date.now()}`;

    // Always update local storage
    const local = getLocalCustomers();
    if (local.some((c) => c.email === cleanEmail)) {
      throw new Error('El correo electrónico ya está registrado.');
    }
    const newCust = { id: customerId, name: name.trim(), email: cleanEmail, pass, createdAt: new Date().toISOString() };
    localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify([...local, newCust]));

    if (tursoClient && isConfigured) {
      try {
        await tursoClient.execute({
          sql: `INSERT INTO customers (id, name, email, password_hash) VALUES (?, ?, ?, ?)`,
          args: [customerId, name.trim(), cleanEmail, pass],
        });
      } catch (err: any) {
        if (err?.message?.includes('UNIQUE')) {
          throw new Error('El correo electrónico ya está registrado en Turso DB.');
        }
        console.error('Error registering customer in Turso:', err);
      }
    }

    return { id: customerId, name: name.trim(), email: cleanEmail };
  },

  authenticateCustomer: async (email: string, pass: string): Promise<CustomerUser | null> => {
    const cleanEmail = email.trim().toLowerCase();

    // First try Turso
    if (tursoClient && isConfigured) {
      try {
        const res = await tursoClient.execute({
          sql: `SELECT id, name, email FROM customers WHERE email = ? AND password_hash = ? LIMIT 1`,
          args: [cleanEmail, pass],
        });

        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            id: String(row.id),
            name: String(row.name),
            email: String(row.email),
          };
        }
      } catch (err) {
        console.error('Customer auth query failed in Turso:', err);
      }
    }

    // Local fallback
    const local = getLocalCustomers();
    const found = local.find((c) => c.email === cleanEmail && c.pass === pass);
    if (found) {
      return { id: found.id, name: found.name, email: found.email };
    }
    return null;
  },

  createOrGetCustomerFromOrder: async (name: string, email: string, pass?: string): Promise<CustomerUser> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const defaultPass = pass && pass.trim() ? pass.trim() : 'Nebulab123*';

    const local = getLocalCustomers();
    const existingIndex = local.findIndex((c) => c.email === cleanEmail);

    let customerId = `CUST-${Date.now()}`;
    if (existingIndex >= 0) {
      customerId = local[existingIndex].id;
      local[existingIndex].name = cleanName;
      if (pass && pass.trim()) {
        local[existingIndex].pass = pass.trim();
      }
    } else {
      local.push({
        id: customerId,
        name: cleanName,
        email: cleanEmail,
        pass: defaultPass,
        createdAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(LOCAL_STORAGE_CUSTOMERS_KEY, JSON.stringify(local));

    if (tursoClient && isConfigured) {
      try {
        await tursoClient.execute({
          sql: `
            INSERT INTO customers (id, name, email, password_hash)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              name = excluded.name,
              password_hash = CASE WHEN ? != '' THEN ? ELSE customers.password_hash END;
          `,
          args: [customerId, cleanName, cleanEmail, defaultPass, pass || '', pass || ''],
        });
      } catch (err) {
        console.error('Error syncing customer from order in Turso:', err);
      }
    }

    return { id: customerId, name: cleanName, email: cleanEmail };
  },

  getCustomersWithMetrics: async (existingOrders?: Order[]): Promise<CustomerWithMetrics[]> => {
    const allOrders = existingOrders ? existingOrders : await tursoService.getOrders();
    let rawCustomers: { id: string; name: string; email: string; createdAt: string }[] = [];

    if (tursoClient && isConfigured) {
      try {
        const res = await tursoClient.execute(`SELECT id, name, email, created_at FROM customers ORDER BY created_at DESC`);
        rawCustomers = res.rows.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          email: String(row.email),
          createdAt: String(row.created_at || new Date().toISOString()),
        }));
      } catch (err) {
        console.error('Error fetching customers from Turso:', err);
      }
    }

    if (rawCustomers.length === 0) {
      const local = getLocalCustomers();
      rawCustomers = local.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt || new Date().toISOString(),
      }));
    }

    // Calculate metrics per customer from orders
    const metricsMap = new Map<string, { orderCount: number; totalSpent: number }>();

    allOrders.forEach((order) => {
      const email = order.shippingDetails?.email?.trim().toLowerCase();
      if (!email) return;
      const current = metricsMap.get(email) || { orderCount: 0, totalSpent: 0 };
      current.orderCount += 1;
      if (order.status !== 'cancelled') {
        current.totalSpent += order.total;
      }
      metricsMap.set(email, current);
    });

    return rawCustomers.map((c) => {
      const m = metricsMap.get(c.email.toLowerCase()) || { orderCount: 0, totalSpent: 0 };
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt,
        orderCount: m.orderCount,
        totalSpent: m.totalSpent,
      };
    });
  },

  getOrders: async (): Promise<Order[]> => {
    if (!tursoClient || !isConfigured) {
      return seedInitialLocalOrders();
    }

    try {
      const res = await tursoClient.execute(`SELECT * FROM orders ORDER BY created_at DESC`);
      if (res.rows.length === 0) {
        return [];
      }

      return res.rows.map((row) => ({
        id: String(row.id),
        items: JSON.parse(String(row.items_json || '[]')),
        subtotal: Number(row.subtotal),
        shippingFee: Number(row.shipping_fee),
        total: Number(row.total),
        currency: (row.currency ? String(row.currency) : 'COP') as Order['currency'],
        shippingDetails: JSON.parse(String(row.shipping_details_json || '{}')),
        paymentMethod: String(row.payment_method) as Order['paymentMethod'],
        status: String(row.status) as Order['status'],
        paymentStatus: (row.payment_status ? String(row.payment_status) : 'pending') as Order['paymentStatus'],
        paymentDetails: row.payment_details_json ? JSON.parse(String(row.payment_details_json)) : undefined,
        logs: row.logs_json ? JSON.parse(String(row.logs_json)) : [],
        createdAt: String(row.created_at),
      }));
    } catch (err) {
      console.error('Error fetching orders from Turso:', err);
      return seedInitialLocalOrders();
    }
  },

  getOrdersByCustomerEmail: async (email: string): Promise<Order[]> => {
    const allOrders = await tursoService.getOrders();
    const cleanEmail = email.trim().toLowerCase();
    return allOrders.filter((o) => o.shippingDetails?.email?.trim().toLowerCase() === cleanEmail);
  },

  getOrderById: async (orderId: string): Promise<Order | null> => {
    const cleanId = orderId.trim().toUpperCase();
    const allOrders = await tursoService.getOrders();
    return allOrders.find((o) => o.id.trim().toUpperCase() === cleanId) || null;
  },

  getOrderImage: async (orderId: string, itemId: string): Promise<{ imageData: string | null; previewData: string | null }> => {
    // 1. Try fetching from Turso DB first
    if (tursoClient && isConfigured) {
      try {
        const res = await tursoClient.execute({
          sql: `SELECT image_data, preview_data FROM order_images WHERE order_id = ? AND item_id = ? LIMIT 1`,
          args: [orderId, itemId],
        });
        if (res.rows.length > 0) {
          const row = res.rows[0];
          return {
            imageData: row.image_data ? String(row.image_data) : null,
            previewData: row.preview_data ? String(row.preview_data) : null,
          };
        }
      } catch (err) {
        console.error('Error fetching order image from Turso:', err);
      }
    }

    // 2. Try LocalStorage fallback
    try {
      const raw = localStorage.getItem('nebulab_order_images_v1');
      if (raw) {
        const map = JSON.parse(raw);
        const imageObj = map[`${orderId}_${itemId}`] || map[itemId];
        if (imageObj) {
          return {
            imageData: imageObj.imageData || null,
            previewData: imageObj.previewData || null,
          };
        }
      }
    } catch (e) {
      console.error('Error reading order image from localStorage:', e);
    }

    // 3. Fallback to order item config if direct URL exists (e.g. sample image or unstripped item)
    const order = await tursoService.getOrderById(orderId);
    if (order) {
      const item = order.items.find((i) => i.id === itemId);
      if (item) {
        const directUrl =
          (item.itemType === 'collar' ? item.collarConfig?.imageUrl : null) ||
          (item.itemType === 'clicker' ? item.clickerConfig?.imageUrl : null) ||
          item.config?.imageUrl ||
          item.previewImageDataUrl;

        if (directUrl && directUrl !== '[STORED_IN_TURSO]') {
          return {
            imageData: directUrl,
            previewData: item.previewImageDataUrl && item.previewImageDataUrl !== '[STORED_IN_TURSO]' ? item.previewImageDataUrl : null,
          };
        }
      }
    }

    return { imageData: null, previewData: null };
  },

  saveOrder: async (order: Order): Promise<void> => {
    // 1. Process and extract images from items
    const localImagesKey = 'nebulab_order_images_v1';
    let localImagesMap: Record<string, { imageData: string; previewData?: string }> = {};
    try {
      const existingImagesRaw = localStorage.getItem(localImagesKey);
      if (existingImagesRaw) {
        localImagesMap = JSON.parse(existingImagesRaw);
      }
    } catch (e) {
      localImagesMap = {};
    }

    const sanitizedItems = order.items.map((item) => {
      const itemCopy = JSON.parse(JSON.stringify(item));
      const mainImageUrl =
        (item.itemType === 'collar' ? item.collarConfig?.imageUrl : null) ||
        (item.itemType === 'clicker' ? item.clickerConfig?.imageUrl : null) ||
        item.config?.imageUrl ||
        item.previewImageDataUrl ||
        '';

      const previewUrl = item.previewImageDataUrl || '';
      const imageKey = `${order.id}_${item.id}`;

      // Store original image in LocalStorage images map
      if (mainImageUrl) {
        localImagesMap[imageKey] = {
          imageData: mainImageUrl,
          previewData: previewUrl,
        };
      }

      // Store original image in Turso order_images table if configured
      if (tursoClient && isConfigured && mainImageUrl) {
        const itemType = item.itemType || 'lithophane';
        tursoClient
          .execute({
            sql: `
              INSERT INTO order_images (id, order_id, item_id, item_type, image_data, preview_data)
              VALUES (?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                image_data = excluded.image_data,
                preview_data = excluded.preview_data;
            `,
            args: [imageKey, order.id, item.id, itemType, mainImageUrl, previewUrl],
          })
          .catch((err) => console.error('Error storing item image in Turso order_images:', err));
      }

      // Sanitize heavy base64 strings in items_json so getOrders() stays super lightweight!
      if (itemCopy.config?.imageUrl && itemCopy.config.imageUrl.startsWith('data:')) {
        itemCopy.config.imageUrl = '[STORED_IN_TURSO]';
      }
      if (itemCopy.clickerConfig?.imageUrl && itemCopy.clickerConfig.imageUrl.startsWith('data:')) {
        itemCopy.clickerConfig.imageUrl = '[STORED_IN_TURSO]';
      }
      if (itemCopy.collarConfig?.imageUrl && itemCopy.collarConfig.imageUrl.startsWith('data:')) {
        itemCopy.collarConfig.imageUrl = '[STORED_IN_TURSO]';
      }
      if (itemCopy.previewImageDataUrl && itemCopy.previewImageDataUrl.startsWith('data:')) {
        itemCopy.previewImageDataUrl = '[STORED_IN_TURSO]';
      }

      return itemCopy;
    });

    try {
      localStorage.setItem(localImagesKey, JSON.stringify(localImagesMap));
    } catch (e) {
      console.warn('LocalStorage quota limit reached when saving image fallback:', e);
    }

    // Sanitize order copy for local storage orders list
    const sanitizedOrder: Order = {
      ...order,
      items: sanitizedItems,
    };

    // Always sync order metadata with localStorage
    const local = seedInitialLocalOrders();
    const updatedLocal = [sanitizedOrder, ...local.filter((o) => o.id !== sanitizedOrder.id)];
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updatedLocal));

    if (!tursoClient || !isConfigured) return;

    try {
      await tursoClient.execute({
        sql: `
          INSERT INTO orders (id, items_json, subtotal, shipping_fee, total, currency, shipping_details_json, payment_method, status, payment_status, payment_details_json, logs_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            items_json = excluded.items_json,
            subtotal = excluded.subtotal,
            shipping_fee = excluded.shipping_fee,
            total = excluded.total,
            currency = excluded.currency,
            shipping_details_json = excluded.shipping_details_json,
            payment_method = excluded.payment_method,
            status = excluded.status,
            payment_status = excluded.payment_status,
            payment_details_json = excluded.payment_details_json,
            logs_json = excluded.logs_json;
        `,
        args: [
          sanitizedOrder.id,
          JSON.stringify(sanitizedOrder.items),
          sanitizedOrder.subtotal,
          sanitizedOrder.shippingFee,
          sanitizedOrder.total,
          sanitizedOrder.currency || 'COP',
          JSON.stringify(sanitizedOrder.shippingDetails),
          sanitizedOrder.paymentMethod,
          sanitizedOrder.status,
          sanitizedOrder.paymentStatus || 'pending',
          sanitizedOrder.paymentDetails ? JSON.stringify(sanitizedOrder.paymentDetails) : null,
          JSON.stringify(sanitizedOrder.logs || []),
          sanitizedOrder.createdAt || new Date().toISOString(),
        ],
      });
    } catch (err) {
      console.error('Error saving order to Turso:', err);
    }
  },

  addOrderLog: async (
    orderId: string,
    log: Omit<OrderLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<OrderLogEntry> => {
    const newEntry: OrderLogEntry = {
      id: log.id || `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: log.timestamp || new Date().toISOString(),
      type: log.type,
      title: log.title,
      description: log.description,
      actor: log.actor || 'Sistema',
      metadata: log.metadata,
    };

    // Update LocalStorage
    const local = seedInitialLocalOrders();
    const orderIndex = local.findIndex((o) => o.id === orderId);
    if (orderIndex >= 0) {
      const existingLogs = local[orderIndex].logs || [];
      local[orderIndex].logs = [newEntry, ...existingLogs];
      localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(local));
    }

    // Update Turso DB
    if (tursoClient && isConfigured) {
      try {
        const res = await tursoClient.execute({
          sql: `SELECT logs_json FROM orders WHERE id = ? LIMIT 1`,
          args: [orderId],
        });
        if (res.rows.length > 0) {
          let currentLogs: OrderLogEntry[] = [];
          if (res.rows[0].logs_json) {
            try {
              currentLogs = JSON.parse(String(res.rows[0].logs_json));
            } catch (e) {}
          }
          const updatedLogs = [newEntry, ...currentLogs];
          await tursoClient.execute({
            sql: `UPDATE orders SET logs_json = ? WHERE id = ?`,
            args: [JSON.stringify(updatedLogs), orderId],
          });
        }
      } catch (err) {
        console.error('Error adding order log in Turso:', err);
      }
    }

    return newEntry;
  },

  updateOrderStatus: async (
    orderId: string,
    status: Order['status'],
    actor: string = 'Admin',
    note?: string
  ): Promise<void> => {
    const local = seedInitialLocalOrders();
    const existing = local.find((o) => o.id === orderId);
    const prevStatus = existing?.status;

    const logEntry: OrderLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'status_change',
      title: `Estado actualizado a "${status.toUpperCase()}"`,
      description: note || `Estado del pedido modificado de "${prevStatus || 'N/A'}" a "${status}".`,
      actor,
    };

    const updatedLocal = local.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          status,
          logs: [logEntry, ...(o.logs || [])],
        };
      }
      return o;
    });
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updatedLocal));

    if (!tursoClient || !isConfigured) return;

    try {
      const res = await tursoClient.execute({
        sql: `SELECT logs_json FROM orders WHERE id = ? LIMIT 1`,
        args: [orderId],
      });
      let currentLogs: OrderLogEntry[] = [];
      if (res.rows.length > 0 && res.rows[0].logs_json) {
        try {
          currentLogs = JSON.parse(String(res.rows[0].logs_json));
        } catch (e) {}
      }
      const newLogsJson = JSON.stringify([logEntry, ...currentLogs]);

      await tursoClient.execute({
        sql: `UPDATE orders SET status = ?, logs_json = ? WHERE id = ?`,
        args: [status, newLogsJson, orderId],
      });
    } catch (err) {
      console.error('Error updating order status in Turso:', err);
    }
  },

  updatePaymentStatus: async (
    orderId: string,
    paymentStatus: Order['paymentStatus'],
    actor: string = 'Admin',
    note?: string
  ): Promise<void> => {
    const local = seedInitialLocalOrders();
    const existing = local.find((o) => o.id === orderId);
    const prevPay = existing?.paymentStatus;

    const logEntry: OrderLogEntry = {
      id: `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: 'payment_update',
      title: `Estado de pago: "${(paymentStatus || 'pending').toUpperCase()}"`,
      description: note || `Estado de pago modificado de "${prevPay || 'pending'}" a "${paymentStatus}".`,
      actor,
    };

    const updatedLocal = local.map((o) => {
      if (o.id === orderId) {
        return {
          ...o,
          paymentStatus,
          logs: [logEntry, ...(o.logs || [])],
        };
      }
      return o;
    });
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updatedLocal));

    if (!tursoClient || !isConfigured) return;

    try {
      const res = await tursoClient.execute({
        sql: `SELECT logs_json FROM orders WHERE id = ? LIMIT 1`,
        args: [orderId],
      });
      let currentLogs: OrderLogEntry[] = [];
      if (res.rows.length > 0 && res.rows[0].logs_json) {
        try {
          currentLogs = JSON.parse(String(res.rows[0].logs_json));
        } catch (e) {}
      }
      const newLogsJson = JSON.stringify([logEntry, ...currentLogs]);

      await tursoClient.execute({
        sql: `UPDATE orders SET payment_status = ?, logs_json = ? WHERE id = ?`,
        args: [paymentStatus || 'pending', newLogsJson, orderId],
      });
    } catch (err) {
      console.error('Error updating payment status in Turso:', err);
    }
  },

  getEmailSettings: async (): Promise<EmailSettings> => {
    const LOCAL_EMAIL_SETTINGS_KEY = 'nebulab_email_settings_v1';
    let localSettings: EmailSettings = { ...DEFAULT_EMAIL_SETTINGS };
    const rawLocal = localStorage.getItem(LOCAL_EMAIL_SETTINGS_KEY);
    if (rawLocal) {
      try {
        localSettings = { ...DEFAULT_EMAIL_SETTINGS, ...JSON.parse(rawLocal) };
      } catch (e) {
        console.error('Error parsing local email settings', e);
      }
    }

    if (!tursoClient || !isConfigured) {
      return localSettings;
    }

    try {
      const res = await tursoClient.execute({
        sql: `SELECT value_json FROM store_settings WHERE key = 'email_settings' LIMIT 1`,
        args: [],
      });
      if (res.rows.length > 0) {
        const parsed = JSON.parse(String(res.rows[0].value_json));
        const merged: EmailSettings = {
          ...DEFAULT_EMAIL_SETTINGS,
          ...parsed,
          events: {
            ...DEFAULT_EMAIL_SETTINGS.events,
            ...(parsed.events || {}),
          },
        };
        localStorage.setItem(LOCAL_EMAIL_SETTINGS_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch (err) {
      console.error('Error fetching email settings from Turso:', err);
    }

    return localSettings;
  },

  saveEmailSettings: async (settings: EmailSettings): Promise<void> => {
    const LOCAL_EMAIL_SETTINGS_KEY = 'nebulab_email_settings_v1';
    localStorage.setItem(LOCAL_EMAIL_SETTINGS_KEY, JSON.stringify(settings));

    if (!tursoClient || !isConfigured) return;

    try {
      await tursoClient.execute({
        sql: `
          INSERT INTO store_settings (key, value_json, updated_at)
          VALUES ('email_settings', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = CURRENT_TIMESTAMP;
        `,
        args: [JSON.stringify(settings)],
      });
    } catch (err) {
      console.error('Error saving email settings in Turso:', err);
      throw err;
    }
  },
};

