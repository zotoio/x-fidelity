/**
 * Unit tests for path utilities
 */

import { describe, it, expect } from 'vitest';
import {
  deepClone,
  deepEqual,
  getAtPath,
  setAtPath,
  deleteAtPath,
  insertAtPath,
  getParentPath,
  pathToString,
  stringToPath,
  isDescendantPath,
  pathsEqual,
  getNodeType,
} from '../../lib/utils/pathUtils';
import type { RuleDefinition } from '../../types';

describe('pathUtils', () => {
  describe('deepClone', () => {
    it('should clone objects', () => {
      const obj = { a: 1, b: { c: 2 } };
      const cloned = deepClone(obj);
      
      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should clone arrays', () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = deepClone(arr);
      
      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
    });
  });

  describe('deepEqual', () => {
    it('should compare primitives', () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual('a', 'a')).toBe(true);
      expect(deepEqual(1, 2)).toBe(false);
    });

    it('should compare objects', () => {
      expect(deepEqual({ a: 1 }, { a: 1 })).toBe(true);
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it('should compare nested objects', () => {
      const a = { x: { y: { z: 1 } } };
      const b = { x: { y: { z: 1 } } };
      const c = { x: { y: { z: 2 } } };
      
      expect(deepEqual(a, b)).toBe(true);
      expect(deepEqual(a, c)).toBe(false);
    });

    it('should compare arrays', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false);
    });
  });

  describe('getAtPath', () => {
    const obj = {
      a: {
        b: {
          c: 'value',
        },
        arr: [1, 2, { d: 3 }],
      },
    };

    it('should get value at path', () => {
      expect(getAtPath(obj, ['a', 'b', 'c'])).toBe('value');
    });

    it('should get array item at path', () => {
      expect(getAtPath(obj, ['a', 'arr', '0'])).toBe(1);
      expect(getAtPath(obj, ['a', 'arr', '2', 'd'])).toBe(3);
    });

    it('should return object for empty path', () => {
      expect(getAtPath(obj, [])).toBe(obj);
    });

    it('should return undefined for invalid path', () => {
      expect(getAtPath(obj, ['x', 'y'])).toBeUndefined();
    });
  });

  describe('setAtPath', () => {
    it('should set value at path (immutable)', () => {
      const obj = { a: { b: 1 } };
      const result = setAtPath(obj, ['a', 'b'], 2);
      
      expect(result.a.b).toBe(2);
      expect(obj.a.b).toBe(1); // Original unchanged
    });

    it('should set value in array', () => {
      const obj = { arr: [1, 2, 3] };
      const result = setAtPath(obj, ['arr', '1'], 5);
      
      expect(result.arr).toEqual([1, 5, 3]);
    });

    it('should handle empty path', () => {
      const obj = { a: 1 };
      const result = setAtPath(obj, [], { b: 2 });
      
      expect(result).toEqual({ b: 2 });
    });
  });

  describe('deleteAtPath', () => {
    it('should delete property at path (immutable)', () => {
      const obj = { a: { b: 1, c: 2 } };
      const result = deleteAtPath(obj, ['a', 'b']);
      
      expect(result.a).toEqual({ c: 2 });
      expect(obj.a).toEqual({ b: 1, c: 2 }); // Original unchanged
    });

    it('should delete array item and shift', () => {
      const obj = { arr: [1, 2, 3] };
      const result = deleteAtPath(obj, ['arr', '1']);
      
      expect(result.arr).toEqual([1, 3]);
    });
  });

  describe('insertAtPath', () => {
    it('should insert into array', () => {
      const obj = { arr: [1, 3] };
      const result = insertAtPath(obj, ['arr', '1'], 2);
      
      expect(result.arr).toEqual([1, 2, 3]);
    });
  });

  describe('path helpers', () => {
    it('getParentPath should return parent', () => {
      expect(getParentPath(['a', 'b', 'c'])).toEqual(['a', 'b']);
      expect(getParentPath(['a'])).toEqual([]);
    });

    it('pathToString should convert to string', () => {
      expect(pathToString(['a', 'b', 'c'])).toBe('a.b.c');
      expect(pathToString([])).toBe('');
    });

    it('stringToPath should convert to array', () => {
      expect(stringToPath('a.b.c')).toEqual(['a', 'b', 'c']);
      expect(stringToPath('')).toEqual([]);
    });

    it('isDescendantPath should check ancestry', () => {
      expect(isDescendantPath(['a'], ['a', 'b'])).toBe(true);
      expect(isDescendantPath(['a', 'b'], ['a'])).toBe(false);
      expect(isDescendantPath(['a'], ['a'])).toBe(false);
    });

    it('pathsEqual should check equality', () => {
      expect(pathsEqual(['a', 'b'], ['a', 'b'])).toBe(true);
      expect(pathsEqual(['a'], ['a', 'b'])).toBe(false);
    });
  });

  describe('getNodeType', () => {
    const rule: RuleDefinition = {
      name: 'test-rule',
      conditions: {
        all: [
          { fact: 'test', operator: 'equal', value: 1 },
        ],
      },
      event: {
        type: 'warning',
        params: { message: 'test' },
      },
    };

    it('should return rule type for empty path', () => {
      expect(getNodeType(rule, [])).toBe('rule');
    });

    it('should return conditions type', () => {
      expect(getNodeType(rule, ['conditions'])).toBe('conditions');
    });

    it('should return condition-group type', () => {
      expect(getNodeType(rule, ['conditions', 'all'])).toBe('condition-group');
    });

    it('should return condition type', () => {
      expect(getNodeType(rule, ['conditions', 'all', '0'])).toBe('condition');
    });

    it('should return event type', () => {
      expect(getNodeType(rule, ['event'])).toBe('event');
    });
  });
});
