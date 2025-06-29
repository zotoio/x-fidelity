import { parentPort } from 'worker_threads';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

// Import Tree-sitter for AST analysis
let Parser: any;
let JavaScriptLanguage: any;
let TypeScriptLanguage: any;

interface WorkerTask {
  id: string;
  type: 'ast-analysis' | 'file-scan' | 'data-transform';
  data: any;
  timeout?: number;
}

interface WorkerResult {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

/**
 * Initialize Tree-sitter for AST analysis
 */
async function initializeTreeSitter(): Promise<void> {
  try {
    // Try native tree-sitter first for better performance
    try {
      const TreeSitter = await import('tree-sitter');
      Parser = TreeSitter.default || TreeSitter;

      const JavaScript = await import('tree-sitter-javascript');
      const TypeScript = await import('tree-sitter-typescript');

      JavaScriptLanguage = JavaScript.default || JavaScript;
      TypeScriptLanguage =
        TypeScript.typescript || TypeScript.default || TypeScript;

      console.log('Native Tree-sitter loaded in worker');
    } catch (nativeError) {
      console.warn(
        'Native Tree-sitter not available, falling back to web-tree-sitter:',
        nativeError instanceof Error ? nativeError.message : String(nativeError)
      );

      // Fallback to web-tree-sitter
      try {
        const WebTreeSitter = await import('web-tree-sitter');
        Parser = WebTreeSitter.default || WebTreeSitter;

        if (typeof Parser.init === 'function') {
          await Parser.init();
        }

        // Note: Language loading would need WASM files accessible to worker
        console.log('Web Tree-sitter loaded in worker');
      } catch (wasmError) {
        console.error(
          'Failed to load web-tree-sitter:',
          wasmError instanceof Error ? wasmError.message : String(wasmError)
        );
        throw new Error(
          'Tree-sitter initialization failed: Both native and WASM versions unavailable'
        );
      }
    }
  } catch (error) {
    console.error('Failed to initialize Tree-sitter in worker:', error);
    throw error;
  }
}

/**
 * Perform AST analysis on multiple files
 */
async function performAstAnalysis(
  files: Array<{ path: string; content: string }>
): Promise<any> {
  if (!Parser) {
    throw new Error('Tree-sitter not initialized');
  }

  const results: any[] = [];
  const parser = new Parser();

  for (const file of files) {
    try {
      // Determine language based on file extension
      const ext = path.extname(file.path).toLowerCase();
      let language = null;

      if (ext === '.js' || ext === '.jsx') {
        language = JavaScriptLanguage;
      } else if (ext === '.ts' || ext === '.tsx') {
        language = TypeScriptLanguage;
      }

      if (!language) {
        continue; // Skip unsupported files
      }

      parser.setLanguage(language);
      const tree = parser.parse(file.content);

      // Extract useful AST information
      const astInfo = {
        filePath: file.path,
        nodeCount: countNodes(tree.rootNode),
        functions: extractFunctions(tree.rootNode),
        complexity: calculateComplexity(tree.rootNode),
        issues: analyzeIssues(tree.rootNode, file.content)
      };

      results.push(astInfo);
    } catch (error) {
      console.error(`AST analysis failed for ${file.path}:`, error);
      results.push({
        filePath: file.path,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { results, totalFiles: files.length };
}

/**
 * Perform file system scanning
 */
async function performFileScan(
  directory: string,
  patterns: string[]
): Promise<any> {
  const results: string[] = [];

  for (const pattern of patterns) {
    try {
      const files = await glob(pattern, { cwd: directory, absolute: true });
      results.push(...files);
    } catch (error) {
      console.error(`File scan failed for pattern ${pattern}:`, error);
    }
  }

  // Remove duplicates and filter out directories
  const uniqueFiles = [...new Set(results)].filter(file => {
    try {
      return fs.statSync(file).isFile();
    } catch {
      return false;
    }
  });

  return {
    files: uniqueFiles,
    totalCount: uniqueFiles.length,
    patterns: patterns
  };
}

/**
 * Perform data transformation
 */
async function performDataTransform(
  data: any,
  transformType: string
): Promise<any> {
  switch (transformType) {
    case 'normalize-issues':
      return normalizeIssues(data);
    case 'aggregate-metrics':
      return aggregateMetrics(data);
    case 'filter-results':
      return filterResults(data);
    default:
      throw new Error(`Unknown transform type: ${transformType}`);
  }
}

// Helper functions for AST analysis
function countNodes(node: any): number {
  let count = 1;
  for (let i = 0; i < node.childCount; i++) {
    count += countNodes(node.child(i));
  }
  return count;
}

function extractFunctions(node: any): any[] {
  const functions: any[] = [];

  if (
    node.type === 'function_declaration' ||
    node.type === 'method_definition'
  ) {
    functions.push({
      name: node.child(1)?.text || 'anonymous',
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      complexity: calculateComplexity(node)
    });
  }

  for (let i = 0; i < node.childCount; i++) {
    functions.push(...extractFunctions(node.child(i)));
  }

  return functions;
}

function calculateComplexity(node: any): number {
  let complexity = 1; // Base complexity

  // Add complexity for control flow statements
  const complexityNodes = [
    'if_statement',
    'while_statement',
    'for_statement',
    'switch_statement',
    'catch_clause',
    'conditional_expression',
    'logical_expression'
  ];

  if (complexityNodes.includes(node.type)) {
    complexity++;
  }

  for (let i = 0; i < node.childCount; i++) {
    complexity += calculateComplexity(node.child(i)) - 1; // Subtract 1 to avoid double counting
  }

  return Math.max(1, complexity);
}

function analyzeIssues(node: any, content: string): any[] {
  const issues: any[] = [];

  // Example: Find console.log statements
  if (node.type === 'call_expression') {
    const callee = node.child(0);
    if (callee?.type === 'member_expression') {
      const object = callee.child(0);
      const property = callee.child(2);

      if (object?.text === 'console' && property?.text === 'log') {
        issues.push({
          type: 'console-log-found',
          message: 'console.log statement found',
          startLine: node.startPosition.row + 1,
          startColumn: node.startPosition.column + 1,
          endLine: node.endPosition.row + 1,
          endColumn: node.endPosition.column + 1,
          severity: 'warning'
        });
      }
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    issues.push(...analyzeIssues(node.child(i), content));
  }

  return issues;
}

// Helper functions for data transformation
function normalizeIssues(data: any): any {
  if (!Array.isArray(data)) {
    return { normalizedIssues: [], error: 'Data is not an array' };
  }

  const normalized = data.map(issue => ({
    file: issue.filePath || issue.file || 'unknown',
    line: issue.startLine || issue.line || 1,
    column: issue.startColumn || issue.column || 1,
    message: issue.message || 'No message',
    severity: issue.severity || 'info',
    ruleId: issue.ruleId || issue.type || 'unknown-rule'
  }));

  return { normalizedIssues: normalized, totalCount: normalized.length };
}

function aggregateMetrics(data: any): any {
  const metrics = {
    totalFiles: 0,
    totalIssues: 0,
    severityCounts: { error: 0, warning: 0, info: 0 },
    ruleBreakdown: {} as Record<string, number>
  };

  if (data.results && Array.isArray(data.results)) {
    metrics.totalFiles = data.results.length;

    for (const result of data.results) {
      if (result.issues && Array.isArray(result.issues)) {
        metrics.totalIssues += result.issues.length;

        for (const issue of result.issues) {
          const severity = issue.severity || 'info';
          if (severity in metrics.severityCounts) {
            metrics.severityCounts[
              severity as keyof typeof metrics.severityCounts
            ]++;
          }

          const ruleId = issue.ruleId || issue.type || 'unknown';
          metrics.ruleBreakdown[ruleId] =
            (metrics.ruleBreakdown[ruleId] || 0) + 1;
        }
      }
    }
  }

  return metrics;
}

function filterResults(data: any): any {
  // Example: Filter out info-level issues
  if (data.results && Array.isArray(data.results)) {
    const filtered = data.results.map((result: any) => ({
      ...result,
      issues:
        result.issues?.filter((issue: any) => issue.severity !== 'info') || []
    }));

    return { results: filtered, filteredCount: filtered.length };
  }

  return data;
}

// Main worker message handler
if (parentPort) {
  parentPort.on('message', async (task: WorkerTask) => {
    const startTime = performance.now();

    try {
      let result: any;

      switch (task.type) {
        case 'ast-analysis':
          if (!Parser) {
            await initializeTreeSitter();
          }
          result = await performAstAnalysis(task.data.files);
          break;

        case 'file-scan':
          result = await performFileScan(
            task.data.directory,
            task.data.patterns
          );
          break;

        case 'data-transform':
          result = await performDataTransform(
            task.data.data,
            task.data.transformType
          );
          break;

        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      const duration = performance.now() - startTime;

      const response: WorkerResult = {
        id: task.id,
        success: true,
        data: result,
        duration
      };

      parentPort!.postMessage(response);
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const response: WorkerResult = {
        id: task.id,
        success: false,
        error: errorMessage,
        duration
      };

      parentPort!.postMessage(response);
    }
  });
}

// Handle worker shutdown
process.on('SIGTERM', () => {
  console.log('Worker shutting down...');
  process.exit(0);
});
