import Parser, { Language, SyntaxNode } from 'tree-sitter';
import * as JavaScript from 'tree-sitter-javascript';
import { default as TypeScript } from 'tree-sitter-typescript/typescript';
import { FileData } from '@x-fidelity/types';
import { logger } from '@x-fidelity/core';

// Initialize parsers
const jsParser = new Parser();
jsParser.setLanguage(JavaScript as unknown as Language);

const tsParser = new Parser();
tsParser.setLanguage(TypeScript as unknown as Language);

export interface AstResult {
    tree: SyntaxNode | null;
    rootNode?: SyntaxNode;
}

function getParserForFile(fileName: string): Parser {
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) {
        return tsParser;
    }
    return jsParser;
}

export function generateAst(fileData: FileData): AstResult {
    try {
        logger.debug({ fileName: fileData?.fileName }, 'Processing file for AST generation with Tree-sitter');
        
        if (!fileData?.fileContent || fileData.fileName === 'REPO_GLOBAL_CHECK') {
            logger.debug('Skipping AST generation - no content or REPO_GLOBAL_CHECK');
            return { tree: null };
        }

        const parser = getParserForFile(fileData.fileName);
        logger.debug({ 
            fileName: fileData.fileName, 
            parserType: parser === jsParser ? 'JavaScript' : 'TypeScript' 
        }, 'Selected Tree-sitter parser for file');

        const parseTree = parser.parse(fileData.fileContent);
        const rootNode = parseTree.rootNode;
        
        logger.debug({ 
            fileName: fileData.fileName,
            rootType: rootNode.type,
            childCount: rootNode.childCount,
            startPosition: rootNode.startPosition,
            endPosition: rootNode.endPosition
        }, 'Generated Tree-sitter AST');

        return { 
            tree: rootNode,
            rootNode: rootNode
        };
    } catch (error) {
        logger.error(`Error generating Tree-sitter AST: ${error}`);
        return { tree: null };
    }
} 