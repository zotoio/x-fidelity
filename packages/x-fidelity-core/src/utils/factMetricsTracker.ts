import { logger } from './logger';

import { FactMetrics } from '@x-fidelity/types';

export class FactMetricsTracker {
    private static instance: FactMetricsTracker;
    private metrics: Map<string, {
        executionCount: number;
        totalExecutionTime: number;
        longestExecutionTime: number;
    }> = new Map();

    private constructor() {}

    public static getInstance(): FactMetricsTracker {
        if (!FactMetricsTracker.instance) {
            FactMetricsTracker.instance = new FactMetricsTracker();
        }
        return FactMetricsTracker.instance;
    }

    public async trackFactExecution(factName: string, execution: () => Promise<any>): Promise<any> {
        const startTime = process.hrtime();
        
        try {
            const result = await execution();
            return result;
        } finally {
            const [seconds, nanoseconds] = process.hrtime(startTime);
            const executionTime = Number((seconds + nanoseconds / 1e9).toFixed(4)); // Convert to seconds with 4 decimal precision
            
            const current = this.metrics.get(factName) || { 
                executionCount: 0, 
                totalExecutionTime: 0,
                longestExecutionTime: 0
            };

            this.metrics.set(factName, {
                executionCount: current.executionCount + 1,
                totalExecutionTime: Number((current.totalExecutionTime + executionTime).toFixed(4)),
                longestExecutionTime: Math.max(executionTime, current.longestExecutionTime || 0)
            });

            logger.debug({
                factName,
                executionTime,
                totalExecutions: current.executionCount + 1
            }, 'Fact execution tracked');
        }
    }

    public getMetrics(): { [factName: string]: FactMetrics } {
        const result: { [factName: string]: FactMetrics } = {};
        this.metrics.forEach((value, key) => {
            result[key] = {
                ...value,
                averageExecutionTime: Number((value.totalExecutionTime / value.executionCount).toFixed(4))
            };
        });
        return result;
    }

    public reset(): void {
        this.metrics.clear();
    }
}

export const factMetricsTracker = FactMetricsTracker.getInstance();
