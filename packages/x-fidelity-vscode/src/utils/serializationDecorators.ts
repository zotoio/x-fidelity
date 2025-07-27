/**
 * Decorators for automatic safe serialization
 */

import { safeSerializeForVSCode } from './serialization';

// Class decorator that adds toJSON method
export function Serializable<T extends { new (...args: any[]): {} }>(
  constructor: T
) {
  return class extends constructor {
    toJSON() {
      const obj = { ...this } as any;

      // Remove non-serializable properties if they were marked
      if ((this as any)._nonSerializableProps) {
        for (const prop of (this as any)._nonSerializableProps) {
          delete obj[prop];
        }
      }

      return safeSerializeForVSCode(obj);
    }
  };
}

// Property decorator to exclude from serialization
export function NonSerializable(target: any, propertyKey: string) {
  if (!target._nonSerializableProps) {
    target._nonSerializableProps = [];
  }
  target._nonSerializableProps.push(propertyKey);
}

// Method decorator to automatically serialize return values
export function SerializeReturn(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args: any[]) {
    const result = await originalMethod.apply(this, args);
    return safeSerializeForVSCode(result);
  };

  return descriptor;
}

// Property decorator to automatically serialize property values when accessed
export function SerializeProperty(target: any, propertyKey: string) {
  const privateKey = `_${propertyKey}`;

  Object.defineProperty(target, propertyKey, {
    get() {
      return this[privateKey];
    },
    set(value: any) {
      this[privateKey] = safeSerializeForVSCode(value);
    },
    enumerable: true,
    configurable: true
  });
}

// Class decorator that makes all methods return serialized values
export function SerializeAllMethods<T extends { new (...args: any[]): {} }>(
  constructor: T
) {
  return class extends constructor {
    constructor(...args: any[]) {
      super(...args);

      // Get all method names
      const prototype = Object.getPrototypeOf(this);
      const methodNames = Object.getOwnPropertyNames(prototype).filter(
        name => name !== 'constructor' && typeof prototype[name] === 'function'
      );

      // Wrap each method
      for (const methodName of methodNames) {
        const originalMethod = (this as any)[methodName];
        if (typeof originalMethod === 'function') {
          (this as any)[methodName] = async function (...args: any[]) {
            const result = await originalMethod.apply(this, args);
            return safeSerializeForVSCode(result);
          };
        }
      }
    }
  };
}

// Utility function to mark a class as serialization-safe at runtime
export function markAsSerializationSafe(instance: any): void {
  instance._isSerializationSafe = true;
  instance._serializedAt = Date.now();
}

// Check if an object is marked as serialization-safe
export function isSerializationSafe(obj: any): boolean {
  return obj && obj._isSerializationSafe === true;
}

// Example usage and type definitions for documentation
export interface SerializableClass {
  toJSON(): any;
  _nonSerializableProps?: string[];
  _isSerializationSafe?: boolean;
  _serializedAt?: number;
}

/**
 * Example usage:
 *
 * @Serializable
 * class MyClass {
 *   @NonSerializable
 *   private vscodeObject: vscode.Range;
 *
 *   public data: string;
 *
 *   @SerializeReturn
 *   async getData() {
 *     return { data: this.data, range: this.vscodeObject };
 *   }
 * }
 */
