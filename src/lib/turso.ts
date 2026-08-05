import { createClient, Client } from '@libsql/client/web';
import { Order } from '../types';

// Admin credentials configuration
export const DEFAULT_ADMIN_EMAIL = import.meta.env.VITE_ADMIN_DEFAULT_EMAIL || 'admin@nebuladb3d.com.co';
export const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_DEFAULT_PASSWORD || 'Nebulab26*';

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
            puckDiameter: 60,
            puckDepth: 26,
            puckAngle: 45,
            puckArcCoverage: 240,
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
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        shippingDetails: JSON.parse(String(row.shipping_details_json || '{}')),
        paymentMethod: String(row.payment_method) as Order['paymentMethod'],
        status: String(row.status) as Order['status'],
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

  saveOrder: async (order: Order): Promise<void> => {
    // Always sync with localStorage
    const local = seedInitialLocalOrders();
    const updatedLocal = [order, ...local.filter((o) => o.id !== order.id)];
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updatedLocal));

    if (!tursoClient || !isConfigured) return;

    try {
      await tursoClient.execute({
        sql: `
          INSERT INTO orders (id, items_json, subtotal, shipping_fee, total, shipping_details_json, payment_method, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            items_json = excluded.items_json,
            subtotal = excluded.subtotal,
            shipping_fee = excluded.shipping_fee,
            total = excluded.total,
            shipping_details_json = excluded.shipping_details_json,
            payment_method = excluded.payment_method,
            status = excluded.status;
        `,
        args: [
          order.id,
          JSON.stringify(order.items),
          order.subtotal,
          order.shippingFee,
          order.total,
          JSON.stringify(order.shippingDetails),
          order.paymentMethod,
          order.status,
          order.createdAt || new Date().toISOString(),
        ],
      });
    } catch (err) {
      console.error('Error saving order to Turso:', err);
    }
  },

  updateOrderStatus: async (orderId: string, status: Order['status']): Promise<void> => {
    const local = seedInitialLocalOrders();
    const updatedLocal = local.map((o) => (o.id === orderId ? { ...o, status } : o));
    localStorage.setItem(LOCAL_STORAGE_ORDERS_KEY, JSON.stringify(updatedLocal));

    if (!tursoClient || !isConfigured) return;

    try {
      await tursoClient.execute({
        sql: `UPDATE orders SET status = ? WHERE id = ?`,
        args: [status, orderId],
      });
    } catch (err) {
      console.error('Error updating order status in Turso:', err);
    }
  },
};

