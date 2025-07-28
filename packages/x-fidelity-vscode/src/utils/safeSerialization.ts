/**
 * Type-safe serialization utilities with compile-time guarantees
 */

import * as vscode from 'vscode';

// Define serializable types
type SerializablePrimitive = string | number | boolean | null | undefined;
type SerializableObject = {
  [key: string]: Serializable;
};
type SerializableArray = Serializable[];
type Serializable =
  | SerializablePrimitive
  | SerializableObject
  | SerializableArray;

// Type guard to check if a value is serializable
function isSerializable(value: unknown): value is Serializable {
  if (value === null || value === undefined) {
    return true;
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isSerializable);
  }
  if (typeof value === 'object') {
    try {
      // Quick test if object can be serialized
      JSON.stringify(value);
      return Object.values(value as any).every(isSerializable);
    } catch {
      return false;
    }
  }
  return false;
}

// Compile-time type that ensures only serializable objects
type EnsureSerializable<T> = T extends Serializable ? T : never;

// Runtime validation with type narrowing
export function ensureSerializable<T>(value: T): EnsureSerializable<T> {
  if (!isSerializable(value)) {
    throw new Error(
      `Value is not serializable: ${typeof value} - ${JSON.stringify(value, null, 2).slice(0, 100)}...`
    );
  }
  return value as EnsureSerializable<T>;
}

// Safe webview message type
export interface SafeWebviewMessage<T extends Serializable = Serializable> {
  command: string;
  data: T;
  timestamp?: number;
  operationId?: string;
}

// Type-safe webview postMessage wrapper
export class SafeWebview {
  constructor(private webview: vscode.Webview) {}

  postMessage<T extends Serializable>(
    message: SafeWebviewMessage<T>
  ): Thenable<boolean> {
    try {
      // This will fail at compile time if T is not serializable
      const safeMessage = ensureSerializable({
        ...message,
        timestamp: message.timestamp || Date.now(),
        operationId:
          message.operationId ||
          `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });

      // Additional runtime check
      JSON.stringify(safeMessage);

      return this.webview.postMessage(safeMessage);
    } catch (error) {
      console.error('🚨 SafeWebview: Failed to serialize message', {
        command: message.command,
        error: error instanceof Error ? error.message : String(error),
        dataType: typeof message.data
      });

      // Send error message instead
      return this.webview.postMessage({
        command: 'error',
        data: {
          message: 'Serialization failed',
          originalCommand: message.command,
          error: error instanceof Error ? error.message : String(error)
        },
        timestamp: Date.now(),
        operationId: `error-${Date.now()}`
      });
    }
  }

  // Helper method to post simple string messages safely
  postSimpleMessage(command: string, message: string): Thenable<boolean> {
    return this.postMessage({
      command,
      data: { message }
    });
  }

  // Helper method to post error messages
  postError(
    error: Error | string,
    originalCommand?: string
  ): Thenable<boolean> {
    return this.postMessage({
      command: 'error',
      data: {
        message: error instanceof Error ? error.message : error,
        originalCommand: originalCommand || 'unknown'
      }
    });
  }
}

// Export types for use in other modules
export type {
  Serializable,
  SerializableObject,
  SerializableArray,
  SerializablePrimitive
};
