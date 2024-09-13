import path from 'path';

export function isPathInside(childPath: string, parentPath: string): boolean {
    const relativePath = path.relative(parentPath, childPath);
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
