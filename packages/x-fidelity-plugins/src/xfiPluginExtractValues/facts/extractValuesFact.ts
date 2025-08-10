import path from 'path';
import { logger } from '@x-fidelity/core';
import { FactDefn, FileData } from '@x-fidelity/types';
import { JSONPath as jp } from 'jsonpath-plus';
import { DOMParser as XmldomParser } from '@xmldom/xmldom';
import * as xpath from 'xpath';
import YAML from 'yaml';
import { ExtractMatch, ExtractValuesParams, ExtractValuesResult, StrategyConfig, StrategyType } from '../types';

function safeString(value: unknown): string {
  try { return typeof value === 'string' ? value : JSON.stringify(value); } catch { return String(value); }
}

function getExtension(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return ext || '';
}

function applyIncludeExclude(fileName: string, params?: ExtractValuesParams): boolean {
  if (!params) return true;
  const { include, exclude } = params;
  if (include && include.length > 0) {
    const ok = include.some((g) => new RegExp(g).test(fileName));
    if (!ok) return false;
  }
  if (exclude && exclude.length > 0) {
    const bad = exclude.some((g) => new RegExp(g).test(fileName));
    if (bad) return false;
  }
  return true;
}

function capContent(content: string, maxBytes?: number): { content: string; truncated: boolean } {
  if (!maxBytes || maxBytes <= 0) return { content, truncated: false };
  const buf = Buffer.from(content, 'utf8');
  if (buf.byteLength <= maxBytes) return { content, truncated: false };
  const sliced = buf.subarray(0, maxBytes).toString('utf8');
  return { content: sliced, truncated: true };
}

function limitArray<T>(arr: T[], max?: number): { arr: T[]; truncated: boolean } {
  if (!max || max <= 0) return { arr, truncated: false };
  if (arr.length <= max) return { arr, truncated: false };
  return { arr: arr.slice(0, max), truncated: true };
}

function computeLineCol(text: string, index: number): { line: number; column: number } {
  const pre = text.slice(0, index);
  const lines = pre.split('\n');
  const line = lines.length; // 1-based
  const column = lines[lines.length - 1].length + 1; // 1-based
  return { line, column };
}

async function extractWithJsonPath(jsonText: string, paths: string[], filePath: string, ext: string, limits?: ExtractValuesParams['limits']): Promise<ExtractValuesResult> {
  const start = Date.now();
  const errors: ExtractValuesResult['errors'] = [];
  let truncatedContent = false;

  try {
    const { content: capped, truncated } = capContent(jsonText, limits?.maxContentBytes);
    truncatedContent = truncated;
    const obj = JSON.parse(capped);
    const matches: ExtractMatch[] = [];
    for (const p of paths) {
      try {
        const vals = jp({ path: p, json: obj });
        for (const v of vals) {
          matches.push({ value: v, meta: { path: p } });
        }
      } catch (err) {
        errors.push({ code: 'JSONPATH_ERROR', message: 'jsonpath evaluation failed', details: { path: p, error: (err as Error)?.message } });
      }
    }
    const limited = limitArray(matches, limits?.maxMatches);
    return {
      strategyUsed: ext === '.yaml' || ext === '.yml' ? 'yaml-jsonpath' : 'jsonpath',
      matches: limited.arr,
      errors,
      stats: { totalMatches: matches.length, truncated: truncatedContent || limited.truncated, durationMs: Date.now() - start },
      file: { path: filePath, ext }
    };
  } catch (err) {
    errors.push({ code: 'JSON_PARSE_ERROR', message: 'invalid json/yaml', details: { error: (err as Error)?.message } });
    return {
      strategyUsed: ext === '.yaml' || ext === '.yml' ? 'yaml-jsonpath' : 'jsonpath',
      matches: [],
      errors,
      stats: { totalMatches: 0, truncated: truncatedContent, durationMs: Date.now() - start },
      file: { path: filePath, ext }
    };
  }
}

async function extractWithXPath(xmlText: string, expressions: string[], filePath: string, ext: string, limits?: ExtractValuesParams['limits']): Promise<ExtractValuesResult> {
  const start = Date.now();
  const errors: ExtractValuesResult['errors'] = [];
  let truncatedContent = false;
  try {
    const { content: capped, truncated } = capContent(xmlText, limits?.maxContentBytes);
    truncatedContent = truncated;
    // xmldom by default does not resolve external entities; avoid DOCTYPE
    if (/<!DOCTYPE/i.test(capped)) {
      errors.push({ code: 'XML_DTD_BLOCKED', message: 'DOCTYPE not allowed for security', details: {} });
      return { strategyUsed: 'xpath', matches: [], errors, stats: { totalMatches: 0, truncated, durationMs: Date.now() - start }, file: { path: filePath, ext } };
    }
    const doc = new XmldomParser().parseFromString(capped, 'text/xml');
    const select = xpath.useNamespaces({});
    const matches: ExtractMatch[] = [];
    for (const expr of expressions) {
      try {
        const nodes = select(expr, doc) as any[];
        for (const n of nodes) {
          // try attribute/stringValue, else serialize node name
          let value: any;
          if (typeof n === 'string') value = n;
          else if (n?.nodeType === 2 /* ATTRIBUTE_NODE */) value = n.value;
          else if (n?.firstChild?.data) value = n.firstChild.data;
          else value = n?.toString?.() ?? String(n);
          matches.push({ value, meta: { expression: expr } });
        }
      } catch (err) {
        errors.push({ code: 'XPATH_ERROR', message: 'xpath evaluation failed', details: { expression: expr, error: (err as Error)?.message } });
      }
    }
    const limited = limitArray(matches, limits?.maxMatches);
    return {
      strategyUsed: 'xpath',
      matches: limited.arr,
      errors,
      stats: { totalMatches: matches.length, truncated: truncatedContent || limited.truncated, durationMs: Date.now() - start },
      file: { path: filePath, ext }
    };
  } catch (err) {
    errors.push({ code: 'XML_PARSE_ERROR', message: 'invalid xml', details: { error: (err as Error)?.message } });
    return {
      strategyUsed: 'xpath',
      matches: [],
      errors,
      stats: { totalMatches: 0, truncated: truncatedContent, durationMs: Date.now() - start },
      file: { path: filePath, ext }
    };
  }
}

async function extractWithRegex(text: string, pattern: string, flags: string | undefined, filePath: string, ext: string, limits?: ExtractValuesParams['limits'], captureContext?: boolean): Promise<ExtractValuesResult> {
  const start = Date.now();
  const errors: ExtractValuesResult['errors'] = [];
  let truncatedContent = false;
  const maxLen = limits?.maxPatternLength ?? 1024;
  if (pattern.length > maxLen) {
    errors.push({ code: 'REGEX_TOO_LONG', message: `pattern length exceeds maxPatternLength ${maxLen}` });
    return { strategyUsed: 'regex', matches: [], errors, stats: { totalMatches: 0, truncated: false, durationMs: Date.now() - start }, file: { path: filePath, ext } };
  }
  const { content: capped, truncated } = capContent(text, limits?.maxContentBytes);
  truncatedContent = truncated;
  const re = new RegExp(pattern, (flags || '') + 'g');
  const matches: ExtractMatch[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(capped)) !== null) {
    const { line, column } = computeLineCol(capped, m.index);
    const value = m[1] ?? m[0];
    const meta: any = { full: m[0] };
    if (captureContext) {
      const contextStart = Math.max(0, m.index - 50);
      const contextEnd = Math.min(capped.length, m.index + m[0].length + 50);
      meta.context = safeString(capped.slice(contextStart, contextEnd));
    }
    matches.push({ value, location: { filePath, line, column }, meta });
    if (limits?.maxMatches && matches.length >= limits.maxMatches) break;
  }
  return {
    strategyUsed: 'regex',
    matches,
    errors,
    stats: { totalMatches: matches.length, truncated: truncatedContent, durationMs: Date.now() - start },
    file: { path: filePath, ext }
  };
}

export const extractValuesFact: FactDefn = {
  name: 'extractValues',
  description: 'Extract values from files and expose them as runtime facts for downstream rules',
  type: 'iterative-function',
  priority: 1,
  fn: async (params: ExtractValuesParams, almanac: any): Promise<ExtractValuesResult> => {
    try {
      const fileData: FileData = await almanac.factValue('fileData');
      const ext = getExtension(fileData.filePath || fileData.fileName);
      const withinScope = applyIncludeExclude(fileData.fileName, params);
      const errors: ExtractValuesResult['errors'] = [];
      const limits = params?.limits;
      const strategyForExt: StrategyConfig | undefined = params?.strategies?.[ext];
      const strategy = strategyForExt || params?.defaultStrategy;

      let result: ExtractValuesResult = {
        strategyUsed: 'regex',
        matches: [],
        errors: [],
        stats: { totalMatches: 0, durationMs: 0 },
        file: { path: fileData.filePath, ext }
      } as ExtractValuesResult;

      if (!withinScope) {
        result.errors = [{ code: 'OUT_OF_SCOPE', message: 'File excluded by include/exclude globs' }];
      } else if (!strategy) {
        // Default to regex no-op
        result.errors = [{ code: 'NO_STRATEGY', message: 'No strategy available for file extension and no defaultStrategy provided' }];
      } else {
        const content = fileData.content || fileData.fileContent || '';
        if ((ext === '.json' || ext === '.yaml' || ext === '.yml') && (strategy.type === 'jsonpath' || strategy.type === 'yaml-jsonpath')) {
          const text = (ext === '.yaml' || ext === '.yml') ? (() => { try { const obj = YAML.parse(content); return JSON.stringify(obj ?? {}); } catch { return '{}'; } })() : content;
          result = await extractWithJsonPath(text, (strategy as any).paths || [], fileData.filePath, ext, limits);
        } else if (ext === '.xml' && strategy.type === 'xpath') {
          result = await extractWithXPath(content, (strategy as any).expressions || [], fileData.filePath, ext, limits);
        } else if (strategy.type === 'regex') {
          result = await extractWithRegex(content, (strategy as any).pattern, (strategy as any).flags, fileData.filePath, ext, limits, params?.captureContext);
        } else if (strategy.type === 'ast-jsonpath' || strategy.type === 'ast-query') {
          // Minimal AST support via existing ast fact when available
          try {
            const ast = await almanac.factValue('ast');
            if (!ast) {
              errors.push({ code: 'AST_UNAVAILABLE', message: 'AST fact not available' });
              result = { strategyUsed: strategy.type, matches: [], errors, stats: { totalMatches: 0, durationMs: 0 }, file: { path: fileData.filePath, ext } };
            } else if (strategy.type === 'ast-jsonpath') {
              const start = Date.now();
              const values: any[] = [];
              for (const p of (strategy as any).paths || []) {
                try { values.push(...jp({ path: p, json: ast })); } catch (e) { errors.push({ code: 'AST_JSONPATH_ERROR', message: 'jsonpath on ast failed', details: { path: p, error: (e as Error)?.message } }); }
              }
              const matches: ExtractMatch[] = values.map((v) => ({ value: v }));
              const limited = limitArray(matches, limits?.maxMatches);
              result = { strategyUsed: 'ast-jsonpath', matches: limited.arr, errors, stats: { totalMatches: matches.length, truncated: limited.truncated, durationMs: Date.now() - start }, file: { path: fileData.filePath, ext } };
            } else {
              // ast-query not implemented fully; report error and empty result
              errors.push({ code: 'AST_QUERY_UNSUPPORTED', message: 'ast-query is not implemented in this environment' });
              result = { strategyUsed: 'ast-query', matches: [], errors, stats: { totalMatches: 0, durationMs: 0 }, file: { path: fileData.filePath, ext } };
            }
          } catch (e) {
            errors.push({ code: 'AST_ERROR', message: 'failed to retrieve ast fact', details: { error: (e as Error)?.message } });
            result = { strategyUsed: strategy.type, matches: [], errors, stats: { totalMatches: 0, durationMs: 0 }, file: { path: fileData.filePath, ext } };
          }
        } else {
          // Fallback to regex when unknown
          result = await extractWithRegex(content, '.*^$', '', fileData.filePath, ext, limits);
          result.errors.push({ code: 'UNSUPPORTED_STRATEGY', message: `Unsupported strategy '${(strategy as any).type}' for extension '${ext}'` });
        }
      }

      // de-duplicate
      if (params?.dedupe !== false && result.matches.length > 0) {
        const unique: ExtractMatch[] = [];
        const seen = new Set<string>();
        for (const m of result.matches) {
          const key = safeString(m.value);
          if (!seen.has(key)) { seen.add(key); unique.push(m); }
        }
        result.matches = unique;
        result.stats.totalMatches = unique.length;
      }

      if (params?.resultFact) {
        almanac.addRuntimeFact(params.resultFact, result);
      }
      return result;
    } catch (error) {
      logger.error('extractValuesFact execution failed', { error });
      return {
        strategyUsed: 'regex',
        matches: [],
        errors: [{ code: 'FACT_EXECUTION_ERROR', message: 'Unhandled error in extractValuesFact', details: { error: (error as Error)?.message } }],
        stats: { totalMatches: 0, durationMs: 0 },
        file: { path: '', ext: '' }
      };
    }
  }
};


