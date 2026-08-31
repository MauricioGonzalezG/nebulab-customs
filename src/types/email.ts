import { Order } from './index';

export interface EmailSettings {
  enabled: boolean;
  provider: 'gmail' | 'custom_smtp';
  senderEmail: string;
  senderName: string;
  gmailAppPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  adminNotificationEmail: string;
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
