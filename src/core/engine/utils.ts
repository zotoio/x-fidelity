import { randomUUID } from 'crypto';

export function generateLogPrefix(): string {
    return randomUUID().substring(0, 8);
}

export const findKeyValuePair = (
    data: any,
    targetKey: string,
    targetValue: any
): any[] => {
    const results: any[] = [];

    const recursiveSearch = (obj: any): void => {
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                if (Object.prototype.hasOwnProperty.call(obj, key)) {
                    if (key === targetKey && obj[key] === targetValue) {
                        results.push(obj);
                        return; // Stop searching this branch as we've found the target in this object
                    }
                    if (typeof obj[key] === 'object' || Array.isArray(obj[key])) {
                        recursiveSearch(obj[key]);
                    }
                }
            }
        } else if (Array.isArray(obj)) {
            obj.forEach((item) => {
                recursiveSearch(item);
            });
        }
    };

    if (Array.isArray(data)) {
        data.forEach((item) => {
            recursiveSearch(item);
        });
    } else {
        recursiveSearch(data);
    }

    return results;
};
