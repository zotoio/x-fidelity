import path from 'path';

export function isPathInside(childPath: string, parentPath: string): boolean {
    if (!childPath || !parentPath) return false;
    const relativePath = path.relative(parentPath, childPath);
    return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}
