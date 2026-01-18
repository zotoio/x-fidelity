/**
 * Fixture loader utility for Rule Builder GUI
 * 
 * This module provides a browser-compatible API for loading and querying
 * fixture data for rule simulation.
 */

import type {
  FixtureBundle,
  FileEntry,
  FileTreeNode,
  FileFilterOptions,
  FileSearchResult,
  FixtureInfo,
} from './types';
import { getFixtureInfo, getRulesForFile, getAvailableFixtures } from './metadata';

// Re-export types for convenience
export type {
  FixtureBundle,
  FileEntry,
  FileTreeNode,
  FileFilterOptions,
  FileSearchResult,
  FixtureInfo,
};

// Re-export metadata functions
export { getFixtureInfo, getRulesForFile, getAvailableFixtures };

/**
 * FixtureLoader provides methods for loading and querying fixture data
 */
export class FixtureLoader {
  private bundle: FixtureBundle | null = null;
  private loaded = false;

  /**
   * Load a fixture bundle by name
   * @param fixtureName - Name of the fixture to load (e.g., 'node-fullstack')
   */
  async load(fixtureName: string): Promise<void> {
    try {
      // Dynamic import of the JSON bundle
      // In Vite, JSON files are automatically parsed
      let bundleModule: { default: FixtureBundle };
      
      switch (fixtureName) {
        case 'node-fullstack':
          bundleModule = await import('./node-fullstack.json');
          break;
        default:
          throw new Error(`Unknown fixture: ${fixtureName}`);
      }
      
      this.bundle = bundleModule.default;
      this.loaded = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load fixture "${fixtureName}": ${message}`);
    }
  }

  /**
   * Check if a fixture is currently loaded
   */
  isLoaded(): boolean {
    return this.loaded && this.bundle !== null;
  }

  /**
   * Get the currently loaded bundle
   */
  getBundle(): FixtureBundle | null {
    return this.bundle;
  }

  /**
   * Get the name of the loaded fixture
   */
  getName(): string | null {
    return this.bundle?.name ?? null;
  }

  /**
   * Get file content by path
   * @param path - Relative path to the file
   * @returns File content or null if not found
   */
  getFile(path: string): string | null {
    if (!this.bundle) return null;
    const entry = this.bundle.files[path];
    return entry?.content ?? null;
  }

  /**
   * Get file entry with metadata
   * @param path - Relative path to the file
   * @returns File entry with content and metadata, or null if not found
   */
  getFileEntry(path: string): FileEntry | null {
    if (!this.bundle) return null;
    return this.bundle.files[path] ?? null;
  }

  /**
   * List all file paths in the fixture
   * @param options - Optional filter options
   * @returns Array of file paths
   */
  listFiles(options?: FileFilterOptions): string[] {
    if (!this.bundle) return [];

    let paths = Object.keys(this.bundle.files);

    if (options?.extensions) {
      const exts = options.extensions.map((e: string) => e.toLowerCase());
      paths = paths.filter((p: string) => {
        const entry = this.bundle?.files[p];
        return entry && exts.includes(entry.extension.toLowerCase());
      });
    }

    if (options?.pathPattern) {
      const pattern = options.pathPattern
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      const regex = new RegExp(pattern);
      paths = paths.filter(p => regex.test(p));
    }

    if (options?.maxSize !== undefined) {
      paths = paths.filter(p => {
        const entry = this.bundle?.files[p];
        return entry && entry.size <= (options.maxSize ?? Infinity);
      });
    }

    if (options?.directories) {
      paths = paths.filter((p: string) => {
        return options.directories?.some((dir: string) => p.startsWith(dir)) ?? false;
      });
    }

    if (options?.excludePatterns) {
      paths = paths.filter((p: string) => {
        const fileName = p.split('/').pop() ?? p;
        return !options.excludePatterns?.some((pattern: string) => {
          // Support exact match or simple glob patterns
          if (pattern.includes('*')) {
            const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
            return regex.test(fileName) || regex.test(p);
          }
          return fileName === pattern || p === pattern;
        });
      });
    }

    return paths.sort();
  }

  /**
   * Get the parsed package.json
   */
  getPackageJson(): Record<string, unknown> {
    return this.bundle?.packageJson ?? {};
  }

  /**
   * Get the file tree structure
   */
  getFileTree(): FileTreeNode[] {
    return this.bundle?.fileTree ?? [];
  }

  /**
   * Get fixture metadata
   */
  getMetadata(): FixtureBundle['metadata'] | null {
    return this.bundle?.metadata ?? null;
  }

  /**
   * Search for files containing a pattern
   * @param pattern - Text or regex pattern to search for
   * @param options - Optional filter options
   * @returns Array of search results
   */
  searchFiles(pattern: string | RegExp, options?: FileFilterOptions): FileSearchResult[] {
    if (!this.bundle) return [];

    const regex = typeof pattern === 'string' 
      ? new RegExp(pattern, 'gi') 
      : pattern;
    
    const results: FileSearchResult[] = [];
    const paths = this.listFiles(options);

    for (const filePath of paths) {
      const entry = this.bundle.files[filePath];
      if (!entry) continue;

      const lines = entry.content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i]?.match(regex);
        if (match) {
          results.push({
            path: filePath,
            extension: entry.extension,
            size: entry.size,
            snippet: lines[i]?.trim().substring(0, 100),
            lineNumber: i + 1,
          });
          break; // Only first match per file
        }
      }
    }

    return results;
  }

  /**
   * Get files by extension
   * @param extension - Extension to filter by (with or without dot)
   */
  getFilesByExtension(extension: string): string[] {
    const ext = extension.startsWith('.') ? extension : `.${extension}`;
    return this.listFiles({ extensions: [ext] });
  }

  /**
   * Get files in a specific directory
   * @param directory - Directory path (relative)
   */
  getFilesInDirectory(directory: string): string[] {
    const dir = directory.endsWith('/') ? directory : `${directory}/`;
    return this.listFiles({ directories: [dir] });
  }

  /**
   * Get rules that the currently loaded fixture triggers
   */
  getTriggeredRules(): string[] {
    return this.bundle?.metadata?.triggersRules ?? [];
  }

  /**
   * Get information about the currently loaded fixture
   */
  getFixtureInfo(): FixtureInfo | null {
    const name = this.getName();
    if (!name) return null;
    return getFixtureInfo(name) ?? null;
  }

  /**
   * Get rules that a specific file in the fixture might trigger
   * @param path - File path relative to fixture root
   */
  getRulesForFile(path: string): string[] {
    return getRulesForFile(path);
  }

  /**
   * Clear the loaded fixture
   */
  clear(): void {
    this.bundle = null;
    this.loaded = false;
  }
}

/**
 * Default singleton instance of FixtureLoader
 */
export const fixtureLoader = new FixtureLoader();

/**
 * Convenience function to load a fixture
 */
export async function loadFixture(name: string): Promise<FixtureLoader> {
  const loader = new FixtureLoader();
  await loader.load(name);
  return loader;
}
