/**
 * Fixture Types for Rule Builder GUI
 * 
 * Type definitions for fixture bundles and file data.
 */

/**
 * A single file entry in the fixture bundle
 */
export interface FileEntry {
  /** File content */
  content: string;
  /** File extension (with leading dot) */
  extension: string;
  /** File size in bytes */
  size: number;
}

/**
 * A node in the file tree structure
 */
export interface FileTreeNode {
  /** Name of the file or directory */
  name: string;
  /** Type: 'file' or 'directory' */
  type: string;
  /** Full path relative to root */
  path: string;
  /** Children nodes (for directories) */
  children?: FileTreeNode[];
  /** File extension (for files only) */
  extension?: string;
  /** File size in bytes (for files only) */
  size?: number;
}

/**
 * The complete fixture bundle structure
 */
export interface FixtureBundle {
  /** Name of the fixture */
  name: string;
  /** Description of the fixture */
  description?: string;
  /** Version of the bundle format */
  version?: string;
  /** Timestamp of bundle generation */
  generatedAt?: string;
  /** Total number of files */
  fileCount?: number;
  /** Total size of all files */
  totalSize?: number;
  /** Map of file paths to file entries */
  files: Record<string, FileEntry>;
  /** Hierarchical file tree */
  fileTree: FileTreeNode[];
  /** Parsed package.json content */
  packageJson: Record<string, unknown>;
  /** Metadata about the fixture (optional for JSON compatibility) */
  metadata?: {
    archetype?: string;
    description?: string;
    triggersRules?: string[];
  };
}

/**
 * Options for filtering files
 */
export interface FileFilterOptions {
  /** Filter by file extensions */
  extensions?: string[];
  /** Filter by path pattern (glob-like) */
  pathPattern?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Directories to include */
  directories?: string[];
  /** File names or patterns to exclude */
  excludePatterns?: string[];
}

/**
 * Result of a file search
 */
export interface FileSearchResult {
  /** File path */
  path: string;
  /** File extension */
  extension: string;
  /** File size */
  size: number;
  /** Matching snippet */
  snippet?: string;
  /** Line number of first match */
  lineNumber?: number;
}

/**
 * Information about a fixture for the UI
 */
export interface FixtureInfo {
  /** Unique identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description of the fixture */
  description: string;
  /** Associated archetype */
  archetype: string;
  /** List of rules this fixture triggers */
  triggersRules: string[];
  /** Key files to highlight */
  keyFiles: string[];
}
