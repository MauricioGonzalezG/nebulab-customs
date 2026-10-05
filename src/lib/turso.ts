import type { Order, EmailSettings, OrderLogEntry } from '../types';

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export interface CustomerWithMetrics extends CustomerUser {
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

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
  adminNotificationEmail: 'admin@nebuladb3d.com.co',
  events: {
    notifyCustomerNewOrder: true,
    notifyAdminNewOrder: true,
    notifyCustomerStatusChange: true,
  },
};

async function callApi<T>(action: string, values: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('/api/store', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ action, ...values }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `Error del servidor (${response.status}).`);
  return data as T;
}

export const tursoService = {
  initDatabase: async (): Promise<void> => { await callApi('session'); },

  getSession: async (): Promise<{ adminUser: { email: string; role: string } | null; customerUser: CustomerUser | null }> => {
    return callApi('session');
  },

  authenticateAdmin: async (email: string, pass: string): Promise<boolean> => {
    try {
      const result = await callApi<{ success: boolean }>('loginAdmin', { email, password: pass });
      return result.success;
    } catch {
      return false;
    }
  },

  registerCustomer: async (name: string, email: string, pass: string): Promise<CustomerUser> => {
    const result = await callApi<{ customer: CustomerUser }>('registerCustomer', { name, email, password: pass });
    return result.customer;
  },

  authenticateCustomer: async (email: string, pass: string): Promise<CustomerUser | null> => {
    try {
      const result = await callApi<{ customer: CustomerUser }>('loginCustomer', { email, password: pass });
      return result.customer;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => { await callApi('logout').catch(() => undefined); },

  getDbStatus: async () => callApi<{ connected: boolean; mode: string; url: string; info: string }>('getDbStatus'),

  getOrders: async (): Promise<Order[]> => {
    const result = await callApi<{ orders: Order[] }>('getOrders');
    return result.orders;
  },

  getOrdersByCustomerEmail: async (_email: string): Promise<Order[]> => {
    const result = await callApi<{ orders: Order[] }>('getOrdersByCustomerEmail');
    return result.orders;
  },

  getOrderById: async (orderId: string): Promise<Order | null> => {
    const result = await callApi<{ order: Order | null }>('getOrderById', { orderId });
    return result.order;
  },

  getOrderImage: async (orderId: string, itemId: string): Promise<{ imageData: string | null; previewData: string | null }> => {
    const result = await callApi<{ image: { imageData: string | null; previewData: string | null } }>('getOrderImage', { orderId, itemId });
    return result.image;
  },

  saveOrder: async (order: Order): Promise<Order> => {
    const result = await callApi<{ order: Order }>('createOrder', { order });
    return result.order;
  },

  getCustomersWithMetrics: async (_existingOrders?: Order[]): Promise<CustomerWithMetrics[]> => {
    const result = await callApi<{ customers: CustomerWithMetrics[] }>('getCustomersWithMetrics');
    return result.customers;
  },

  addOrderLog: async (
    orderId: string,
    log: Omit<OrderLogEntry, 'id' | 'timestamp'> & { id?: string; timestamp?: string }
  ): Promise<OrderLogEntry> => {
    const result = await callApi<{ entry: OrderLogEntry }>('addOrderLog', { orderId, log });
    return result.entry;
  },

  updateOrderStatus: async (orderId: string, status: Order['status'], _actor?: string, note?: string): Promise<void> => {
    await callApi('updateOrderStatus', { orderId, value: status, note });
  },

  updatePaymentStatus: async (orderId: string, paymentStatus: Order['paymentStatus'], _actor?: string, note?: string): Promise<void> => {
    await callApi('updatePaymentStatus', { orderId, value: paymentStatus || 'pending', note });
  },

  getEmailSettings: async (): Promise<EmailSettings> => {
    const result = await callApi<{ settings: Partial<EmailSettings> | null }>('getEmailSettings');
    const saved = result.settings || {};
    return {
      ...DEFAULT_EMAIL_SETTINGS,
      ...saved,
      events: { ...DEFAULT_EMAIL_SETTINGS.events, ...(saved.events || {}) },
    };
  },

  saveEmailSettings: async (settings: EmailSettings): Promise<void> => {
    await callApi('saveEmailSettings', { settings });
  },
};
