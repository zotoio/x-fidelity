/**
 * Centralized serialization service
 * Provides consistent, safe serialization across the entire extension
 */

import * as vscode from 'vscode';
import {
  SerializableValue,
  toSerializableDiagnostic,
  toSerializableRange,
  toSerializableUri,
  toSerializablePosition
} from '../types/serialization';

export interface SerializationOptions {
  stripFunctions?: boolean;
  maxDepth?: number;
  includeMetadata?: boolean;
  errorOnFailure?: boolean;
}

export interface SerializationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    originalType: string;
    serializedAt: number;
    byteSize: number;
  };
}

export class SerializationService {
  private static instance: SerializationService;

  static getInstance(): SerializationService {
    if (!this.instance) {
      this.instance = new SerializationService();
    }
    return this.instance;
  }

  // Register known problematic types and their serializers
  private serializers = new Map<string, (obj: any) => any>([
    ['Range', (range: vscode.Range) => toSerializableRange(range)],
    ['Uri', (uri: vscode.Uri) => toSerializableUri(uri)],
    ['Position', (pos: vscode.Position) => toSerializablePosition(pos)],
    ['Diagnostic', (diag: vscode.Diagnostic) => toSerializableDiagnostic(diag)],
    [
      'Location',
      (loc: vscode.Location) => ({
        uri: toSerializableUri(loc.uri),
        range: toSerializableRange(loc.range)
      })
    ],
    [
      'DiagnosticRelatedInformation',
      (info: vscode.DiagnosticRelatedInformation) => ({
        location: this.serializers.get('Location')!(info.location),
        message: info.message
      })
    ],
    [
      'ThemeIcon',
      (icon: vscode.ThemeIcon) => ({
        id: icon.id,
        color: icon.color
      })
    ],
    [
      'MarkdownString',
      (md: vscode.MarkdownString) => ({
        value: md.value,
        isTrusted: md.isTrusted,
        supportThemeIcons: md.supportThemeIcons
      })
    ]
  ]);

  // Register custom serializer for specific types
  registerSerializer<T>(typeName: string, serializer: (obj: T) => any): void {
    this.serializers.set(typeName, serializer);
  }

  // Get all registered serializers (for debugging)
  getRegisteredSerializers(): string[] {
    return Array.from(this.serializers.keys());
  }

  // Main serialization method
  serialize<T>(
    obj: T,
    options: SerializationOptions = {}
  ): SerializationResult<SerializableValue> {
    const opts: Required<SerializationOptions> = {
      stripFunctions: true,
      maxDepth: 10,
      includeMetadata: true,
      errorOnFailure: false,
      ...options
    };

    // Use WeakSet for proper circular reference detection
    const visited = new WeakSet();

    try {
      const serialized = this.serializeInternal(obj, opts, 0, visited);
      const serializedString = JSON.stringify(serialized);

      const result: SerializationResult<SerializableValue> = {
        success: true,
        data: serialized
      };

      if (opts.includeMetadata) {
        result.metadata = {
          originalType: obj?.constructor?.name || typeof obj,
          serializedAt: Date.now(),
          byteSize: new TextEncoder().encode(serializedString).length
        };
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (opts.errorOnFailure) {
        throw new Error(`Serialization failed: ${errorMessage}`);
      }

      return {
        success: false,
        error: errorMessage,
        metadata: opts.includeMetadata
          ? {
              originalType: obj?.constructor?.name || typeof obj,
              serializedAt: Date.now(),
              byteSize: 0
            }
          : undefined
      };
    }
  }

  // Internal recursive serialization with depth tracking
  private serializeInternal(
    obj: any,
    options: Required<SerializationOptions>,
    depth: number,
    visited: WeakSet<object>
  ): any {
    // Prevent infinite recursion
    if (depth > options.maxDepth) {
      return '[Max Depth Reached]';
    }

    // Handle primitives
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (
      typeof obj === 'string' ||
      typeof obj === 'number' ||
      typeof obj === 'boolean'
    ) {
      return obj;
    }

    // Handle functions
    if (typeof obj === 'function') {
      return options.stripFunctions
        ? undefined
        : `[Function: ${obj.name || 'anonymous'}]`;
    }

    // For objects, check circular references first
    if (typeof obj === 'object' && obj !== null) {
      // Check for circular reference using WeakSet
      if (visited.has(obj)) {
        return '[Circular Reference]';
      }

      // Add to visited set
      visited.add(obj);
    }

    try {
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item =>
          this.serializeInternal(item, options, depth + 1, visited)
        );
      }

      // Handle VSCode objects with registered serializers
      const typeName = obj?.constructor?.name;
      if (typeName && this.serializers.has(typeName)) {
        return this.serializers.get(typeName)!(obj);
      }

      // Handle Map and Set with circular reference protection
      if (obj instanceof Map) {
        return Object.fromEntries(
          Array.from(obj.entries()).map(([key, value]) => [
            this.serializeInternal(key, options, depth + 1, visited),
            this.serializeInternal(value, options, depth + 1, visited)
          ])
        );
      }

      if (obj instanceof Set) {
        return Array.from(obj).map(item =>
          this.serializeInternal(item, options, depth + 1, visited)
        );
      }

      // Handle Buffer
      if (Buffer.isBuffer(obj)) {
        return `[Buffer: ${obj.length} bytes]`;
      }

      // Handle Date
      if (obj instanceof Date) {
        return obj.toISOString();
      }

      // Handle Error
      if (obj instanceof Error) {
        return {
          name: obj.name,
          message: obj.message,
          stack: obj.stack
        };
      }

      // Handle regular objects
      if (typeof obj === 'object') {
        const result: any = {};

        // Only process enumerable own properties
        for (const [key, value] of Object.entries(obj)) {
          try {
            const serializedValue = this.serializeInternal(
              value,
              options,
              depth + 1,
              visited
            );
            if (serializedValue !== undefined) {
              result[key] = serializedValue;
            }
          } catch (error) {
            result[key] =
              `[Serialization Error: ${error instanceof Error ? error.message : String(error)}]`;
          }
        }

        return result;
      }

      // Fallback: convert to string
      return String(obj);
    } finally {
      // Remove from visited set when we're done processing this object
      if (typeof obj === 'object' && obj !== null) {
        visited.delete(obj);
      }
    }
  }

  // Wrap any async operation that might return non-serializable data
  async wrapAsync<T>(
    operation: () => Promise<T>,
    options?: SerializationOptions
  ): Promise<SerializationResult<SerializableValue>> {
    try {
      const result = await operation();
      return this.serialize(result, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Safe webview message creation
  createWebviewMessage(
    command: string,
    data: any,
    options?: SerializationOptions
  ): SerializationResult<any> {
    const serializedData = this.serialize(data, options);

    if (!serializedData.success) {
      return {
        success: false,
        error: `Failed to serialize data for command '${command}': ${serializedData.error}`
      };
    }

    return {
      success: true,
      data: {
        command,
        data: serializedData.data,
        timestamp: Date.now(),
        operationId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }
    };
  }

  // Validate that an object can be safely serialized
  canSerialize(obj: any): boolean {
    try {
      const result = this.serialize(obj, { errorOnFailure: true });
      return result.success;
    } catch {
      return false;
    }
  }

  // Get serialization statistics for debugging
  getSerializationStats(obj: any): {
    canSerialize: boolean;
    estimatedSize: number;
    depth: number;
    problematicPaths: string[];
  } {
    const stats = {
      canSerialize: false,
      estimatedSize: 0,
      depth: 0,
      problematicPaths: [] as string[]
    };

    try {
      const result = this.serialize(obj, { includeMetadata: true });
      stats.canSerialize = result.success;
      stats.estimatedSize = result.metadata?.byteSize || 0;

      // Analyze depth and problematic paths with circular reference protection
      const visited = new WeakSet();
      this.analyzeObject(obj, stats, '', 0, visited);
    } catch (error) {
      stats.problematicPaths.push(
        `root: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return stats;
  }

  private analyzeObject(
    obj: any,
    stats: any,
    path: string,
    depth: number,
    visited: WeakSet<object>
  ): void {
    stats.depth = Math.max(stats.depth, depth);

    if (depth > 20) {
      // Prevent infinite recursion in analysis
      stats.problematicPaths.push(`${path}: Max depth exceeded`);
      return;
    }

    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return;
    }

    // Check for circular references
    if (visited.has(obj)) {
      stats.problematicPaths.push(`${path}: Circular reference detected`);
      return;
    }

    // Add to visited set
    visited.add(obj);

    try {
      // Check if object is problematic
      try {
        JSON.stringify(obj);
      } catch (error) {
        stats.problematicPaths.push(
          `${path}: ${error instanceof Error ? error.message : String(error)}`
        );
        return;
      }

      // Recursively analyze object properties
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          this.analyzeObject(
            item,
            stats,
            `${path}[${index}]`,
            depth + 1,
            visited
          );
        });
      } else {
        for (const [key, value] of Object.entries(obj)) {
          this.analyzeObject(
            value,
            stats,
            path ? `${path}.${key}` : key,
            depth + 1,
            visited
          );
        }
      }
    } finally {
      // Remove from visited set when done
      visited.delete(obj);
    }
  }

  // Create a safe copy of an object that can be serialized
  createSafeCopy<T>(obj: T): T | null {
    const result = this.serialize(obj);
    return result.success ? (result.data as T) : null;
  }

  // Utility method for debugging serialization issues
  debugSerialization(obj: any, label?: string): void {
    const stats = this.getSerializationStats(obj);
    const serializers = this.getRegisteredSerializers();

    console.group(`🔍 Serialization Debug${label ? ` - ${label}` : ''}`);
    console.log('Can serialize:', stats.canSerialize);
    console.log('Estimated size:', `${stats.estimatedSize} bytes`);
    console.log('Max depth:', stats.depth);
    console.log('Registered serializers:', serializers);

    if (stats.problematicPaths.length > 0) {
      console.warn('Problematic paths:', stats.problematicPaths);
    }

    console.groupEnd();
  }
}
