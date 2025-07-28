/**
 * Centralized Coverage Thresholds Configuration
 * 
 * This file defines coverage thresholds for all packages in the X-Fidelity monorepo.
 * Individual package jest.config.js files should import and use these thresholds
 * to ensure consistency across the codebase.
 */

/** @type {import('jest').Config['coverageThreshold']} */
const coverageThresholds = {
  // Global thresholds applied to the entire codebase
  // These are set based on current coverage levels with room for improvement
  global: {
    statements: 35,  // Current: 36.79%
    branches: 35,    // Current: 39.27%
    functions: 30,   // Current: 33.09%
    lines: 35        // Setting a baseline for lines coverage
  },
  
  // Package-specific thresholds based on current coverage levels
  // Targets are set slightly above current levels to encourage improvement
  "packages/x-fidelity-core/": {
    statements: 60.0,  // Current: ~58%
    branches: 50.0,    // Current: ~48%
    functions: 55.0,   // Current: ~52%
    lines: 60.0        // Current: ~58%
  },
  
  "packages/x-fidelity-cli/": {
    statements: 45.0,  // Current: ~40%
    branches: 45.0,    // Current: ~40%
    functions: 45.0,   // Current: ~40%
    lines: 45.0        // Current: ~40%
  },
  
  "packages/x-fidelity-plugins/": {
    statements: 55.0,  // Current: ~52.9%
    branches: 50.0,    // Current: ~47.7%
    functions: 58.0,   // Current: ~55.9%
    lines: 55.0        // Current: ~52.5%
  },
  
  "packages/x-fidelity-server/": {
    statements: 60.0,  // Current: ~56.7%
    branches: 40.0,    // Current: ~38.2%
    functions: 47.0,   // Current: ~44.2%
    lines: 60.0        // Current: ~56.8%
  },
  
  "packages/x-fidelity-types/": {
    statements: 92.0,  // Current: ~91.4%
    branches: 95.0,    // Current: ~95.2%
    functions: 65.0,   // Current: ~61.0%
    lines: 92.0        // Current: ~90.8%
  },
  
  "packages/x-fidelity-vscode/": {
    statements: 15.0,  // Current: ~10%, setting realistic target
    branches: 15.0,    // Current: ~10%
    functions: 15.0,   // Current: ~10%
    lines: 15.0        // Current: ~10%
  }
};

/**
 * Get coverage thresholds for a specific package
 * @param {string} packagePath - The package path (e.g., 'packages/x-fidelity-core/')
 * @returns {object} Coverage thresholds for the package or global defaults
 */
function getPackageThresholds(packagePath) {
  return coverageThresholds[packagePath] || coverageThresholds.global;
}

/**
 * Create a Jest-compatible coverage threshold configuration
 * @param {string[]} [packagePaths] - Optional array of package paths to include
 * @returns {object} Jest coverage threshold configuration
 */
function createCoverageThresholds(packagePaths = []) {
  if (packagePaths.length === 0) {
    // Return all thresholds for monorepo-wide coverage
    return coverageThresholds;
  }
  
  // Return thresholds for specific packages
  const result = { global: coverageThresholds.global };
  packagePaths.forEach(path => {
    if (coverageThresholds[path]) {
      result[path] = coverageThresholds[path];
    }
  });
  
  return result;
}

module.exports = {
  coverageThresholds,
  getPackageThresholds,
  createCoverageThresholds
}; 