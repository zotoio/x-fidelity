/**
 * Path manipulation utilities for rule state
 * 
 * Provides functions for navigating and modifying nested rule structures
 * using path arrays like ['conditions', 'all', '0', 'fact'].
 */

import type { RuleDefinition } from '../../types';

/**
 * Deep clone an object using JSON serialization
 * Note: structuredClone doesn't work with immer draft objects,
 * so we use JSON.parse/stringify which handles plain objects better
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Deep equality check for two values
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  
  if (aKeys.length !== bKeys.length) return false;
  
  return aKeys.every((key) => 
    deepEqual(
      (a as Record<string, unknown>)[key],
      (b as Record<string, unknown>)[key]
    )
  );
}

/**
 * Get a value at a given path in an object
 */
export function getAtPath<T = unknown>(obj: unknown, path: string[]): T | undefined {
  if (!obj || path.length === 0) return obj as T;
  
  let current: unknown = obj;
  
  for (const segment of path) {
    if (current === null || current === undefined) return undefined;
    
    if (typeof current !== 'object') return undefined;
    
    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      if (isNaN(index)) return undefined;
      current = current[index];
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }
  
  return current as T;
}

/**
 * Set a value at a given path in an object (immutable)
 * Returns a new object with the value set
 */
export function setAtPath<T extends object>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return value as T;
  
  const result = deepClone(obj);
  let current: unknown = result;
  
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (segment === undefined) continue;
    
    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      current = current[index];
    } else if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    }
  }
  
  const lastSegment = path[path.length - 1];
  if (lastSegment === undefined) return result;
  
  if (Array.isArray(current)) {
    const index = parseInt(lastSegment, 10);
    current[index] = value;
  } else if (current && typeof current === 'object') {
    (current as Record<string, unknown>)[lastSegment] = value;
  }
  
  return result;
}

/**
 * Delete a value at a given path (immutable)
 * For arrays, removes the item and shifts remaining items
 */
export function deleteAtPath<T extends object>(obj: T, path: string[]): T {
  if (path.length === 0) return obj;
  
  const result = deepClone(obj);
  let current: unknown = result;
  
  for (let i = 0; i < path.length - 1; i++) {
    const segment = path[i];
    if (segment === undefined) continue;
    
    if (Array.isArray(current)) {
      const index = parseInt(segment, 10);
      current = current[index];
    } else if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
    }
  }
  
  const lastSegment = path[path.length - 1];
  if (lastSegment === undefined) return result;
  
  if (Array.isArray(current)) {
    const index = parseInt(lastSegment, 10);
    current.splice(index, 1);
  } else if (current && typeof current === 'object') {
    delete (current as Record<string, unknown>)[lastSegment];
  }
  
  return result;
}

/**
 * Insert a value at a given path in an array (immutable)
 * The last segment of the path should be the index to insert at
 */
export function insertAtPath<T extends object>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return obj;
  
  const result = deepClone(obj);
  const parentPath = path.slice(0, -1);
  const parent = getAtPath<unknown[]>(result, parentPath);
  
  if (!Array.isArray(parent)) return result;
  
  const lastSegment = path[path.length - 1];
  if (lastSegment === undefined) return result;
  
  const index = parseInt(lastSegment, 10);
  parent.splice(index, 0, value);
  
  return result;
}

/**
 * Get parent path
 */
export function getParentPath(path: string[]): string[] {
  return path.slice(0, -1);
}

/**
 * Convert path array to string (for display/keys)
 */
export function pathToString(path: string[]): string {
  return path.join('.');
}

/**
 * Convert string path to array
 */
export function stringToPath(pathStr: string): string[] {
  if (!pathStr) return [];
  return pathStr.split('.');
}

/**
 * Check if a path is a descendant of another path
 */
export function isDescendantPath(parentPath: string[], childPath: string[]): boolean {
  if (childPath.length <= parentPath.length) return false;
  return parentPath.every((segment, i) => segment === childPath[i]);
}

/**
 * Check if two paths are equal
 */
export function pathsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((segment, i) => segment === b[i]);
}

/**
 * Determine the type of node at a path in a rule
 */
export type NodeType = 'rule' | 'conditions' | 'condition-group' | 'condition' | 'event' | 'event-param' | 'unknown';

export function getNodeType(rule: RuleDefinition, path: string[]): NodeType {
  if (path.length === 0) return 'rule';
  
  const [first, ...rest] = path;
  
  if (first === 'conditions') {
    if (rest.length === 0) return 'conditions';
    const node = getAtPath(rule.conditions, rest);
    if (node && typeof node === 'object' && ('all' in node || 'any' in node || 'not' in node)) {
      return 'condition-group';
    }
    if (node && typeof node === 'object' && 'fact' in node) {
      return 'condition';
    }
    return 'condition-group';
  }
  
  if (first === 'event') {
    // Root event node
    if (rest.length === 0) return 'event';
    // Event params and their children
    return 'event-param';
  }
  
  return 'unknown';
}

/**
 * Generate a unique ID for a new condition
 */
export function generateConditionId(): string {
  return `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
