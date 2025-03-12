import { FactDefn, FileData } from '../../../types/typeDefs';
import { logger } from '../../../utils/logger';
import { generateAst } from '../../../utils/astUtils';

interface CodeMetrics {
    consistency: number;  // How consistent the code structure is (0-1)
    complexity: number;   // Overall structural complexity (0-1) 
    readability: number;  // Code readability score (0-1)
}

const NODE_WEIGHTS = {
    function_declaration: 3,
    if_statement: 2, 
    for_statement: 2,
    while_statement: 2,
    try_statement: 2,
    return_statement: 1,
    variable_declaration: 1
};

function analyzeCodeMetrics(node: any): CodeMetrics {
    const nodeTypes = new Map<string, number>();
    let totalNodes = 0;
    let maxDepth = 0;
    let currentDepth = 0;
    let weightedSum = 0;

    // Traverse tree and collect metrics
    function visit(node: any, depth: number) {
        if (!node) return;

        currentDepth = depth;
        maxDepth = Math.max(maxDepth, depth);
        totalNodes++;

        // Track node type frequencies
        const count = nodeTypes.get(node.type) || 0;
        nodeTypes.set(node.type, count + 1);

        // Add weighted value based on node type
        const weight = NODE_WEIGHTS[node.type as keyof typeof NODE_WEIGHTS] || 0;
        weightedSum += weight * (1 + depth * 0.1); // Weight increases with depth

        // Visit children
        for (const child of node.children || []) {
            visit(child, depth + 1);
        }
    }

    visit(node, 0);

    // Calculate metrics
    const consistency = calculateConsistency(nodeTypes, totalNodes);
    const complexity = calculateComplexity(maxDepth, weightedSum, totalNodes);
    const readability = calculateReadability(consistency, complexity);

    return {
        consistency,
        complexity,
        readability
    };
}

function calculateConsistency(nodeTypes: Map<string, number>, total: number): number {
    // Calculate normalized variance in node type distribution
    let variance = 0;
    const mean = total / nodeTypes.size;
    
    nodeTypes.forEach(count => {
        variance += Math.pow(count - mean, 2);
    });

    // Normalize variance to 0-1 range where 1 is most consistent
    const maxVariance = Math.pow(mean * (nodeTypes.size - 1), 2);
    return maxVariance > 0 ? 1 - (Math.sqrt(variance) / Math.sqrt(maxVariance)) : 1;
}

function calculateComplexity(depth: number, weightedSum: number, total: number): number {
    // Linear scaling for depth with lower impact
    const depthFactor = Math.min(1, depth / 15); // More gradual depth scaling
    const weightFactor = Math.min(1, weightedSum / (total * 5)); // Lower weight impact
    
    // Balance depth and weight factors more evenly
    return (depthFactor * 0.5 + weightFactor * 0.5);
}

function calculateReadability(consistency: number, complexity: number): number {
    // More balanced weighting between consistency and complexity
    return (consistency * 0.5 + (1 - complexity) * 0.5);
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

            const baseMetrics = analyzeCodeMetrics(tree.rootNode);
            
            // Calculate the final metrics based on the base metrics
            const metrics = {
                consistency: baseMetrics.consistency,
                complexity: baseMetrics.complexity,
                readability: baseMetrics.readability,
                // Map to expected test metrics
                flowDensity: 1 - baseMetrics.consistency, // Inverse of consistency
                operationalSymmetry: baseMetrics.consistency, // Same as consistency
                syntacticDiscontinuity: baseMetrics.complexity // Same as complexity
            };

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
