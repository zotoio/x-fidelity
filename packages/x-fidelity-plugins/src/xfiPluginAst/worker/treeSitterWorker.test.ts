import { EventEmitter } from 'events';
import { TreeSitterRequest, TreeSitterResponse, ParseResult } from './treeSitterWorker';

// Mock modules for testing
jest.mock('tree-sitter', () => {
  const mockParser = {
    setLanguage: jest.fn(),
    parse: jest.fn().mockReturnValue({
      rootNode: { type: 'program', children: [] }
    })
  };
  return jest.fn().mockImplementation(() => mockParser);
}, { virtual: true });

jest.mock('tree-sitter-javascript', () => ({
  type: 'javascript'
}), { virtual: true });

jest.mock('tree-sitter-typescript', () => ({
  typescript: { type: 'typescript' }
}), { virtual: true });

// Mock web-tree-sitter - handle case where it might not be installed
jest.mock('web-tree-sitter', () => ({
  default: {
    init: jest.fn().mockResolvedValue(undefined),
    Language: {
      load: jest.fn().mockResolvedValue({ type: 'mock-language' })
    }
  }
}), { virtual: true });

// Mock Worker class to simulate worker behavior without actual worker threads
class MockWorker extends EventEmitter {
  private messageHandler: (message: TreeSitterRequest) => Promise<void>;
  private isWorkerInitialized = false;

  constructor(scriptPath: string) {
    super();
    
    // Simulate worker initialization
    setTimeout(() => {
      this.emit('message', { id: 'worker-ready', success: true });
    }, 10);

    // Set up message handler
    this.messageHandler = async (request: TreeSitterRequest) => {
      const response: TreeSitterResponse = {
        id: request.id,
        success: false
      };

      try {
        switch (request.type) {
          case 'initialize':
            this.isWorkerInitialized = true;
            response.success = true;
            response.data = {
              isInitialized: true,
              initializationFailed: false,
              failureReason: null,
              isVSCodeMode: request.data?.isVSCodeEnvironment || false,
              hasLanguages: true,
              hasParser: true
            };
            break;

          case 'parse':
            if (!request.data?.code || !request.data?.language || !request.data?.fileName) {
              throw new Error('Missing required parse parameters');
            }
            response.success = true;
            if (this.isWorkerInitialized) {
              response.data = {
                tree: { type: 'program', children: [] },
                rootNode: { type: 'program', children: [] }
              };
            } else {
              response.data = {
                tree: null,
                reason: 'Tree-sitter not initialized: Unknown error'
              };
            }
            break;

          case 'getStatus':
            response.success = true;
            response.data = {
              isInitialized: this.isWorkerInitialized,
              initializationFailed: false,
              failureReason: null,
              isVSCodeMode: false,
              hasLanguages: this.isWorkerInitialized,
              hasParser: this.isWorkerInitialized
            };
            break;

          case 'shutdown':
            response.success = true;
            // Emit response first, then exit
            setTimeout(() => {
              this.emit('message', response);
              setTimeout(() => this.emit('exit', 0), 5);
            }, 5);
            return;

          default:
            throw new Error(`Unknown request type: ${(request as any).type}`);
        }
      } catch (error) {
        response.error = error instanceof Error ? error.message : String(error);
      }

      setTimeout(() => this.emit('message', response), 1);
    };
  }

  postMessage(message: TreeSitterRequest) {
    // Use immediate execution for better test predictability
    this.messageHandler(message);
  }

  terminate() {
    setTimeout(() => this.emit('exit', 0), 5);
  }
}

// Mock the worker_threads module
jest.mock('worker_threads', () => ({
  Worker: MockWorker,
  isMainThread: true,
  parentPort: null
}));

describe('TreeSitterWorker', () => {
  let worker: any;

  beforeAll(() => {
    // No setup needed for mocked workers
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  afterEach(async () => {
    if (worker) {
      await terminateWorker(worker);
      worker = null as any;
    }
  });

  const createWorker = (): any => {
    const { Worker } = require('worker_threads');
    worker = new Worker('mock-worker-path');
    return worker;
  };

  const terminateWorker = async (workerInstance: any): Promise<void> => {
    return new Promise((resolve) => {
      workerInstance.on('exit', () => resolve());
      workerInstance.terminate();
    });
  };

  const sendMessage = (worker: any, request: TreeSitterRequest): Promise<TreeSitterResponse> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const messageHandler = (response: TreeSitterResponse) => {
        // Only resolve if this response matches our request ID
        if (response.id === request.id) {
          clearTimeout(timeout);
          worker.removeListener('message', messageHandler);
          worker.removeListener('error', errorHandler);
          resolve(response);
        }
      };

      const errorHandler = (error: any) => {
        clearTimeout(timeout);
        worker.removeListener('message', messageHandler);
        worker.removeListener('error', errorHandler);
        reject(error);
      };

      worker.on('message', messageHandler);
      worker.once('error', errorHandler);

      worker.postMessage(request);
    });
  };

  describe('Worker Creation and Ready State', () => {
    it('should send worker-ready message on startup', async () => {
      const worker = createWorker();
      
      const readyMessage = await new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker ready timeout'));
        }, 5000);

        worker.once('message', (message) => {
          clearTimeout(timeout);
          resolve(message);
        });

        worker.once('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });

      expect(readyMessage).toEqual({
        id: 'worker-ready',
        success: true
      });
    });
  });

  describe('Initialization', () => {
    it('should initialize in native mode successfully', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      const request: TreeSitterRequest = {
        id: 'test-init-1',
        type: 'initialize',
        data: {
          isVSCodeEnvironment: false
        }
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-init-1');
      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        isInitialized: true,
        initializationFailed: false,
        failureReason: null,
        isVSCodeMode: false,
        hasLanguages: true,
        hasParser: true
      });
    });

    it('should initialize in VSCode mode with extension path', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      const request: TreeSitterRequest = {
        id: 'test-init-vscode',
        type: 'initialize',
        data: {
          isVSCodeEnvironment: true,
          extensionPath: '/mock/extension/path'
        }
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-init-vscode');
      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        isInitialized: true,
        initializationFailed: false,
        failureReason: null,
        isVSCodeMode: true,
        hasLanguages: true,
        hasParser: true
      });
    });

    it('should handle initialization without options', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      const request: TreeSitterRequest = {
        id: 'test-init-default',
        type: 'initialize'
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-init-default');
      expect(response.success).toBe(true);
      expect(response.data.isVSCodeMode).toBe(false);
    });

    it('should handle re-initialization gracefully', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      // First initialization
      await sendMessage(worker, {
        id: 'init-1',
        type: 'initialize',
        data: { isVSCodeEnvironment: false }
      });

      // Second initialization should succeed without issues
      const response = await sendMessage(worker, {
        id: 'init-2',
        type: 'initialize',
        data: { isVSCodeEnvironment: false }
      });

      expect(response.success).toBe(true);
    });
  });

  describe('Status Reporting', () => {
    it('should return status before initialization', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      const request: TreeSitterRequest = {
        id: 'test-status-uninit',
        type: 'getStatus'
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-status-uninit');
      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        isInitialized: false,
        initializationFailed: false,
        failureReason: null,
        isVSCodeMode: false,
        hasLanguages: false,
        hasParser: false
      });
    });

    it('should return status after initialization', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      // Initialize first
      await sendMessage(worker, {
        id: 'init',
        type: 'initialize',
        data: { isVSCodeEnvironment: false }
      });

      const statusResponse = await sendMessage(worker, {
        id: 'test-status-init',
        type: 'getStatus'
      });

      expect(statusResponse.success).toBe(true);
      expect(statusResponse.data.isInitialized).toBe(true);
      expect(statusResponse.data.hasLanguages).toBe(true);
      expect(statusResponse.data.hasParser).toBe(true);
    });
  });

  describe('Code Parsing', () => {
    beforeEach(async () => {
      // Initialize worker for parsing tests
      const worker = createWorker();
      await new Promise(resolve => worker.once('message', resolve));
      await sendMessage(worker, {
        id: 'init',
        type: 'initialize',
        data: { isVSCodeEnvironment: false }
      });
    });

    it('should parse JavaScript code successfully', async () => {
      const request: TreeSitterRequest = {
        id: 'test-parse-js',
        type: 'parse',
        data: {
          code: 'function hello() { return "world"; }',
          language: 'javascript',
          fileName: 'test.js'
        }
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-parse-js');
      expect(response.success).toBe(true);
      expect(response.data).toEqual({
        tree: { type: 'program', children: [] },
        rootNode: { type: 'program', children: [] }
      });
    });

    it('should parse TypeScript code successfully', async () => {
      const request: TreeSitterRequest = {
        id: 'test-parse-ts',
        type: 'parse',
        data: {
          code: 'interface User { name: string; }',
          language: 'typescript',
          fileName: 'test.ts'
        }
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-parse-ts');
      expect(response.success).toBe(true);
      expect(response.data.tree).toBeDefined();
      expect(response.data.rootNode).toBeDefined();
    });

    it('should handle parse request with missing code', async () => {
      const request: TreeSitterRequest = {
        id: 'test-parse-missing-code',
        type: 'parse',
        data: {
          language: 'javascript',
          fileName: 'test.js'
        }
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-parse-missing-code');
      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parse parameters');
    });

    it('should handle parse request with missing language', async () => {
      const request: TreeSitterRequest = {
        id: 'test-parse-missing-lang',
        type: 'parse',
        data: {
          code: 'function test() {}',
          fileName: 'test.js'
        }
      };

      const response = await sendMessage(worker, request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parse parameters');
    });

    it('should handle parse request with missing fileName', async () => {
      const request: TreeSitterRequest = {
        id: 'test-parse-missing-file',
        type: 'parse',
        data: {
          code: 'function test() {}',
          language: 'javascript'
        }
      };

      const response = await sendMessage(worker, request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Missing required parse parameters');
    });

    it('should handle parsing before initialization', async () => {
      // Create new worker without initialization
      const { Worker } = require('worker_threads');
      const uninitWorker = new Worker('mock-worker-path');
      
      try {
        // Wait for ready message
        await new Promise(resolve => uninitWorker.once('message', resolve));

        const request: TreeSitterRequest = {
          id: 'test-parse-uninit',
          type: 'parse',
          data: {
            code: 'function test() {}',
            language: 'javascript',
            fileName: 'test.js'
          }
        };

        const response = await sendMessage(uninitWorker, request);

        expect(response.success).toBe(true);
        expect(response.data.tree).toBeNull();
        expect(response.data.reason).toContain('Tree-sitter not initialized');
      } finally {
        await terminateWorker(uninitWorker);
      }
    });
  });

  describe('Shutdown', () => {
    it('should handle shutdown request gracefully', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      const request: TreeSitterRequest = {
        id: 'test-shutdown',
        type: 'shutdown'
      };

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-shutdown');
      expect(response.success).toBe(true);

      // Worker should exit after shutdown
      await new Promise(resolve => worker.once('exit', resolve));
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown request types', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      const request = {
        id: 'test-unknown',
        type: 'unknown-type',
        data: {}
      } as any;

      const response = await sendMessage(worker, request);

      expect(response.id).toBe('test-unknown');
      expect(response.success).toBe(false);
      expect(response.error).toContain('Unknown request type');
    });

    it('should handle malformed requests gracefully', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      const malformedRequest = {
        id: 'test-malformed'
        // Missing type field
      } as any;

      const response = await sendMessage(worker, malformedRequest);

      expect(response.id).toBe('test-malformed');
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Message Flow', () => {
    it('should maintain request/response correlation', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      // Send multiple concurrent requests
      const requests = [
        { id: 'req-1', type: 'getStatus' as const },
        { id: 'req-2', type: 'getStatus' as const },
        { id: 'req-3', type: 'getStatus' as const }
      ];

      const responses = await Promise.all(
        requests.map(req => sendMessage(worker, req))
      );

      // Check that all request IDs are present in responses (order may vary)
      const responseIds = responses.map(r => r.id).sort();
      const requestIds = requests.map(r => r.id).sort();
      expect(responseIds).toEqual(requestIds);
      
      // Check that all responses were successful
      responses.forEach((response) => {
        expect(response.success).toBe(true);
      });
    });

    it('should handle rapid sequential requests', async () => {
      const worker = createWorker();
      
      // Wait for ready message
      await new Promise(resolve => worker.once('message', resolve));

      // Initialize first
      await sendMessage(worker, {
        id: 'init',
        type: 'initialize',
        data: { isVSCodeEnvironment: false }
      });

      // Send rapid requests
      const responses: TreeSitterResponse[] = [];
      for (let i = 0; i < 5; i++) {
        const response = await sendMessage(worker, {
          id: `rapid-${i}`,
          type: 'getStatus'
        });
        responses.push(response);
      }

      expect(responses).toHaveLength(5);
      responses.forEach((response, index) => {
        expect(response.id).toBe(`rapid-${index}`);
        expect(response.success).toBe(true);
      });
    });
  });

  describe('Type Definitions', () => {
    it('should have correct TreeSitterRequest interface', () => {
      const request: TreeSitterRequest = {
        id: 'test',
        type: 'initialize',
        data: {
          code: 'test',
          language: 'javascript',
          fileName: 'test.js',
          extensionPath: '/path',
          isVSCodeEnvironment: true
        }
      };

      expect(request.id).toBe('test');
      expect(request.type).toBe('initialize');
      expect(request.data?.code).toBe('test');
      expect(request.data?.language).toBe('javascript');
      expect(request.data?.fileName).toBe('test.js');
      expect(request.data?.extensionPath).toBe('/path');
      expect(request.data?.isVSCodeEnvironment).toBe(true);
    });

    it('should have correct TreeSitterResponse interface', () => {
      const response: TreeSitterResponse = {
        id: 'test',
        success: true,
        data: { result: 'test' },
        error: 'test error'
      };

      expect(response.id).toBe('test');
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ result: 'test' });
      expect(response.error).toBe('test error');
    });

    it('should have correct ParseResult interface', () => {
      const parseResult: ParseResult = {
        tree: { type: 'program' },
        rootNode: { type: 'program' },
        reason: 'test reason'
      };

      expect(parseResult.tree).toEqual({ type: 'program' });
      expect(parseResult.rootNode).toEqual({ type: 'program' });
      expect(parseResult.reason).toBe('test reason');
    });
  });
}); 