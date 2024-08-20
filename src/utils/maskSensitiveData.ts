import { logger } from './logger';

export function maskSensitiveData(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    const maskedObj: { [key: string]: any } = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (/x-shared-secret/gi.test(key)) {
                maskedObj[key] = '********';
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                maskedObj[key] = maskSensitiveData(obj[key]);
            } else {
                maskedObj[key] = obj[key];
            }
        }
    }

    logger.debug(`Masked sensitive data: ${JSON.stringify(maskedObj)}`);

    return maskedObj;
}
