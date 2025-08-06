/**
 * Mock for the 'path-scurry' package to prevent Jest test failures
 * This prevents issues with platform-specific path handling in tests
 */

export class PathScurry {
  constructor(public cwd: string = process.cwd()) {}
  
  resolve(path: string): string {
    return path;
  }
  
  relative(from: string, to: string): string {
    return to;
  }
}

// Default export
export default PathScurry;
