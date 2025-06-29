export interface NotificationProvider {
  name: string;
  send(notification: Notification): Promise<void>;  // V4 implementation returns void, not boolean
}

export interface Notification {
  recipients: string[];
  subject: string;
  content: string;
  metadata?: Record<string, any>;
  // v3.24.0 compatibility properties
  type?: string;
  title?: string;
  message?: string;
}

export interface NotificationConfig {
  enabled: boolean;
  providers: string[];
  codeOwnersPath?: string;
  codeOwnersEnabled?: boolean;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
} 
