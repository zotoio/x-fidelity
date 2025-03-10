import { FactDefn, FileData } from '../types/typeDefs';
import { logger } from '../utils/logger';
import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import TypeScript from 'tree-sitter-typescript';

// Initialize parsers
const jsParser = new Parser();
jsParser.setLanguage(JavaScript);

const tsParser = new Parser();
tsParser.setLanguage(TypeScript.typescript);

function getParserForFile(fileName: string): Parser {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
        return tsParser;
    }
    return jsParser;
}

export const astFact: FactDefn = {
    name: 'ast',
    fn: async (params: any, almanac: any) => {
        try {
            const fileData: FileData = await almanac.factValue('fileData');
            
            if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
                return { tree: null };
            }

            const parser = getParserForFile(fileData.fileName);
            const tree = parser.parse(fileData.fileContent);

            // Add the AST to the almanac for other facts/operators to use
            if (params?.resultFact) {
                almanac.addRuntimeFact(params.resultFact, { tree });
            }

            return { tree };
        } catch (error) {
            logger.error(`Error generating AST: ${error}`);
            return { tree: null };
        }
    }
};

export const functionComplexityFact: FactDefn = {
    name: 'functionComplexity',
    fn: async (params: any, almanac: any) => {
        try {
            const { tree } = await almanac.factValue('ast');
            if (!tree) {
                return { complexity: 0 };
            }

            const complexities: any[] = [];

            // Visit each function declaration/expression
            tree.rootNode.walk({
                visit: (node) => {
                    if (node.type === 'function_declaration' || 
                        node.type === 'function_expression' ||
                        node.type === 'arrow_function') {

                        const complexity = analyzeFunctionComplexity(node);
                        complexities.push({
                            name: getFunctionName(node),
                            complexity,
                            location: {
                                start: node.startPosition,
                                end: node.endPosition
                            }
                        });
                    }
                }
            });

            const result = {
                complexities,
                maxComplexity: Math.max(...complexities.map(c => c.complexity))
            };

            if (params?.resultFact) {
                almanac.addRuntimeFact(params.resultFact, result);
            }

            return result;
        } catch (error) {
            logger.error(`Error analyzing function complexity: ${error}`);
            return { complexities: [], maxComplexity: 0 };
        }
    }
};

function analyzeFunctionComplexity(node: any): number {
    let complexity = 1; // Base complexity

    // Walk the AST and count:
    // - Conditional statements (if, else, switch cases)
    // - Loops (for, while, do-while)
    // - Logical operators (&&, ||)
    // - Try/catch blocks
    node.walk({
        visit: (child) => {
            switch (child.type) {
                case 'if_statement':
                case 'switch_case':
                case 'for_statement':
                case 'while_statement':
                case 'do_statement':
                case 'try_statement':
                    complexity++;
                    break;
                case '&&':
                case '||':
                    complexity += 0.5;
                    break;
            }
        }
    });

    return complexity;
}

function getFunctionName(node: any): string {
    if (node.type === 'function_declaration') {
        const nameNode = node.descendantsOfType('identifier')[0];
        return nameNode ? nameNode.text : 'anonymous';
    }
    return 'anonymous';
}
