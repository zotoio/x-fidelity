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
        let maxFlow = this.weightings.function_declaration; // Use highest weighting as baseline
        let previousNodeWeight = tree.weight;
        let weightChanges = 0;

        const traverse = (node: CodeRhythmNode) => {
            // Count abrupt weight changes
            if (Math.abs(node.weight - previousNodeWeight) > 1) {
                weightChanges++;
            }
            previousNodeWeight = node.weight;

            // Add node's impact to total
            totalFlow += node.flowImpact * (1 + (node.interval > 3 ? 0.5 : 0));
            nodeCount++;

            for (const child of node.children) {
                traverse(child);
            }
        };

        traverse(tree);

        // Normalize to 0-1 range with weight changes factored in
        const baseScore = totalFlow / (nodeCount * maxFlow);
        const weightChangeImpact = weightChanges / nodeCount;
        
        // Higher score indicates more chaotic flow
        return baseScore + weightChangeImpact;
    }

    private calculateSymmetry(tree: CodeRhythmNode): number {
        const typeCounts = new Map<string, number>();
        let totalNodes = 0;
        
        const countTypes = (node: CodeRhythmNode) => {
            typeCounts.set(node.type, (typeCounts.get(node.type) || 0) + 1);
            totalNodes++;
            node.children.forEach(countTypes);
        };

        countTypes(tree);

        // Calculate entropy-based symmetry
        let entropy = 0;
        typeCounts.forEach(count => {
            const probability = count / totalNodes;
            entropy -= probability * Math.log2(probability);
        });

        // Normalize entropy to 0-1 range (max entropy for n types is log2(n))
        const maxEntropy = Math.log2(typeCounts.size);
        return entropy / maxEntropy;
    }

    private calculateDiscontinuity(tree: CodeRhythmNode): number {
        let totalDiscontinuity = 0;
        let maxDiscontinuity = 0;
        let previousInterval = 0;

        const traverse = (node: CodeRhythmNode) => {
            if (previousInterval > 0) {
                const change = Math.abs(node.interval - previousInterval);
                const weightedChange = change * node.weight;
                totalDiscontinuity += weightedChange;
                maxDiscontinuity = Math.max(maxDiscontinuity, weightedChange);
            }
            previousInterval = node.interval;
            node.children.forEach(traverse);
        };

        traverse(tree);

        // Normalize to 0-1 range
        return maxDiscontinuity > 0 ? totalDiscontinuity / (maxDiscontinuity * tree.flowImpact) : 0;
    }

    analyzeNode(node: SyntaxTreeNode): CodeRhythmMetrics {
        this.flowPatterns.clear();
        const rhythmTree = this.buildRhythmTree(node);
        
        const metrics = {
            flowDensity: this.calculateFlowDensity(rhythmTree),
            operationalSymmetry: this.calculateSymmetry(rhythmTree),
            syntacticDiscontinuity: this.calculateDiscontinuity(rhythmTree)
        };

        logger.debug({ 
            metrics,
            nodeType: node.type,
            threshold: params?.minimumComplexityLogged || 0
        }, 'Code rhythm metrics calculated');

        return metrics;
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
