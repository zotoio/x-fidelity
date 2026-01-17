/**
 * Manifest Location Parser
 * 
 * Parses manifest files (package.json, build.gradle, etc.) to find
 * precise line and column locations for dependencies.
 * 
 * This enables highlighting dependency issues directly in the manifest files.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@x-fidelity/core';
import type { DependencyLocation } from '@x-fidelity/types';

// Re-export for convenience
export type { DependencyLocation } from '@x-fidelity/types';

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
 * Clear the manifest cache (useful for testing)
 */
export function clearManifestCache(): void {
    manifestCache.clear();
}

/**
 * Parse package.json and extract dependency locations
 * 
 * @param repoPath - Path to the repository root
 * @returns Map of dependency names to their locations
 */
export async function parsePackageJsonLocations(repoPath: string): Promise<Map<string, DependencyLocation>> {
    const packageJsonPath = path.join(repoPath, 'package.json');
    
    try {
        if (!fs.existsSync(packageJsonPath)) {
            logger.debug(`No package.json found at ${packageJsonPath}`);
            return new Map();
        }
        
        const stats = fs.statSync(packageJsonPath);
        const mtime = stats.mtime.getTime();
        
        // Check cache
        const cached = manifestCache.get(packageJsonPath);
        if (cached && cached.mtime === mtime) {
            logger.debug('Using cached package.json locations');
            return cached.locations;
        }
        
        const content = fs.readFileSync(packageJsonPath, 'utf-8');
        const locations = parsePackageJsonContent(content, packageJsonPath);
        
        // Cache the result
        manifestCache.set(packageJsonPath, {
            content,
            mtime,
            locations
        });
        
        logger.debug(`Parsed ${locations.size} dependency locations from package.json`);
        return locations;
        
    } catch (error) {
        logger.error(`Error parsing package.json locations: ${error}`);
        return new Map();
    }
}

/**
 * Parse package.json content and extract dependency locations
 * Uses a text-based approach to find exact line/column positions
 */
function parsePackageJsonContent(content: string, filePath: string): Map<string, DependencyLocation> {
    const locations = new Map<string, DependencyLocation>();
    const lines = content.split('\n');
    
    // Sections that contain dependencies
    const dependencySections = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'bundledDependencies',
        'bundleDependencies'
    ];
    
    let currentSection: string | null = null;
    let braceDepth = 0;
    let inDependencySection = false;
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const lineNumber = lineIndex + 1; // 1-based
        
        // Track brace depth to know when we exit a section
        for (const char of line) {
            if (char === '{') braceDepth++;
            if (char === '}') braceDepth--;
        }
        
        // Check if we're entering a dependency section
        for (const section of dependencySections) {
            const sectionMatch = line.match(new RegExp(`"${section}"\\s*:\\s*\\{?`));
            if (sectionMatch) {
                currentSection = section;
                inDependencySection = true;
                // If opening brace is on the same line, we're in the section
                if (line.includes('{')) {
                    braceDepth = line.split('{').length - line.split('}').length;
                }
                continue;
            }
        }
        
        // If we're in a dependency section, look for dependency entries
        if (inDependencySection && currentSection) {
            // Match dependency entries: "package-name": "version"
            // Handles various formats:
            // - "react": "^18.0.0"
            // - "@scope/package": "1.0.0"
            const depMatch = line.match(/^\s*"([^"]+)"\s*:\s*"([^"]+)"/);
            
            if (depMatch) {
                const [fullMatch, depName, version] = depMatch;
                const columnStart = line.indexOf(`"${depName}"`) + 1; // 1-based, start of quotes
                const columnEnd = line.lastIndexOf('"') + 2; // After the closing quote of version
                
                locations.set(depName, {
                    manifestPath: filePath,
                    lineNumber,
                    columnNumber: columnStart + 1, // Start after the opening quote
                    endLineNumber: lineNumber,
                    endColumnNumber: columnEnd,
                    section: currentSection,
                    lineContent: line.trim()
                });
            }
            
            // Check if we've exited the dependency section (closing brace at depth 1)
            if (line.includes('}') && braceDepth <= 1) {
                inDependencySection = false;
                currentSection = null;
            }
        }
    }
    
    return locations;
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
