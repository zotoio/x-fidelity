// Custom typedef for glob 11.0.3
// This ensures consistent typing across the entire monorepo

declare module 'glob' {
  export interface GlobOptions {
    cwd?: string;
    root?: string;
    dot?: boolean;
    nomount?: boolean;
    mark?: boolean;
    nosort?: boolean;
    stat?: boolean;
    silent?: boolean;
    strict?: boolean;
    cache?: { [path: string]: any };
    statCache?: { [path: string]: false | { isDirectory(): boolean } | null };
    symlinks?: { [path: string]: boolean | null };
    realpathCache?: { [path: string]: string };
    sync?: boolean;
    nounique?: boolean;
    nonull?: boolean;
    debug?: boolean;
    nobrace?: boolean;
    noglobstar?: boolean;
    noext?: boolean;
    nocase?: boolean;
    matchBase?: boolean;
    nodir?: boolean;
    ignore?: string | ReadonlyArray<string>;
    follow?: boolean;
    realpath?: boolean;
    nonegate?: boolean;
    nocomment?: boolean;
    absolute?: boolean;
    fs?: any;
    maxLength?: number;
    withFileTypes?: boolean;
    includeChildMatches?: boolean;
    platform?: NodeJS.Platform;
    windowsPathsNoEscape?: boolean;
    posix?: boolean;
    win32?: boolean;
  }

  export interface GlobOptionsWithFileTypesTrue extends GlobOptions {
    withFileTypes: true;
  }

  export interface GlobOptionsWithFileTypesFalse extends GlobOptions {
    withFileTypes?: false;
  }

  export interface GlobOptionsWithFileTypesUnset extends GlobOptions {
    withFileTypes?: undefined;
  }

  export type Path = string;

  export class Dirent {
    name: string;
    path: Path;
    parent?: Dirent;
    constructor(name: string, type?: number, parent?: Dirent);
    isFile(): boolean;
    isDirectory(): boolean;
    isSymbolicLink(): boolean;
    isUnknown(): boolean;
    isBlockDevice(): boolean;
    isCharacterDevice(): boolean;
    isFIFO(): boolean;
    isSocket(): boolean;
    fullpath(): string;
    fullpathPosix(): string;
  }

  // Main glob function overloads
  export function glob(pattern: string, options: GlobOptionsWithFileTypesTrue): Promise<Dirent[]>;
  export function glob(pattern: string, options: GlobOptionsWithFileTypesFalse): Promise<string[]>;
  export function glob(pattern: string, options: GlobOptionsWithFileTypesUnset): Promise<string[]>;
  export function glob(pattern: string): Promise<string[]>;

  // Sync versions
  export function globSync(pattern: string, options: GlobOptionsWithFileTypesTrue): Dirent[];
  export function globSync(pattern: string, options: GlobOptionsWithFileTypesFalse): string[];
  export function globSync(pattern: string, options: GlobOptionsWithFileTypesUnset): string[];
  export function globSync(pattern: string): string[];

  // Stream version
  export function globStream(pattern: string, options?: GlobOptions): NodeJS.ReadableStream;

  // Iterator version
  export function globIterate(pattern: string, options?: GlobOptions): AsyncIterable<string>;
  export function globIterateSync(pattern: string, options?: GlobOptions): Iterable<string>;

  // Escape function
  export function escape(s: string): string;
  export function unescape(s: string): string;

  // Default export for backward compatibility
  declare const _default: {
    glob: typeof glob;
    globSync: typeof globSync;
    globStream: typeof globStream;
    globIterate: typeof globIterate;
    globIterateSync: typeof globIterateSync;
    Glob: any;
    hasMagic: (pattern: string, options?: GlobOptions) => boolean;
    escape: typeof escape;
    unescape: typeof unescape;
  };

  export default _default;

  // Additional utility exports
  export function hasMagic(pattern: string, options?: GlobOptions): boolean;

  // For backward compatibility with older glob versions
  export const Glob: any;
} 