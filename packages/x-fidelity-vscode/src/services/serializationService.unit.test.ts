/**
 * Tests for SerializationService
 * Verifies safe serialization without object mutation
 */

import { SerializationService } from './serializationService';

describe('SerializationService', () => {
  let service: SerializationService;

  beforeEach(() => {
    service = SerializationService.getInstance();
  });

  describe('Object Mutation Prevention', () => {
    it('should not mutate input objects during serialization', () => {
      const originalObj = {
        name: 'test',
        nested: {
          value: 42
        }
      };

      // Create a deep copy to compare later
      const originalCopy = JSON.parse(JSON.stringify(originalObj));

      // Serialize the object
      const result = service.serialize(originalObj);

      // Verify serialization succeeded
      expect(result.success).toBe(true);

      // Verify the original object was not mutated
      expect(originalObj).toEqual(originalCopy);

      // Verify no _serializationVisited property was added
      expect(originalObj).not.toHaveProperty('_serializationVisited');
      expect(originalObj.nested).not.toHaveProperty('_serializationVisited');
    });

    it('should work with frozen objects', () => {
      const frozenObj = Object.freeze({
        name: 'frozen',
        nested: Object.freeze({
          value: 123
        })
      });

      // This should not throw an error
      expect(() => {
        const result = service.serialize(frozenObj);
        expect(result.success).toBe(true);
      }).not.toThrow();
    });

    it('should work with objects that have non-configurable properties', () => {
      const obj = {};
      Object.defineProperty(obj, 'readOnly', {
        value: 'cannot modify',
        writable: false,
        configurable: false,
        enumerable: true // Make it enumerable so Object.entries() can see it
      });

      const result = service.serialize(obj);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ readOnly: 'cannot modify' });
    });
  });

  describe('Circular Reference Detection', () => {
    it('should detect circular references in objects', () => {
      const obj: any = { name: 'parent' };
      obj.self = obj; // Create circular reference

      const result = service.serialize(obj);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'parent',
        self: '[Circular Reference]'
      });

      // Verify original object was not mutated
      expect(obj).not.toHaveProperty('_serializationVisited');
    });

    it('should detect circular references in arrays', () => {
      const arr: any[] = [1, 2, 3];
      arr.push(arr); // Create circular reference

      const result = service.serialize(arr);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3, '[Circular Reference]']);
    });

    it('should detect circular references in nested structures', () => {
      const parent: any = { name: 'parent' };
      const child: any = { name: 'child', parent };
      parent.child = child; // Create circular reference

      const result = service.serialize(parent);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        name: 'parent',
        child: {
          name: 'child',
          parent: '[Circular Reference]'
        }
      });
    });

    it('should handle Map with circular references', () => {
      const map = new Map();
      map.set('self', map);
      map.set('normal', 'value');

      const result = service.serialize(map);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        self: '[Circular Reference]',
        normal: 'value'
      });
    });

    it('should handle Set with circular references', () => {
      const set = new Set();
      set.add('normal');
      set.add(set);

      const result = service.serialize(set);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(['normal', '[Circular Reference]']);
    });
  });

  describe('Concurrent Serialization', () => {
    it('should allow concurrent serialization of the same object', async () => {
      const obj = {
        name: 'concurrent',
        data: new Array(1000).fill(0).map((_, i) => ({ index: i }))
      };

      // Start multiple serializations concurrently
      const promises = Array.from({ length: 10 }, () =>
        Promise.resolve(service.serialize(obj))
      );

      const results = await Promise.all(promises);

      // All serializations should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toEqual(obj);
      });

      // Original object should not be mutated
      expect(obj).not.toHaveProperty('_serializationVisited');
    });

    it('should allow the same object to be serialized multiple times', () => {
      const obj = { name: 'reusable', value: 42 };

      // Serialize multiple times
      const result1 = service.serialize(obj);
      const result2 = service.serialize(obj);
      const result3 = service.serialize(obj);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result3.success).toBe(true);

      expect(result1.data).toEqual(obj);
      expect(result2.data).toEqual(obj);
      expect(result3.data).toEqual(obj);

      // Original object should not be mutated
      expect(obj).not.toHaveProperty('_serializationVisited');
    });
  });

  describe('Error Handling', () => {
    it('should handle serialization errors gracefully without leaving objects in inconsistent state', () => {
      const problematicObj = {
        normal: 'value'
        // Create a problematic property that will cause an error during Object.entries iteration
      };

      // Add a property that throws when accessed
      Object.defineProperty(problematicObj, 'problematic', {
        get() {
          throw new Error('Property access error');
        },
        enumerable: true
      });

      const result = service.serialize(problematicObj);

      // Since Object.entries() throws when accessing the getter, the whole serialization might fail
      // But we should expect that the object is not left in a mutated state
      if (result.success) {
        expect((result.data as any)?.normal).toBe('value');
        expect((result.data as any)?.problematic).toMatch(
          /\[Serialization Error/
        );
      } else {
        // If serialization fails, we should still not have mutation
        expect(result.error).toBeTruthy();
      }

      // Object should not be left with visited markers
      expect(problematicObj).not.toHaveProperty('_serializationVisited');
    });
  });

  describe('Complex Data Structures', () => {
    it('should serialize complex nested structures without mutation', () => {
      const complex = {
        array: [1, 2, { nested: 'value' }],
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
        date: new Date('2023-01-01'),
        error: new Error('test error'),
        nested: {
          deep: {
            deeper: {
              value: 'deep value'
            }
          }
        }
      };

      const originalCopy = {
        ...complex,
        array: [...complex.array],
        map: new Map(complex.map),
        set: new Set(complex.set),
        date: new Date(complex.date.getTime()),
        error: new Error(complex.error.message),
        nested: JSON.parse(JSON.stringify(complex.nested))
      };

      const result = service.serialize(complex);

      expect(result.success).toBe(true);

      // Verify no mutation occurred
      expect(complex.array).toEqual(originalCopy.array);
      expect(complex.map).toEqual(originalCopy.map);
      expect(complex.set).toEqual(originalCopy.set);
      expect(complex.nested).toEqual(originalCopy.nested);

      // Verify no _serializationVisited properties were added
      expect(complex).not.toHaveProperty('_serializationVisited');
      expect(complex.nested).not.toHaveProperty('_serializationVisited');
      expect(complex.nested.deep).not.toHaveProperty('_serializationVisited');
      expect(complex.nested.deep.deeper).not.toHaveProperty(
        '_serializationVisited'
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined without issues', () => {
      expect(service.serialize(null).success).toBe(true);
      expect(service.serialize(undefined).success).toBe(true);
      expect(service.serialize(null).data).toBe(null);
      expect(service.serialize(undefined).data).toBe(undefined);
    });

    it('should handle primitives without mutation concerns', () => {
      expect(service.serialize('string').data).toBe('string');
      expect(service.serialize(42).data).toBe(42);
      expect(service.serialize(true).data).toBe(true);
      expect(service.serialize(false).data).toBe(false);
    });

    it('should handle empty objects and arrays', () => {
      const emptyObj = {};
      const emptyArr: any[] = [];

      const objResult = service.serialize(emptyObj);
      const arrResult = service.serialize(emptyArr);

      expect(objResult.success).toBe(true);
      expect(arrResult.success).toBe(true);
      expect(objResult.data).toEqual({});
      expect(arrResult.data).toEqual([]);

      // Verify no mutation
      expect(emptyObj).not.toHaveProperty('_serializationVisited');
    });
  });
});
