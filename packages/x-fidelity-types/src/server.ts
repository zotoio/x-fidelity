// Server types for X-Fidelity
// Moved from packages/x-fidelity-core/src/types/

import { 
    StartServerParams,
    NotificationProvider,
    Notification
} from './core';

import {
    NotificationConfig,
    EmailProviderConfig,
    SlackProviderConfig,
    TeamsProviderConfig
} from './config';

// Re-export server-related types
export type {
    StartServerParams,
    NotificationConfig,
    NotificationProvider,
    Notification,
    EmailProviderConfig,
    SlackProviderConfig,
    TeamsProviderConfig
};

// Server-specific types
export interface ServerConfig {
    port: number;
    host: string;
    configPath: string;
    jsonTTL: string;
}

export interface ServerOptions {
    port?: number;
    host?: string;
    configPath?: string;
    jsonTTL?: string;
}

// API response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: string;
}

export interface HealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    uptime: number;
    memory: {
        used: number;
        total: number;
    };
    version: string;
}

// Webhook types
export interface WebhookPayload {
    event: string;
    data: any;
    timestamp: string;
}

export interface GitHubWebhookPayload extends WebhookPayload {
    repository: {
        name: string;
        full_name: string;
        clone_url: string;
    };
    ref?: string;
    commits?: any[];
}

 