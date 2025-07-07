import { logger } from './logger';

export interface TimingTracker {
    recordTiming: (operation: string) => void;
    recordDetailedTiming: (operation: string, fileIndex?: number, fileName?: string, totalFiles?: number) => void;
    logTimingBreakdown: (label: string, totalFiles?: number) => void;
    getTimings: () => { [key: string]: number };
    reset: () => void;
}

export function createTimingTracker(logPrefix: string = 'TIMING'): TimingTracker {
    const timings: { [key: string]: number } = {};
    const startTime = Date.now();
    let lastTime = startTime;

    const recordTiming = (operation: string) => {
        const now = Date.now();
        timings[operation] = now - lastTime;
        logger.trace(`${logPrefix}: ${operation} took ${timings[operation]}ms`);
        lastTime = now;
    };

    const recordDetailedTiming = (operation: string, fileIndex?: number, fileName?: string, totalFiles?: number) => {
        const now = Date.now();
        const elapsed = now - lastTime;
        const fileInfo = fileIndex !== undefined && totalFiles !== undefined ? ` [${fileIndex + 1}/${totalFiles}]` : '';
        const nameInfo = fileName ? ` ${fileName}` : '';
        logger.trace(`${logPrefix} DETAILED: ${operation}${fileInfo}${nameInfo} took ${elapsed}ms`);
        lastTime = now;
    };

    const logTimingBreakdown = (label: string, totalFiles?: number) => {
        const totalTime = Date.now() - startTime;
        logger.info(`=== ${label} TIMING BREAKDOWN ===`);
        
        if (totalFiles !== undefined) {
            logger.info(`Total files processed: ${totalFiles}`);
            logger.info(`Average time per file: ${Math.round(totalTime / totalFiles)}ms`);
        }
        
        Object.entries(timings).forEach(([operation, time]) => {
            const percentage = ((time / totalTime) * 100).toFixed(1);
            logger.info(`${operation}: ${time}ms (${percentage}%)`);
        });
        
        logger.info(`Total execution time: ${totalTime}ms`);
        logger.info('==================================');
    };

    const getTimings = () => ({ ...timings });

    const reset = () => {
        Object.keys(timings).forEach(key => delete timings[key]);
        const now = Date.now();
        lastTime = now;
    };

    return {
        recordTiming,
        recordDetailedTiming,
        logTimingBreakdown,
        getTimings,
        reset
    };
}

// Legacy function for backward compatibility
export function createLegacyRecordTiming(logPrefix: string = 'TIMING'): (operation: string) => void {
    const tracker = createTimingTracker(logPrefix);
    return tracker.recordTiming;
} 