/**
 * Browser-compatible Matches Satisfy Operator
 * 
 * Evaluates extractValues results using parameter-driven conditions.
 */

import { BrowserOperator } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Match result from extract values
 */
interface MatchResult {
  value: unknown;
  location?: {
    line?: number;
    column?: number;
  };
}

/**
 * Extract values result
 */
interface ExtractValuesResult {
  matches: MatchResult[];
  strategyUsed?: string;
  errors?: string[];
}

/**
 * Parameters for matchesSatisfy operator
 */
interface MatchesSatisfyParams {
  requireMatches?: boolean;
  requireNoErrors?: boolean;
  strategyIs?: string | string[];
  count?: {
    op: '==' | '!=' | '>' | '>=' | '<' | '<=';
    value: number;
  };
  distinctCount?: {
    of?: 'by.path';
    path?: string;
    op: '==' | '!=' | '>' | '>=' | '<' | '<=';
    value: number;
  };
  contains?: {
    path?: string;
    regex?: string;
    flags?: string;
    value?: unknown;
    mode?: 'all' | 'some' | 'none';
  };
  every?: {
    path?: string;
    predicate: 'defined' | 'nonEmpty' | 'isNumber' | 'isString' | 'isObject';
  };
  some?: {
    path?: string;
    predicate: 'defined' | 'nonEmpty' | 'isNumber' | 'isString' | 'isObject';
  };
  countWhere?: {
    path?: string;
    regex?: string;
    equals?: unknown;
    op: '==' | '!=' | '>' | '>=' | '<' | '<=';
    value: number;
  };
  line?: {
    op: '==' | '!=' | '>' | '>=' | '<' | '<=';
    value: number;
  };
  all?: MatchesSatisfyParams[];
  any?: MatchesSatisfyParams[];
  none?: MatchesSatisfyParams[];
}

/**
 * Compare helper function
 */
function compare(op: string, left: number, right: number): boolean {
  switch (op) {
    case '==': return left === right;
    case '!=': return left !== right;
    case '>': return left > right;
    case '>=': return left >= right;
    case '<': return left < right;
    case '<=': return left <= right;
    default: return false;
  }
}

/**
 * Get value by path
 */
function getByPath(obj: unknown, path?: string): unknown {
  if (!path) return obj;
  return path.split('.').reduce((acc: unknown, key: string) => {
    if (acc != null && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Test a predicate on a value
 */
function testPredicate(value: unknown, predicate: string): boolean {
  switch (predicate) {
    case 'defined': return value !== undefined && value !== null;
    case 'nonEmpty': return value !== undefined && value !== null && String(value).length > 0;
    case 'isNumber': return typeof value === 'number' && !Number.isNaN(value);
    case 'isString': return typeof value === 'string';
    case 'isObject': return value !== null && typeof value === 'object' && !Array.isArray(value);
    default: return false;
  }
}

/**
 * Check if matches contain expected values
 */
function containsCheck(matches: MatchResult[], cfg: NonNullable<MatchesSatisfyParams['contains']>): boolean {
  const list = matches.map(m => getByPath(m.value, cfg.path));
  if (cfg.regex) {
    const re = new RegExp(cfg.regex, cfg.flags || '');
    const hits = list.map(v => re.test(String(v)));
    if (cfg.mode === 'all') return hits.every(Boolean);
    if (cfg.mode === 'none') return hits.every(h => !h);
    return hits.some(Boolean);
  }
  const target = cfg.value;
  const hits = list.map(v => v === target);
  if (cfg.mode === 'all') return hits.every(Boolean);
  if (cfg.mode === 'none') return hits.every(h => !h);
  return hits.some(Boolean);
}

/**
 * Evaluate the matches against params
 */
function evaluate(params: MatchesSatisfyParams, fv: ExtractValuesResult): boolean {
  if (!fv || !Array.isArray(fv.matches)) return false;
  const matches = fv.matches;

  if (params.requireMatches && matches.length === 0) return false;
  if (params.requireNoErrors && Array.isArray(fv.errors) && fv.errors.length > 0) return false;

  if (params.strategyIs) {
    const allowed = Array.isArray(params.strategyIs) ? params.strategyIs : [params.strategyIs];
    if (!allowed.includes(fv.strategyUsed || '')) return false;
  }

  if (params.count) {
    if (!compare(params.count.op, matches.length, params.count.value)) return false;
  }

  if (params.distinctCount) {
    const dc = params.distinctCount;
    const values = dc.of === 'by.path'
      ? matches.map(m => getByPath(m.value, dc.path))
      : matches.map(m => m.value);
    const set = new Set(values.map(v => JSON.stringify(v)));
    if (!compare(dc.op, set.size, dc.value)) return false;
  }

  if (params.contains) {
    if (!containsCheck(matches, params.contains)) return false;
  }

  if (params.every) {
    const result = matches.every(m => testPredicate(getByPath(m.value, params.every?.path), params.every?.predicate || 'defined'));
    if (!result) return false;
  }

  if (params.some) {
    const result = matches.some(m => testPredicate(getByPath(m.value, params.some?.path), params.some?.predicate || 'defined'));
    if (!result) return false;
  }

  if (params.countWhere) {
    const re = params.countWhere.regex ? new RegExp(params.countWhere.regex) : undefined;
    const cnt = matches.reduce((acc, m) => {
      const v = getByPath(m.value, params.countWhere?.path);
      if (re) return acc + (re.test(String(v)) ? 1 : 0);
      if (params.countWhere?.equals !== undefined) return acc + (v === params.countWhere.equals ? 1 : 0);
      return acc;
    }, 0);
    if (!compare(params.countWhere.op, cnt, params.countWhere.value)) return false;
  }

  if (params.line && matches.length > 0) {
    const first = matches.find(m => m.location && typeof m.location.line === 'number');
    const line = first?.location?.line ?? 0;
    if (!compare(params.line.op, line, params.line.value)) return false;
  }

  if (params.all && params.all.length > 0) {
    if (!params.all.every(p => evaluate(p, fv))) return false;
  }
  if (params.any && params.any.length > 0) {
    if (!params.any.some(p => evaluate(p, fv))) return false;
  }
  if (params.none && params.none.length > 0) {
    if (!params.none.every(p => !evaluate(p, fv))) return false;
  }

  return true;
}

/**
 * Matches satisfy operator
 */
export const matchesSatisfyOperator: BrowserOperator = {
  name: 'matchesSatisfy',
  description: 'Evaluates extractValues result using parameter-driven conditions',
  
  evaluate(factValue: unknown, compareValue: unknown): boolean {
    try {
      browserLogger.debug(`matchesSatisfy: processing ${typeof factValue}`);
      
      if (!compareValue || typeof compareValue !== 'object') {
        browserLogger.debug('matchesSatisfy: compareValue is not an object');
        return false;
      }
      
      const result = evaluate(
        compareValue as MatchesSatisfyParams,
        factValue as ExtractValuesResult
      );
      
      browserLogger.debug(`matchesSatisfy: result is ${result}`);
      return result;
    } catch (e) {
      browserLogger.error(`matchesSatisfy error: ${e}`);
      return false;
    }
  },
};
