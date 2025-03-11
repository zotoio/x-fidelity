import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { generateAst } from '../../../utils/astUtils';

interface SyntaxTreeNode {
    type: string;
    startPosition: {
        row: number;
    };
    children?: SyntaxTreeNode[];
}

interface CodeRhythmNode {
    type: string;
    weight: number;
    children: CodeRhythmNode[];
    interval: number;
    flowImpact: number;
}

interface CodeRhythmMetrics {
    flowDensity: number;
    operationalSymmetry: number;
    syntacticDiscontinuity: number;
}

type NodeWeightings = {
    function_declaration: number;
    if_statement: number;
    return_statement: number;
    for_statement: number;
    while_statement: number;
    try_statement: number;
    catch_clause: number;
    variable_declaration: number;
};

class CodeRhythmAnalyzer {
    private flowPatterns: Map<string, number> = new Map();
    private readonly weightings: NodeWeightings = {
        function_declaration: 3,
        if_statement: 2,
        return_statement: 1,
        for_statement: 2,
        while_statement: 2,
        try_statement: 2,
        catch_clause: 1,
        variable_declaration: 1
    };

    private buildRhythmTree(node: SyntaxTreeNode): CodeRhythmNode {
        const weight = this.weightings[node.type as keyof NodeWeightings] || 0;
        const children: CodeRhythmNode[] = [];
        let interval = 0;
        let flowImpact = weight;

        // Calculate interval from previous similar node
        if (this.flowPatterns.has(node.type)) {
            interval = node.startPosition.row - this.flowPatterns.get(node.type)!;
            this.flowPatterns.set(node.type, node.startPosition.row);
        } else {
            this.flowPatterns.set(node.type, node.startPosition.row);
        }

        // Process children
        for (const child of node.children || []) {
            const childNode = this.buildRhythmTree(child);
            children.push(childNode);
            flowImpact += childNode.flowImpact * 0.5; // Dampen child impact
        }

        return {
            type: node.type,
            weight,
            children,
            interval,
            flowImpact
        };
    }

    private calculateFlowDensity(tree: CodeRhythmNode): number {
        let totalFlow = tree.flowImpact;
        let nodeCount = 1;

        const traverse = (node: CodeRhythmNode) => {
            for (const child of node.children) {
                totalFlow += child.flowImpact;
                nodeCount++;
                traverse(child);
            }
        };

        traverse(tree);
        return totalFlow / nodeCount;
    }

    private calculateSymmetry(tree: CodeRhythmNode): number {
        const typeCounts = new Map<string, number>();
        
        const countTypes = (node: CodeRhythmNode) => {
            typeCounts.set(node.type, (typeCounts.get(node.type) || 0) + 1);
            node.children.forEach(countTypes);
        };

        countTypes(tree);

        // Calculate variance in type distributions
        const counts = Array.from(typeCounts.values());
        const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
        const variance = counts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / counts.length;

        return 1 / (1 + variance); // Normalize to 0-1 range
    }

    private calculateDiscontinuity(tree: CodeRhythmNode): number {
        let discontinuityScore = 0;
        let previousInterval = 0;

        const traverse = (node: CodeRhythmNode) => {
            // Large changes in interval indicate discontinuity
            if (previousInterval > 0) {
                const change = Math.abs(node.interval - previousInterval);
                discontinuityScore += change * node.weight;
            }
            previousInterval = node.interval;
            node.children.forEach(traverse);
        };

        traverse(tree);
        return discontinuityScore;
    }

    analyzeNode(node: SyntaxTreeNode): CodeRhythmMetrics {
        this.flowPatterns.clear();
        const rhythmTree = this.buildRhythmTree(node);
        
        return {
            flowDensity: this.calculateFlowDensity(rhythmTree),
            operationalSymmetry: this.calculateSymmetry(rhythmTree),
            syntacticDiscontinuity: this.calculateDiscontinuity(rhythmTree)
        };
    }
}

export const codeRhythmFact: FactDefn = {
    name: 'codeRhythm',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            const { tree } = generateAst(fileData);
            
            if (!tree) {
                logger.debug('No AST available for rhythm analysis');
                return { metrics: null };
            }

            const analyzer = new CodeRhythmAnalyzer();
            const metrics = analyzer.analyzeNode(tree.rootNode);

            logger.debug({ 
                fileName: fileData.fileName,
                metrics
            }, 'Code rhythm analysis complete');

            if (params?.resultFact) {
                almanac.addRuntimeFact(params.resultFact, metrics);
            }

            return { metrics };
        } catch (error) {
            logger.error(`Error in code rhythm analysis: ${error}`);
            return { metrics: null };
        }
    }
};
