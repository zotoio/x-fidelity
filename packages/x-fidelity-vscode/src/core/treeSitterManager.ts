import { Parser } from 'web-tree-sitter';
import * as vscode from 'vscode';
import * as path from 'path';
import { createComponentLogger } from '../utils/globalLogger';

export class TreeSitterManager {
  private static instance: TreeSitterManager;
  private parser: Parser | null = null;
  private initialized = false;
  private logger;
  private loadedLanguages = new Set<string>();

  constructor() {
    this.logger = createComponentLogger('TreeSitterManager');
  }

  static getInstance(): TreeSitterManager {
    if (!TreeSitterManager.instance) {
      TreeSitterManager.instance = new TreeSitterManager();
    }
    return TreeSitterManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug('TreeSitter WASM already initialized');
      return;
    }

    try {
      this.logger.info('🚀 Initializing TreeSitter WASM...');

      // For Node.js environments (like VSCode extension), we need a simpler approach
      // without locateFile which is primarily for browsers
      await Parser.init();

      this.parser = new Parser();
      this.initialized = true;

      this.logger.info('✅ TreeSitter WASM initialized successfully');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ TreeSitter WASM initialization failed: ${errorMessage}`,
        { error }
      );

      // Don't throw - let the extension continue without TreeSitter
      this.initialized = false;
    }
  }

  async loadLanguage(languageName: string): Promise<void> {
    if (!this.parser) {
      throw new Error('Parser not initialized. Call initialize() first.');
    }

    if (this.loadedLanguages.has(languageName)) {
      this.logger.debug(`Language ${languageName} already loaded`);
      return;
    }

    try {
      const extension = vscode.extensions.getExtension(
        'zotoio.x-fidelity-vscode'
      );
      const extensionPath = extension!.extensionPath;

      // Map language names to the correct WASM file names
      const languageMap: Record<string, string> = {
        javascript: 'tree-sitter-javascript.wasm',
        typescript: 'tree-sitter-typescript.wasm',
        tsx: 'tree-sitter-tsx.wasm'
      };

      const wasmFileName =
        languageMap[languageName] || `tree-sitter-${languageName}.wasm`;
      const wasmPath = path.join(extensionPath, 'dist', 'wasm', wasmFileName);

      this.logger.debug(`Loading language ${languageName} from: ${wasmPath}`);

      // Check if file exists before trying to load
      const fs = require('fs');
      if (!fs.existsSync(wasmPath)) {
        throw new Error(`WASM file not found: ${wasmPath}`);
      }

      // For Node.js environments, use direct file path instead of file:// URL
      const Language = await Parser.Language.load(wasmPath);
      this.parser.setLanguage(Language);
      this.loadedLanguages.add(languageName);

      this.logger.info(`✅ Language ${languageName} loaded successfully`);
    } catch (error) {
      this.logger.error(`❌ Failed to load language ${languageName}:`, error);
      throw new Error(`Failed to load language ${languageName}: ${error}`);
    }
  }

  getParser(): Parser {
    if (!this.parser) {
      throw new Error('Parser not initialized. Call initialize() first.');
    }
    return this.parser;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getLoadedLanguages(): string[] {
    return Array.from(this.loadedLanguages);
  }

  async parse(code: string, languageName?: string): Promise<Parser.Tree> {
    if (!this.parser) {
      throw new Error('Parser not initialized. Call initialize() first.');
    }

    // Load language if specified and not already loaded
    if (languageName && !this.loadedLanguages.has(languageName)) {
      await this.loadLanguage(languageName);
    }

    return this.parser.parse(code);
  }

  dispose(): void {
    if (this.parser) {
      this.parser.delete();
      this.parser = null;
    }
    this.initialized = false;
    this.loadedLanguages.clear();
    this.logger.info('TreeSitter manager disposed');
  }
}
