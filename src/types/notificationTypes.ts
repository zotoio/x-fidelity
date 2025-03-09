export interface NotificationProvider {
  name: string;
  send(notification: Notification): Promise<boolean>;
}

export interface Notification {
  recipients: string[];
  subject: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface NotificationConfig {
  enabled: boolean;
  providers: string[];
  codeOwnersPath?: string;
  codeOwnersEnabled?: boolean;
  notifyOnSuccess?: boolean;
  notifyOnFailure?: boolean;
}

export interface CodeOwner {
  path: string;
  owners: string[];
}
