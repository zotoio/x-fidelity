declare module 'complexity-report' {
    export interface ComplexityReport {
        aggregate: {
            complexity: {
                cyclomatic: number;
                halstead: {
                    difficulty: number;
                    volume: number;
                    effort: number;
                    bugs: number;
                    time: number;
                };
                sloc: {
                    logical: number;
                    physical: number;
                };
            };
        };
        functions: Array<{
            name: string;
            complexity: {
                cyclomatic: number;
                halstead: {
                    difficulty: number;
                    volume: number;
                    effort: number;
                    bugs: number;
                    time: number;
                };
                sloc: {
                    logical: number;
                    physical: number;
                };
            };
        }>;
        maintainability: number;
    }

    export function analyze(fileContent: string): ComplexityReport;
}
