import { Order } from './index';

export interface EmailSettings {
  enabled: boolean;
  provider: 'mailtrap' | 'gmail';
  senderEmail: string;
  senderName: string;
  // Mailtrap Configuration
  mailtrapApiToken?: string;
  // Gmail SMTP Configuration
  gmailAppPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  // Admin Alert Destination
  adminNotificationEmail: string;
  // Event triggers
  events: {
    notifyCustomerNewOrder: boolean;
    notifyAdminNewOrder: boolean;
    notifyCustomerStatusChange: boolean;
  };
}

export type EmailEventType = 'order_created' | 'status_changed' | 'test';

export interface EmailSendRequest {
  type: EmailEventType;
  order?: Order;
  newStatus?: Order['status'];
  previousStatus?: Order['status'];
  testRecipient?: string;
  customSettings?: EmailSettings;
}

export interface EmailSendResult {
  success: boolean;
  message: string;
  sentTo?: string[];
  skipped?: boolean;
  error?: string;
}
