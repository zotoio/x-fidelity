import { parentPort, isMainThread, workerData } from 'worker_threads';
import { logger } from '@x-fidelity/core';

export interface TreeSitterRequest {
  id: string;
  type: 'initialize' | 'parse' | 'getStatus' | 'shutdown';
  data?: {
    code?: string;
    language?: 'javascript' | 'typescript';
    fileName?: string;
  };
}

export interface TreeSitterResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
}

export interface ParseResult {
  tree: any;
  rootNode?: any;
  reason?: string;
}

// Worker state
let isInitialized = false;
let initializationFailed = false;
let ParserClass: any = null;
let jsLanguage: any = null;
let tsLanguage: any = null;
let failureReason: string | null = null;

/**
 * Initialize Tree-sitter in the worker
 */
async function initialize(): Promise<void> {
  if (isInitialized && !initializationFailed) {
    return;
  }

  try {
    // Always use native Tree-sitter (works in worker threads)
    await initializeNativeTreeSitter();

    isInitialized = true;
    initializationFailed = false;
    failureReason = null;
  } catch (error) {
    initializationFailed = true;
    isInitialized = false;
    failureReason = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

/**
 * Initialize native Tree-sitter
 */
async function initializeNativeTreeSitter(): Promise<void> {
  try {
    const TreeSitter = require('tree-sitter');
    const JavaScript = require('tree-sitter-javascript');
    const TreeSitterTypescript = require('tree-sitter-typescript');
    
    ParserClass = TreeSitter;
    jsLanguage = JavaScript;
    tsLanguage = TreeSitterTypescript.typescript;
    
    logger.info('[TreeSitter Worker] Native Tree-sitter initialized successfully');
  } catch (error) {
    logger.error('[TreeSitter Worker] Failed to initialize native Tree-sitter:', error);
    throw new Error(`Native Tree-sitter initialization failed: ${error}`);
  }
}

/**
 * Convert a Tree-sitter node to a serializable format
 */
function nodeToSerializable(node: any): any {
  if (!node) return null;

  const result: any = {
    type: node.type,
    text: node.text,
    startPosition: {
      row: node.startPosition.row,
      column: node.startPosition.column
    },
    endPosition: {
      row: node.endPosition.row,
      column: node.endPosition.column
    },
    startIndex: node.startIndex,
    endIndex: node.endIndex,
    childCount: node.childCount,
    children: []
  };

  // Add children (but limit depth to prevent excessive data)
  if (node.childCount > 0 && node.childCount < 1000) { // Safety limit
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        result.children.push(nodeToSerializable(child));
      }
    }
  }

  return result;
}

/**
 * Parse code using Tree-sitter
 */
async function parseCode(code: string, language: 'javascript' | 'typescript', fileName: string): Promise<ParseResult> {
  if (!isInitialized || initializationFailed) {
    return {
      tree: null,
      reason: `Tree-sitter not initialized: ${failureReason || 'Unknown error'}`
    };
  }

  try {
    const parser = new ParserClass();
    const lang = language === 'typescript' ? tsLanguage : jsLanguage;

    if (!lang) {
      return {
        tree: null,
        reason: `Language not available: ${language}`
      };
    }

    parser.setLanguage(lang);
    const tree = parser.parse(code);
    const rootNode = tree.rootNode;

    // Convert to serializable format to prevent worker crashes
    const serializableTree = nodeToSerializable(rootNode);

    return {
      tree: serializableTree,
      rootNode: serializableTree
    };
  } catch (error) {
    return {
      tree: null,
      reason: `Parse error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Get current status
 */
function getStatus() {
  return {
    isInitialized,
    initializationFailed,
    failureReason,
    hasLanguages: jsLanguage !== null && tsLanguage !== null,
    hasParser: ParserClass !== null
  };
}

/**
 * Worker message handler
 */
if (!isMainThread && parentPort) {
  parentPort.on('message', async (request: TreeSitterRequest) => {
    const response: TreeSitterResponse = {
      id: request.id,
      success: false
    };

    try {
      switch (request.type) {
        case 'initialize':
          await initialize();
          response.success = true;
          response.data = getStatus();
          break;

        case 'parse':
          if (!request.data?.code || !request.data?.language || !request.data?.fileName) {
            throw new Error('Missing required parse parameters');
          }
          const result = await parseCode(
            request.data.code,
            request.data.language,
            request.data.fileName
          );
          response.success = true;
          response.data = result;
          break;

        case 'getStatus':
          response.success = true;
          response.data = getStatus();
          break;

        case 'shutdown':
          response.success = true;
          // Clean up resources
          isInitialized = false;
          ParserClass = null;
          jsLanguage = null;
          tsLanguage = null;
          process.exit(0);
          break;

        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }
    } catch (error) {
      response.error = error instanceof Error ? error.message : String(error);
    }

    parentPort!.postMessage(response);
  });

  // Notify that worker is ready
  parentPort.postMessage({ id: 'worker-ready', success: true });
} 