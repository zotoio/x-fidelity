/**
 * Browser-compatible Dependency Facts
 * 
 * Provides dependency analysis from bundled package.json fixtures.
 */

import { BrowserFact, BrowserAlmanac, LocalDependencies, VersionData } from '../../types';
import { browserLogger } from '../../browserContext';

/**
 * Parse dependencies from package.json structure
 */
export function parseDependencies(packageJson: Record<string, unknown>): LocalDependencies[] {
  const dependencies: LocalDependencies[] = [];
  
  const addDeps = (deps: Record<string, string> | undefined, depType: string): void => {
    if (!deps || typeof deps !== 'object') return;
    
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === 'string') {
        // Clean version string (remove ^ ~ etc for comparison)
        const cleanVersion = version.replace(/^[\^~>=<]+/, '');
        dependencies.push({ name, version: cleanVersion });
        browserLogger.debug(`Found ${depType}: ${name}@${cleanVersion}`);
      }
    }
  };
  
  addDeps(packageJson.dependencies as Record<string, string> | undefined, 'dependency');
  addDeps(packageJson.devDependencies as Record<string, string> | undefined, 'devDependency');
  addDeps(packageJson.peerDependencies as Record<string, string> | undefined, 'peerDependency');
  
  return dependencies;
}

/**
 * Find dependencies that match minimum version requirements
 */
export function findVersionData(
  dependencies: LocalDependencies[],
  minimumVersions: Record<string, string>
): VersionData[] {
  const results: VersionData[] = [];
  
  for (const dep of dependencies) {
    const minVersion = minimumVersions[dep.name] || minimumVersions[`@${dep.name}`];
    if (minVersion) {
      results.push({
        dep: dep.name,
        ver: dep.version,
        min: minVersion,
      });
    }
  }
  
  return results;
}

/**
 * Simple semver comparison (browser-compatible)
 */
export function compareSemver(installed: string, required: string): boolean {
  // Clean versions
  const cleanInstalled = installed.replace(/^[\^~>=<]+/, '');
  const cleanRequired = required.replace(/^[\^~>=<]+/, '');
  
  // Split into parts
  const installedParts = cleanInstalled.split('.').map(p => parseInt(p, 10) || 0);
  const requiredParts = cleanRequired.split('.').map(p => parseInt(p, 10) || 0);
  
  // Pad to equal length
  while (installedParts.length < 3) installedParts.push(0);
  while (requiredParts.length < 3) requiredParts.push(0);
  
  // Compare major.minor.patch
  for (let i = 0; i < 3; i++) {
    const installedPart = installedParts[i] ?? 0;
    const requiredPart = requiredParts[i] ?? 0;
    if (installedPart > requiredPart) return true;
    if (installedPart < requiredPart) return false;
  }
  
  return true; // Equal versions
}

/**
 * Repository dependency versions fact
 */
export const repoDependencyVersionsFact: BrowserFact = {
  name: 'repoDependencyVersions',
  description: 'Extracts dependency versions from package.json',
  type: 'global',
  priority: 10,
  
  async calculate(params: unknown, almanac: BrowserAlmanac): Promise<VersionData[]> {
    const fixtureData = almanac._fixtureData;
    
    if (!fixtureData) {
      browserLogger.warn('repoDependencyVersionsFact: No fixture data available');
      return [];
    }
    
    const packageJson = fixtureData.packageJson;
    if (!packageJson) {
      browserLogger.warn('repoDependencyVersionsFact: No package.json in fixture data');
      return [];
    }
    
    const typedParams = params as {
      archetypeConfig?: {
        config?: {
          minimumDependencyVersions?: Record<string, string>;
        };
      };
    };
    
    const minimumVersions = typedParams?.archetypeConfig?.config?.minimumDependencyVersions || {};
    
    const localDependencies = parseDependencies(packageJson);
    browserLogger.debug(`repoDependencyVersionsFact: Found ${localDependencies.length} dependencies`);
    
    const versionData = findVersionData(localDependencies, minimumVersions);
    browserLogger.debug(`repoDependencyVersionsFact: ${versionData.length} dependencies match minimum version requirements`);
    
    return versionData;
  },
};

/**
 * Repository dependency analysis fact
 */
export const repoDependencyAnalysisFact: BrowserFact = {
  name: 'repoDependencyAnalysis',
  description: 'Analyzes dependencies for outdated versions',
  type: 'global-function',
  priority: 8,
  
  async calculate(params: unknown, almanac: BrowserAlmanac): Promise<Array<{
    dependency: string;
    currentVersion: string;
    requiredVersion: string;
  }>> {
    const typedParams = params as {
      resultFact?: string;
    };
    
    // Get installed versions from the repoDependencyVersions fact
    const installedVersions = await almanac.factValue<VersionData[]>('repoDependencyVersions');
    
    if (!installedVersions || installedVersions.length === 0) {
      browserLogger.debug('repoDependencyAnalysisFact: No installed versions found');
      return [];
    }
    
    const analysis: Array<{
      dependency: string;
      currentVersion: string;
      requiredVersion: string;
    }> = [];
    
    for (const versionData of installedVersions) {
      const isValid = compareSemver(versionData.ver, versionData.min);
      
      if (!isValid) {
        const failure = {
          dependency: versionData.dep,
          currentVersion: versionData.ver,
          requiredVersion: versionData.min,
        };
        
        browserLogger.debug(`Dependency failure: ${JSON.stringify(failure)}`);
        analysis.push(failure);
      }
    }
    
    // Add runtime fact if requested
    if (typedParams?.resultFact) {
      almanac.addRuntimeFact(typedParams.resultFact, analysis);
    }
    
    browserLogger.debug(`repoDependencyAnalysisFact: Found ${analysis.length} outdated dependencies`);
    return analysis;
  },
};
