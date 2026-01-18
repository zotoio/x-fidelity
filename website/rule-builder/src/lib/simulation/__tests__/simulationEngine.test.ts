/**
 * Simulation Engine Tests
 *
 * Tests for the SimulationEngine class including:
 * - Initialization
 * - Rule simulation
 * - Condition evaluation
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  evaluateCondition,
  evaluateConditions,
  areConditionsMet,
  createFactAlmanac,
  getValueAtPath,
  collectFactsUsed,
} from '../index';
import type { RuleCondition, NestedCondition } from '../../../types';
import type { BrowserAlmanac, BrowserPluginRegistry, FixtureData } from '../../plugins/types';

// Mock fixture data
const mockFixtureData: FixtureData = {
  files: new Map([
    ['src/App.tsx', 'export function App() { return <div>Hello</div>; }'],
    ['src/index.ts', 'import { App } from "./App"; export default App;'],
    ['package.json', '{"name": "test", "version": "1.0.0"}'],
  ]),
  packageJson: { name: 'test', version: '1.0.0' },
  fileList: ['src/App.tsx', 'src/index.ts', 'package.json'],
};

// Mock almanac
function createMockAlmanac(fileData: { fileName: string; content: string }): BrowserAlmanac {
  const runtimeFacts = new Map<string, unknown>();
  
  return {
    _runtimeFacts: runtimeFacts,
    _currentFileData: {
      fileName: fileData.fileName,
      filePath: `src/${fileData.fileName}`,
      fileContent: fileData.content,
      content: fileData.content,
      relativePath: `src/${fileData.fileName}`,
    },
    _fixtureData: mockFixtureData,
    factValue: async <T>(factName: string): Promise<T> => {
      if (factName === 'fileData') {
        return {
          fileName: fileData.fileName,
          filePath: `src/${fileData.fileName}`,
          fileContent: fileData.content,
        } as T;
      }
      return runtimeFacts.get(factName) as T;
    },
    addRuntimeFact: (name: string, value: unknown) => {
      runtimeFacts.set(name, value);
    },
  };
}

// Mock registry
function createMockRegistry(): BrowserPluginRegistry {
  const facts = new Map();
  const operators = new Map();
  
  // Add fileData fact
  facts.set('fileData', {
    name: 'fileData',
    description: 'File data fact',
    calculate: async (_params: unknown, almanac: BrowserAlmanac) => {
      return almanac._currentFileData;
    },
  });
  
  // Add a custom operator
  operators.set('customOp', {
    name: 'customOp',
    evaluate: (a: unknown, b: unknown) => a === b,
  });
  
  return {
    plugins: new Map(),
    facts,
    operators,
    registerPlugin: vi.fn(),
    getPlugin: vi.fn(),
    getFact: (name: string) => facts.get(name),
    getOperator: (name: string) => operators.get(name),
    initializeAll: vi.fn().mockResolvedValue(undefined),
  };
}

describe('SimulationEngine', () => {
  describe('getValueAtPath', () => {
    it('should return the object itself when path is undefined', () => {
      const obj = { a: 1, b: 2 };
      expect(getValueAtPath(obj, undefined)).toEqual(obj);
    });

    it('should return the object itself when path is empty', () => {
      const obj = { a: 1, b: 2 };
      expect(getValueAtPath(obj, '')).toEqual(obj);
    });

    it('should return value at simple path', () => {
      const obj = { a: 1, b: { c: 2 } };
      expect(getValueAtPath(obj, '$.b.c')).toBe(2);
    });

    it('should return value at array path', () => {
      const obj = { items: [{ name: 'first' }, { name: 'second' }] };
      expect(getValueAtPath(obj, '$.items[0].name')).toBe('first');
    });

    it('should return undefined for invalid path', () => {
      const obj = { a: 1 };
      expect(getValueAtPath(obj, '$.b.c.d')).toBeUndefined();
    });

    it('should handle path without $ prefix', () => {
      const obj = { a: { b: 3 } };
      expect(getValueAtPath(obj, 'a.b')).toBe(3);
    });
  });

  describe('collectFactsUsed', () => {
    it('should collect facts from single condition', () => {
      const condition: RuleCondition = {
        fact: 'fileData',
        operator: 'equal',
        value: 'test',
      };
      
      const facts = collectFactsUsed(condition);
      expect(facts.has('fileData')).toBe(true);
      expect(facts.size).toBe(1);
    });

    it('should collect facts from nested conditions', () => {
      const conditions: NestedCondition = {
        all: [
          { fact: 'fileData', operator: 'equal', value: 'test' },
          { fact: 'functionComplexity', operator: 'greaterThan', value: 10 },
          {
            any: [
              { fact: 'repoDependencies', operator: 'contains', value: 'react' },
            ],
          },
        ],
      };
      
      const facts = collectFactsUsed(conditions);
      expect(facts.has('fileData')).toBe(true);
      expect(facts.has('functionComplexity')).toBe(true);
      expect(facts.has('repoDependencies')).toBe(true);
      expect(facts.size).toBe(3);
    });

    it('should handle not conditions', () => {
      const conditions: NestedCondition = {
        not: { fact: 'fileData', operator: 'equal', value: 'skip' },
      };
      
      const facts = collectFactsUsed(conditions);
      expect(facts.has('fileData')).toBe(true);
    });

    it('should handle empty conditions', () => {
      const facts = collectFactsUsed({});
      expect(facts.size).toBe(0);
    });

    it('should handle null/undefined', () => {
      expect(collectFactsUsed(null).size).toBe(0);
      expect(collectFactsUsed(undefined).size).toBe(0);
    });
  });

  describe('evaluateCondition', () => {
    let almanac: BrowserAlmanac;
    let registry: BrowserPluginRegistry;

    beforeEach(() => {
      almanac = createMockAlmanac({ fileName: 'App.tsx', content: 'test content' });
      registry = createMockRegistry();
    });

    it('should evaluate equal operator correctly', async () => {
      const condition: RuleCondition = {
        fact: 'fileData',
        operator: 'equal',
        value: 'App.tsx',
        path: '$.fileName',
      };

      const result = await evaluateCondition(
        condition,
        ['conditions', 'all', '0'],
        almanac,
        registry
      );

      expect(result.result).toBe(true);
      expect(result.factName).toBe('fileData');
      expect(result.operator).toBe('equal');
    });

    it('should evaluate notEqual operator correctly', async () => {
      const condition: RuleCondition = {
        fact: 'fileData',
        operator: 'notEqual',
        value: 'REPO_GLOBAL_CHECK',
        path: '$.fileName',
      };

      const result = await evaluateCondition(
        condition,
        ['conditions', 'all', '0'],
        almanac,
        registry
      );

      expect(result.result).toBe(true);
    });

    it('should handle unknown fact gracefully', async () => {
      const condition: RuleCondition = {
        fact: 'unknownFact',
        operator: 'equal',
        value: 'test',
      };

      const result = await evaluateCondition(
        condition,
        ['conditions', 'all', '0'],
        almanac,
        registry
      );

      expect(result.result).toBe(false);
      expect(result.error).toContain('Unknown fact');
    });

    it('should handle unknown operator gracefully', async () => {
      const condition: RuleCondition = {
        fact: 'fileData',
        operator: 'unknownOperator',
        value: 'test',
      };

      const result = await evaluateCondition(
        condition,
        ['conditions', 'all', '0'],
        almanac,
        registry
      );

      expect(result.result).toBe(false);
      expect(result.error).toContain('Unknown operator');
    });

    it('should use custom operator from registry', async () => {
      const condition: RuleCondition = {
        fact: 'fileData',
        operator: 'customOp',
        value: 'App.tsx',
        path: '$.fileName',
      };

      const result = await evaluateCondition(
        condition,
        ['conditions', 'all', '0'],
        almanac,
        registry
      );

      expect(result.result).toBe(true);
    });

    it('should include duration in result', async () => {
      const condition: RuleCondition = {
        fact: 'fileData',
        operator: 'equal',
        value: 'test',
      };

      const result = await evaluateCondition(
        condition,
        ['conditions', 'all', '0'],
        almanac,
        registry
      );

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('evaluateConditions', () => {
    let almanac: BrowserAlmanac;
    let registry: BrowserPluginRegistry;

    beforeEach(() => {
      almanac = createMockAlmanac({ fileName: 'App.tsx', content: 'test content' });
      registry = createMockRegistry();
    });

    it('should evaluate all conditions in "all" group', async () => {
      const conditions: NestedCondition = {
        all: [
          { fact: 'fileData', operator: 'notEqual', value: 'REPO_GLOBAL_CHECK', path: '$.fileName' },
          { fact: 'fileData', operator: 'equal', value: 'App.tsx', path: '$.fileName' },
        ],
      };

      const results = await evaluateConditions(
        conditions,
        ['conditions'],
        almanac,
        registry
      );

      expect(results.length).toBe(2);
      expect(results.every(r => r.result)).toBe(true);
    });

    it('should evaluate all conditions in "any" group', async () => {
      const conditions: NestedCondition = {
        any: [
          { fact: 'fileData', operator: 'equal', value: 'wrongFile', path: '$.fileName' },
          { fact: 'fileData', operator: 'equal', value: 'App.tsx', path: '$.fileName' },
        ],
      };

      const results = await evaluateConditions(
        conditions,
        ['conditions'],
        almanac,
        registry
      );

      expect(results.length).toBe(2);
      expect(results.some(r => r.result)).toBe(true);
    });

    it('should invert result for "not" condition', async () => {
      const conditions: NestedCondition = {
        not: { fact: 'fileData', operator: 'equal', value: 'REPO_GLOBAL_CHECK', path: '$.fileName' },
      };

      const results = await evaluateConditions(
        conditions,
        ['conditions'],
        almanac,
        registry
      );

      expect(results.length).toBe(1);
      expect(results[0]?.result).toBe(true); // inverted from false
    });

    it('should handle nested condition groups', async () => {
      const conditions: NestedCondition = {
        all: [
          { fact: 'fileData', operator: 'notEqual', value: 'REPO_GLOBAL_CHECK', path: '$.fileName' },
          {
            any: [
              { fact: 'fileData', operator: 'equal', value: 'wrongFile', path: '$.fileName' },
              { fact: 'fileData', operator: 'equal', value: 'App.tsx', path: '$.fileName' },
            ],
          },
        ],
      };

      const results = await evaluateConditions(
        conditions,
        ['conditions'],
        almanac,
        registry
      );

      expect(results.length).toBe(3);
    });
  });

  describe('areConditionsMet', () => {
    it('should return true for all passing "all" conditions', () => {
      const conditions: NestedCondition = {
        all: [
          { fact: 'a', operator: 'equal', value: true },
          { fact: 'b', operator: 'equal', value: true },
        ],
      };

      const results = [
        { path: ['conditions', 'all', '0'], factName: 'a', operator: 'equal', compareValue: true, result: true, factValue: true },
        { path: ['conditions', 'all', '1'], factName: 'b', operator: 'equal', compareValue: true, result: true, factValue: true },
      ];

      expect(areConditionsMet(conditions, results)).toBe(true);
    });

    it('should return false if any "all" condition fails', () => {
      const conditions: NestedCondition = {
        all: [
          { fact: 'a', operator: 'equal', value: true },
          { fact: 'b', operator: 'equal', value: true },
        ],
      };

      const results = [
        { path: ['conditions', 'all', '0'], factName: 'a', operator: 'equal', compareValue: true, result: true, factValue: true },
        { path: ['conditions', 'all', '1'], factName: 'b', operator: 'equal', compareValue: true, result: false, factValue: false },
      ];

      expect(areConditionsMet(conditions, results)).toBe(false);
    });

    it('should return true if any "any" condition passes', () => {
      const conditions: NestedCondition = {
        any: [
          { fact: 'a', operator: 'equal', value: true },
          { fact: 'b', operator: 'equal', value: true },
        ],
      };

      const results = [
        { path: ['conditions', 'any', '0'], factName: 'a', operator: 'equal', compareValue: true, result: false, factValue: false },
        { path: ['conditions', 'any', '1'], factName: 'b', operator: 'equal', compareValue: true, result: true, factValue: true },
      ];

      expect(areConditionsMet(conditions, results)).toBe(true);
    });

    it('should return false if all "any" conditions fail', () => {
      const conditions: NestedCondition = {
        any: [
          { fact: 'a', operator: 'equal', value: true },
          { fact: 'b', operator: 'equal', value: true },
        ],
      };

      const results = [
        { path: ['conditions', 'any', '0'], factName: 'a', operator: 'equal', compareValue: true, result: false, factValue: false },
        { path: ['conditions', 'any', '1'], factName: 'b', operator: 'equal', compareValue: true, result: false, factValue: false },
      ];

      expect(areConditionsMet(conditions, results)).toBe(false);
    });
  });

  describe('createFactAlmanac', () => {
    it('should create almanac with file data', () => {
      const almanac = createFactAlmanac(mockFixtureData, 'src/App.tsx');
      
      expect(almanac._currentFileData).toBeDefined();
      expect(almanac._currentFileData?.fileName).toBe('App.tsx');
      expect(almanac._currentFileData?.filePath).toBe('src/App.tsx');
    });

    it('should include fixture data reference', () => {
      const almanac = createFactAlmanac(mockFixtureData, 'src/App.tsx');
      
      expect(almanac._fixtureData).toBeDefined();
    });

    it('should handle missing file gracefully', () => {
      const almanac = createFactAlmanac(mockFixtureData, 'nonexistent.ts');
      
      expect(almanac._currentFileData).toBeDefined();
      expect(almanac._currentFileData?.fileContent).toBe('');
    });
  });
});

describe('Standard Operators', () => {
  let almanac: BrowserAlmanac;
  let registry: BrowserPluginRegistry;

  beforeEach(() => {
    almanac = createMockAlmanac({ fileName: 'test.ts', content: 'test content' });
    registry = createMockRegistry();
    // Add a simple fact for testing
    registry.facts.set('testValue', {
      name: 'testValue',
      calculate: async () => 5,
    });
  });

  it('should handle lessThan operator', async () => {
    almanac.addRuntimeFact('testValue', 5);
    
    const result = await evaluateCondition(
      { fact: 'testValue', operator: 'lessThan', value: 10 },
      ['test'],
      almanac,
      registry
    );
    
    expect(result.result).toBe(true);
  });

  it('should handle greaterThan operator', async () => {
    almanac.addRuntimeFact('testValue', 15);
    
    const result = await evaluateCondition(
      { fact: 'testValue', operator: 'greaterThan', value: 10 },
      ['test'],
      almanac,
      registry
    );
    
    expect(result.result).toBe(true);
  });

  it('should handle contains operator with string', async () => {
    almanac.addRuntimeFact('testValue', 'hello world');
    
    const result = await evaluateCondition(
      { fact: 'testValue', operator: 'contains', value: 'world' },
      ['test'],
      almanac,
      registry
    );
    
    expect(result.result).toBe(true);
  });

  it('should handle contains operator with array', async () => {
    almanac.addRuntimeFact('testValue', ['a', 'b', 'c']);
    
    const result = await evaluateCondition(
      { fact: 'testValue', operator: 'contains', value: 'b' },
      ['test'],
      almanac,
      registry
    );
    
    expect(result.result).toBe(true);
  });

  it('should handle in operator', async () => {
    almanac.addRuntimeFact('testValue', 'b');
    
    const result = await evaluateCondition(
      { fact: 'testValue', operator: 'in', value: ['a', 'b', 'c'] },
      ['test'],
      almanac,
      registry
    );
    
    expect(result.result).toBe(true);
  });

  it('should handle notIn operator', async () => {
    almanac.addRuntimeFact('testValue', 'd');
    
    const result = await evaluateCondition(
      { fact: 'testValue', operator: 'notIn', value: ['a', 'b', 'c'] },
      ['test'],
      almanac,
      registry
    );
    
    expect(result.result).toBe(true);
  });
});
