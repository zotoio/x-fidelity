import { logger } from './logger';

import { FactMetrics } from '../types/typeDefs';

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
            const executionTime = Number((seconds + nanoseconds / 1e9).toFixed(3)); // Convert to seconds with 3 decimal precision
            
            const current = this.metrics.get(factName) || { 
                executionCount: 0, 
                totalExecutionTime: 0,
                longestExecutionTime: 0
            };

            this.metrics.set(factName, {
                executionCount: current.executionCount + 1,
                totalExecutionTime: current.totalExecutionTime + executionTime,
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
                averageExecutionTime: Number((value.totalExecutionTime / value.executionCount).toFixed(3))
            };
        });
        return result;
    }

    public reset(): void {
        this.metrics.clear();
    }
}

export const factMetricsTracker = FactMetricsTracker.getInstance();
