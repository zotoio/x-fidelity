/**
 * Manifest Location Parser
 * 
 * Parses manifest files (package.json, build.gradle, etc.) to find
 * precise line and column locations for dependencies.
 * 
 * This enables highlighting dependency issues directly in the manifest files.
 * 
 * Supports workspaces:
 * - yarn workspaces (package.json "workspaces" field)
 * - pnpm workspaces (pnpm-workspace.yaml)
 * - npm workspaces (package.json "workspaces" field)
 * 
 * Supports dependency override/resolution fields:
 * - dependencies, devDependencies, peerDependencies, optionalDependencies
 * - bundledDependencies, bundleDependencies
 * - resolutions (Yarn classic - override transitive dependency versions)
 * - overrides (npm 8.3+ - similar to resolutions)
 * - pnpm.overrides (pnpm equivalent)
 * 
 * Handles resolution/override patterns:
 * - Simple: "lodash": "4.17.21"
 * - Glob patterns: "**\/lodash": "4.17.21", "react/*": "18.0.0"
 * - Version constraints: "@scope/package@1.0.0": "2.0.0"
 * - Nested resolutions: "parent/child": "1.0.0"
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@x-fidelity/core';
import type { DependencyLocation } from '@x-fidelity/types';
import * as yaml from 'js-yaml';

// Re-export for convenience
export type { DependencyLocation } from '@x-fidelity/types';

/**
 * Represents a dependency with its declared version from package.json
 */
export interface DeclaredDependency {
    name: string;
    version: string;
    section: string;
    manifestPath: string;
}

/**
 * Cache for parsed manifest locations to avoid re-parsing
 */
interface ManifestCache {
    content: string;
    mtime: number;
    locations: Map<string, DependencyLocation>;
}

const manifestCache = new Map<string, ManifestCache>();

/**
 * Cache for workspace package.json paths
 */
interface WorkspaceCache {
    mtime: number;
    packagePaths: string[];
}

const workspaceCache = new Map<string, WorkspaceCache>();

/**
 * Clear the manifest cache (useful for testing)
 */
export function clearManifestCache(): void {
    manifestCache.clear();
    workspaceCache.clear();
}

/**
 * Expand glob patterns to match files/directories
 * Simple implementation for workspace patterns like "packages/*"
 */
function expandGlobPattern(repoPath: string, pattern: string): string[] {
    const results: string[] = [];
    
    // Handle negation patterns (e.g., "!packages/internal")
    if (pattern.startsWith('!')) {
        return []; // Skip negation patterns for now
    }
    
    // Split pattern into parts
    const parts = pattern.split('/');
    let currentPaths = [repoPath];
    
    for (const part of parts) {
        const nextPaths: string[] = [];
        
        for (const currentPath of currentPaths) {
            if (part === '*' || part === '**') {
                // Wildcard - match all directories
                try {
                    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                            nextPaths.push(path.join(currentPath, entry.name));
                        }
                    }
                } catch (error) {
                    logger.debug(`Unable to read directory ${currentPath}: ${error}`);
                }
            } else if (part.includes('*')) {
                // Pattern like "package-*"
                const regex = new RegExp('^' + part.replace(/\*/g, '.*') + '$');
                try {
                    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory() && regex.test(entry.name)) {
                            nextPaths.push(path.join(currentPath, entry.name));
                        }
                    }
                } catch (error) {
                    logger.debug(`Unable to read directory ${currentPath} for pattern ${part}: ${error}`);
                }
            } else {
                // Exact match
                const fullPath = path.join(currentPath, part);
                if (fs.existsSync(fullPath)) {
                    nextPaths.push(fullPath);
                }
            }
        }
        
        currentPaths = nextPaths;
    }
    
    return currentPaths;
}

/**
 * Get workspace package paths from pnpm-workspace.yaml
 */
function getPnpmWorkspacePackages(repoPath: string): string[] {
    const workspaceFile = path.join(repoPath, 'pnpm-workspace.yaml');
    
    if (!fs.existsSync(workspaceFile)) {
        return [];
    }
    
    try {
        const content = fs.readFileSync(workspaceFile, 'utf-8');
        const config = yaml.load(content) as { packages?: string[] };
        
        if (!config.packages || !Array.isArray(config.packages)) {
            return [];
        }
        
        const packagePaths: string[] = [];
        for (const pattern of config.packages) {
            const expanded = expandGlobPattern(repoPath, pattern);
            packagePaths.push(...expanded);
        }
        
        return packagePaths;
    } catch (error) {
        logger.debug(`Error reading pnpm-workspace.yaml: ${error}`);
        return [];
    }
}

/**
 * Get workspace package paths from package.json workspaces field
 * (Used by yarn and npm workspaces)
 */
function getPackageJsonWorkspaces(repoPath: string): string[] {
    const packageJsonPath = path.join(repoPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
        return [];
    }
    
    try {
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const pkg = JSON.parse(content);
        
        let patterns: string[] = [];
        
        if (Array.isArray(pkg.workspaces)) {
            patterns = pkg.workspaces;
        } else if (pkg.workspaces && Array.isArray(pkg.workspaces.packages)) {
            // Yarn workspaces with nohoist
            patterns = pkg.workspaces.packages;
        }
        
        if (patterns.length === 0) {
            return [];
        }
        
        const packagePaths: string[] = [];
        for (const pattern of patterns) {
            const expanded = expandGlobPattern(repoPath, pattern);
            packagePaths.push(...expanded);
        }
        
        return packagePaths;
    } catch (error) {
        logger.debug(`Error reading package.json workspaces: ${error}`);
        return [];
    }
}

/**
 * Get all workspace package paths (pnpm, yarn, npm workspaces)
 */
function getWorkspacePackagePaths(repoPath: string): string[] {
    // Check cache
    const rootPackageJson = path.join(repoPath, 'package.json');
    const pnpmWorkspace = path.join(repoPath, 'pnpm-workspace.yaml');
    
    try {
        const cacheKey = repoPath;
        let latestMtime = 0;
        
        if (fs.existsSync(rootPackageJson)) {
            latestMtime = Math.max(latestMtime, fs.statSync(rootPackageJson).mtime.getTime());
        }
        if (fs.existsSync(pnpmWorkspace)) {
            latestMtime = Math.max(latestMtime, fs.statSync(pnpmWorkspace).mtime.getTime());
        }
        
        const cached = workspaceCache.get(cacheKey);
        if (cached && cached.mtime === latestMtime) {
            return cached.packagePaths;
        }
        
        // Try pnpm workspaces first
        let packagePaths = getPnpmWorkspacePackages(repoPath);
        
        // If no pnpm workspaces, try yarn/npm workspaces
        if (packagePaths.length === 0) {
            packagePaths = getPackageJsonWorkspaces(repoPath);
        }
        
        // Cache the result
        workspaceCache.set(cacheKey, {
            mtime: latestMtime,
            packagePaths
        });
        
        logger.debug(`Found ${packagePaths.length} workspace packages`);
        return packagePaths;
    } catch (error) {
        logger.debug(`Error getting workspace packages: ${error}`);
        return [];
    }
}

/**
 * Parse a single package.json and extract dependency locations
 * @param packageJsonPath - Absolute path to the package.json file
 * @param repoPath - Repository root path (used to make manifest paths relative)
 */
function parseSinglePackageJson(packageJsonPath: string, repoPath?: string): Map<string, DependencyLocation> {
    try {
        if (!fs.existsSync(packageJsonPath)) {
            return new Map();
        }
        
        const stats = fs.statSync(packageJsonPath);
        const mtime = stats.mtime.getTime();
        
        // Create cache key that includes repoPath for relative path handling
        const cacheKey = repoPath ? `${packageJsonPath}:${repoPath}` : packageJsonPath;
        
        // Check cache
        const cached = manifestCache.get(cacheKey);
        if (cached && cached.mtime === mtime) {
            return cached.locations;
        }
        
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        
        // Use relative path for manifestPath if repoPath is provided
        const manifestPath = repoPath ? path.relative(repoPath, packageJsonPath) : packageJsonPath;
        const locations = parsePackageJsonContent(content, manifestPath);
        
        // Cache the result
        manifestCache.set(cacheKey, {
            content,
            mtime,
            locations
        });
        
        return locations;
    } catch (error) {
        logger.debug(`Error parsing ${packageJsonPath}: ${error}`);
        return new Map();
    }
}

/**
 * Parse package.json files and extract dependency locations
 * Supports workspaces (yarn, pnpm, npm) - parses all workspace package.json files
 * 
 * @param repoPath - Path to the repository root (can be relative or absolute)
 * @returns Map of dependency names to their locations
 */
export async function parsePackageJsonLocations(repoPath: string): Promise<Map<string, DependencyLocation>> {
    const allLocations = new Map<string, DependencyLocation>();
    
    // Resolve to absolute path to ensure consistent behavior
    const absoluteRepoPath = path.resolve(repoPath);
    
    try {
        // Parse root package.json
        const rootPackageJson = path.join(absoluteRepoPath, 'package.json');
        const rootLocations = parseSinglePackageJson(rootPackageJson, absoluteRepoPath);
        for (const [name, location] of rootLocations) {
            allLocations.set(name, location);
        }
        
        // Parse workspace package.json files
        const workspacePackages = getWorkspacePackagePaths(absoluteRepoPath);
        for (const packagePath of workspacePackages) {
            const packageJsonPath = path.join(packagePath, 'package.json');
            const locations = parseSinglePackageJson(packageJsonPath, absoluteRepoPath);
            
            // Merge locations (workspace packages take precedence for their own deps)
            for (const [name, location] of locations) {
                // Only override if not already set (root takes precedence)
                // Actually, for precision, we might want the most specific location
                // For now, first found wins - this matches common monorepo patterns
                if (!allLocations.has(name)) {
                    allLocations.set(name, location);
                }
            }
        }
        
        logger.debug(`Parsed ${allLocations.size} dependency locations from ${1 + workspacePackages.length} package.json files`);
        return allLocations;
        
    } catch (error) {
        logger.error(`Error parsing package.json locations: ${error}`);
        return new Map();
    }
}

/**
 * Parse package.json content and extract dependency locations
 * Uses a text-based approach to find exact line/column positions
 * 
 * Supports:
 * - Standard dependency sections (dependencies, devDependencies, etc.)
 * - Yarn resolutions (resolutions field)
 * - npm overrides (overrides field) 
 * - pnpm overrides (pnpm.overrides field)
 */
function parsePackageJsonContent(content: string, filePath: string): Map<string, DependencyLocation> {
    const locations = new Map<string, DependencyLocation>();
    const lines = content.split('\n');
    
    // Sections that contain dependencies (top-level simple objects)
    const simpleDependencySections = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'bundledDependencies',
        'bundleDependencies',
        'resolutions',    // Yarn classic resolutions
        'overrides'       // npm 8.3+ overrides
    ];
    
    let currentSection: string | null = null;
    let inPnpmSection = false;
    let pnpmBraceDepth = 0;
    let sectionBraceDepth = 0;
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1; // 1-based
        
        // Count braces on this line
        const openBraces = (line.match(/\{/g) || []).length;
        const closeBraces = (line.match(/\}/g) || []).length;
        
        // Check for entering pnpm section
        if (!inPnpmSection && !currentSection) {
            const pnpmMatch = line.match(/"pnpm"\s*:\s*\{/);
            if (pnpmMatch) {
                inPnpmSection = true;
                pnpmBraceDepth = 1;
                continue;
            }
        }
        
        // If we're in pnpm section but not in a subsection, look for overrides
        if (inPnpmSection && !currentSection) {
            const overridesMatch = line.match(/"overrides"\s*:\s*\{/);
            if (overridesMatch) {
                currentSection = 'pnpm.overrides';
                sectionBraceDepth = 1;
                continue;
            }
            
            // Track pnpm brace depth
            pnpmBraceDepth += openBraces - closeBraces;
            if (pnpmBraceDepth <= 0) {
                inPnpmSection = false;
                pnpmBraceDepth = 0;
            }
            continue;
        }
        
        // Check if we're entering a simple dependency section (only at top level)
        if (!currentSection && !inPnpmSection) {
            for (const section of simpleDependencySections) {
                const sectionMatch = line.match(new RegExp(`"${section}"\\s*:\\s*\\{`));
                if (sectionMatch) {
                    currentSection = section;
                    sectionBraceDepth = 1;
                    break;
                }
            }
            if (currentSection) {
                continue;
            }
        }
        
        // If we're in a dependency section, look for dependency entries
        if (currentSection) {
            // Match dependency entries: "package-name": "version"
            // Handles various formats:
            // - "react": "^18.0.0"
            // - "@scope/package": "1.0.0"
            // - "react/*": "18.0.0" (resolutions glob patterns)
            // - "**/lodash": "4.17.21" (resolutions with ** prefix)
            // - "@scope/package@1.0.0": "2.0.0" (resolutions with version constraint)
            const depMatch = line.match(/^\s*"([^"]+)"\s*:\s*"([^"]+)"/);
            
            if (depMatch) {
                const [, depName] = depMatch;
                const columnStart = line.indexOf(`"${depName}"`) + 1; // 1-based, start of quotes
                const columnEnd = line.lastIndexOf('"') + 2; // After the closing quote of version
                
                // Normalize dependency name for resolutions/overrides
                // Remove glob patterns and version constraints for lookup
                const normalizedName = normalizeDependencyName(depName);
                
                // Store with both the original and normalized name for flexibility
                const locationData: DependencyLocation = {
                    manifestPath: filePath,
                    lineNumber,
                    columnNumber: columnStart + 1, // Start after the opening quote
                    endLineNumber: lineNumber,
                    endColumnNumber: columnEnd,
                    section: currentSection,
                    lineContent: line.trim()
                };
                
                // Use original name as key (for exact matches)
                locations.set(depName, locationData);
                
                // Also store normalized name if different (for flexible lookup)
                if (normalizedName !== depName && !locations.has(normalizedName)) {
                    locations.set(normalizedName, locationData);
                }
            }
            
            // Update section brace depth
            sectionBraceDepth += openBraces - closeBraces;
            
            // Check if we've exited the current section
            if (sectionBraceDepth <= 0) {
                // If we were in pnpm.overrides, stay in pnpm section
                if (currentSection === 'pnpm.overrides') {
                    // Adjust pnpm brace depth for the closing brace we just processed
                    pnpmBraceDepth += openBraces - closeBraces - 1; // -1 for the section close
                }
                currentSection = null;
                sectionBraceDepth = 0;
            }
        }
    }
    
    return locations;
}

/**
 * Normalize dependency name from resolutions/overrides format
 * Removes glob patterns, version constraints, and path prefixes
 * 
 * Examples:
 * - "react" → "react"
 * - "react/*" → "react"
 * - "**\/lodash" → "lodash"
 * - "@scope/package" → "@scope/package"
 * - "@scope/package@1.0.0" → "@scope/package"
 * - "parent/child" → "child" (for nested resolution)
 */
function normalizeDependencyName(name: string): string {
    let normalized = name;
    
    // Remove ** prefix (yarn resolution glob)
    if (normalized.startsWith('**/')) {
        normalized = normalized.substring(3);
    }
    
    // Remove /* suffix (yarn resolution glob)
    if (normalized.endsWith('/*')) {
        normalized = normalized.slice(0, -2);
    }
    
    // Handle version constraint in name like "@scope/package@1.0.0"
    // But be careful with scoped packages that start with @
    if (normalized.includes('@') && !normalized.startsWith('@')) {
        // Non-scoped with version: "lodash@4.0.0" → "lodash"
        normalized = normalized.split('@')[0];
    } else if (normalized.startsWith('@')) {
        // Scoped package: check if there's a version after the package name
        // "@scope/package@1.0.0" → "@scope/package"
        const parts = normalized.split('@');
        if (parts.length === 3) {
            // ['', 'scope/package', '1.0.0']
            normalized = `@${parts[1]}`;
        }
    }
    
    // Handle nested resolution paths like "package-a/lodash"
    // In this case, we want "lodash" (the actual dependency)
    // But NOT for scoped packages like "@scope/package"
    if (!normalized.startsWith('@') && normalized.includes('/')) {
        // Take the last segment as the actual package name
        const segments = normalized.split('/');
        normalized = segments[segments.length - 1];
    }
    
    return normalized;
}

/**
 * Extract the root dependency name from a dependency path
 * Handles scoped packages correctly:
 * - "react" → "react"
 * - "lodash/deep" → "lodash" (transitive dep)
 * - "@scope/package" → "@scope/package"
 * - "@scope/package/subdep" → "@scope/package" (transitive dep)
 * - "@x-fidelity/core/react" → "@x-fidelity/core" (react is transitive of @x-fidelity/core)
 */
function extractRootDependency(dependencyPath: string): { rootDep: string; isTransitive: boolean } {
    if (!dependencyPath.includes('/')) {
        // Simple package name like "react"
        return { rootDep: dependencyPath, isTransitive: false };
    }
    
    if (dependencyPath.startsWith('@')) {
        // Scoped package - need to include the scope and package name
        // @scope/package or @scope/package/subdep
        const parts = dependencyPath.split('/');
        if (parts.length === 2) {
            // Just "@scope/package" - not transitive
            return { rootDep: dependencyPath, isTransitive: false };
        } else {
            // "@scope/package/subdep/..." - transitive dep
            // Root is "@scope/package"
            return { rootDep: `${parts[0]}/${parts[1]}`, isTransitive: true };
        }
    } else {
        // Non-scoped with path like "lodash/deep"
        // Root is "lodash"
        return { rootDep: dependencyPath.split('/')[0], isTransitive: true };
    }
}

/**
 * Get location for a specific dependency from package.json
 * 
 * @param repoPath - Path to the repository root
 * @param dependencyName - Name of the dependency (may include path like "parent/child")
 * @returns Location info if found, null otherwise
 */
export async function getDependencyLocation(
    repoPath: string, 
    dependencyName: string
): Promise<DependencyLocation | null> {
    const locations = await parsePackageJsonLocations(repoPath);
    
    // Extract the root dependency name, handling scoped packages correctly
    const { rootDep } = extractRootDependency(dependencyName);
    
    // Handle scoped packages (e.g., @scope/package might be stored with or without @)
    let location = locations.get(rootDep);
    
    if (!location && rootDep.startsWith('@')) {
        // Try without @ prefix (unlikely but for compatibility)
        location = locations.get(rootDep.substring(1));
    }
    
    if (!location && !rootDep.startsWith('@')) {
        // Try with @ prefix
        location = locations.get(`@${rootDep}`);
    }
    
    return location || null;
}

/**
 * Enhance dependency failure with location information
 * 
 * @param failure - The dependency failure object from analysis
 * @param repoPath - Path to the repository root
 * @returns Enhanced failure with location info, or original if location not found
 */
export async function enhanceDependencyFailureWithLocation(
    failure: {
        dependency: string;
        currentVersion: string;
        requiredVersion: string;
        [key: string]: any;
    },
    repoPath: string
): Promise<{
    dependency: string;
    currentVersion: string;
    requiredVersion: string;
    location?: DependencyLocation;
    isTransitive?: boolean;
    [key: string]: any;
}> {
    const location = await getDependencyLocation(repoPath, failure.dependency);
    
    // Determine if this is a transitive dependency using proper scoped package handling
    const { isTransitive } = extractRootDependency(failure.dependency);
    
    if (location) {
        return {
            ...failure,
            location,
            isTransitive
        };
    }
    
    // If location not found but it's a transitive dep, note that
    if (isTransitive) {
        return {
            ...failure,
            isTransitive,
            locationNote: 'Transitive dependency - not directly defined in package.json'
        };
    }
    
    return failure;
}

/**
 * Batch enhance multiple dependency failures with locations
 * More efficient than calling enhanceDependencyFailureWithLocation for each
 */
export async function enhanceDependencyFailuresWithLocations(
    failures: Array<{
        dependency: string;
        currentVersion: string;
        requiredVersion: string;
        [key: string]: any;
    }>,
    repoPath: string
): Promise<Array<{
    dependency: string;
    currentVersion: string;
    requiredVersion: string;
    location?: DependencyLocation;
    isTransitive?: boolean;
    [key: string]: any;
}>> {
    // Parse locations once for all failures
    const locations = await parsePackageJsonLocations(repoPath);
    
    return failures.map(failure => {
        // Extract the root dependency name, handling scoped packages correctly
        const { rootDep, isTransitive } = extractRootDependency(failure.dependency);
        
        // Try to find location with various name formats
        let location = locations.get(rootDep);
        
        if (!location && rootDep.startsWith('@')) {
            location = locations.get(rootDep.substring(1));
        }
        
        if (!location && !rootDep.startsWith('@')) {
            location = locations.get(`@${rootDep}`);
        }
        
        if (location) {
            return {
                ...failure,
                location,
                isTransitive
            };
        }
        
        if (isTransitive) {
            return {
                ...failure,
                isTransitive,
                locationNote: 'Transitive dependency - not directly defined in package.json'
            };
        }
        
        return failure;
    });
}
