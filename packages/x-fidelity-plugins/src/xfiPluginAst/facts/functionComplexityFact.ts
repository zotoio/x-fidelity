import ts from 'typescript';
import { FactDefn } from '@x-fidelity/types';
import { FunctionMetrics } from '@x-fidelity/types';
import { generateAst, logger } from '@x-fidelity/core';

export const functionComplexityFact: FactDefn = {
    name: 'functionComplexity',
    description: 'Calculates complexity metrics for functions in the codebase',
    fn: async (params: unknown, almanac?: unknown) => {
        try {
            const { tree, sourceFile } = generateAst(params as any);
            if (!tree) {
                return [];
            }

            const functions: FunctionMetrics[] = [];
            const visited = new Set<string>();

            function visit(node: ts.Node) {
                if (visited.has(node.pos.toString())) {
                    return;
                }
                visited.add(node.pos.toString());

                if (isFunctionLike(node)) {
                    const metrics = calculateMetrics(node, sourceFile);
                    functions.push(metrics);
                }

                node.forEachChild(visit);
            }

            tree.forEachChild(visit);
            return functions;
        } catch (error) {
            console.error(`Error in functionComplexityFact: ${error}`);
            return [];
        }
    }
};

function isFunctionLike(node: ts.Node): boolean {
    return node.kind === ts.SyntaxKind.FunctionDeclaration ||
           node.kind === ts.SyntaxKind.MethodDeclaration ||
           node.kind === ts.SyntaxKind.ArrowFunction ||
           node.kind === ts.SyntaxKind.FunctionExpression;
}

function calculateMetrics(node: ts.Node, sourceFile: ts.SourceFile): FunctionMetrics {
    const name = getFunctionName(node);
    const cyclomaticComplexity = calculateCyclomaticComplexity(node);
    const cognitiveComplexity = calculateCognitiveComplexity(node);
    const nestingDepth = calculateNestingDepth(node);
    const parameterCount = calculateParameterCount(node);
    const returnCount = calculateReturnCount(node);
    const lineCount = calculateLineCount(node, sourceFile);

    return {
        name,
        cyclomaticComplexity,
        cognitiveComplexity,
        nestingDepth,
        parameterCount,
        returnCount,
        lineCount
    };
}

function calculateLineCount(node: ts.Node, sourceFile: ts.SourceFile): number {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return end.line - start.line + 1;
}

function calculateCyclomaticComplexity(node: ts.Node): number {
    let complexity = 1;
    function visit(node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.ConditionalExpression:
            case ts.SyntaxKind.CaseClause:
            case ts.SyntaxKind.CatchClause:
            case ts.SyntaxKind.BinaryExpression:
                if (node.kind === ts.SyntaxKind.BinaryExpression) {
                    const binaryExpr = node as ts.BinaryExpression;
                    if (binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                        binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
                        complexity++;
                    }
                } else {
                    complexity++;
                }
                break;
        }
        node.forEachChild(visit);
    }
    visit(node);
    return complexity;
}

function calculateCognitiveComplexity(node: ts.Node): number {
    let complexity = 0;
    let nestingLevel = 0;

    function visit(node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
                complexity += nestingLevel + 1;
                nestingLevel++;
                node.forEachChild(visit);
                nestingLevel--;
                break;
            case ts.SyntaxKind.CatchClause:
            case ts.SyntaxKind.ConditionalExpression:
            case ts.SyntaxKind.BinaryExpression:
                if (node.kind === ts.SyntaxKind.BinaryExpression) {
                    const binaryExpr = node as ts.BinaryExpression;
                    if (binaryExpr.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
                        binaryExpr.operatorToken.kind === ts.SyntaxKind.BarBarToken) {
                        complexity += nestingLevel + 1;
                    }
                } else {
                    complexity += nestingLevel + 1;
                }
                node.forEachChild(visit);
                break;
            default:
                node.forEachChild(visit);
                break;
        }
    }
    visit(node);
    return complexity;
}

function calculateNestingDepth(node: ts.Node): number {
    let maxDepth = 0;
    let currentDepth = 0;

    function visit(node: ts.Node) {
        switch (node.kind) {
            case ts.SyntaxKind.IfStatement:
            case ts.SyntaxKind.WhileStatement:
            case ts.SyntaxKind.DoStatement:
            case ts.SyntaxKind.ForStatement:
            case ts.SyntaxKind.ForInStatement:
            case ts.SyntaxKind.ForOfStatement:
            case ts.SyntaxKind.CaseClause:
            case ts.SyntaxKind.CatchClause:
                currentDepth++;
                maxDepth = Math.max(maxDepth, currentDepth);
                node.forEachChild(visit);
                currentDepth--;
                break;
            default:
                node.forEachChild(visit);
                break;
        }
    }
    visit(node);
    return maxDepth;
}

function calculateParameterCount(node: ts.Node): number {
    if (ts.isFunctionLike(node)) {
        return node.parameters?.length || 0;
    }
    return 0;
}

function calculateReturnCount(node: ts.Node): number {
    let count = 0;
    function visit(node: ts.Node) {
        if (node.kind === ts.SyntaxKind.ReturnStatement) {
            count++;
        }
        node.forEachChild(visit);
    }
    visit(node);
    return count;
}

function getFunctionName(node: ts.Node): string {
    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
        return node.name?.getText() || 'anonymous';
    }
    return 'anonymous';
}
