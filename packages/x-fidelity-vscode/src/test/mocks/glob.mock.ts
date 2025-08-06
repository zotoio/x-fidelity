/**
 * Mock for the 'glob' package to prevent Jest test failures
 * This prevents "Cannot read properties of undefined (reading 'native')" errors
 */

export function glob(_pattern: string, _options?: any): Promise<string[]> {
  // Return empty array for test purposes
  return Promise.resolve([]);
}

export function globSync(_pattern: string, _options?: any): string[] {
  // Return empty array for test purposes
  return [];
}

// Default export
export default {
  glob,
  globSync
};
