import { logger } from './logger';

export interface FactMetric {
    executionCount: number;
    totalExecutionTime: number;
    averageExecutionTime: number;
    lastExecutionTime?: number;
}

export class FactMetricsTracker {
    private static instance: FactMetricsTracker;
    private metrics: Map<string, {
        executionCount: number;
        totalExecutionTime: number;
        lastExecutionTime?: number;
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
            const executionTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds
            
            const current = this.metrics.get(factName) || { 
                executionCount: 0, 
                totalExecutionTime: 0 
            };

            this.metrics.set(factName, {
                executionCount: current.executionCount + 1,
                totalExecutionTime: current.totalExecutionTime + executionTime,
                lastExecutionTime: executionTime
            });

            logger.debug({
                factName,
                executionTime,
                totalExecutions: current.executionCount + 1
            }, 'Fact execution tracked');
        }
    }

    public getMetrics(): { [factName: string]: FactMetric } {
        const result: { [factName: string]: FactMetric } = {};
        this.metrics.forEach((value, key) => {
            result[key] = {
                ...value,
                averageExecutionTime: value.totalExecutionTime / value.executionCount
            };
        });
        return result;
    }

    public reset(): void {
        this.metrics.clear();
    }
}

export const factMetricsTracker = FactMetricsTracker.getInstance();
