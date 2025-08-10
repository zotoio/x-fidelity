export type StrategyType = 'jsonpath' | 'yaml-jsonpath' | 'xpath' | 'regex' | 'ast-jsonpath' | 'ast-query';

export interface BaseStrategyConfig {
  type: StrategyType;
}

export interface JsonPathStrategy extends BaseStrategyConfig {
  type: 'jsonpath' | 'yaml-jsonpath' | 'ast-jsonpath';
  paths: string[];
}

export interface XPathStrategy extends BaseStrategyConfig {
  type: 'xpath';
  expressions: string[];
  namespaces?: Record<string, string>;
}

export interface RegexStrategy extends BaseStrategyConfig {
  type: 'regex';
  pattern: string;
  flags?: string; // i, m, u ; g is implied for collection
}

export interface AstQueryStrategy extends BaseStrategyConfig {
  type: 'ast-query';
  query: string;
  language?: string;
  requiresAstFact?: boolean;
}

export type StrategyConfig = JsonPathStrategy | XPathStrategy | RegexStrategy | AstQueryStrategy;

export interface ExtractValuesParams {
  resultFact: string;
  strategies?: Record<string, StrategyConfig>; // key is extension including dot, e.g., '.json'
  defaultStrategy?: StrategyConfig;
  include?: string[];
  exclude?: string[];
  limits?: {
    maxContentBytes?: number;
    maxMatches?: number;
    maxPatternLength?: number;
  };
  dedupe?: boolean;
  captureContext?: boolean;
}

export interface ExtractMatchLocation {
  filePath: string;
  line?: number;
  column?: number;
}

export interface ExtractMatch {
  value: any;
  location?: ExtractMatchLocation;
  meta?: any;
}

export interface ExtractValuesResult {
  strategyUsed: StrategyType;
  matches: ExtractMatch[];
  errors: Array<{ code: string; message: string; details?: any }>;
  stats: { totalMatches: number; truncated?: boolean; durationMs: number };
  file: { path: string; ext: string; size?: number };
}

export type MatchesSatisfyParams = {
  requireMatches?: boolean;
  requireNoErrors?: boolean;
  count?: { op: '==' | '!=' | '>' | '>=' | '<' | '<='; value: number };
  distinctCount?: { of: 'value' | 'by.path'; path?: string; op: '==' | '!=' | '>' | '>=' | '<' | '<='; value: number };
  contains?: { value?: any; regex?: string; flags?: string; mode?: 'any' | 'all' | 'none'; path?: string };
  every?: { path?: string; predicate: 'defined' | 'nonEmpty' | 'isNumber' | 'isString' | 'isObject' };
  some?: { path?: string; predicate: 'defined' | 'nonEmpty' | 'isNumber' | 'isString' | 'isObject' };
  countWhere?: { path?: string; equals?: any; regex?: string; op: '==' | '!=' | '>' | '>=' | '<' | '<='; value: number };
  line?: { op: '==' | '>' | '<' | '>=' | '<='; value: number };
  strategyIs?: StrategyType | StrategyType[];
  all?: MatchesSatisfyParams[];
  any?: MatchesSatisfyParams[];
  none?: MatchesSatisfyParams[];
};


